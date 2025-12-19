import { useCallback } from 'react';
import { saveAs } from 'file-saver';
import { UtilRow, DAYS, getInlineColors } from '../roomAllocationUtils';

export function useAllocationExport(data: UtilRow[]) {
  const buildCsv = useCallback(() => {
    const headerRow1 = ['ROOMS', 'MONTH', 'UTILIZATION PERCENTAGE', '', '', '', ''];
    const headerRow2 = ['', '', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
    const rows = data.map((row) => [
      row.room,
      row.month,
      ...DAYS.map((d) => `${(row[d] as number).toFixed(2)}%`),
    ]);
    const escapeCell = (val: unknown) => `"${String(val).replace(/"/g, '""')}"`;
    return [headerRow1, headerRow2, ...rows].map((r) => r.map(escapeCell).join(',')).join('\r\n');
  }, [data]);

  const handleExportCSV = useCallback(() => {
    const csv = buildCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, 'room_utilization.csv');
  }, [buildCsv]);

  const handleExportExcel = useCallback(() => {
    const border = '#9CA3AF';
    const header1Bg = '#FDE047';
    const header1Text = '#111827';
    const header2Bg = '#FEF2F2';
    const header2Text = '#B91C1C';

    const headerRow1 = `
      <tr>
        <th style="border:1px solid ${border};padding:6px;background:${header1Bg};color:${header1Text};text-align:center">ROOMS</th>
        <th style="border:1px solid ${border};padding:6px;background:${header1Bg};color:${header1Text};text-align:center">MONTH</th>
        <th colspan="5" style="border:1px solid ${border};padding:6px;background:${header1Bg};color:${header1Text};text-align:center">UTILIZATION PERCENTAGE</th>
      </tr>`;

    const headerRow2 = `
      <tr>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center"></th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center"></th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center">MONDAY</th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center">TUESDAY</th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center">WEDNESDAY</th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center">THURSDAY</th>
        <th style="border:1px solid ${border};padding:6px;background:${header2Bg};color:${header2Text};text-align:center">FRIDAY</th>
      </tr>`;

    const bodyRows = data
      .map((row) => {
        const dayCells = DAYS.map((d) => {
          const v = row[d] as number;
          const c = getInlineColors(v);
          return `<td style="border:1px solid #9CA3AF;padding:6px;text-align:center;background-color:${c.bg};color:${c.text}">${v.toFixed(
            2
          )}%</td>`;
        }).join('');
        return (
          `<tr>` +
          `<td style="border:1px solid #9CA3AF;padding:6px;font-weight:600">${row.room}</td>` +
          `<td style="border:1px solid #9CA3AF;padding:6px;font-weight:600">${row.month}</td>` +
          dayCells +
          `</tr>`
        );
      })
      .join('');

    const html =
      '<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>' +
      `<table style="border-collapse:collapse;font-family:Arial, sans-serif;font-size:12px">` +
      `<thead>${headerRow1}${headerRow2}</thead>` +
      `<tbody>${bodyRows}</tbody>` +
      `</table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    saveAs(blob, 'room_utilization.xls');
  }, [data]);

  return { handleExportCSV, handleExportExcel };
}
