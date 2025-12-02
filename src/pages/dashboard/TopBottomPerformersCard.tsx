import React from 'react';
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
    const width = 210;
    const height = 110;
    const chartPadding = { left: 8, right: 8, top: 8, bottom: 18 };
    const chartW = width - chartPadding.left - chartPadding.right;
    const chartH = height - chartPadding.top - chartPadding.bottom;
    const legendY = height - 6;
    const baselineY = chartPadding.top + chartH;

    const seriesPoints = series.map((item, idx) => {
      const base = Math.max(0, Math.min(100, item.avgUtil || 0));
      const vals: number[] = [];
      const points: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < pointsPerSeries; i++) {
        const wobble = ((i + 1) * (idx + 1) * 3) % 10; // simple deterministic variation
        const sign = i % 2 === 0 ? 1 : -1;
        const v = Math.max(0, Math.min(100, base + sign * wobble));
        vals.push(v);
      }

      vals.forEach((v, i) => {
        const x =
          chartPadding.left + (chartW * (vals.length === 1 ? 0.5 : i / (vals.length - 1)));
        const y = chartPadding.top + chartH - chartH * (v <= 0 ? 0 : v / 100);
        points.push({ x, y });
      });

      const gradId = `perfTrendFill-${idx}`;

      return { item, vals, points, gradId };
    });

    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto block"
        aria-hidden="true"
      >
        <defs>
          {seriesPoints.map(({ item, gradId }, sIdx) => {
            const col = item.color || colorForKey(item.label);
            return (
              <linearGradient key={gradId} id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={col} stopOpacity={0.55} />
                <stop offset="75%" stopColor={col} stopOpacity={0.12} />
                <stop offset="100%" stopColor="#0f172a" stopOpacity={0.0} />
              </linearGradient>
            );
          })}
        </defs>
        {/* soft background to mimic 3D depth */}
        {/* baseline */}
        <line
          x1={chartPadding.left}
          y1={baselineY}
          x2={chartPadding.left + chartW}
          y2={baselineY}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
        {seriesPoints.map(({ item, vals, points, gradId }, sIdx) => {
          const col = item.color || colorForKey(item.label);
          const pathParts: string[] = [];
          points.forEach((p, i) => {
            pathParts.push(`${i === 0 ? 'M' : 'L'}${p.x},${p.y}`);
          });

          const areaPathParts: string[] = [];
          points.forEach((p, i) => {
            areaPathParts.push(`${i === 0 ? 'M' : 'L'}${p.x},${p.y}`);
          });
          if (points.length > 1) {
            const last = points[points.length - 1];
            const first = points[0];
            areaPathParts.push(`L${last.x},${baselineY}`);
            areaPathParts.push(`L${first.x},${baselineY}`);
            areaPathParts.push('Z');
          }

          const label =
            item.label.length > 10 ? `${item.label.slice(0, 9)}…` : item.label || `Series ${sIdx}`;
          const legendX = chartPadding.left + sIdx * (chartW / Math.max(1, series.length));
          return (
            <g key={sIdx}>
              {/* filled area for soft 3D look */}
              <path
                d={areaPathParts.join(' ')}
                fill={`url(#${gradId})`}
                stroke="none"
                opacity={0.95}
              />
              <path
                d={pathParts.join(' ')}
                fill="none"
                stroke={col}
                strokeWidth={2.4}
                strokeLinecap="round"
              />
              <circle
                cx={legendX}
                cy={legendY - 4}
                r={3.5}
                fill={col}
              />
              <text
                x={legendX + 7}
                y={legendY}
                fontSize="9"
                className="fill-slate-600"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
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
