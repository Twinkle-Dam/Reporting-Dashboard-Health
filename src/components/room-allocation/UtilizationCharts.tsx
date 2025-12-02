import React, { useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type UtilRowLike = {
  room: string | number;
  month: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
};

type UtilizationChartsProps = {
  data: UtilRowLike[];
  children?: React.ReactNode;
};

const DAYS: Array<keyof UtilRowLike> = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold text-slate-800 mb-1">{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-600">{entry.name}</span>
          </span>
          <span className="font-semibold text-slate-900">{Number(entry.value).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
};

type WeekTrendChartProps = {
  data: Array<{
    [key: string]: any;
    monday: number;
    tuesday: number;
    wednesday: number;
    thursday: number;
    friday: number;
  }>;
  xKey: string;
  xLabel: string;
  heightClassName?: string;
  onItemClick?: (label: string, rawEvent: any) => void;
};

export const WeekTrendChart: React.FC<WeekTrendChartProps> = ({
  data,
  xKey,
  xLabel,
  heightClassName = 'h-80',
  onItemClick,
}) => {
  const handleClick = (e: any) => {
    if (!onItemClick) return;
    try {
      const label =
        e?.activeLabel ||
        e?.activePayload?.[0]?.payload?.[xKey] ||
        (typeof e?.activePayload?.[0]?.payload?.room !== 'undefined'
          ? e.activePayload[0].payload.room
          : undefined);
      if (!label) return;
      onItemClick(String(label), e);
    } catch {
      // ignore
    }
  };

  return (
    <div className={heightClassName}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} onClick={handleClick}>
          <defs>
            <linearGradient id="monArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#0f172a" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="tueArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#0f172a" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="wedArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#0f172a" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="thuArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#0f172a" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="friArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eab308" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#0f172a" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey={xKey}
            stroke="#64748b"
            label={{
              value: xLabel,
              position: 'insideBottom',
              offset: -5,
              style: { fill: '#0f172a', fontSize: 13, fontWeight: 600 },
            }}
          />
          <YAxis
            stroke="#64748b"
            tickFormatter={(v) => `${v}%`}
            label={{
              value: 'Utilisation',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#0f172a', fontSize: 13, fontWeight: 600 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="monday"
            name="Monday"
            stroke="#34d399"
            fill="url(#monArea)"
            strokeWidth={2}
            fillOpacity={0.5}
            isAnimationActive
            animationDuration={800}
          />
          <Area
            type="monotone"
            dataKey="tuesday"
            name="Tuesday"
            stroke="#60a5fa"
            fill="url(#tueArea)"
            strokeWidth={2}
            fillOpacity={0.4}
          />
          <Area
            type="monotone"
            dataKey="wednesday"
            name="Wednesday"
            stroke="#a855f7"
            fill="url(#wedArea)"
            strokeWidth={2}
            fillOpacity={0.35}
          />
          <Area
            type="monotone"
            dataKey="thursday"
            name="Thursday"
            stroke="#f97316"
            fill="url(#thuArea)"
            strokeWidth={2}
            fillOpacity={0.3}
          />
          <Area
            type="monotone"
            dataKey="friday"
            name="Friday"
            stroke="#eab308"
            fill="url(#friArea)"
            strokeWidth={2}
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const UtilizationCharts: React.FC<UtilizationChartsProps> = ({ data, children }) => {
  const safe = data || [];

  const roomLines = useMemo(
    () =>
      safe.map((row) => ({
        room: String(row.room),
        monday: Number((row as any).monday || 0),
        tuesday: Number((row as any).tuesday || 0),
        wednesday: Number((row as any).wednesday || 0),
        thursday: Number((row as any).thursday || 0),
        friday: Number((row as any).friday || 0),
      })),
    [safe],
  );

  const [roomView, setRoomView] = useState<'graph' | 'table'>('graph');

  return (
    <div className="mt-0 lg:mt-1 space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-white p-4 text-slate-900 shadow-xl ring-1 ring-slate-200 transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl">
        <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-gradient-to-br from-emerald-400/35 via-sky-400/35 to-violet-500/25 blur-2xl opacity-90" />
        <div className="relative mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-slate-900">Average utilization per room</div>
            <div className="text-xs text-slate-600">
              Each curve is a weekday; hover a room to see exact Mon–Fri utilization.
            </div>
          </div>
          <div className="inline-flex rounded-full bg-violet-50 p-1 text-xs">
            <button
              type="button"
              className={`px-3 py-1 rounded-full font-medium ${
                roomView === 'graph'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-violet-700 hover:text-violet-900'
              }`}
              onClick={() => setRoomView('graph')}
            >
              Graph
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-full font-medium ${
                roomView === 'table'
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-violet-700 hover:text-violet-900'
              }`}
              onClick={() => setRoomView('table')}
            >
              Table
            </button>
          </div>
        </div>

        {roomView === 'graph' ? (
          <WeekTrendChart data={roomLines as any} xKey="room" xLabel="Rooms" />
        ) : (
          <div className="max-h-80 overflow-auto rounded-2xl bg-white border border-blue-100 shadow-inner">
            <table className="min-w-full text-xs">
              <thead className="bg-blue-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Room</th>
                  <th className="px-3 py-2 text-left font-semibold">Mon</th>
                  <th className="px-3 py-2 text-left font-semibold">Tue</th>
                  <th className="px-3 py-2 text-left font-semibold">Wed</th>
                  <th className="px-3 py-2 text-left font-semibold">Thu</th>
                  <th className="px-3 py-2 text-left font-semibold">Fri</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {roomLines.map((row) => (
                  <tr key={row.room} className="hover:bg-blue-50/70">
                    <td className="px-3 py-2 text-slate-800 font-medium whitespace-nowrap">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                        Room {row.room}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.monday.toFixed(0)}%</td>
                    <td className="px-3 py-2 text-slate-700">{row.tuesday.toFixed(0)}%</td>
                    <td className="px-3 py-2 text-slate-700">{row.wednesday.toFixed(0)}%</td>
                    <td className="px-3 py-2 text-slate-700">{row.thursday.toFixed(0)}%</td>
                    <td className="px-3 py-2 text-slate-700">{row.friday.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {children ? (
          <div className="mt-8 rounded-2xl bg-slate-950/40 p-4 sm:p-5 border border-slate-800/80">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default UtilizationCharts;


