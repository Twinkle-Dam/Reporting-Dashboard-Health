import React from 'react';

type UtilizationCircleCellProps = {
  value: number;
  label?: string;
};

function getRingColor(value: number): string {
  if (value >= 85) return '#16a34a'; // high – green
  if (value >= 70) return '#0ea5e9'; // medium-high – sky
  if (value >= 55) return '#eab308'; // medium – amber
  return '#f97316'; // low – orange
}

export const UtilizationCircleCell: React.FC<UtilizationCircleCellProps> = ({ value, label }) => {
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const angle = safe * 3.6;
  const ringColor = getRingColor(safe);

  const title =
    label != null
      ? `${safe.toFixed(2)}% utilization on ${label}`
      : `${safe.toFixed(2)}% utilization`;

  return (
    <div className="flex items-center justify-center py-1">
      <div
        title={title}
        className="relative h-10 w-10 rounded-full transition-transform duration-200 hover:scale-105 hover:shadow-md"
        style={{
          background: `conic-gradient(${ringColor} ${angle}deg, #e5e7eb ${angle}deg)`,
        }}
      >
        <div className="absolute inset-1 rounded-full bg-white flex items-center justify-center text-[10px] font-semibold text-slate-800">
          {safe.toFixed(0)}%
        </div>
      </div>
    </div>
  );
};

export default UtilizationCircleCell;


