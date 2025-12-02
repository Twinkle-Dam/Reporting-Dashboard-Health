import React, { useMemo } from 'react';
import UtilizationCircleCell from './UtilizationCircleCell';

type UtilRowLike = {
  room: string | number;
  month: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
};

type RoomUtilizationGridProps = {
  rows: UtilRowLike[];
  summaryRow?: UtilRowLike;
};

const DAY_KEYS: Array<keyof UtilRowLike> = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export const RoomUtilizationGrid: React.FC<RoomUtilizationGridProps> = ({ rows, summaryRow }) => {
  const cards = useMemo(
    () =>
      (rows || []).map((row) => {
        const values = DAY_KEYS.map((k) => Number((row as any)[k] || 0));
        const overall = avg(values);
        return { row, overall };
      }),
    [rows],
  );

  const hasSummary = !!summaryRow;

  return (
    <div className="space-y-4">
      {hasSummary && (
        <div className="rounded-2xl bg-slate-900 text-slate-50 p-4 shadow-xl ring-1 ring-slate-800/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Overview
              </div>
              <div className="mt-1 text-base font-semibold">
                {String(summaryRow?.room)} — {summaryRow?.month}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                Average utilization across all rooms on this floor.
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-14 w-14">
                <UtilizationCircleCell
                  value={avg(DAY_KEYS.map((k) => Number((summaryRow as any)[k] || 0)))}
                  label="Overall (Mon–Fri)"
                />
              </div>
              <div className="grid grid-cols-5 gap-1 text-[10px] text-slate-200">
                {DAY_KEYS.map((k, idx) => {
                  const v = Number((summaryRow as any)[k] || 0);
                  return (
                    <div key={k} className="flex flex-col items-center gap-0.5">
                      <span className="opacity-70">{DAY_LABELS[idx][0]}</span>
                      <div
                        className="h-6 w-1 rounded-full bg-gradient-to-t from-slate-600 to-emerald-400"
                        style={{ height: `${Math.max(8, Math.min(24, (v / 100) * 24))}px` }}
                        title={`${DAY_LABELS[idx]}: ${v.toFixed(1)}%`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ row, overall }) => (
          <div
            key={`${row.room}-${row.month}`}
            className="group rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-200 transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Room
                </div>
                <div className="text-lg font-semibold text-slate-900">
                  {String(row.room)}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">{row.month}</div>
              </div>
              <div className="h-14 w-14">
                <UtilizationCircleCell value={overall} label="Average (Mon–Fri)" />
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {DAY_KEYS.map((k, idx) => {
                const v = Number((row as any)[k] || 0);
                const width = Math.max(6, Math.min(100, v));
                return (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-10 text-[11px] text-slate-500">
                      {DAY_LABELS[idx]}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-400 group-hover:brightness-110"
                        style={{ width: `${width}%` }}
                        title={`${DAY_LABELS[idx]}: ${v.toFixed(1)}%`}
                      />
                    </div>
                    <span className="w-9 text-right text-[11px] font-medium text-slate-700">
                      {v.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoomUtilizationGrid;


