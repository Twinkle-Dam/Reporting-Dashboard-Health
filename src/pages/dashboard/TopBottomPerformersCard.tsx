import React from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';
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
  /** Optional list of performers used to render the trend lines for the current scope */
  trendSeries?: PerformerItem[];
  /** Label describing the current scope (e.g., All cities, Campuses, Buildings) */
  trendLabel?: string;
  mode?: TopBottomPerformersMode;
  onChangeMode?: (mode: TopBottomPerformersMode) => void;
}

export function TopBottomPerformersCard({
  top,
  bottom,
  overallAvgUtil,
  trendSeries,
  trendLabel = 'All cities',
  mode = 'multi',
  onChangeMode,
}: TopBottomPerformersCardProps) {
  const best = top && top.length > 0 ? top[0] : null;
  const bestPct = best ? Math.max(0, Math.min(100, best.avgUtil)) : 0;
  const bestColor = best?.color || colorForKey(best?.label || '');
  const worst = bottom && bottom.length > 0 ? bottom[0] : null;
  const worstPct = worst ? Math.max(0, Math.min(100, worst.avgUtil)) : 0;
  const worstColor = worst?.color || colorForKey(worst?.label || '');

  // Dedicated palettes so each card has a distinct visual identity.
  const GREEN_PALETTE = ['#16a34a', '#22c55e', '#4ade80', '#15803d'];
  const WARM_PALETTE = ['#f97316', '#fb923c', '#ea580c', '#dc2626'];
  const PURPLE_PALETTE = ['#6366f1', '#8b5cf6', '#a855f7', '#7c3aed'];
  // Stroke palette for lowest performers – introduces a yellow accent for clearer deltas.
  const WARM_STROKE_PALETTE = ['#dc2626', '#f97316', '#facc15', '#b91c1c'];
  // Multicolor palette for the overall "All cities" trend – inspired by the weekday chart.
  const MULTI_FILL_PALETTE = ['#6366f1', '#22c55e', '#60a5fa', '#a855f7', '#f97316', '#eab308', '#ec4899'];
  const MULTI_STROKE_PALETTE = ['#4f46e5', '#16a34a', '#2563eb', '#9333ea', '#ea580c', '#ca8a04', '#db2777'];
  const GREEN_PRIMARY = GREEN_PALETTE[0];
  const WARM_PRIMARY = WARM_PALETTE[0];
  const PURPLE_PRIMARY = PURPLE_PALETTE[0];

  const buildTrendLines = (
    items: Array<{ label: string; avgUtil: number; color?: string }>,
    opts?: {
      tall?: boolean;
      limit?: number;
      palette?: string[];
      tailColor?: string;
      /** Optional unique prefix so gradients don't clash across multiple charts */
      gradientPrefix?: string;
      /** Optional palette for the stroke/outline color of each series */
      strokePalette?: string[];
    }
  ) => {
    const limit = opts?.limit ?? 3;
    const series = (items || []).slice(0, limit);
    if (!series.length) return null;

    const pointsPerSeries = 7;
    const days = Array.from({ length: pointsPerSeries }, (_, i) => i + 1);

    type TrendRow = { day: number } & Record<string, number>;
    const data: TrendRow[] = days.map((d) => ({ day: d }));

    type TrendMeta = {
      key: string;
      label: string;
      fillColor: string;
      strokeColor: string;
      gradientId: string;
    };

    const meta: TrendMeta[] = [];

    series.forEach((item, idx) => {
      const key = `s${idx}`;
      const base = Math.max(0, Math.min(100, item.avgUtil || 0));
      const fillPalette = opts?.palette;
      const strokePalette = opts?.strokePalette;

      const fillColor =
        (fillPalette && fillPalette.length ? fillPalette[idx % fillPalette.length] : undefined) ||
        item.color ||
        colorForKey(item.label);

      // For outlines we prefer team-specific colors if provided; otherwise fall back to a stroke palette
      // or the same color used for the fill.
      const strokeColor =
        (strokePalette && strokePalette.length
          ? strokePalette[idx % strokePalette.length]
          : undefined) ||
        item.color ||
        colorForKey(item.label) ||
        fillColor;
      const gradientPrefix = opts?.gradientPrefix || 'default';
      const gradientId = `perfTrendGrad-${gradientPrefix}-${key}`;
      meta.push({ key, label: item.label, fillColor, strokeColor, gradientId });

      days.forEach((d, i) => {
        const wobble = ((i + 1) * (idx + 1) * 3) % 10;
        const sign = i % 2 === 0 ? 1 : -1;
        const v = Math.max(0, Math.min(100, base + sign * wobble));
        (data[i] as any)[key] = v;
      });
    });

    const heightClass = opts?.tall ? 'h-40' : 'h-32';
    const tailColor = opts?.tailColor || '#0f172a';

    return (
      <>
        <div className={`mt-1 w-full ${heightClass}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                {meta.map((m) => (
                  <linearGradient key={m.gradientId} id={m.gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={m.fillColor} stopOpacity={0.7} />
                    <stop offset="80%" stopColor={m.fillColor} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={tailColor} stopOpacity={0.03} />
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
                  stroke={m.strokeColor}
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
        <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-700">
          {meta.map((m) => (
            <div key={m.key} className="flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: m.strokeColor }}
              />
              <span className="max-w-[96px] truncate">{m.label}</span>
            </div>
          ))}
        </div>
      </>
    );
  };

  const computeAvg = (
    items: Array<{ avgUtil: number }> | undefined | null
  ): number => {
    if (!items || !items.length) return 0;
    const sum = items.reduce((acc, it) => acc + (it.avgUtil || 0), 0);
    return Math.round(sum / items.length);
  };

  const renderCircleSummary = (
    value: number,
    color: string,
    label: string
  ) => {
    const safeValue = Math.max(0, Math.min(100, value || 0));
    const data = [{ name: label, value: safeValue }];
    return (
      <div className="mt-1 w-full">
        <div className="relative h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
              data={data}
              innerRadius="70%"
              outerRadius="100%"
              startAngle={225}
              endAngle={-45}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                tick={false}
              />
              <RadialBar
                dataKey="value"
                cornerRadius={9999}
                fill={color}
                background={{ fill: hexToRgba(color, 0.12) }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-base font-semibold leading-none" style={{ color }}>
              {safeValue}%
            </div>
          </div>
        </div>
        <div className="mt-1.5 text-xs font-medium leading-snug text-slate-500 text-center px-2">
          {label}
        </div>
      </div>
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
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${rankBg}`}
              >
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="mb-0.5 flex items-center justify-between pr-1 text-xs text-slate-600">
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

  const topAvg = computeAvg(top);
  const bottomAvg = computeAvg(bottom);
  const overallAvg =
    overallAvgUtil != null
      ? Math.max(0, Math.min(100, overallAvgUtil))
      : computeAvg([...(top || []), ...(bottom || [])]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">Performance Snapshot</div>
          <div className="text-xs text-slate-600">
            Best and worst performers by average room utilization
          </div>
        </div>
        {onChangeMode && (
          <div className="relative inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1 text-xs shadow-sm">
            <div
              className={`absolute inset-y-1 w-1/2 rounded-md bg-violet-600 transition-transform duration-300 ${
                mode === 'bars' ? 'translate-x-full' : 'translate-x-0'
              }`}
            />
            <button
              type="button"
              onClick={() => onChangeMode('multi')}
              className={`relative z-10 px-2 py-1 rounded-md transition-colors duration-200 ${
                mode === 'multi' ? 'text-white' : 'text-slate-700 hover:text-violet-700'
              }`}
            >
              Trends
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('bars')}
              className={`relative z-10 px-2 py-1 rounded-md transition-colors duration-200 ${
                mode === 'bars' ? 'text-white' : 'text-slate-700 hover:text-violet-700'
              }`}
            >
              Graph
            </button>
          </div>
        )}
      </div>
      <div className="mt-1 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* All-scope average (now first, purple‑themed) */}
        <div className="flex flex-col items-center gap-2 rounded-lg bg-violet-50 p-3 lg:col-span-1">
          <div className="relative w-full">
            <div
              className={`transition-opacity duration-300 ${
                mode === 'multi'
                  ? 'opacity-100 relative'
                  : 'pointer-events-none absolute inset-0 opacity-0'
              }`}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-violet-800">
                {trendLabel} Performance
              </div>
              <div className="-mt-1 text-xs text-violet-700/80">7-day utilization trend</div>
              {buildTrendLines(
                trendSeries && trendSeries.length
                  ? trendSeries
                  : overallAvgUtil != null
                  ? [
                      {
                        label: trendLabel,
                        avgUtil: Math.max(0, Math.min(100, overallAvgUtil)),
                        color: PURPLE_PRIMARY,
                      },
                    ]
                  : top && top.length > 0
                  ? top
                  : [],
                {
                  tall: true,
                  limit: 6,
                  // Use a multicolor palette so each city line has its own hue,
                  // similar to the weekday utilization chart.
                  palette: MULTI_FILL_PALETTE,
                  tailColor: '#0f172a',
                  gradientPrefix: 'avg',
                  strokePalette: MULTI_STROKE_PALETTE,
                }
              )}
            </div>
            <div
              className={`transition-opacity duration-300 ${
                mode === 'bars'
                  ? 'opacity-100 relative'
                  : 'pointer-events-none absolute inset-0 opacity-0'
              }`}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-violet-800">
                Average utilization
              </div>
              <div className="-mt-1 text-xs text-violet-700/80">
                {trendLabel} (summary view)
              </div>
              {renderCircleSummary(overallAvg, PURPLE_PRIMARY, `${trendLabel} avg utilization`)}
            </div>
          </div>
        </div>

        {/* Best performer – green themed */}
        <div className="flex flex-col items-center gap-2 rounded-lg bg-emerald-50 p-3 lg:col-span-1">
          <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            <span>🏆</span>
            <span>Best performer</span>
          </div>
          {top && top.length > 0 ? (
            <div className="relative w-full">
              <div
                className={`transition-opacity duration-300 ${
                  mode === 'multi'
                    ? 'opacity-100 relative'
                    : 'pointer-events-none absolute inset-0 opacity-0'
                }`}
              >
                <div className="-mt-1 text-xs text-emerald-700/80">Top 3 trend (7‑day)</div>
                {buildTrendLines(top, {
                  palette: GREEN_PALETTE,
                  tailColor: GREEN_PRIMARY,
                  gradientPrefix: 'best',
                  // Let outlines use each team's own color (via item.color / colorForKey)
                })}
              </div>
              <div
                className={`transition-opacity duration-300 ${
                  mode === 'bars'
                    ? 'opacity-100 relative'
                    : 'pointer-events-none absolute inset-0 opacity-0'
                }`}
              >
                {renderCircleSummary(topAvg, GREEN_PRIMARY, 'Top 3 avg utilization')}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500">No data</div>
          )}
        </div>

        {/* Lowest performer – warm red/orange themed */}
        <div className="flex flex-col items-center gap-2 rounded-lg bg-amber-50 p-3 lg:col-span-1">
          <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
            <span>⚠️</span>
            <span>Lowest performer</span>
          </div>
          {bottom && bottom.length > 0 ? (
            <div className="relative w-full">
              <div
                className={`transition-opacity duration-300 ${
                  mode === 'multi'
                    ? 'opacity-100 relative'
                    : 'pointer-events-none absolute inset-0 opacity-0'
                }`}
              >
                <div className="-mt-1 text-xs text-amber-700/80">Bottom 3 trend (7‑day)</div>
                {buildTrendLines(bottom, {
                  palette: WARM_PALETTE,
                  tailColor: WARM_PRIMARY,
                  gradientPrefix: 'low',
                  // Stronger deltas for lowest performers – red, orange, yellow, etc.
                  strokePalette: WARM_STROKE_PALETTE,
                })}
              </div>
              <div
                className={`transition-opacity duration-300 ${
                  mode === 'bars'
                    ? 'opacity-100 relative'
                    : 'pointer-events-none absolute inset-0 opacity-0'
                }`}
              >
                {renderCircleSummary(bottomAvg, WARM_PRIMARY, 'Lowest 3 avg utilization')}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500">No data</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TopBottomPerformersCard;
