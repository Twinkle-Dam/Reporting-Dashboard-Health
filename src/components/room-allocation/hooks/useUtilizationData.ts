import { useState, useCallback, useEffect } from 'react';
import { UTILIZATION_ENDPOINT } from '../../../api/config';
import { fetchRoomUtilizationSummary } from '../../../api/roomUtilization';
import { UtilRow } from '../roomAllocationUtils';
import { generateWeekData } from '../../../data/mockRoomData';
import { Crumbs, Scope } from './useAllocationFilters';
import { RemoteRoom } from './useRoomList';

const DEFAULT_ROOM_UTIL_LOCATION_ID = 'BABEEF54-C88A-400E-926E-5317260E5EA2';

// Helper to filter and map rows
function parsePercent(val: unknown): number {
  const n = Number.parseFloat(String(val ?? '0'));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function mapSummaryRows(rows: any[]): UtilRow[] {
  return (rows || [])
    .map((r: any) => ({
      room: String(r?.RoomName || r?.RoomId || '').trim(),
      month: String(r?.DateRange || '').trim() || 'Reporting Period',
      monday: parsePercent(r?.Monday),
      tuesday: parsePercent(r?.Tuesday),
      wednesday: parsePercent(r?.Wednesday),
      thursday: parsePercent(r?.Thursday),
      friday: parsePercent(r?.Friday),
    }))
    .filter((row) => row.room.length > 0);
}

export function useUtilizationData(
  useMock: boolean,
  crumbs: Crumbs,
  roomFilter: string | null,
  roomKey: string | null,
  range: { from?: string; to?: string },
  fromDate: string,
  toDate: string,
  resolvedLocationId: string | null,
  resolvedBuilding: any,
  remoteRoomsByBuilding: Record<string, Record<number, RemoteRoom[]>>,
  scopedRooms: Array<string | number>
) {
  const [data, setData] = useState<UtilRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const filterResultRows = useCallback(
    (rows: UtilRow[], opts?: { allowScopedFallback?: boolean }) => {
      if (!rows || rows.length === 0) return rows;
      let next = rows;
      if (roomFilter) {
        const target = String(roomFilter).toLowerCase();
        next = next.filter((r) => String(r.room).toLowerCase() === target);
        return next;
      }
      if (scopedRooms && scopedRooms.length > 0) {
        const allow = new Set(scopedRooms.map((x) => String(x)));
        const scoped = next.filter((r) => allow.has(String(r.room)));
        if (scoped.length === 0 && opts?.allowScopedFallback) {
          return next;
        }
        next = scoped;
      }
      return next;
    },
    [roomFilter, scopedRooms]
  );

  const fetchSummaryFallback = useCallback(
    async ({
      locationIdOverride,
      signal,
    }: {
      locationIdOverride?: string | null;
      signal?: AbortSignal;
    }) => {
      const today = new Date().toISOString().slice(0, 10);
      const startDate = range.from || fromDate || today;
      const endDate = range.to || toDate || startDate || today;
      const locationId = locationIdOverride || resolvedLocationId || DEFAULT_ROOM_UTIL_LOCATION_ID;
      if (!locationId) {
        return [] as UtilRow[];
      }

      let roomIdParam = roomKey || roomFilter;
      try {
        if (
          roomFilter &&
          resolvedBuilding?.id &&
          typeof crumbs.floor === 'number' &&
          remoteRoomsByBuilding[String(resolvedBuilding.id)]
        ) {
          const byBuilding = remoteRoomsByBuilding[String(resolvedBuilding.id)] || {};
          const floorRooms = byBuilding[Number(crumbs.floor)] || [];
          const match = floorRooms.find(
            (r) => String(r.label) === String(roomFilter) || String(r.id) === String(roomFilter)
          );
          if (match) {
            roomIdParam = match.id;
          }
        }
      } catch {
        // fall back as-is
      }

      const rows = await fetchRoomUtilizationSummary({
        locationId,
        startDate,
        endDate,
        roomId: roomIdParam || undefined,
      });
      const mapped = mapSummaryRows(rows || []);
      return filterResultRows(mapped, { allowScopedFallback: true });
    },
    [
      range.from,
      range.to,
      fromDate,
      toDate,
      resolvedLocationId,
      roomFilter,
      roomKey,
      filterResultRows,
      resolvedBuilding?.id,
      crumbs.floor,
      remoteRoomsByBuilding,
    ]
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    const buildPrimaryParams = () => {
      const params = new URLSearchParams();
      if (crumbs.city) params.set('city', String(crumbs.city));
      if (crumbs.campus) params.set('campus', String(crumbs.campus));
      if (crumbs.buildingId) params.set('buildingId', String(crumbs.buildingId));
      if (crumbs.buildingName) params.set('buildingName', String(crumbs.buildingName));
      if (typeof crumbs.floor === 'number') params.set('floor', String(crumbs.floor));
      if (roomFilter) params.set('room', String(roomFilter));
      if (range.from) params.set('from', String(range.from));
      if (range.to) params.set('to', String(range.to));
      return params;
    };

    const fetchPrimaryUtilization = async (): Promise<UtilRow[]> => {
      try {
        const params = buildPrimaryParams();
        const res = await fetch(`${UTILIZATION_ENDPOINT}?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error('Failed to fetch utilization data');
        }
        const result = (await res.json()) as UtilRow[];
        return filterResultRows(result);
      } catch (err) {
        console.warn('Primary utilization fetch failed', err);
        return [];
      }
    };

    const fallbackToDemo = () => {
      const demo = generateWeekData(scopedRooms as any[], range.from, range.to);
      setData(demo);
      setError(null);
    };

    const run = async () => {
      try {
        if (useMock) {
          fallbackToDemo();
          return;
        }

        let primaryRows: UtilRow[] = [];
        try {
          primaryRows = await fetchPrimaryUtilization();
        } catch (e) {
          console.warn('Primary utilization fetch failed', e);
        }

        if (primaryRows && primaryRows.length > 0) {
          setData(primaryRows);
          setError(null);
          return;
        }

        const summaryRows = await fetchSummaryFallback({ signal: controller.signal });
        if (summaryRows && summaryRows.length > 0) {
          setData(summaryRows);
          setError(null);
          return;
        }

        fallbackToDemo();
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.warn('API failed, falling back to demo data', err);
        fallbackToDemo();
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [
    crumbs.buildingId,
    crumbs.buildingName,
    crumbs.campus,
    crumbs.city,
    crumbs.floor,
    filterResultRows,
    fetchSummaryFallback,
    range.from,
    range.to,
    roomFilter,
    scopedRooms,
    useMock,
  ]);

  return { data, loading, error };
}
