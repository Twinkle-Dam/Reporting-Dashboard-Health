import React from 'react';
import { Badge, colorForKey, rgba, dateKey, seededPercent } from '../dashboardShared';
import { WeekTrendChart } from '../../components/room-allocation/UtilizationCharts';

type CityViewProps = {
  cities: any[];
  onSelectCity: (cityName: string) => void;
};

type CampusViewProps = {
  city: string;
  campuses: any[];
  onSelectCampus: (campusName: string) => void;
};

type BuildingsListProps = {
  buildings: any[];
  onSelectBuilding: (b: any) => void;
};

type BuildingViewProps = {
  building: any;
  onSelectFloor: (floor: number) => void;
};

export function CityView({ cities, onSelectCity }: CityViewProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-slate-900 text-base font-semibold">Select City</div>
          <div className="text-slate-600 text-xs">Choose a city</div>
        </div>
        <Badge>{cities.length} cities</Badge>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {cities.map((c: any) => (
          <button
            key={c.name}
            onClick={() => onSelectCity(c.name)}
            className="flex min-w-[120px] max-w-[140px] flex-col justify-between rounded-lg px-3 py-2 text-left hover:shadow-sm"
            style={{
              border: `1px solid ${colorForKey(c.name)}`,
              backgroundColor: rgba(colorForKey(c.name), 0.08),
            }}
          >
            <div className="space-y-0.5">
              <div className="text-sm font-semibold" style={{ color: colorForKey(c.name) }}>
                {c.name}
              </div>
              <div className="text-xs text-slate-600">
                {c.campuses} campuses • {c.buildings} buildings
              </div>
            </div>
            <span
              className="mt-1 inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: colorForKey(c.name) }}
            >
              Select
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function CampusView({ city, campuses, onSelectCampus }: CampusViewProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-slate-900 text-base font-semibold">Select Campus</div>
          <div className="text-slate-600 text-sm">City: {city}</div>
        </div>
        <Badge>{campuses.length} campuses</Badge>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {campuses.map((camp: any) => {
          const accent = colorForKey(`${city}-${camp.name}`);
          return (
            <button
              key={camp.name}
              onClick={() => onSelectCampus(camp.name)}
              className="flex items-center justify-between rounded-lg px-4 py-3 text-left cursor-pointer transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                border: `1px solid ${accent}`,
                backgroundColor: rgba(accent, 0.08),
              }}
            >
              <div>
                <div className="font-medium" style={{ color: accent }}>
                  {camp.name}
                </div>
                <div className="text-xs text-slate-600">{camp.buildings} buildings</div>
              </div>
              <span
                className="ml-3 rounded-md px-2 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                Select
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BuildingsList({ buildings, onSelectBuilding }: BuildingsListProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-slate-900 text-base font-semibold">Select Building</div>
          <div className="text-slate-600 text-sm">Choose a building to view floors</div>
        </div>
        <Badge>{buildings.length} buildings</Badge>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {buildings.map((b: any) => {
          const accent = colorForKey(`${b.campus}-${b.name}`);
          return (
            <button
              key={b.id}
              onClick={() => onSelectBuilding(b)}
              className="rounded-lg px-4 py-3 text-left transition hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                border: `1px solid ${accent}`,
                backgroundColor: rgba(accent, 0.08),
              }}
            >
              <div className="font-medium" style={{ color: accent }}>
                {b.name}
              </div>
              <div className="text-xs text-slate-600">
                {b.campus} • {b.address}
              </div>
              {b.phone ? <div className="mt-0.5 text-xs text-slate-700">{b.phone}</div> : null}
              <div className="mt-2 inline-flex items-center justify-center rounded-full px-2 py-1 text-[11px] font-semibold text-slate-900/80 bg-white/80">
                {b.floors.length} floors
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BuildingView({ building, onSelectFloor }: BuildingViewProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-slate-900 text-base font-semibold">{building.name}</div>
          <div className="text-slate-600 text-sm">
            {building.campus} • {building.address}
          </div>
          {building.phone ? (
            <div className="mt-0.5 text-xs text-slate-600">{building.phone}</div>
          ) : null}
        </div>
        <Badge>{building.floors.length} floors</Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {building.floors.map((f: number) => (
          <button
            key={f}
            onClick={() => onSelectFloor(f)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800 hover:bg-white hover:shadow"
          >
            Floor {f}
          </button>
        ))}
      </div>
    </div>
  );
}

type BuildingFloorTrendProps = {
  building: any;
  dateFrom: string;
  dateTo: string;
  onSelectFloor?: (floor: number) => void;
};

export function BuildingFloorTrend({ building, dateFrom, dateTo, onSelectFloor }: BuildingFloorTrendProps) {
  const trendData = React.useMemo(() => {
    if (!building?.floors || (building.floors as number[]).length === 0) return [];
    const normalize = (value?: string) => (dateKey(value) || '0').replace(/-/g, '');
    const fromNum = parseInt(normalize(dateFrom), 10) || 0;
    const toNum = parseInt(normalize(dateTo || dateFrom), 10) || fromNum;
    const daySpan = Math.max(1, Math.min(7, Math.abs(toNum - fromNum) || 1));
    const seedBase = String(building?.id || building?.name || 'uh').length;
    const roomsPerFloor = 24;

    return (building.floors as number[])
      .slice()
      .sort((a: number, b: number) => a - b)
      .map((floor: number) => {
        let sum = 0;
        for (let i = 1; i <= roomsPerFloor; i++) {
          const roomNumber = floor * 100 + i;
          let pct = 0;
          for (let day = 0; day < daySpan; day++) {
            pct += seededPercent(roomNumber * 13 + day * 17 + seedBase + floor);
          }
          pct = Math.round(pct / daySpan);
          sum += pct;
        }
        const avg = roomsPerFloor ? Math.round(sum / roomsPerFloor) : 0;
        return {
          floor,
          label: `Floor ${floor}`,
          utilization: avg,
        };
      });
  }, [building, dateFrom, dateTo]);

  const highlight = React.useMemo(() => {
    if (trendData.length === 0) return null;
    const sorted = [...trendData].sort((a, b) => b.utilization - a.utilization);
    return {
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      avg:
        Math.round(
          sorted.reduce((sum, item) => sum + item.utilization, 0) / sorted.length
        ) || 0,
    };
  }, [trendData]);

  const clamp = React.useCallback((value: number) => Math.max(5, Math.min(98, Math.round(value))), []);

  const chartData = React.useMemo(() => {
    if (trendData.length === 0) return [];
    const seasonal = [-6, -2, 1, 4, 2];
    return trendData.map((item, index) => {
      const base = item.utilization;
      const seed = ((building?.id?.length || 1) + index) * 17;
      const daily: Record<string, number> = {};
      (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const).forEach((day, dayIdx) => {
        const noise = (seededPercent(seed + dayIdx * 13) - 50) * 0.12;
        daily[day] = clamp(base + seasonal[dayIdx] + noise);
      });
      return {
        label: item.label,
        ...daily,
      };
    });
  }, [trendData, building?.id, clamp]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm h-full flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-slate-900 text-base font-semibold">Floor utilization trend</div>
          <div className="text-slate-600 text-sm">Average room occupancy by floor</div>
        </div>
        <Badge>{building?.floors?.length || 0} floors</Badge>
      </div>

      {highlight ? (
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-700">
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-slate-500">Best</div>
            <div className="text-slate-900 font-semibold">
              Floor {highlight.best.floor}{' '}
              <span className="text-slate-600 font-medium">{highlight.best.utilization}%</span>
            </div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
            <div className="text-xs uppercase tracking-wide text-slate-500">Average</div>
            <div className="text-slate-900 font-semibold">{highlight.avg}%</div>
          </div>
        </div>
      ) : (
        <div className="mt-4 text-sm text-slate-500">No utilization data available.</div>
      )}

      <div className="mt-4">
        <WeekTrendChart
          data={chartData as any}
          xKey="label"
          xLabel="Floors"
          heightClassName="h-56"
          onItemClick={(label) => {
            if (!onSelectFloor) return;
            const floorNumber = Number(String(label).replace(/\D+/g, ''));
            if (!Number.isNaN(floorNumber)) {
              onSelectFloor(floorNumber);
            }
          }}
        />
      </div>

      {/* <div className="mt-4 space-y-2">
        {trendData.map((item) => (
          <button
            key={item.floor}
            type="button"
            onClick={() => onSelectFloor && onSelectFloor(item.floor)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <span className="font-semibold">Floor {item.floor}</span>
            <span className="text-slate-600">{item.utilization}%</span>
          </button>
        ))}
      </div> */}
    </div>
  );
}
