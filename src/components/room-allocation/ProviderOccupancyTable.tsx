import React from 'react';

type ProviderItem = {
  name: string;
  percent: number;
  department?: string;
};

type ProviderDayRow = {
  day: string;
  items: ProviderItem[];
};

type ProviderOccupancyTableProps = {
  scopeDayBreakdown: ProviderDayRow[];
  allDepartments: string[];
  onDoctorClick: (name: string) => void;
};

export const ProviderOccupancyTable: React.FC<ProviderOccupancyTableProps> = ({
  scopeDayBreakdown,
  allDepartments,
  onDoctorClick,
}) => {
  const days: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  return (
    <div className="mt-2">
      <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-900/90 text-slate-100">
            <tr>
              <th className="px-3 py-2 text-left font-semibold w-48">Department</th>
              {days.map((day) => (
                <th key={`head-${day}`} className="px-3 py-2 text-left font-semibold">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {allDepartments.map((dept) => (
              <tr key={`row-${dept}`} className="hover:bg-slate-900/60 align-top">
                <td className="px-3 py-2 text-slate-100">
                  <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-100">
                    {dept}
                  </span>
                </td>
                {days.map((day) => {
                  const dayRow = scopeDayBreakdown.find((r) => r.day === day);
                  const items = (dayRow?.items || [])
                    .filter((it: any) => (String(it.department || '').trim() || 'Other') === dept)
                    .sort((a, b) => b.percent - a.percent);
                  return (
                    <td key={`cell-${dept}-${day}`} className="px-3 py-2 text-slate-100">
                      {items.length > 0 ? (
                        <span className="space-x-1">
                          {items.map((it, idx) => (
                            <span key={`${dept}-${day}-${it.name}-${idx}`} className="whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => onDoctorClick(it.name as any)}
                                className="text-sky-400 hover:text-sky-300 hover:underline"
                              >
                                {it.name}
                              </button>{' '}
                              <span className="text-slate-300">({it.percent}%)</span>
                              {idx < items.length - 1 ? <span>, </span> : null}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProviderOccupancyTable;


