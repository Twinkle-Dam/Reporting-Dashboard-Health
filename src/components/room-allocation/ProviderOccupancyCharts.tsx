import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LabelList } from 'recharts';

type ProviderItem = {
  name: string;
  percent: number;
  department?: string;
};

type ProviderDayRow = {
  day: string;
  items: ProviderItem[];
};

type ProviderOccupancyChartsProps = {
  scopeDayBreakdown: ProviderDayRow[];
  allDepartments: string[];
  onDoctorClick: (name: string) => void;
  mode?: 'donut' | 'ribbons';
};

const RADIAN = Math.PI / 180;

const renderDonutLabel = (props: any) => {
  const { cx, cy, midAngle, outerRadius, value, payload } = props;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const dept = (payload?.department as string) || '';
  const topDoctor = (payload?.topDoctor as ProviderItem | undefined)?.name || '';
  const pct = Number(value ?? 0).toFixed(1);
  const baseDept = dept.length > 10 ? `${dept.slice(0, 9)}…` : dept;
  const docLabel =
    topDoctor.length > 14 ? `${topDoctor.slice(0, 13)}…` : topDoctor;

  return (
    <text
      x={x}
      y={y}
      fill="#0f172a"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="middle"
      fontSize={11}
      fontWeight={600}
    >
      {baseDept}
      {docLabel && (
        <tspan x={x} dy={14} fontSize={10} fontWeight={600}>
          {docLabel}
        </tspan>
      )}
      <tspan x={x} dy={docLabel ? 12 : 14} fontSize={10} fill="#475569">
        {pct}%
      </tspan>
    </text>
  );
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const ProviderOccupancyCharts: React.FC<ProviderOccupancyChartsProps> = ({
  scopeDayBreakdown,
  allDepartments,
  onDoctorClick,
  mode = 'donut',
}) => {
  const { donutData, ribbonData } = useMemo(() => {
    const dayDeptTotals: Record<string, Record<string, number>> = {};
    const dayDeptTopDoctor: Record<string, Record<string, ProviderItem | null>> = {};

    for (const row of scopeDayBreakdown || []) {
      const dayKey = row.day;
      if (!dayDeptTotals[dayKey]) dayDeptTotals[dayKey] = {};
      if (!dayDeptTopDoctor[dayKey]) dayDeptTopDoctor[dayKey] = {};
      for (const it of row.items || []) {
        const dept = (String(it.department || '').trim() || 'Other');
        const v = Number(it.percent || 0);
        if (!Number.isFinite(v)) continue;

        dayDeptTotals[dayKey][dept] = (dayDeptTotals[dayKey][dept] || 0) + v;

        const currentTop = dayDeptTopDoctor[dayKey][dept];
        if (!currentTop || v > (currentTop?.percent || 0)) {
          dayDeptTopDoctor[dayKey][dept] = { ...it };
        }
      }
    }

    const deptOrderSet = new Set<string>();
    (allDepartments || []).forEach((d) => {
      if (d) deptOrderSet.add(d);
    });
    for (const day of Object.keys(dayDeptTotals)) {
      for (const dept of Object.keys(dayDeptTotals[day])) {
        deptOrderSet.add(dept);
      }
    }
    const deptOrder = Array.from(deptOrderSet);

    const rows = deptOrder.map((dept) => ({
      department: dept,
      cells: DAYS.map((day) => {
        const total = Number(dayDeptTotals[day]?.[dept] || 0);
        const topDoctor = dayDeptTopDoctor[day]?.[dept] || null;
        return { day, total, topDoctor };
      }),
    }));

    const baseForDonut = rows.map((row) => {
      const total = row.cells.reduce((sum, c) => sum + (c.total || 0), 0);
      let topDoctor: ProviderItem | null = null;
      for (const cell of row.cells) {
        const candidate = cell.topDoctor;
        const val = candidate ? candidate.percent : 0;
        if (candidate && (!topDoctor || val > (topDoctor.percent || 0))) {
          topDoctor = candidate;
        }
      }
      return { department: row.department, total, topDoctor };
    });

    const grandTotal =
      baseForDonut.reduce((sum, d) => sum + (Number.isFinite(d.total) ? d.total : 0), 0) || 1;

    const donutData = baseForDonut.map((d) => ({
      department: d.department,
      percent: (d.total / grandTotal) * 100,
      topDoctor: d.topDoctor,
    }));

    // Build per-department weekday breakdown (normalized to 100% for ribbons)
    // Also carry the top doctor per weekday so tooltips can show names.
    const ribbonData = rows.map((row) => {
      const dayTotals: Record<string, number> = {};
      const topByShort: Record<string, ProviderItem | null> = {};
      let deptTotal = 0;

      for (const cell of row.cells) {
        const short = cell.day.slice(0, 3); // Mon, Tue...
        const v = Number(cell.total || 0);
        dayTotals[short] = (dayTotals[short] || 0) + v;
        deptTotal += v;

        const existing = topByShort[short];
        const candidate = cell.topDoctor as ProviderItem | null;
        if (candidate && (!existing || (candidate.percent || 0) > (existing?.percent || 0))) {
          topByShort[short] = candidate;
        }
      }

      const safeTotal = deptTotal || 1;

      const makeLabel = (short: string) => {
        const doc = topByShort[short];
        if (!doc?.name) return '';
        const pct =
          typeof doc.percent === 'number' && Number.isFinite(doc.percent)
            ? doc.percent.toFixed(1)
            : '';
        return pct ? `${doc.name} ${pct}%` : doc.name;
      };

      return {
        department: row.department,
        Mon: (dayTotals.Mon || 0) / safeTotal,
        Tue: (dayTotals.Tue || 0) / safeTotal,
        Wed: (dayTotals.Wed || 0) / safeTotal,
        Thu: (dayTotals.Thu || 0) / safeTotal,
        Fri: (dayTotals.Fri || 0) / safeTotal,
        MonDoc: topByShort.Mon || null,
        TueDoc: topByShort.Tue || null,
        WedDoc: topByShort.Wed || null,
        ThuDoc: topByShort.Thu || null,
        FriDoc: topByShort.Fri || null,
        MonLabel: makeLabel('Mon'),
        TueLabel: makeLabel('Tue'),
        WedLabel: makeLabel('Wed'),
        ThuLabel: makeLabel('Thu'),
        FriLabel: makeLabel('Fri'),
      };
    });

    return { donutData, ribbonData };
  }, [scopeDayBreakdown, allDepartments]);

  if (!donutData.length) return null;

  const COLORS = ['#4f46e5', '#6366f1', '#a855f7', '#0ea5e9', '#22c55e', '#14b8a6', '#0f766e'];
  const DAY_COLORS: Record<string, string> = {
    Mon: '#a855f7',
    Tue: '#6366f1',
    Wed: '#0ea5e9',
    Thu: '#22c55e',
    Fri: '#14b8a6',
  };

  const handleSliceClick = (_: any, index: number) => {
    const segment = donutData[index];
    if (segment?.topDoctor?.name) {
      onDoctorClick(segment.topDoctor.name);
    }
  };

  return (
    <div className="mt-2 relative">
      <div className="h-72 sm:h-80">
        {mode === 'donut' ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow
                    dx="0"
                    dy="8"
                    stdDeviation="6"
                    floodColor="#000000"
                    floodOpacity="0.45"
                  />
                </filter>
              </defs>
              <Pie
                data={donutData}
                dataKey="percent"
                nameKey="department"
                cx="50%"
                cy="50%"
                innerRadius="45%"
                outerRadius="75%"
                paddingAngle={3}
                stroke="#020617"
                strokeWidth={2}
                isAnimationActive
                onClick={handleSliceClick}
              >
                {donutData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.department}-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="rgba(15,23,42,0.5)"
                    strokeWidth={1.25}
                    style={{
                      filter: 'url(#shadow)',
                      cursor: entry.topDoctor ? 'pointer' : 'default',
                    }}
                  />
                ))}
                <LabelList dataKey="percent" content={renderDonutLabel} />
              </Pie>
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => (
                  <span style={{ color: '#0f172a', fontSize: 11 }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ribbonData} stackOffset="expand" margin={{ top: 8, right: 8, left: 0, bottom: 20 }}>
                <XAxis
                  dataKey="department"
                  tick={{ fill: '#0f172a', fontSize: 11 }}
                  axisLine={{ stroke: '#64748b' }}
                  tickLine={{ stroke: '#64748b' }}
                />
                <YAxis
                  tickFormatter={(v) => `${Math.round((v as number) * 100)}%`}
                  tick={{ fill: '#0f172a', fontSize: 10 }}
                  axisLine={{ stroke: '#64748b' }}
                  tickLine={{ stroke: '#64748b' }}
                />
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((dayKey) => (
                  <Bar
                    key={dayKey}
                    dataKey={dayKey}
                    stackId="a"
                    fill={DAY_COLORS[dayKey]}
                    radius={dayKey === 'Fri' ? [4, 4, 0, 0] : undefined}
                  >
                    <LabelList
                      dataKey={`${dayKey}Label`}
                      position="inside"
                      fill="#f9fafb"
                      style={{ fontSize: 9, fontWeight: 600 }}
                    />
                  </Bar>
                ))}
                <Legend
                  verticalAlign="bottom"
                  height={24}
                  formatter={(value: string) => (
                    <span style={{ color: '#0f172a', fontSize: 11 }}>{value}</span>
                  )}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
      </div>
    </div>
  );
};

export default ProviderOccupancyCharts;


