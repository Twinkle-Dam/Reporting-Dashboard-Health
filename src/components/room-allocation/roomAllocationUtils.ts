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
    d.getDate()
  ).padStart(2, '0')}`;
}

export function getInlineColors(value: number): { bg: string; text: string } {
  if (value >= 80) return { bg: '#DCFCE7', text: '#065F46' };
  if (value >= 60) return { bg: '#FCE7F3', text: '#9D174D' };
  return { bg: '#FEE2E2', text: '#991B1B' };
}
