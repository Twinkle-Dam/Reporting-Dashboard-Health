import React from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type CityCampusPoint = {
  campus: string;
  util: number;
};

interface CityCampusUtilizationChartProps {
  scope: 'city' | 'campus' | 'building' | 'floor';
  city?: string;
  data: CityCampusPoint[];
  onSelectCampus: (campusName: string) => void;
}

const CityCampusUtilizationChart: React.FC<CityCampusUtilizationChartProps> = ({
  scope,
  city,
  data,
  onSelectCampus,
}) => {
  if (!city || scope !== 'city' || !data.length) return null;

  return (
    <div className="mt-10 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200">
      <h3 className="mb-4 text-center text-xl font-semibold">Utilization by Campus</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            onClick={(e: any) => {
              try {
                const name = e?.activeLabel || e?.activePayload?.[0]?.payload?.campus;
                if (!name) return;
                onSelectCampus(String(name));
              } catch {
                // no-op
              }
            }}
          >
            <XAxis dataKey="campus" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="util" fill="#22c55e" name="Avg Utilization (%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CityCampusUtilizationChart;


