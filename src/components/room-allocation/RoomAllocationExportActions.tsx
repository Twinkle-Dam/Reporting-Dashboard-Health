import React from 'react';

interface RoomAllocationExportActionsProps {
  onPrint: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
}

const RoomAllocationExportActions: React.FC<RoomAllocationExportActionsProps> = ({
  onPrint,
  onExportCSV,
  onExportExcel,
}) => {
  return (
    <div className="mt-6 flex justify-end gap-2">
      <button
        type="button"
        onClick={onPrint}
        className="rounded border px-3 py-2 hover:bg-gray-50"
      >
        Export PDF
      </button>
      <button
        type="button"
        onClick={onExportCSV}
        className="rounded border px-3 py-2 hover:bg-gray-50"
      >
        Export CSV
      </button>
      <button
        type="button"
        onClick={onExportExcel}
        className="rounded border px-3 py-2 hover:bg-gray-50"
      >
        Export Excel
      </button>
    </div>
  );
};

export default RoomAllocationExportActions;


