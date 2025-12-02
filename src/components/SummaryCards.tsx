import React from 'react';

type Datum = { department?: string; visits?: number; revenue?: number };
type Props = { data?: Datum[]; loading?: boolean };

const Card: React.FC<{ title: string; value: number }> = ({ title, value }) => (
  <div className="bg-white p-4 rounded-2xl shadow">
    <div className="text-sm text-gray-500">{title}</div>
    <div className="text-xl font-semibold">{value}</div>
  </div>
);

export default function SummaryCards({ data = [], loading }: Props): React.ReactElement {
  const totalVisits = data.reduce((s, d) => s + (d.visits || 0), 0);
  const totalRevenue = data.reduce((s, d) => s + (d.revenue || 0), 0);
  const groups = Array.from(new Set(data.map((d) => d.department))).length;

  if (loading) return <div className="col-span-3 bg-white p-4 rounded-2xl shadow">Loading...</div>;

  return (
    <>
      <Card title="Total Visits" value={totalVisits} />
      <Card title="Total Revenue" value={totalRevenue} />
      <Card title="Departments" value={groups} />
    </>
  );
}
