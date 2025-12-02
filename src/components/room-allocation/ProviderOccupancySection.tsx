import React from 'react';
import ProviderOccupancyTable from './ProviderOccupancyTable';
// @ts-ignore - module is provided by TSX component, ignore type resolution noise
import ProviderOccupancyCharts from './ProviderOccupancyCharts';

type ProviderView = 'table' | 'donut' | 'ribbons';

type ProviderOccupancySectionProps = {
  scopeDayBreakdown: Array<{
    day: string;
    items: Array<{ name: string; percent: number; department?: string }>;
  }>;
  allDepartments: string[];
  providerView: ProviderView;
  onChangeView: (view: ProviderView) => void;
  onDoctorClick: (name: string) => void;
};

export const ProviderOccupancySection: React.FC<ProviderOccupancySectionProps> = ({
  scopeDayBreakdown,
  allDepartments,
  providerView,
  onChangeView,
  onDoctorClick,
}) => {
  if (!scopeDayBreakdown || scopeDayBreakdown.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-4 text-slate-900 shadow-xl ring-1 ring-slate-200">
      <div className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-gradient-to-br from-emerald-400/35 via-sky-400/35 to-violet-500/25 blur-2xl opacity-90" />
      <div className="relative mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">Occupancy by providers</div>
        <div className="inline-flex rounded-full bg-violet-50 p-1 text-xs">
          <button
            type="button"
            className={`px-3 py-1 rounded-full font-medium ${
              providerView === 'ribbons'
                ? 'bg-violet-600 text-white shadow'
                : 'text-violet-700 hover:text-violet-900'
            }`}
            onClick={() => onChangeView('ribbons')}
          >
            Ribbons
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded-full font-medium ${
              providerView === 'donut'
                ? 'bg-violet-600 text-white shadow'
                : 'text-violet-700 hover:text-violet-900'
            }`}
            onClick={() => onChangeView('donut')}
          >
            Donut
          </button>
          <button
            type="button"
            className={`px-3 py-1 rounded-full font-medium ${
              providerView === 'table'
                ? 'bg-violet-600 text-white shadow'
                : 'text-violet-700 hover:text-violet-900'
            }`}
            onClick={() => onChangeView('table')}
          >
            Table
          </button>
        </div>
      </div>

      {providerView === 'table' ? (
        <ProviderOccupancyTable
          scopeDayBreakdown={scopeDayBreakdown as any}
          allDepartments={allDepartments}
          onDoctorClick={onDoctorClick}
        />
      ) : (
        <ProviderOccupancyCharts
          scopeDayBreakdown={scopeDayBreakdown as any}
          allDepartments={allDepartments}
          onDoctorClick={onDoctorClick}
          mode={providerView === 'donut' ? 'donut' : 'ribbons'}
        />
      )}
    </div>
  );
};

export default ProviderOccupancySection;


