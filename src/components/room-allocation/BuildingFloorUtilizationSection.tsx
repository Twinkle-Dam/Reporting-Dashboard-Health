import React from 'react';
import { WeekTrendChart } from './UtilizationCharts';
import type { UtilRow } from './roomAllocationUtils';

interface BuildingFloorUtilizationSectionProps {
  scope: 'city' | 'campus' | 'building' | 'floor';
  floorDailyTable: UtilRow[];
  hasFloorSeries: boolean;
  buildingName?: string;
  drillFloor: number | null;
  resolvedBuildingId?: string;
  listRoomsForBuilding: (buildingId: string, floor: number) => Array<string | number>;
  onSelectFloor: (floor: number) => void;
  onSelectRoom: (floor: number, room: string | number) => void;
}

const BuildingFloorUtilizationSection: React.FC<BuildingFloorUtilizationSectionProps> = ({
  scope,
  floorDailyTable,
  hasFloorSeries,
  buildingName,
  drillFloor,
  resolvedBuildingId,
  listRoomsForBuilding,
  onSelectFloor,
  onSelectRoom,
}) => {
  if (scope !== 'building' || !hasFloorSeries) return null;

  return (
    <div className="mt-10 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200">
      <h3 className="mb-4 text-center text-xl font-semibold">Utilization by Floor</h3>
      <WeekTrendChart
        data={floorDailyTable as any}
        xKey="room"
        xLabel="Floors"
        heightClassName="h-72"
        onItemClick={(label) => {
          const f = Number(String(label).replace('Floor ', ''));
          if (f) onSelectFloor(f);
        }}
      />
      {drillFloor ? (
        <div className="mt-4">
          <div className="mb-2 text-center text-sm text-slate-700">
            Select a room on {buildingName || 'Building'} — Floor {drillFloor}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {(listRoomsForBuilding(resolvedBuildingId || '', drillFloor) || [])
              .slice(0, 6)
              .map((r) => (
                <button
                  key={String(r)}
                  type="button"
                  onClick={() => onSelectRoom(drillFloor, r)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
                >
                  Room {String(r)}
                </button>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BuildingFloorUtilizationSection;


