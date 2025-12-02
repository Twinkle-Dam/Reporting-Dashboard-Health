import React from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type CampusBuildingPoint = {
  name: string;
  util: number;
};

interface CampusBuildingUtilizationChartProps {
  scope: 'city' | 'campus' | 'building' | 'floor';
  campus?: string;
  hasResolvedBuilding: boolean;
  data: CampusBuildingPoint[];
  onSelectBuilding: (buildingName: string) => void;
}

const CampusBuildingUtilizationChart: React.FC<CampusBuildingUtilizationChartProps> = ({
  scope,
  campus,
  hasResolvedBuilding,
  data,
  onSelectBuilding,
}) => {
  const shouldShow =
    !!campus &&
    data.length > 0 &&
    (scope === 'campus' || (!hasResolvedBuilding));

  if (!shouldShow) return null;

  return (
    <div className="mt-10 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200">
      <h3 className="mb-4 text-center text-xl font-semibold">Utilization by Building</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            onClick={(e: any) => {
              try {
                const name = e?.activeLabel || e?.activePayload?.[0]?.payload?.name;
                if (!name) return;
                onSelectBuilding(String(name));
              } catch {
                // no-op
              }
            }}
          >
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="util" fill="#0ea5e9" name="Avg Utilization (%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CampusBuildingUtilizationChart;


