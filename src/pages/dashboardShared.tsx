import React, { useMemo } from 'react';
import { BUILDINGS } from '../data/buildings';

// Simple deterministic color palette per key (e.g., city)
const CITY_PALETTE = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#e11d48',
  '#14b8a6',
  '#84cc16',
  '#f97316',
  '#06b6d4',
];

function hashString(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h << 5) - h + key.charCodeAt(i);
    h |= 0;
  }
  return h;
}

export function colorForKey(key: string): string {
  const idx = Math.abs(hashString(key)) % CITY_PALETTE.length;
  return CITY_PALETTE[idx];
}

// Hex → rgba helper used by multiple dashboard components
export function hexToRgba(hex: string, alpha: number) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return `rgba(15,23,42,${alpha})`;
  const r = parseInt(m[1], 16),
    g = parseInt(m[2], 16),
    b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Convenience wrapper that mirrors the original local helper
export function rgba(hex: string, alpha: number): string {
  try {
    return hexToRgba(hex, alpha);
  } catch {
    return hex;
  }
}

export function occupancyFillHex(pct: number) {
  if (pct >= 80) return '#059669'; // emerald-600
  if (pct >= 60) return '#10B981'; // emerald-500
  if (pct >= 40) return '#f59e0b'; // amber-500
  if (pct >= 20) return '#f97316'; // orange-500
  return '#f43f5e'; // rose-500
}

export function occupancyFillClass(pct: number) {
  if (pct >= 80) return 'fill-emerald-600';
  if (pct >= 60) return 'fill-emerald-500';
  if (pct >= 40) return 'fill-amber-500';
  if (pct >= 20) return 'fill-orange-500';
  return 'fill-rose-500';
}

export function occupancyColor(pct: number) {
  if (pct >= 80) return 'bg-emerald-600';
  if (pct >= 60) return 'bg-emerald-500';
  if (pct >= 40) return 'bg-amber-500';
  if (pct >= 20) return 'bg-orange-500';
  return 'bg-rose-500';
}

export function zoneColorHexTS(z: string) {
  switch (z) {
    case 'A':
      return '#3b82f6';
    case 'B':
      return '#8b5cf6';
    case 'C':
      return '#f59e0b';
    case 'D':
      return '#10b981';
    default:
      return '#64748b';
  }
}

export function zoneColorHex(z: string) {
  return zoneColorHexTS(z);
}

export function dateKey(date?: string) {
  if (!date) return '0';
  try {
    const d = new Date(date);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  } catch {
    return '0';
  }
}

export function seededPercent(seed: number) {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * 100);
}

export function useCityStats() {
  return useMemo(() => {
    const byCity: Record<string, { campuses: Set<string>; buildings: number }> = {};
    for (const b of BUILDINGS as any[]) {
      if (!byCity[b.city]) byCity[b.city] = { campuses: new Set(), buildings: 0 };
      byCity[b.city].campuses.add(b.campus);
      byCity[b.city].buildings += 1;
    }
    return Object.entries(byCity).map(([name, s]) => ({
      name,
      campuses: (s as any).campuses.size,
      buildings: (s as any).buildings,
    }));
  }, []);
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
      {children}
    </span>
  );
}
