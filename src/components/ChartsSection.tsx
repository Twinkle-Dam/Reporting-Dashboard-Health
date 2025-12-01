import React from 'react';
import { Bar, BarChart, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Datum = { department?: string; visits?: number; revenue?: number; date?: string };
type Props = { data?: Datum[] };

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f50', '#a4de6c', '#d0ed57'];

function aggregatedByDept(data: Datum[]) {
  const map: Record<string, { department: string; visits: number; revenue: number }> = {};
  data.forEach(d => {
    const key = d.department || 'Unknown';
    if (!map[key]) map[key] = { department: key, visits: 0, revenue: 0 };
    map[key].visits += d.visits || 0;
    map[key].revenue += d.revenue || 0;
  });
  return Object.values(map);
}

export default function ChartsSection({ data = [] }: Props): React.ReactElement {
  const agg = aggregatedByDept(data);

  return (
    <div className="bg-white p-4 rounded-2xl shadow space-y-6">
      <h2 className="font-semibold">Charts</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-2">
          <div className="text-sm mb-2">Visits by Department (Bar)</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={agg}>
              <XAxis dataKey="department" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="visits" name="Visits">
                {agg.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-2">
          <div className="text-sm mb-2">Revenue Trend (Line)</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="p-2 md:col-span-2">
          <div className="text-sm mb-2">Department Share (Pie)</div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={agg} dataKey="visits" nameKey="department" outerRadius={100} label>
                {agg.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}



