import React, { useCallback, useEffect, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import { BUILDINGS, listRoomsForBuilding as listRoomsForBuildingBase } from '../data/buildings';
import { API_BASE, UTILIZATION_ENDPOINT } from '../api/config';
import { fetchRoomsByLocation } from '../api/rooms';
import { fetchRoomUtilizationSummary } from '../api/roomUtilization';
import { fetchLocationHierarchy, type LocationHierarchyRow } from '../api/locations';
import { loadSchedules } from '../modules/scheduling/scheduleStore';
import {
  DAYS,
  formatDate,
  generateWeekData,
  getInlineColors,
  startOfWeekMonday,
  type UtilRow,
} from '../components/room-allocation/roomAllocationUtils';
import { useDoctorPopup } from '../components/room-allocation/useDoctorPopup';

const DEFAULT_ROOM_UTIL_LOCATION_ID = 'BABEEF54-C88A-400E-926E-5317260E5EA2';

export function useRoomAllocationReport() {
  const [data, setData] = useState<UtilRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState<string | null>(null);
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const [crumbs, setCrumbs] = useState<{
    city?: string;
    campus?: string;
    buildingId?: string;
    buildingName?: string;
    floor?: number;
  }>({});
  const [scope, setScope] = useState<'city' | 'campus' | 'building' | 'floor'>('floor');
  const [drillFloor, setDrillFloor] = useState<number | null>(null);
  const envPrefersMock =
    String(process.env.REACT_APP_USE_MOCK_DATA || '').toLowerCase() === 'true';
  const [useMock, setUseMock] = useState<boolean>(envPrefersMock);
  const [remoteRoomsByBuilding, setRemoteRoomsByBuilding] = useState<Record<string, string[]>>({});
  const [providerView, setProviderView] = useState<'table' | 'donut' | 'ribbons'>('ribbons');
  const [locationHierarchyRows, setLocationHierarchyRows] = useState<LocationHierarchyRow[] | null>(
    null,
  );

  function listRoomsForBuilding(buildingId: string, floor: number): Array<string | number> {
    const remote = remoteRoomsByBuilding[buildingId];
    if (remote && remote.length > 0) return remote;
    return listRoomsForBuildingBase(buildingId, floor);
  }

  const handlePrint = useCallback(() => window.print(), []);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState<string>(today);
  const [toDate, setToDate] = useState<string>(today);
  const handleBack = useCallback(() => {
    window.history.back();
  }, []);

  const [doctorPopup, setDoctorPopup] = useState<any | null>(null);

  const buildCsv = useCallback(() => {
    const headerRow1 = ['ROOMS', 'MONTH', 'UTILIZATION PERCENTAGE', '', '', '', ''];
    const headerRow2 = ['', '', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    const rows = data.map((row) => [
      row.room,
      row.month,
      ...DAYS.map((d) => `${(row[d] as number).toFixed(2)}%`),
    ]);
    const escapeCell = (val: unknown) => `"${String(val).replace(/"/g, '""')}"`;
    return [headerRow1, headerRow2, ...rows]
      .map((r) => r.map(escapeCell).join(','))
      .join('\r\n');
  }, [data]);

  const syntheticRoomsForFloor = React.useCallback((floor: number, count: number = 6): number[] => {
    return Array.from({ length: count }).map((_, i) => floor * 100 + (i + 1));
  }, []);

  const handleExportCSV = useCallback(() => {
    const csv = buildCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'room_utilization.csv');
  }, [buildCsv]);

  const handleExportExcel = useCallback(() => {
    const border = '#9CA3AF';
    const header1Bg = '#FDE047';
    const header1Text = '#111827';
    const header2Bg = '#FEF2F2';
    const header2Text = '#B91C1C';

    const headerRow1 = `
      <tr>
        <th style="border:1px solid ${border};padding:6px;background:${header1Bg};color:${header1Text};text-align:center">ROOMS</th>
        <th style="border:1px solid ${border};padding:6px;background:${header1Bg};color:${header1Text};text-align:center">MONTH</th>
        <th colspan="5" style="border:1px solid ${border};padding:6px;background:${header1Bg};color:${header1Text};text-align:center">UTILIZATION PERCENTAGE</th>
      </tr>`;

    const headerRow2 = `
      <tr>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center"></th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center"></th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center">MONDAY</th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center">TUESDAY</th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center">WEDNESDAY</th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center">THURSDAY</th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center">FRIDAY</th>
      </tr>`;

    const bodyRows = data
      .map((row) => {
        const dayCells = DAYS.map((d) => {
          const v = row[d] as number;
          const c = getInlineColors(v);
          return `<td style="border:1px solid #9CA3AF;padding:6px;text-align:center;background-color:${c.bg};color:${c.text}">${v.toFixed(
            2,
          )}%</td>`;
        }).join('');
        return (
          `<tr>` +
          `<td style="border:1px solid #9CA3AF;padding:6px;font-weight:600">${row.room}</td>` +
          `<td style="border:1px solid #9CA3AF;padding:6px;font-weight:600">${row.month}</td>` +
          dayCells +
          `</tr>`
        );
      })
      .join('');

    const html =
      '<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>' +
      `<table style="border-collapse:collapse;font-family:Arial, sans-serif;font-size:12px">` +
      `<thead>${headerRow1}${headerRow2}</thead>` +
      `<tbody>${bodyRows}</tbody>` +
      `</table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    saveAs(blob, 'room_utilization.xls');
  }, [data]);

  // Load the location hierarchy once so we can derive accurate floor counts per building.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchLocationHierarchy({ onlyActive: true });
        if (!cancelled && Array.isArray(rows) && rows.length > 0) {
          setLocationHierarchyRows(rows);
        }
      } catch {
        // `fetchLocationHierarchy` already falls back to a static snapshot; if it still fails,
        // we simply keep using the static BUILDINGS metadata.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const hash = window.location.hash || '';
      const qIndex = hash.indexOf('?');
      if (qIndex >= 0) {
        const query = hash.slice(qIndex + 1);
        const params = new URLSearchParams(query);
        const room = params.get('room');
        const from = params.get('from') || undefined;
        const to = params.get('to') || undefined;
        const cityParam = params.get('city') || undefined;
        const campusParam = params.get('campus') || undefined;
        const buildingIdParam = params.get('buildingId') || undefined;
        const buildingNameParam = params.get('buildingName') || undefined;
        const floorParam = params.get('floor');
        const mockParam = params.get('mock');
        if (room) setRoomFilter(room);
        setRange({ from, to });
        if (from) setFromDate(from);
        if (to) setToDate(to);
        if (mockParam === '0' || mockParam === 'false') setUseMock(false);
        if (mockParam === '1' || mockParam === 'true') setUseMock(true);
        if (cityParam) {
          setCrumbs((c) => ({ ...c, city: cityParam }));
        }
        if (campusParam) {
          setCrumbs((c) => ({ ...c, campus: campusParam }));
        }
        if (buildingIdParam || buildingNameParam) {
          setCrumbs((c) => ({
            ...c,
            buildingId: buildingIdParam || c.buildingId,
            buildingName: buildingNameParam || c.buildingName,
            floor: floorParam ? Number(floorParam) : undefined,
          }));
        }
        if (room && !floorParam) {
          const inferred = parseInt(room, 10);
          if (!Number.isNaN(inferred) && inferred >= 100) {
            const f = Math.floor(inferred / 100);
            setCrumbs((c) => ({ ...c, floor: f }));
          }
        }
        if (room) {
          setScope('floor');
        }
        if ((buildingIdParam || buildingNameParam) && !floorParam && !room) {
          setScope('building');
        } else if (campusParam && !buildingIdParam && !buildingNameParam && !room) {
          setScope('campus');
        } else if (cityParam && !campusParam && !buildingIdParam && !buildingNameParam && !room) {
          setScope('city');
        }
      }
      try {
        const raw = sessionStorage.getItem('dash_state');
        if (raw) {
          const s = JSON.parse(raw || '{}') as {
            city?: string;
            campus?: string;
            buildingId?: string;
            floor?: number;
            from?: string;
            to?: string;
          };
          const building = s.buildingId ? (BUILDINGS as any[]).find((b) => b.id === s.buildingId) : null;
          setCrumbs((prev) => ({
            city: typeof prev.city !== 'undefined' ? prev.city : s.city,
            campus: typeof prev.campus !== 'undefined' ? prev.campus : s.campus,
            buildingId: typeof prev.buildingId !== 'undefined' ? prev.buildingId : s.buildingId,
            buildingName:
              typeof prev.buildingName !== 'undefined' ? prev.buildingName : building?.name || s.buildingId || undefined,
            floor:
              typeof prev.floor === 'number'
                ? prev.floor
                : typeof s.floor === 'number'
                ? s.floor
                : undefined,
          }));
          if (!fromDate && s.from) setFromDate(s.from);
          if (!toDate && s.to) setToDate(s.to);
          if (!range.from || !range.to) {
            setRange((r) => ({ from: r.from || s.from, to: r.to || s.to }));
          }
          setScope((prev) => {
            if (roomFilter) return 'floor';
            if (typeof s.floor === 'number') return 'floor';
            if (s.buildingId) return 'building';
            if (s.campus) return 'campus';
            if (s.city) return 'city';
            return prev;
          });
        }
      } catch {
        /* ignore */
      }
    } catch {
      /* ignore */
    }
  }, [fromDate, range.from, range.to, roomFilter, toDate]);

  const scopedRooms = React.useMemo((): Array<string | number> => {
    try {
      if (roomFilter) return [roomFilter];
      const MAX = 6;
      const out: Array<string | number> = [];
      if (
        (scope === 'floor' || (resolvedBuilding && typeof crumbs.floor === 'number')) &&
        resolvedBuilding &&
        typeof crumbs.floor === 'number'
      ) {
        let list: Array<string | number> = (listRoomsForBuilding(
          (resolvedBuilding as any).id,
          crumbs.floor,
        ) || []) as Array<string | number>;
        if (!list || list.length === 0) {
          list = syntheticRoomsForFloor(crumbs.floor);
        }
        for (const r of list) {
          if (out.length < MAX) out.push(r);
          else break;
        }
      } else if (
        (resolvedBuilding || buildingMeta) &&
        (scope === 'building' || crumbs.floor === undefined || crumbs.floor === null)
      ) {
        const b = resolvedBuilding as any;
        const floors = Number((buildingMeta?.floors) || (b?.floors) || 5);
        for (let f = 1; f <= floors; f++) {
          let list: Array<string | number>;
          if (b?.id) {
            list = (listRoomsForBuilding(b.id, f) || []) as Array<string | number>;
            if (!list || list.length === 0) list = syntheticRoomsForFloor(f);
          } else {
            list = syntheticRoomsForFloor(f);
          }
          for (const r of list) {
            out.push(r);
          }
        }
      } else if (scope === 'campus' && crumbs.campus) {
        const bs = (BUILDINGS as any[]).filter((b) => b.campus === crumbs.campus);
        for (const b of bs) {
          for (let f = 1; f <= 2 && out.length < MAX; f++) {
            const list = listRoomsForBuilding(b.id, f) || [];
            for (const r of list) {
              if (out.length < MAX) out.push(r);
              else break;
            }
          }
          if (out.length >= MAX) break;
        }
      } else if (scope === 'city' && crumbs.city) {
        const bs = (BUILDINGS as any[]).filter((b) => b.city === crumbs.city);
        for (const b of bs) {
          const list = listRoomsForBuilding(b.id, 1) || [];
          for (const r of list) {
            if (out.length < MAX) out.push(r);
            else break;
          }
          if (out.length >= MAX) break;
        }
      }
      if (out.length > 0) return out;
    } catch {
      /* ignore */
    }
    return Array.from({ length: 6 }).map((_, i) => i + 1);
  }, [roomFilter, scope, crumbs.city, crumbs.campus, crumbs.buildingId, crumbs.floor]);

const resolvedBuilding = React.useMemo(() => {
  try {
    if (crumbs.buildingId) {
      const byId = (BUILDINGS as any[]).find((bb) => bb.id === crumbs.buildingId);
      if (byId) return byId;
    }
    if (crumbs.buildingName) {
      const target = String(crumbs.buildingName).toLowerCase().trim();
      let found = (BUILDINGS as any[]).find(
        (bb) => String(bb.name).toLowerCase().trim() === target
      );
      if (found) return found;
      found = (BUILDINGS as any[]).find((bb) =>
        String(bb.name).toLowerCase().includes(target)
      );
      if (found) return found;
      found = (BUILDINGS as any[]).find((bb) =>
        target.includes(String(bb.name).toLowerCase())
      );
      if (found) return found;
    }
  } catch {
    /* ignore */
  }
  return null;
}, [crumbs.buildingId, crumbs.buildingName]);

const resolvedLocationId = React.useMemo(() => {
  if (crumbs.buildingId) {
    return String(crumbs.buildingId);
  }
  const buildingName = crumbs.buildingName || String((resolvedBuilding as any)?.name || '').trim();
  if (!buildingName || !locationHierarchyRows || locationHierarchyRows.length === 0) {
    return null;
  }
  const target = buildingName.toLowerCase().trim();
  const match = locationHierarchyRows.find(
    (row) => String(row.BuildingName).toLowerCase().trim() === target
  );
  return match?.BuildingId ? String(match.BuildingId) : null;
}, [crumbs.buildingId, crumbs.buildingName, locationHierarchyRows, resolvedBuilding]);

const filterResultRows = React.useCallback(
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

const mapSummaryRows = React.useCallback((rows: any[]): UtilRow[] => {
  const parsePercent = (val: unknown): number => {
    const n = Number.parseFloat(String(val ?? '0'));
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  };
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
}, []);

const fetchSummaryFallback = React.useCallback(
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
    const locationId =
      locationIdOverride || resolvedLocationId || DEFAULT_ROOM_UTIL_LOCATION_ID;
    if (!locationId) {
      return [] as UtilRow[];
    }
    const rows = await fetchRoomUtilizationSummary({
      locationId,
      startDate,
      endDate,
      roomId: roomFilter,
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
    mapSummaryRows,
    filterResultRows,
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
    const params = buildPrimaryParams();
    const res = await fetch(`${UTILIZATION_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error('Failed to fetch utilization data');
    }
    const result = (await res.json()) as UtilRow[];
    return filterResultRows(result);
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

      const primaryRows = await fetchPrimaryUtilization();
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
      try {
        const summaryRows = await fetchSummaryFallback({ signal: controller.signal });
        if (summaryRows && summaryRows.length > 0) {
          setData(summaryRows);
          setError(null);
          return;
        }
      } catch (innerErr: any) {
        if (innerErr?.name === 'AbortError') {
          return;
        }
      }
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

  const buildingFloorsFromHierarchy = React.useMemo(() => {
    try {
      if (!locationHierarchyRows || (!crumbs.buildingName && !resolvedBuilding)) {
        return undefined;
      }
      const buildingName =
        crumbs.buildingName || String((resolvedBuilding as any)?.name || '').trim();
      if (!buildingName) return undefined;
      const target = buildingName.toLowerCase().trim();
      const matches = locationHierarchyRows.filter(
        (row) => String(row.BuildingName).toLowerCase().trim() === target,
      );
      if (!matches.length) return undefined;
      const floorsFromAttr = Math.max(
        ...matches.map((r) =>
          typeof r.BuildingFloors === 'number' && r.BuildingFloors > 0
            ? Number(r.BuildingFloors)
            : 0,
        ),
      );
      if (floorsFromAttr > 0) return floorsFromAttr;
      const maxFloor = Math.max(...matches.map((r) => Number(r.FloorNumber || 0)));
      return maxFloor > 0 ? maxFloor : undefined;
    } catch {
      return undefined;
    }
  }, [locationHierarchyRows, crumbs.buildingName, resolvedBuilding]);

  const buildingMeta = React.useMemo(() => {
    try {
      const b = resolvedBuilding as any;
      const floorsFromHierarchy =
        typeof buildingFloorsFromHierarchy === 'number' && buildingFloorsFromHierarchy > 0
          ? Number(buildingFloorsFromHierarchy)
          : undefined;
      if (!b && !floorsFromHierarchy) {
        if (crumbs.buildingName) {
          return { floors: 5 };
        }
        return null;
      }
      const floors = floorsFromHierarchy ?? Number((b?.floors) || 5);
      return { floors };
    } catch {
      return null;
    }
  }, [resolvedBuilding, crumbs.buildingName, buildingFloorsFromHierarchy]);

  const { openDoctorPopup } = useDoctorPopup(crumbs, resolvedBuilding, setDoctorPopup);

  useEffect(() => {
    (async () => {
      try {
        if (!API_BASE) return;
        const b = resolvedBuilding as any;
        if (!b) return;
        const byName = String(b?.name || '');
        if (byName !== 'UH Ahuja Medical Center') return;
        if (!(scope === 'floor' && Number(crumbs.floor) === 1)) return;
        const locationId = 'BABEEF54-C88A-400E-926E-5317260E5EA2';
        const rooms = await fetchRoomsByLocation(locationId, undefined);
        if (rooms && rooms.length > 0) {
          setRemoteRoomsByBuilding((prev) => ({
            ...prev,
            [String(b.id || 'uh-ahuja-medical-center')]: rooms,
          }));
        }
      } catch {
      }
    })();
  }, [resolvedBuilding, scope, crumbs.floor]);

  const floorsCount = React.useMemo(() => {
    if (buildingMeta?.floors && Number(buildingMeta.floors) > 0)
      return Number(buildingMeta.floors);
    if (crumbs.buildingName || resolvedBuilding) return 5;
    return undefined;
  }, [buildingMeta?.floors, crumbs.buildingName, resolvedBuilding]);

  const campusBuildings = React.useMemo(() => {
    if (!crumbs.campus) return [];
    const target = String(crumbs.campus).toLowerCase().trim();
    return (BUILDINGS as any[]).filter(
      (b) => String(b.campus).toLowerCase().trim() === target,
    );
  }, [crumbs.campus]);

  const cityCampuses = React.useMemo(() => {
    if (!crumbs.city) return [];
    const target = String(crumbs.city).toLowerCase().trim();
    const set = new Set<string>();
    for (const b of BUILDINGS as any[]) {
      if (String(b.city).toLowerCase().trim() === target) set.add(String(b.campus));
    }
    return Array.from(set);
  }, [crumbs.city]);

  const cityCampusTable = React.useMemo(() => {
    if (!crumbs.city || cityCampuses.length === 0 || !(scope === 'city')) return [];
    const rows: UtilRow[] = [];
    const weekLabel = `Week of ${formatDate(startOfWeekMonday(range.from))}`;
    const avg = (vals: number[]) =>
      vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    for (const campus of cityCampuses) {
      const buildings = (BUILDINGS as any[]).filter(
        (b) =>
          String(b.city) === String(crumbs.city) &&
          String(b.campus) === String(campus),
      );
      let allRooms: string[] = [];
      for (const b of buildings) {
        const floors = Number((b as any)?.floors || 5);
        for (let f = 1; f <= floors; f++) {
          const list = (listRoomsForBuilding((b as any).id, f) || []).map(String);
          if (list && list.length > 0) allRooms.push(...list);
          else allRooms.push(...syntheticRoomsForFloor(f).map(String));
        }
      }
      let dataRows = (data || []).filter((r) =>
        allRooms.includes(String(r.room)),
      );
      if (!dataRows || dataRows.length === 0) {
        dataRows = generateWeekData(allRooms.slice(0, 20) as any[], range.from, range.to);
      }
      const mondays = dataRows.map((r) => Number(r.monday as number));
      const tuesdays = dataRows.map((r) => Number(r.tuesday as number));
      const wednesdays = dataRows.map((r) => Number(r.wednesday as number));
      const thursdays = dataRows.map((r) => Number(r.thursday as number));
      const fridays = dataRows.map((r) => Number(r.friday as number));
      rows.push({
        room: String(campus),
        month: weekLabel,
        monday: Math.round(avg(mondays) * 100) / 100,
        tuesday: Math.round(avg(tuesdays) * 100) / 100,
        wednesday: Math.round(avg(wednesdays) * 100) / 100,
        thursday: Math.round(avg(thursdays) * 100) / 100,
        friday: Math.round(avg(fridays) * 100) / 100,
      } as UtilRow);
    }
    return rows;
  }, [crumbs.city, cityCampuses, scope, data, range.from, syntheticRoomsForFloor]);

  const cityCampusSeries = React.useMemo(() => {
    if (!crumbs.city || cityCampuses.length === 0 || scope !== 'city') return [];
    const series: Array<{ campus: string; util: number }> = [];
    const dayAvg = (row: UtilRow) => {
      const vals = DAYS.map((d) => Number((row[d] as number) || 0));
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    for (const campus of cityCampuses) {
      const buildings = (BUILDINGS as any[]).filter(
        (b) =>
          String(b.city) === String(crumbs.city) &&
          String(b.campus) === String(campus),
      );
      let rooms: string[] = [];
      for (const b of buildings) {
        const floors = Number((b as any)?.floors || 5);
        for (let f = 1; f <= floors; f++) {
          const list = (listRoomsForBuilding((b as any).id, f) || []).map(String);
          if (list && list.length > 0) rooms.push(...list);
          else rooms.push(...syntheticRoomsForFloor(f).map(String));
        }
      }
      let dataRows = (data || []).filter((r) =>
        rooms.includes(String(r.room)),
      );
      if (!dataRows || dataRows.length === 0) {
        dataRows = generateWeekData(rooms.slice(0, 20) as any[], range.from, range.to);
      }
      const util = dataRows.length
        ? dataRows.reduce((s, r) => s + dayAvg(r), 0) / dataRows.length
        : 0;
      series.push({ campus: String(campus), util: Math.round(util * 100) / 100 });
    }
    return series;
  }, [crumbs.city, cityCampuses, scope, data, range.from, syntheticRoomsForFloor]);

  const campusDailyTable = React.useMemo(() => {
    if (
      !crumbs.campus ||
      campusBuildings.length === 0 ||
      !(scope === 'campus' || (!resolvedBuilding && (crumbs.floor === undefined || crumbs.floor === null)))
    )
      return [];
    const result: UtilRow[] = [];
    const weekLabel = `Week of ${formatDate(startOfWeekMonday(range.from))}`;
    const avg = (vals: number[]) =>
      vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    for (const b of campusBuildings) {
      const floors = Number((b as any)?.floors || 5);
      let rooms: string[] = [];
      for (let f = 1; f <= floors; f++) {
        const list = (listRoomsForBuilding((b as any).id, f) || []).map(String);
        if (list && list.length > 0) {
          rooms.push(...list);
        } else {
          rooms.push(...syntheticRoomsForFloor(f).map(String));
        }
      }
      const roomSet = new Set(rooms);
      let rows = (data || []).filter((row) =>
        roomSet.has(String(row.room)),
      );
      if (!rows || rows.length === 0) {
        const demo = generateWeekData(rooms.slice(0, 12) as any[], range.from, range.to);
        rows = demo;
      }
      const mondays = rows.map((r) => Number(r.monday as number));
      const tuesdays = rows.map((r) => Number(r.tuesday as number));
      const wednesdays = rows.map((r) => Number(r.wednesday as number));
      const thursdays = rows.map((r) => Number(r.thursday as number));
      const fridays = rows.map((r) => Number(r.friday as number));
      result.push({
        room: String((b as any).name),
        month: weekLabel,
        monday: Math.round(avg(mondays) * 100) / 100,
        tuesday: Math.round(avg(tuesdays) * 100) / 100,
        wednesday: Math.round(avg(wednesdays) * 100) / 100,
        thursday: Math.round(avg(thursdays) * 100) / 100,
        friday: Math.round(avg(fridays) * 100) / 100,
      } as UtilRow);
    }
    return result;
  }, [crumbs.campus, campusBuildings, scope, resolvedBuilding, range.from, data, syntheticRoomsForFloor]);

  const campusSeries = React.useMemo(() => {
    if (
      !crumbs.campus ||
      campusBuildings.length === 0 ||
      !(scope === 'campus' || (!resolvedBuilding && (crumbs.floor === undefined || crumbs.floor === null)))
    )
      return [];
    const series: Array<{ name: string; util: number }> = [];
    const dayAvg = (row: UtilRow) => {
      const vals = DAYS.map((d) => Number((row[d] as number) || 0));
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    for (const b of campusBuildings) {
      const floors = Number((b as any)?.floors || 5);
      let rooms: string[] = [];
      for (let f = 1; f <= floors; f++) {
        const list = (listRoomsForBuilding((b as any).id, f) || []).map(String);
        if (list && list.length > 0) rooms.push(...list);
        else rooms.push(...syntheticRoomsForFloor(f).map(String));
      }
      let rows = (data || []).filter((row) =>
        rooms.includes(String(row.room)),
      );
      if (!rows || rows.length === 0) {
        rows = generateWeekData(rooms.slice(0, 12) as any[], range.from, range.to);
      }
      const util = rows.length
        ? rows.reduce((s, r) => s + dayAvg(r), 0) / rows.length
        : 0;
      series.push({
        name: String((b as any).name),
        util: Math.round(util * 100) / 100,
      });
    }
    return series;
  }, [crumbs.campus, campusBuildings, scope, resolvedBuilding, range.from, data, syntheticRoomsForFloor]);

  useEffect(() => {
    try {
      if (
        (resolvedBuilding || crumbs.buildingName) &&
        !roomFilter &&
        (crumbs.floor === undefined || crumbs.floor === null)
      ) {
        if (scope !== 'building') {
          setScope('building');
        }
      }
    } catch {
    }
  }, [resolvedBuilding, crumbs.buildingName, roomFilter, crumbs.floor, scope]);

  const groupedByFloor = React.useMemo(() => {
    if (scope !== 'building' || !resolvedBuilding) return null;
    try {
      const b = resolvedBuilding as any;
      const floors = Number((b as any)?.floors || 5);
      const groups: Array<{ floor: number; data: UtilRow[] }> = [];
      for (let f = 1; f <= floors; f++) {
        const rooms = new Set(
          (listRoomsForBuilding(b.id, f) || []).map((r: any) => String(r)),
        );
        const rows = (data || []).filter((row) =>
          rooms.has(String(row.room)),
        );
        if (rows.length > 0) {
          groups.push({ floor: f, data: rows });
        }
      }
      return groups;
    } catch {
      return null;
    }
  }, [scope, resolvedBuilding, data]);

  const floorDailyTable = React.useMemo(() => {
    if (
      (scope !== 'building' && !(crumbs.floor === undefined || crumbs.floor === null)) ||
      !floorsCount
    )
      return [];
    const result: UtilRow[] = [];
    const weekLabel = `Week of ${formatDate(startOfWeekMonday(range.from))}`;
    const avg = (vals: number[]) =>
      vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    for (let f = 1; f <= floorsCount; f++) {
      let rooms: string[];
      if (resolvedBuilding?.id) {
        rooms = (listRoomsForBuilding((resolvedBuilding as any).id, f) || []).map(
          (r: any) => String(r),
        );
        if (!rooms || rooms.length === 0)
          rooms = syntheticRoomsForFloor(f).map(String);
      } else {
        rooms = syntheticRoomsForFloor(f).map(String);
      }
      const roomSet = new Set(rooms);
      let rows = (data || []).filter((row) =>
        roomSet.has(String(row.room)),
      );
      if (!rows || rows.length === 0) {
        const demo = generateWeekData(rooms.slice(0, 6) as any[], range.from, range.to);
        rows = demo;
      }
      const mondays = rows.map((r) => Number(r.monday as number));
      const tuesdays = rows.map((r) => Number(r.tuesday as number));
      const wednesdays = rows.map((r) => Number(r.wednesday as number));
      const thursdays = rows.map((r) => Number(r.thursday as number));
      const fridays = rows.map((r) => Number(r.friday as number));
      result.push({
        room: `Floor ${f}`,
        month: weekLabel,
        monday: Math.round(avg(mondays) * 100) / 100,
        tuesday: Math.round(avg(tuesdays) * 100) / 100,
        wednesday: Math.round(avg(wednesdays) * 100) / 100,
        thursday: Math.round(avg(thursdays) * 100) / 100,
        friday: Math.round(avg(fridays) * 100) / 100,
      } as UtilRow);
    }
    return result;
  }, [scope, resolvedBuilding, floorsCount, data, range.from, range.to, crumbs.floor, syntheticRoomsForFloor]);

  const floorSeries = React.useMemo(() => {
    if (
      (scope !== 'building' && !(crumbs.floor === undefined || crumbs.floor === null)) ||
      !floorsCount
    )
      return [];
    const series: Array<{ floor: number; floorLabel: string; util: number }> = [];
    for (let f = 1; f <= floorsCount; f++) {
      let roomList: string[];
      if (resolvedBuilding?.id) {
        roomList = (listRoomsForBuilding((resolvedBuilding as any).id, f) || []).map(
          (r: any) => String(r),
        );
        if (!roomList || roomList.length === 0)
          roomList = syntheticRoomsForFloor(f).map(String);
      } else {
        roomList = syntheticRoomsForFloor(f).map(String);
      }
      const rooms = new Set(roomList);
      const rows = (data || []).filter((r) =>
        rooms.has(String(r.room)),
      );
      let util = 0;
      if (rows.length > 0) {
        const dayAvg = (row: UtilRow) => {
          const vals = DAYS.map((d) => Number((row[d] as number) || 0));
          return vals.reduce((a, b) => a + b, 0) / vals.length;
        };
        util = rows.reduce((sum, r) => sum + dayAvg(r), 0) / rows.length;
      } else {
        const fallbackRooms = roomList.slice(0, 6);
        const demo = generateWeekData(fallbackRooms as any[], range.from, range.to);
        const dayAvg = (row: UtilRow) => {
          const vals = DAYS.map((d) => Number((row[d] as number) || 0));
          return vals.reduce((a, b) => a + b, 0) / vals.length;
        };
        util = demo.reduce((sum, r) => sum + dayAvg(r), 0) / (demo.length || 1);
      }
      series.push({
        floor: f,
        floorLabel: `Floor ${f}`,
        util: Math.round(util * 100) / 100,
      });
    }
    return series;
  }, [scope, resolvedBuilding, floorsCount, data, range.from, range.to, crumbs.floor, syntheticRoomsForFloor]);

  const selectedFloorSummaryRow = React.useMemo((): UtilRow | null => {
    try {
      if (typeof crumbs.floor !== 'number') return null;
      if (roomFilter) return null;
      const weekLabel = `Week of ${formatDate(startOfWeekMonday(range.from))}`;
      let rows: UtilRow[] = [];
      if (resolvedBuilding?.id) {
        let rooms = (listRoomsForBuilding(
          (resolvedBuilding as any).id,
          crumbs.floor,
        ) || []).map((r: any) => String(r));
        if (!rooms || rooms.length === 0)
          rooms = syntheticRoomsForFloor(crumbs.floor).map(String);
        const roomSet = new Set(rooms);
        rows = (data || []).filter((row) => roomSet.has(String(row.room)));
        if (!rows || rows.length === 0) {
          const demo = generateWeekData(rooms.slice(0, 20) as any[], range.from, range.to);
          rows = demo as any as UtilRow[];
        }
      } else {
        const rooms = syntheticRoomsForFloor(crumbs.floor).map(String);
        const demo = generateWeekData(rooms.slice(0, 20) as any[], range.from, range.to);
        rows = demo as any as UtilRow[];
      }
      if (!rows || rows.length === 0) return null;
      const avg = (vals: number[]) =>
        vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      const mondays = rows.map((r) => Number((r.monday as number) || 0));
      const tuesdays = rows.map((r) => Number((r.tuesday as number) || 0));
      const wednesdays = rows.map((r) => Number((r.wednesday as number) || 0));
      const thursdays = rows.map((r) => Number((r.thursday as number) || 0));
      const fridays = rows.map((r) => Number((r.friday as number) || 0));
      return {
        room: `Floor ${crumbs.floor}`,
        month: weekLabel,
        monday: Math.round(avg(mondays) * 100) / 100,
        tuesday: Math.round(avg(tuesdays) * 100) / 100,
        wednesday: Math.round(avg(wednesdays) * 100) / 100,
        thursday: Math.round(avg(thursdays) * 100) / 100,
        friday: Math.round(avg(fridays) * 100) / 100,
      };
    } catch {
      return null;
    }
  }, [crumbs.floor, roomFilter, resolvedBuilding, data, range.from, range.to, syntheticRoomsForFloor, listRoomsForBuilding]);

  React.useMemo(() => {
    try {
      const schedules = loadSchedules() as Record<string, any>;
      const deptSet = new Set<string>();
      const bId = (resolvedBuilding as any)?.id || crumbs.buildingId || '';
      const wantFloor = typeof crumbs.floor === 'number' ? Number(crumbs.floor) : null;
      const wantRoom = roomFilter ? String(roomFilter) : null;
      if (!bId) return [];
      for (const sched of Object.values(schedules || {})) {
        const dept = (sched as any)?.doctorDepartment || '';
        const week: any = (sched as any)?.week || {};
        for (const key of Object.keys(week)) {
          const slots: any[] = week[key]?.slots || [];
          for (const s of slots) {
            if (String(s.buildingId) !== String(bId)) continue;
            if (wantFloor !== null && Number(s.floor) !== wantFloor) continue;
            if (wantRoom && String(s.room) !== wantRoom) continue;
            if (dept) deptSet.add(String(dept));
          }
        }
      }
      return Array.from(deptSet);
    } catch {
      return [];
    }
  }, [resolvedBuilding, crumbs.buildingId, crumbs.floor, roomFilter]);

  const scopeDayBreakdown = React.useMemo(() => {
    try {
      const allowed = new Set<string>();
      if (scope === 'city' && crumbs.city) {
        for (const b of BUILDINGS as any[]) {
          if (String(b.city) === String(crumbs.city)) allowed.add(String(b.id));
        }
      } else if (scope === 'campus' && crumbs.campus) {
        for (const b of BUILDINGS as any[]) {
          if (String(b.campus) === String(crumbs.campus)) allowed.add(String(b.id));
        }
      } else if ((resolvedBuilding as any)?.id || crumbs.buildingId) {
        const id = (resolvedBuilding as any)?.id || crumbs.buildingId;
        if (id) allowed.add(String(id));
      }
      if (allowed.size === 0) {
        for (const b of BUILDINGS as any[]) allowed.add(String((b as any).id));
      }
      const wantFloor =
        scope === 'floor' && typeof crumbs.floor === 'number'
          ? Number(crumbs.floor)
          : null;
      const wantRoom = roomFilter ? String(roomFilter) : null;
      const schedules = loadSchedules() as Record<string, any>;
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const result: Array<{
        day: string;
        items: Array<{ name: string; percent: number; department?: string }>;
      }> = [];
      const occForDay = (day: string) => {
        const key = day.toLowerCase() as keyof UtilRow;
        if (
          scope === 'floor' &&
          !wantRoom &&
          typeof crumbs.floor === 'number' &&
          selectedFloorSummaryRow
        ) {
          const v = Number((selectedFloorSummaryRow as any)?.[key] || 0);
          return Math.max(0, Math.min(100, Math.round(v)));
        }
        if (scope === 'building' && (floorDailyTable?.length || 0) > 0) {
          const vals = floorDailyTable.map((r) =>
            Number(((r as any)?.[key] || 0) as number),
          );
          const avg =
            vals.length === 0
              ? 0
              : vals.reduce((a, b) => a + b, 0) / vals.length;
          return Math.max(0, Math.min(100, Math.round(avg)));
        }
        if (scope === 'campus' && (campusDailyTable?.length || 0) > 0) {
          const vals = campusDailyTable.map((r) =>
            Number(((r as any)?.[key] || 0) as number),
          );
          const avg =
            vals.length === 0
              ? 0
              : vals.reduce((a, b) => a + b, 0) / vals.length;
          return Math.max(0, Math.min(100, Math.round(avg)));
        }
        if (scope === 'city' && (cityCampusTable?.length || 0) > 0) {
          const vals = cityCampusTable.map((r) =>
            Number(((r as any)?.[key] || 0) as number),
          );
          const avg =
            vals.length === 0
              ? 0
              : vals.reduce((a, b) => a + b, 0) / vals.length;
          return Math.max(0, Math.min(100, Math.round(avg)));
        }
        const vals = (data || [])
          .map((r) => Number(((r as any)?.[key] || 0) as number))
          .filter((v) => Number.isFinite(v));
        const avg =
          vals.length === 0
            ? 0
            : vals.reduce((a, b) => a + b, 0) / vals.length;
        return Math.max(0, Math.min(100, Math.round(avg)));
      };
      for (const day of days) {
        const nameToCount = new Map<string, number>();
        const nameToDept = new Map<string, string>();
        let total = 0;
        for (const sched of Object.values(schedules || {})) {
          const name = String(
            (sched as any)?.doctorName || (sched as any)?.doctorId || 'Doctor',
          );
          const dept = String((sched as any)?.doctorDepartment || '');
          const slots: any[] = ((sched as any)?.week?.[day]?.slots) || [];
          for (const s of slots) {
            if (!allowed.has(String(s.buildingId))) continue;
            if (wantFloor !== null && Number(s.floor) !== wantFloor) continue;
            if (wantRoom && String(s.room) !== String(wantRoom)) continue;
            nameToCount.set(name, (nameToCount.get(name) || 0) + 1);
            if (!nameToDept.has(name)) nameToDept.set(name, dept);
            total += 1;
          }
        }
        if (total > 0) {
          const dayOcc = occForDay(day);
          let items = Array.from(nameToCount.entries()).map(
            ([name, count]) => ({
              name,
              department: nameToDept.get(name) || '',
              percent: Math.round((count / total) * dayOcc),
            }),
          );
          const sum = items.reduce((a, b) => a + b.percent, 0);
          const diff = dayOcc - sum;
          if (diff !== 0 && items.length > 0) {
            items.sort((a, b) => b.percent - a.percent);
            items[0].percent = Math.max(0, items[0].percent + diff);
          }
          result.push({ day, items });
        } else if (useMock) {
          // Synthetic provider mix when no real schedule data is available.
          // We generate one mock provider per department so that every
          // department shows up in the ribbons/donut views.
          const mockDepartments = [
            'Cardiology',
            'Gastroenterology',
            'Neurology',
            'Oncology',
            'Orthopedics',
            'Pediatrics',
            'Primary Care',
            'Urology',
            'Dermatology',
            'Other',
          ];
          const deptToDoctor: Record<string, string> = {
            Cardiology: 'Dr. Patel',
            Gastroenterology: 'Dr. Rivera',
            Neurology: 'Dr. Gupta',
            Oncology: 'Dr. Brooks',
            Orthopedics: 'Dr. Lee',
            Pediatrics: 'Dr. Martinez',
            'Primary Care': 'Dr. Johnson',
            Urology: 'Dr. Chen',
            Dermatology: 'Dr. Shah',
            Other: 'Dr. Taylor',
          };
          const base =
            (typeof crumbs.floor === 'number' ? crumbs.floor : 0) * 17 +
            days.indexOf(day) * 11;
          const vals = mockDepartments.map(
            (_, i) => Math.abs(Math.cos(base + i * 7)) * 100 + 1,
          );
          const sum = vals.reduce((a, b) => a + b, 0) || 1;
          const dayOcc = occForDay(day);
          let items = mockDepartments.map((dept, i) => {
            const pct = Math.max(0, Math.round(((vals[i] / sum) * dayOcc)));
            const firstWord = String(dept).split(' ')[0] || 'Provider';
            const fallbackName = `Dr. ${firstWord}`;
            const name = deptToDoctor[dept] || fallbackName;
            return {
              name,
              department: dept,
              percent: pct,
            };
          });
          const s2 = items.reduce((a, b) => a + b.percent, 0);
          const d2 = dayOcc - s2;
          if (d2 !== 0 && items.length > 0) {
            items.sort((a, b) => b.percent - a.percent);
            items[0].percent = Math.max(0, items[0].percent + d2);
          }
          result.push({ day, items });
        } else {
          result.push({ day, items: [] });
        }
      }
      return result;
    } catch {
      return [];
    }
  }, [
    scope,
    crumbs.city,
    crumbs.campus,
    resolvedBuilding,
    crumbs.buildingId,
    crumbs.floor,
    roomFilter,
    data,
    useMock,
    selectedFloorSummaryRow,
    floorDailyTable,
    campusDailyTable,
    cityCampusTable,
  ]);

  const allDeptList = React.useMemo(() => {
    try {
      const schedules = loadSchedules() as Record<string, any>;
      const fromSchedules = new Set<string>();
      for (const sched of Object.values(schedules || {})) {
        const dep = String((sched as any)?.doctorDepartment || '').trim();
        if (dep) fromSchedules.add(dep);
      }
      const baseFallback = [
        'Cardiology',
        'Gastroenterology',
        'Urology',
        'Primary Care',
        'Neurology',
        'Orthopedics',
        'Oncology',
        'Pediatrics',
        'Dermatology',
      ];
      const merged = new Set<string>([...baseFallback, ...fromSchedules]);
      const arr = Array.from(merged)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      if (!arr.includes('Other')) arr.push('Other');
      return arr;
    } catch {
      return [
        'Cardiology',
        'Gastroenterology',
        'Urology',
        'Primary Care',
        'Neurology',
        'Orthopedics',
        'Oncology',
        'Pediatrics',
        'Dermatology',
        'Other',
      ];
    }
  }, [scopeDayBreakdown]);

  const scopeLabel = (() => {
    if (scope === 'city' && crumbs.city) return `City • ${crumbs.city}`;
    if (scope === 'campus' && crumbs.campus) return `Campus • ${crumbs.campus}`;
    if (scope === 'building' && crumbs.buildingName)
      return `Building • ${crumbs.buildingName}`;
    if (scope === 'floor' && typeof crumbs.floor === 'number')
      return `Floor ${crumbs.floor}`;
    return 'Current selection';
  })();

  return {
    data,
    loading,
    error,
    roomFilter,
    setRoomFilter,
    range,
    setRange,
    crumbs,
    setCrumbs,
    scope,
    setScope,
    drillFloor,
    setDrillFloor,
    fromDate,
    toDate,
    floorsCount,
    buildingMeta,
    campusBuildings,
    cityCampuses,
    cityCampusSeries,
    campusSeries,
    floorDailyTable,
    floorSeries,
    scopeDayBreakdown,
    allDeptList,
    scopeLabel,
    resolvedBuilding,
    syntheticRoomsForFloor,
    listRoomsForBuilding,
    providerView,
    setProviderView,
    doctorPopup,
    setDoctorPopup,
    openDoctorPopup,
    handleBack,
    handlePrint,
    handleExportCSV,
    handleExportExcel,
  };
}


