import { useMemo } from 'react';
import { BUILDINGS } from '../../../data/buildings';
import { Crumbs, Scope } from './useAllocationFilters';

export function useScopedRooms(
  scope: Scope,
  crumbs: Crumbs,
  resolvedBuilding: any,
  roomFilter: string | null,
  listRoomsForBuilding: (id: string, f: number) => Array<string | number>,
  buildingMeta: any
) {
  const syntheticRoomsForFloor = (floor: number, count: number = 6): number[] => {
    return Array.from({ length: count }).map((_, i) => floor * 100 + (i + 1));
  };

  return useMemo((): Array<string | number> => {
    try {
      if (roomFilter) return [roomFilter];
      const MAX = 12;
      const out: Array<string | number> = [];
      if (
        (scope === 'floor' || (resolvedBuilding && typeof crumbs.floor === 'number')) &&
        resolvedBuilding &&
        typeof crumbs.floor === 'number'
      ) {
        let list: Array<string | number> = (listRoomsForBuilding(
          (resolvedBuilding as any).id,
          crumbs.floor
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
        const floors = Number(buildingMeta?.floors || b?.floors || 5);
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
  }, [
    roomFilter,
    scope,
    crumbs.city,
    crumbs.campus,
    crumbs.buildingId,
    crumbs.floor,
    listRoomsForBuilding,
    resolvedBuilding,
    buildingMeta,
  ]);
}
