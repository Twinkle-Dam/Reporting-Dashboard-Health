import React from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { colorForKey, hexToRgba } from '../dashboardShared';

export type PerformerItem = {
  id: string;
  label: string;
  avgUtil: number;
  color?: string;
};

export type TopBottomPerformersMode = 'bars' | 'multi';

export interface TopBottomPerformersCardProps {
  top: PerformerItem[];
  bottom: PerformerItem[];
  /** Overall average utilization across all cities (used for the all‑cities trend card) */
  overallAvgUtil?: number;
  mode?: TopBottomPerformersMode;
  onChangeMode?: (mode: TopBottomPerformersMode) => void;
}

export function TopBottomPerformersCard({
  top,
  bottom,
  overallAvgUtil,
  mode = 'multi',
  onChangeMode,
}: TopBottomPerformersCardProps) {
  const best = top && top.length > 0 ? top[0] : null;
  const bestPct = best ? Math.max(0, Math.min(100, best.avgUtil)) : 0;
  const bestColor = best?.color || colorForKey(best?.label || '');
  const worst = bottom && bottom.length > 0 ? bottom[0] : null;
  const worstPct = worst ? Math.max(0, Math.min(100, worst.avgUtil)) : 0;
  const worstColor = worst?.color || colorForKey(worst?.label || '');

  const buildTrendLines = (items: Array<{ label: string; avgUtil: number; color?: string }>) => {
    const series = (items || []).slice(0, 3);
    if (!series.length) return null;

    const pointsPerSeries = 7;
    const days = Array.from({ length: pointsPerSeries }, (_, i) => i + 1);

    type TrendRow = { day: number } & Record<string, number>;
    const data: TrendRow[] = days.map((d) => ({ day: d }));

    const meta: Array<{ key: string; label: string; color: string; gradientId: string }> = [];

    series.forEach((item, idx) => {
      const key = `s${idx}`;
      const base = Math.max(0, Math.min(100, item.avgUtil || 0));
      const color = item.color || colorForKey(item.label);
      const gradientId = `perfTrendGrad-${key}`;
      meta.push({ key, label: item.label, color, gradientId });

      days.forEach((d, i) => {
        const wobble = ((i + 1) * (idx + 1) * 3) % 10;
        const sign = i % 2 === 0 ? 1 : -1;
        const v = Math.max(0, Math.min(100, base + sign * wobble));
        (data[i] as any)[key] = v;
      });
    });

    return (
      <>
        <div className="mt-1 h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                {meta.map((m) => (
                  <linearGradient key={m.gradientId} id={m.gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={m.color} stopOpacity={0.7} />
                    <stop offset="80%" stopColor={m.color} stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 50, 100]}
                tickFormatter={(v) => `${v}%`}
                width={30}
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                formatter={(value: any) => [`${Number(value).toFixed(0)}%`, 'Utilization']}
                labelFormatter={(d) => `Day ${d}`}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 11,
                  padding: '6px 8px',
                }}
              />
              {meta.map((m) => (
                <Area
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  name={m.label}
                  stroke={m.color}
                  strokeWidth={2}
                  fill={`url(#${m.gradientId})`}
                  fillOpacity={0.9}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-700">
          {meta.map((m) => (
            <div key={m.key} className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: m.color }}
              />
              <span className="max-w-[96px] truncate">{m.label}</span>
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderMiniBars = (
    items: Array<{ id: string; label: string; avgUtil: number; color?: string }>,
    variant: 'top' | 'bottom'
  ) => {
    if (!items || items.length === 0) return null;
    const max = Math.max(...items.map((e) => e.avgUtil || 0), 1);
    return (
      <div className="space-y-2">
        {items.map((e, idx) => {
          const val = Math.max(0, Math.min(100, e.avgUtil || 0));
          const widthPct = (val / max) * 100;
          const color = e.color || colorForKey(e.label);
          const bg = hexToRgba(color, 0.08);
          const border = hexToRgba(color, 0.25);
          const label = String(e.label || '').slice(0, 28);
          const rankBg =
            variant === 'top'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200';
          return (
            <div
              key={e.id || idx}
              className="flex items-center gap-2"
              title={`${e.label}: ${val}% avg utilization`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold ${rankBg}`}
              >
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="mb-0.5 flex items-center justify-between pr-1 text-[11px] text-slate-600">
                  <span className="truncate">{label}</span>
                  <span className="ml-2 font-semibold" style={{ color, fontSize: '10px' }}>
                    {val}%
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full border"
                  style={{ borderColor: border, backgroundColor: bg }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${widthPct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-slate-900">Performance Snapshot</div>
          <div className="text-sm text-slate-600">
            Best and worst cities by average room utilization
          </div>
        </div>
        {onChangeMode && (
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs shadow-sm">
            <button
              type="button"
              onClick={() => onChangeMode('multi')}
              className={`px-2 py-1 rounded-md ${
                mode === 'multi' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              3‑City Trends
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('bars')}
              className={`px-2 py-1 rounded-md ${
                mode === 'bars' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              Bars
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col items-center gap-2 rounded-lg bg-emerald-50/60 p-3">
          <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <span>🏆</span>
            <span>Best performer</span>
          </div>
          {top && top.length > 0 ? (
            <>
              <div className="-mt-1 text-[11px] text-emerald-700/80">Top 3 city trend (7‑day)</div>
              {buildTrendLines(top)}
            </>
          ) : (
            <div className="text-xs text-slate-500">No data</div>
          )}
        </div>
        <div className="flex flex-col items-center gap-2 rounded-lg bg-rose-50/70 p-3">
          <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-rose-700">
            <span>⚠️</span>
            <span>Lowest performer</span>
          </div>
          {bottom && bottom.length > 0 ? (
            <>
              <div className="-mt-1 text-[11px] text-rose-700/80">Bottom 3 city trend (7‑day)</div>
              {buildTrendLines(bottom)}
            </>
          ) : (
            <div className="text-xs text-slate-500">No data</div>
          )}
        </div>
        {mode === 'multi' && (
          <div className="flex flex-col items-center gap-2 rounded-lg bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
              All cities average
            </div>
            <div className="-mt-1 text-[11px] text-slate-500">7-day utilization trend</div>
            {buildTrendLines(
              overallAvgUtil != null
                ? [
                    {
                      label: 'All cities',
                      avgUtil: Math.max(0, Math.min(100, overallAvgUtil)),
                      color: colorForKey('All cities'),
                    },
                  ]
                : top && top.length > 0
                ? top
                : []
            )}
          </div>
        )}
      </div>
      {mode === 'bars' && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              Top 3 performers
            </div>
            {renderMiniBars(top, 'top')}
          </div>
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
              Lowest 3 performers
            </div>
            {renderMiniBars(bottom, 'bottom')}
          </div>
        </div>
      )}
    </div>
  );
}

export default TopBottomPerformersCard;
