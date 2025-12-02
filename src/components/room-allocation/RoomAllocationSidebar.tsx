import React from 'react';

import UtilizationSummaryCards from './UtilizationSummaryCards';
import type { UtilRow } from './roomAllocationUtils';

type Scope = 'city' | 'campus' | 'building' | 'floor';

type Crumbs = {
  city?: string;
  campus?: string;
  buildingId?: string;
  buildingName?: string;
  floor?: number;
};

export interface RoomAllocationSidebarProps {
  scope: Scope;
  crumbs: Crumbs;
  buildingMeta: { floors?: number } | null | undefined;
  campusBuildings: any[];
  cityCampuses: string[];
  floorsCount?: number;
  roomFilter: string | null;
  scopeLabel: string;
  resolvedBuilding: any;
  summaryData: UtilRow[];
  syntheticRoomsForFloor: (floor: number, count?: number) => Array<string | number>;
  listRoomsForBuilding: (buildingId: string, floor: number) => Array<string | number>;
  setScope: (s: Scope) => void;
  setCrumbs: React.Dispatch<React.SetStateAction<Crumbs>>;
  setRoomFilter: (v: string | null) => void;
  setDrillFloor: (v: number | null) => void;
}

const RoomAllocationSidebar: React.FC<RoomAllocationSidebarProps> = ({
  scope,
  crumbs,
  buildingMeta,
  campusBuildings,
  cityCampuses,
  floorsCount,
  roomFilter,
  scopeLabel,
  summaryData,
  resolvedBuilding,
  syntheticRoomsForFloor,
  listRoomsForBuilding,
  setScope,
  setCrumbs,
  setRoomFilter,
  setDrillFloor,
}) => {
  return (
    <div className="space-y-4">
      {/* Campus building selector (dropdown) */}
      {crumbs.campus &&
      campusBuildings.length > 0 &&
      (scope === 'campus' || (!resolvedBuilding && (crumbs.floor === undefined || crumbs.floor === null))) ? (
        <div className="mt-3 flex items-center justify-center gap-2">
          <label className="text-sm text-slate-600">Building</label>
          <select
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm"
            value={String(crumbs.buildingId || '')}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                setScope('campus');
                setCrumbs((c) => ({
                  ...c,
                  buildingId: undefined,
                  buildingName: undefined,
                  floor: undefined,
                }));
                setRoomFilter(null);
                setDrillFloor(null);
              } else {
                const b = (campusBuildings as any[]).find(
                  (x) => String((x as any).id) === String(val),
                );
                setScope('building');
                setCrumbs((c) => ({
                  ...c,
                  buildingId: String(val),
                  buildingName: String((b as any)?.name || ''),
                  floor: undefined,
                }));
                setRoomFilter(null);
                setDrillFloor(null);
              }
            }}
          >
            <option value="">All Buildings</option>
            {(campusBuildings as any[]).map((b) => (
              <option key={(b as any).id} value={(b as any).id}>
                {String((b as any).name)}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {/* Floor selector (dropdown) + Room selector inline when on a floor */}
      {floorsCount ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Floor</label>
            <select
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm"
              value={typeof crumbs.floor === 'number' ? String(crumbs.floor) : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setScope('building');
                  setCrumbs((c) => ({ ...c, floor: undefined }));
                  setRoomFilter(null);
                  setDrillFloor(null);
                } else {
                  const f = Number(val);
                  setScope('floor');
                  setCrumbs((c) => ({ ...c, floor: f }));
                  setRoomFilter(null);
                  setDrillFloor(null);
                }
              }}
            >
              <option value="">All Floors</option>
              {Array.from({ length: floorsCount }).map((_, idx) => {
                const f = idx + 1;
                return (
                  <option key={f} value={String(f)}>
                    Floor {f}
                  </option>
                );
              })}
            </select>
          </div>
          {scope === 'floor' && resolvedBuilding && typeof crumbs.floor === 'number' ? (
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Room</label>
              <select
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm"
                value={roomFilter || ''}
                onChange={(e) => setRoomFilter(e.target.value || null)}
              >
                <option value="">All Rooms</option>
                {(() => {
                  let list: Array<string | number> = [];
                  try {
                    list =
                      listRoomsForBuilding((resolvedBuilding as any).id, crumbs.floor) || [];
                  } catch {
                    list = [];
                  }
                  if (!list || (list as any[]).length === 0) {
                    list = syntheticRoomsForFloor(crumbs.floor);
                  }
                  // Show all discovered rooms for this floor so any room can be selected.
                  return list.map((r: any) => (
                    <option key={String(r)} value={String(r)}>
                      Room {String(r)}
                    </option>
                  ));
                })()}
              </select>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* City campus selector (dropdown) */}
      {crumbs.city && cityCampuses.length > 0 && scope === 'city' ? (
        <div className="mt-3 flex items-center justify-center gap-2">
          <label className="text-sm text-slate-600">Campus</label>
          <select
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm"
            value={String(crumbs.campus || '')}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                setScope('city');
                setCrumbs((c) => ({
                  ...c,
                  campus: undefined,
                  buildingId: undefined,
                  buildingName: undefined,
                  floor: undefined,
                }));
              } else {
                setScope('campus');
                setCrumbs((c) => ({
                  ...c,
                  campus: val,
                  buildingId: undefined,
                  buildingName: undefined,
                  floor: undefined,
                }));
              }
              setRoomFilter(null);
              setDrillFloor(null);
            }}
          >
            <option value="">All Campuses</option>
            {cityCampuses.map((camp) => (
              <option key={camp} value={camp}>
                {camp}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {/* High-level summary cards (stacked vertically) */}
      <UtilizationSummaryCards data={summaryData} scopeLabel={scopeLabel} />
    </div>
  );
};

export default RoomAllocationSidebar;


