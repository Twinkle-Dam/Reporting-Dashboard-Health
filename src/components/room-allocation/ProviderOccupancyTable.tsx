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
    <div className="mt-6">
      <div className="text-sm font-semibold text-slate-900 mb-3 text-center">Occupancy by providers</div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-700 w-48">Department</th>
              {days.map((day) => (
                <th key={`head-${day}`} className="px-3 py-2 text-left font-semibold text-slate-700">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {allDepartments.map((dept) => (
              <tr key={`row-${dept}`} className="hover:bg-slate-50 align-top">
                <td className="px-3 py-2 text-slate-800">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {dept}
                  </span>
                </td>
                {days.map((day) => {
                  const dayRow = scopeDayBreakdown.find((r) => r.day === day);
                  const items = (dayRow?.items || [])
                    .filter((it: any) => (String(it.department || '').trim() || 'Other') === dept)
                    .sort((a, b) => b.percent - a.percent);
                  return (
                    <td key={`cell-${dept}-${day}`} className="px-3 py-2 text-slate-800">
                      {items.length > 0 ? (
                        <span className="space-x-1">
                          {items.map((it, idx) => (
                            <span key={`${dept}-${day}-${it.name}-${idx}`} className="whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => onDoctorClick(it.name as any)}
                                className="text-blue-600 hover:underline"
                              >
                                {it.name}
                              </button>{' '}
                              <span className="text-slate-600">({it.percent}%)</span>
                              {idx < items.length - 1 ? <span>, </span> : null}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
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


