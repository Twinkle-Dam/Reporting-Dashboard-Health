import React, { useMemo } from 'react';

type UtilRowLike = {
  room: string | number;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
};

type UtilizationSummaryCardsProps = {
  data: UtilRowLike[];
  scopeLabel?: string;
};

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export const UtilizationSummaryCards: React.FC<UtilizationSummaryCardsProps> = ({ data, scopeLabel }) => {
  const metrics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        overall: 0,
        peakDay: '—',
        peakDayValue: 0,
        peakRoom: '—',
        peakRoomValue: 0,
        roomCount: 0,
        highUtilRooms: 0,
        lowUtilRooms: 0,
      };
    }

    const dayKeys: Array<keyof UtilRowLike> = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    // Overall avg of all cells
    const allValues: number[] = [];
    data.forEach((row) => {
      dayKeys.forEach((d) => {
        const v = Number((row as any)[d] || 0);
        if (!Number.isNaN(v)) allValues.push(v);
      });
    });

    const overall = avg(allValues);

    // Peak weekday
    const dayAvgs = dayKeys.map((d) => {
      const vals = data.map((row) => Number((row as any)[d] || 0));
      return avg(vals);
    });
    let peakIdx = 0;
    for (let i = 1; i < dayAvgs.length; i++) {
      if (dayAvgs[i] > dayAvgs[peakIdx]) peakIdx = i;
    }

    // Peak room (avg across days) + distribution bands
    let peakRoom = data[0].room;
    let peakRoomValue = 0;
    let highUtilRooms = 0;
    let lowUtilRooms = 0;

    data.forEach((row) => {
      const vals = dayKeys.map((d) => Number((row as any)[d] || 0));
      const a = avg(vals);
      if (a > peakRoomValue) {
        peakRoomValue = a;
        peakRoom = row.room;
      }
      if (a >= 75) highUtilRooms += 1;
      else if (a < 35) lowUtilRooms += 1;
    });

      return {
        overall,
        peakDay: dayNames[peakIdx],
        peakDayValue: dayAvgs[peakIdx],
        peakRoom: String(peakRoom),
        peakRoomValue,
        roomCount: data.length,
        highUtilRooms,
        lowUtilRooms,
      };
  }, [data]);

  const scope = scopeLabel || 'Current selection';

  return (
    <div className="mt-2 mb-3 rounded-3xl bg-white/70 shadow-[0_18px_50px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/80 px-3 py-3 md:px-4 md:py-4">
      <div className="grid grid-cols-1 gap-3">
        {/* Overall utilization */}
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-200 transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl">
          <div className="absolute inset-x-0 -top-16 h-24 bg-gradient-to-br from-emerald-400/35 via-sky-400/35 to-violet-500/25 blur-2xl" />
          <div className="relative px-3 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Overall Utilization
            </div>
            <div className="mt-1.5 flex items-end justify-between">
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  {metrics.overall.toFixed(1)}
                  <span className="text-xs font-semibold ml-1 text-slate-500">%</span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">{scope}</div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-slate-50 shadow-inner border border-slate-700/80">
                <span className="text-base font-semibold">Σ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Busiest day */}
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-200 transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl">
          <div className="absolute inset-x-0 -top-16 h-24 bg-gradient-to-br from-violet-500/35 via-sky-400/35 to-emerald-400/25 blur-2xl" />
          <div className="relative px-3 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Peak Weekday
            </div>
            <div className="mt-1.5 flex items-end justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">{metrics.peakDay}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">Average across rooms</div>
              </div>
              <div className="text-xl font-bold text-slate-900">
                {metrics.peakDayValue.toFixed(1)}
                <span className="text-xs ml-1 text-slate-500">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Most utilized room */}
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-200 transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl">
          <div className="absolute inset-x-0 -top-16 h-24 bg-gradient-to-br from-emerald-400/35 via-sky-400/35 to-violet-500/25 blur-2xl" />
          <div className="relative px-3 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Most Utilized Room
            </div>
            <div className="mt-1.5 flex items-end justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Room {metrics.peakRoom}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">Average across Mon–Fri</div>
              </div>
              <div className="text-xl font-bold text-emerald-600">
                {metrics.peakRoomValue.toFixed(1)}
                <span className="text-xs ml-1">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact secondary stats row as small cards */}
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div
          className="group relative rounded-xl bg-slate-100 px-3 py-2 shadow-sm cursor-default"
          title="How many rooms are included in this view."
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Rooms tracked
          </div>
          <div className="mt-0.5 text-sm font-semibold text-slate-900">
            {metrics.roomCount}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">
            Unique rooms in this view.
          </div>
        </div>

        <div
          className="group relative rounded-xl bg-emerald-50 px-3 py-2 shadow-sm cursor-default"
          title="Rooms that are busy most of the week (average utilization at or above 75%)."
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            Busy rooms (≥ 75%)
          </div>
          <div className="mt-0.5 text-sm font-semibold text-emerald-700">
            {metrics.highUtilRooms}
          </div>
          <div className="mt-0.5 text-[10px] text-emerald-800/80">
            Avg utilization ≥ 75% this week.
          </div>
        </div>

        <div
          className="group relative rounded-xl bg-rose-50 px-3 py-2 shadow-sm cursor-default"
          title="Rooms that sit idle most of the week (average utilization below 35%)."
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">
            Under‑used rooms (&lt; 35%)
          </div>
          <div className="mt-0.5 text-sm font-semibold text-rose-700">
            {metrics.lowUtilRooms}
          </div>
          <div className="mt-0.5 text-[10px] text-rose-800/80">
            Avg utilization &lt; 35% this week.
          </div>
        </div>
      </div>
    </div>
  );
};

export default UtilizationSummaryCards;


