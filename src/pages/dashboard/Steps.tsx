import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { Badge, colorForKey, rgba, dateKey, seededPercent } from '../dashboardShared';

const formatCount = (count: number, singular: string, plural?: string) => {
  const safeCount = Number.isFinite(count) ? count : 0;
  const label = safeCount === 1 ? singular : plural ?? `${singular}s`;
  return `${safeCount} ${label}`;
};

const CityIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="h-5 w-5"
    style={{ color }}
  >
    <rect x="3" y="9" width="6" height="11" rx="1.5" fill="currentColor" opacity={0.18} />
    <rect x="9" y="5" width="6" height="15" rx="1.5" fill="currentColor" opacity={0.3} />
    <rect x="15" y="11" width="6" height="9" rx="1.5" fill="currentColor" opacity={0.5} />
    <circle cx="6" cy="12" r="0.9" fill="currentColor" />
    <circle cx="12" cy="8" r="0.9" fill="currentColor" />
    <circle cx="12" cy="12" r="0.9" fill="currentColor" />
    <circle cx="18" cy="14" r="0.9" fill="currentColor" />
  </svg>
);

// Simple alias so we can semantically distinguish the building count icon
// while reusing the existing city skyline SVG.
const BuildingIcon: React.FC<{ color: string }> = CityIcon;

const CampusIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="h-5 w-5"
    style={{ color }}
  >
    <path
      d="M4 10.5 12 6l8 4.5-8 4.5-8-4.5Z"
      fill="currentColor"
      opacity={0.16}
    />
    <path
      d="M6 11.5v4.25C6 17.1 8.69 18.5 12 18.5s6-1.4 6-2.75V11.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.8}
    />
    <circle cx="12" cy="11.25" r="1.05" fill="currentColor" />
  </svg>
);

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
  /**
   * Called when a floor is selected.
   * - floorNumber: human-friendly floor number (1, 2, 3, ...)
   * - floorId: VM_GetLocationHierarchy FloorId when available
   */
  onSelectFloor: (floorNumber: number, floorId?: string) => void;
};

export function CityView({ cities, onSelectCity }: CityViewProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-slate-900 text-base font-semibold">Select City</div>
          {/* <div className="text-slate-600 text-xs">Choose a city</div> */}
        </div>
        <Badge>{formatCount(cities.length, 'city', 'cities')}</Badge>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {cities.map((c: any) => {
          const accent = colorForKey(c.name);
          return (
            <button
              key={c.name}
              onClick={() => onSelectCity(c.name)}
              className="flex min-w-[130px] max-w-[150px] flex-col justify-between rounded-lg px-3 py-2 text-left hover:shadow-sm"
              style={{
                border: `1px solid ${accent}`,
                backgroundColor: rgba(accent, 0.08),
              }}
            >
              <div className="flex items-start">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold" style={{ color: accent }}>
                    {c.name}
                  </div>
                <div className="text-xs text-slate-600 flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <CampusIcon color={accent} />
                    <span>{Number.isFinite(c.campuses) ? c.campuses : 0}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <BuildingIcon color={accent} />
                    <span>{Number.isFinite(c.buildings) ? c.buildings : 0}</span>
                  </span>
                </div>
                </div>
              </div>
              <span
                className="mt-2 inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium text-white"
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

export function CampusView({ city, campuses, onSelectCampus }: CampusViewProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-slate-900 text-base font-semibold">Select Campus</div>
          <div className="text-slate-600 text-sm">City: {city}</div>
        </div>
        <Badge>{formatCount(campuses.length, 'campus', 'campuses')}</Badge>
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
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/80">
                  <CampusIcon color={accent} />
                </span>
                <div>
                  <div className="font-medium" style={{ color: accent }}>
                    {camp.name}
                  </div>
                  <div className="text-xs text-slate-600">
                    {formatCount(camp.buildings, 'building')}
                  </div>
                </div>
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
        <Badge>{formatCount(buildings.length, 'building')}</Badge>
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
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/80">
                  <CityIcon color={accent} />
                </span>
                <div>
                  <div className="font-medium" style={{ color: accent }}>
                    {b.name}
                  </div>
                  <div className="text-xs text-slate-600">
                    {b.campus} • {b.address}
                  </div>
                </div>
              </div>
              {b.phone ? <div className="mt-0.5 text-xs text-slate-700">{b.phone}</div> : null}
              <div className="mt-2 inline-flex items-center justify-center rounded-full px-2 py-1 text-[11px] font-semibold text-slate-900/80 bg-white/80">
                {formatCount(b.floors.length, 'floor')}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BuildingView({ building, onSelectFloor }: BuildingViewProps) {
  // Map floor number -> array of LocationHierarchyRow-style details (when available)
  const floorDetailsByNumber = React.useMemo(() => {
    try {
      const rows = Array.isArray((building as any)?.floorDetails)
        ? ((building as any).floorDetails as any[])
        : [];
      const map = new Map<number, any[]>();
      for (const row of rows) {
        const num = Number((row as any)?.FloorNumber ?? NaN);
        if (!Number.isFinite(num)) continue;
        if (!map.has(num)) map.set(num, []);
        map.get(num)!.push(row);
      }
      return map;
    } catch {
      return new Map<number, any[]>();
    }
  }, [building]);

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
        <Badge>{formatCount(building.floors.length, 'floor')}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {building.floors.map((f: number) => {
          const rows = floorDetailsByNumber.get(f) || [];
          const first = rows[0] || {};
          const name = first.FloorName ? String(first.FloorName) : null;
          const id = first.FloorId ? String(first.FloorId) : null;
          const buildingId = first.BuildingId ? String(first.BuildingId) : null;
          const parts: string[] = [];
          if (name) parts.push(`Name: ${name}`);
          if (id) parts.push(`FloorId: ${id}`);
          if (buildingId) parts.push(`BuildingId: ${buildingId}`);
          const tooltip = parts.join(' • ');

          return (
            <button
              key={f}
              onClick={() => onSelectFloor(f, id || undefined)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800 hover:bg-white hover:shadow text-left"
              title={tooltip}
            >
              <div className="flex flex-col">
                <span className="font-semibold">Floor {f}</span>
                
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const DAY_COLORS: Record<string, string> = {
  Mon: '#ec4899',
  Tue: '#06b6d4',
  Wed: '#6366f1',
  Thu: '#f97316',
  Fri: '#eab308',
};

type FloorMiniTrendPoint = {
  day: string;
  value: number;
};

type FloorMiniTrendCardProps = {
  floor: number;
  avgUtilization: number;
  points: FloorMiniTrendPoint[];
  onClick?: () => void;
};

const FloorMiniTrendCard: React.FC<FloorMiniTrendCardProps> = ({
  floor,
  avgUtilization,
  points,
  onClick,
}) => {
  const renderDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (typeof cx !== 'number' || typeof cy !== 'number') return null;
    const color = DAY_COLORS[payload?.day as keyof typeof DAY_COLORS] || '#6366f1';
    return (
      <g>
        <circle cx={cx} cy={cy} r={5} fill="#ffffff" opacity={0.9} />
        <circle cx={cx} cy={cy} r={4} fill={color} />
      </g>
    );
  };

  const tooltipContent = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const point = payload[0]?.payload;
    if (!point) return null;
    const color = DAY_COLORS[point.day as keyof typeof DAY_COLORS] || '#6366f1';
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-md">
        <div className="font-semibold text-slate-900">{point.day}</div>
        <div className="flex items-center gap-2 text-slate-600">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          {point.value}%
        </div>
      </div>
    );
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 sm:p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-slate-900">Floor {floor}</div>
          <div className="mt-0.5 text-xs text-slate-500">Tap to drill into schedule</div>
        </div>
        <div className="text-right text-xs font-semibold text-slate-900">
          <div>{avgUtilization}% avg</div>
        </div>
      </div>
      <div className="mt-3 h-24 sm:h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ left: 12, right: 6 }}>
            <defs>
              <linearGradient id="floorTrendStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="25%" stopColor="#06b6d4" />
                <stop offset="50%" stopColor="#6366f1" />
                <stop offset="75%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
              interval={0}
            />
            <YAxis hide />
            <Tooltip cursor={false} content={tooltipContent} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="url(#floorTrendStroke)"
              strokeWidth={2.5}
              dot={renderDot}
              activeDot={(props) =>
                renderDot({
                  ...props,
                  payload: props.payload,
                  cx: props.cx,
                  cy: props.cy,
                })
              }
              isAnimationActive
              animationDuration={600}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </button>
  );
};

type BuildingFloorTrendProps = {
  building: any;
  dateFrom: string;
  dateTo: string;
  /**
   * Called when a floor is selected from the trend chart.
   * - floorNumber: human-friendly floor number (1, 2, 3, ...)
   * - floorId: VM_GetLocationHierarchy FloorId when available
   */
  onSelectFloor?: (floorNumber: number, floorId?: string) => void;
};

export function BuildingFloorTrend({ building, dateFrom, dateTo, onSelectFloor }: BuildingFloorTrendProps) {
  // Rebuild the same floor-number -> details map that BuildingView uses so we can
  // look up the real FloorId for each floor when wiring callbacks.
  const floorDetailsByNumber = React.useMemo(() => {
    try {
      const rows = Array.isArray((building as any)?.floorDetails)
        ? ((building as any).floorDetails as any[])
        : [];
      const map = new Map<number, any[]>();
      for (const row of rows) {
        const num = Number((row as any)?.FloorNumber ?? NaN);
        if (!Number.isFinite(num)) continue;
        if (!map.has(num)) map.set(num, []);
        map.get(num)!.push(row);
      }
      return map;
    } catch {
      return new Map<number, any[]>();
    }
  }, [building]);

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
        const rowsForFloor = floorDetailsByNumber.get(floor) || [];
        const first = rowsForFloor[0] || {};
        const floorId: string | undefined = first.FloorId ? String(first.FloorId) : undefined;

        let sum = 0;
        for (let i = 1; i <= roomsPerFloor; i++) {
          // Use a composite seed that incorporates the real FloorId when available
          // so that utilization patterns are stable per VM floor row instead of
          // relying solely on a synthetic floor * 100 + i value.
          const baseKey =
            floorId != null
              ? floorId
              : `${building?.id || building?.name || 'uh'}-${floor}-${i}`;
          let hash = 0;
          for (let idx = 0; idx < baseKey.length; idx++) {
            hash = (hash * 31 + baseKey.charCodeAt(idx)) | 0;
          }
          const roomNumber = Math.abs(hash) || floor * 100 + i;

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
          floorId,
          label: `Floor ${floor}`,
          utilization: avg,
        };
      });
  }, [building, dateFrom, dateTo, floorDetailsByNumber]);

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

  const floorCards = React.useMemo(() => {
    if (trendData.length === 0) return [];
    const seasonal = [-6, -2, 1, 4, 2];
    return trendData.map((item, index) => {
      const base = item.utilization;
      const seed = ((building?.id?.length || 1) + index) * 17;
      const points: FloorMiniTrendPoint[] = (['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const).map(
        (label, dayIdx) => {
          const noise = (seededPercent(seed + dayIdx * 13) - 50) * 0.12;
          const value = clamp(base + seasonal[dayIdx] + noise);
          return { day: label, value };
        }
      );
      return {
        floor: item.floor,
        floorId: item.floorId,
        avgUtilization: item.utilization,
        points,
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
        <Badge>{formatCount(building?.floors?.length || 0, 'floor')}</Badge>
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

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {floorCards
          .slice(0, 4)
          .sort((a, b) => a.floor - b.floor)
          .map((card) => (
            <FloorMiniTrendCard
              key={card.floor}
              floor={card.floor}
              avgUtilization={card.avgUtilization}
              points={card.points}
              onClick={() => onSelectFloor && onSelectFloor(card.floor, card.floorId)}
            />
          ))}
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
