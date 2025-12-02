import React from 'react';

import UtilizationCharts from './UtilizationCharts';
// @ts-ignore - TS may not resolve this TSX component module in some environments, but it exists in this folder.
import ProviderOccupancySection from './ProviderOccupancySection';

type ProviderView = 'table' | 'donut' | 'ribbons';

export interface RoomAllocationInsightsProps {
  data: any[];
  scopeDayBreakdown: any[];
  allDepartments: string[];
  providerView: ProviderView;
  onChangeView: (view: ProviderView) => void;
  onDoctorClick: (name: string) => void;
}

const RoomAllocationInsights: React.FC<RoomAllocationInsightsProps> = ({
  data,
  scopeDayBreakdown,
  allDepartments,
  providerView,
  onChangeView,
  onDoctorClick,
}) => {
  return (
    <div className="mt-2 xl:mt-0 space-y-6">
      {/* Utilization insights graph */}
      <UtilizationCharts data={data as any} />

      {/* Separate 3D card for Occupancy by providers */}
      <ProviderOccupancySection
        scopeDayBreakdown={scopeDayBreakdown as any}
        allDepartments={allDepartments}
        providerView={providerView}
        onChangeView={onChangeView}
        onDoctorClick={onDoctorClick}
      />
    </div>
  );
};

export default RoomAllocationInsights;


