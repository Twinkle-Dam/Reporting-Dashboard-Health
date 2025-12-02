export type UtilRow = {
  room: string;
  month: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  // allow index access for generic helpers
  [key: string]: string | number;
};

export const DAYS: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'> = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];

export function seededPercent(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return Math.max(1, Math.min(98, Math.floor((x - Math.floor(x)) * 100)));
}

export function startOfWeekMonday(isoDate?: string): Date {
  const d = isoDate ? new Date(isoDate) : new Date();
  const day = d.getDay(); // 0..6 (Sun..Sat)
  const diff = day === 0 ? -6 : 1 - day; // move to Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function generateWeekData(
  rooms: Array<string | number>,
  from?: string,
  to?: string,
): UtilRow[] {
  const monday = startOfWeekMonday(from);
  const weekDays: Date[] = Array.from({ length: 5 }).map((_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
  const weekLabel = `Week of ${formatDate(monday)}`;
  return rooms.map((room) => {
    const rn = Number(room);
    const [mon, tue, wed, thu, fri] = weekDays.map((d, idx) => {
      const key = parseInt(formatDate(d).split('-').join(''), 10);
      return seededPercent(rn * 17 + (idx + 1) * 13 + key);
    });
    return {
      room: String(room),
      month: weekLabel,
      monday: mon,
      tuesday: tue,
      wednesday: wed,
      thursday: thu,
      friday: fri,
    };
  });
}

export function getInlineColors(value: number): { bg: string; text: string } {
  if (value >= 80) return { bg: '#DCFCE7', text: '#065F46' };
  if (value >= 60) return { bg: '#FCE7F3', text: '#9D174D' };
  return { bg: '#FEE2E2', text: '#991B1B' };
}


