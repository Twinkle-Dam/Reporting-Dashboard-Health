import { useEffect } from 'react';
import { BUILDINGS } from '../../../data/buildings';
import { Crumbs, Scope } from './useAllocationFilters';

export function useDeepLinkSync(
  setRoomKey: (v: string | null) => void,
  setRoomFilter: (v: string | null) => void,
  setRange: (v: { from?: string; to?: string }) => void,
  setFromDate: (v: string) => void,
  setToDate: (v: string) => void,
  setUseMock: (v: boolean) => void,
  setCrumbs: React.Dispatch<React.SetStateAction<Crumbs>>,
  setScope: React.Dispatch<React.SetStateAction<Scope>>,
  fromDate: string,
  toDate: string,
  range: { from?: string; to?: string },
  roomFilter: string | null
) {
  useEffect(() => {
    try {
      const hash = window.location.hash || '';
      const qIndex = hash.indexOf('?');
      if (qIndex >= 0) {
        const query = hash.slice(qIndex + 1);
        const params = new URLSearchParams(query);
        const roomLabel = params.get('room') ? decodeURIComponent(params.get('room')!) : null;
        const roomKeyParam = params.get('roomKey')
          ? decodeURIComponent(params.get('roomKey')!)
          : null;
        const from = params.get('from') || undefined;
        const to = params.get('to') || undefined;
        const cityParam = params.get('city') || undefined;
        const campusParam = params.get('campus') || undefined;
        const buildingIdParam = params.get('buildingId') || undefined;
        const buildingNameParam = params.get('buildingName') || undefined;
        const floorParam = params.get('floor');
        const mockParam = params.get('mock');
        if (roomKeyParam) setRoomKey(roomKeyParam);
        if (roomLabel || roomKeyParam) setRoomFilter(roomLabel || roomKeyParam);

        const newRange = { from, to };
        setRange(newRange);
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
            floor: floorParam ? Number(floorParam) : c.floor, // Keep existing floor if not in URL? No, default undefined.
          }));
          // Actually original logic:
          // floor: floorParam ? Number(floorParam) : undefined,
          if (floorParam) {
            setCrumbs((c) => ({ ...c, floor: Number(floorParam) }));
          }
        }
        if ((roomLabel || roomKeyParam) && !floorParam) {
          const numericSource = roomLabel || roomKeyParam;
          const inferred = parseInt(numericSource || '', 10);
          if (!Number.isNaN(inferred) && inferred >= 100) {
            const f = Math.floor(inferred / 100);
            setCrumbs((c) => ({ ...c, floor: f }));
          }
        }
        if (roomLabel || roomKeyParam) {
          setScope('floor');
        }
        if ((buildingIdParam || buildingNameParam) && !floorParam && !(roomLabel || roomKeyParam)) {
          setScope('building');
        } else if (
          campusParam &&
          !buildingIdParam &&
          !buildingNameParam &&
          !(roomLabel || roomKeyParam)
        ) {
          setScope('campus');
        } else if (
          cityParam &&
          !campusParam &&
          !buildingIdParam &&
          !buildingNameParam &&
          !(roomLabel || roomKeyParam)
        ) {
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
          const building = s.buildingId
            ? (BUILDINGS as any[]).find((b) => b.id === s.buildingId)
            : null;
          setCrumbs((prev) => ({
            city: typeof prev.city !== 'undefined' ? prev.city : s.city,
            campus: typeof prev.campus !== 'undefined' ? prev.campus : s.campus,
            buildingId: typeof prev.buildingId !== 'undefined' ? prev.buildingId : s.buildingId,
            buildingName:
              typeof prev.buildingName !== 'undefined'
                ? prev.buildingName
                : building?.name || s.buildingId || undefined,
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
            // Need to update range if it wasn't set by URL
            if (s.from || s.to) setRange({ from: range.from || s.from, to: range.to || s.to });
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
  }, []); // Run once on mount
}
