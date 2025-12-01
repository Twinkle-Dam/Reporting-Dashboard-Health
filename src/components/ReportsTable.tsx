import React from 'react';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

type Row = { id: string | number; department?: string; date?: string; visits?: number; revenue?: number; [k: string]: any };
type Props = { data?: Row[] };

function toCsv(rows: Row[]): string {
  if (!rows || !rows.length) return '';
  const keys = Object.keys(rows[0]);
  const lines = [keys.join(',')];
  rows.forEach(r => {
    lines.push(keys.map(k => JSON.stringify(r[k] ?? '')).join(','));
  });
  return lines.join('\n');
}

export default function ReportsTable({ data = [] }: Props): React.ReactElement {
  const exportCsv = () => {
    const csv = toCsv(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'report.csv');
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.text('Report', 10, 10);
    const headers = Object.keys(data[0] || {});
    const rows = data.map(d => headers.map(h => String(d[h] ?? '')));
    let y = 20;
    doc.setFontSize(10);
    doc.text(headers.join(' | '), 10, y);
    y += 6;
    rows.forEach(r => {
      doc.text(r.join(' | '), 10, y);
      y += 6;
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });
    doc.save('report.pdf');
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">Reports</h3>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="px-3 py-1 bg-gray-100 rounded">Export CSV</button>
          <button onClick={exportPdf} className="px-3 py-1 bg-gray-100 rounded">Export PDF</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="text-left">
              <th className="px-2 py-1">Department</th>
              <th className="px-2 py-1">Date</th>
              <th className="px-2 py-1">Visits</th>
              <th className="px-2 py-1">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr><td colSpan={4} className="p-4 text-center">No data</td></tr>
            )}
            {data.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-2 py-2">{r.department}</td>
                <td className="px-2 py-2">{r.date}</td>
                <td className="px-2 py-2">{r.visits}</td>
                <td className="px-2 py-2">{r.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



