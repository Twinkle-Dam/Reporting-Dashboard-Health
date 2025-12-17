import { useMemo } from 'react';
import { BUILDINGS } from '../../../data/buildings';
import { Crumbs, Scope } from './useAllocationFilters';
import { UtilRow } from '../roomAllocationUtils';
import { colorForKey } from '../../../pages/dashboardShared';

export function useAllocationCharts(
  data: UtilRow[],
  crumbs: Crumbs,
  scope: Scope,
  resolvedBuilding: any,
  floorsCount?: number
) {
  // 1. City / Campus series
  const cityCampusSeries = useMemo(() => {
    // Only meaningful if scope=city or if we wanted to show all campuses in a city
    if (!crumbs.city) return [];
    const campuses = new Set<string>();
    for (const b of BUILDINGS as any[]) {
      if (b.city === crumbs.city) campuses.add(b.campus);
    }
    const list = Array.from(campuses).map((c) => ({
      name: c,
      value: 0,
      color: colorForKey(c),
    }));
    // Simplified logic: aggregation would go here if we had full hierarchy data
    return list;
  }, [crumbs.city]);

  // 2. Campus / Building series
  const campusSeries = useMemo(() => {
    if (!crumbs.campus) return [];
    const buildings = (BUILDINGS as any[]).filter((b) => b.campus === crumbs.campus);
    return buildings.map((b) => ({
      name: b.name,
      value: 0, // Placeholder for aggregation
      color: colorForKey(b.name),
    }));
  }, [crumbs.campus]);

  // 3. Floor Series (for selected building)
  const floorSeries = useMemo(() => {
    if (!resolvedBuilding && !crumbs.buildingName) return [];
    if (!floorsCount) return [];

    // Create a mock distribution or aggregate from 'data' if 'data' contained all floors
    // Since 'data' is usually scoped to the current view, we might need a separate aggregation
    // For now, return placeholders
    return Array.from({ length: floorsCount }).map((_, i) => ({
      name: `Floor ${i + 1}`,
      value: 0,
    }));
  }, [resolvedBuilding, crumbs.buildingName, floorsCount]);

  // 4. Floor Daily Breakdown
  const floorDailyTable = useMemo(() => {
    if (scope !== 'building') return [];
    // If we were at building level, 'data' might contain rows for all rooms?
    // Actually 'data' from useUtilizationData matches the Scope.
    // If scope=building, 'data' is rooms across floors.
    return data;
  }, [scope, data]);

  // 5. Day Breakdown (Mon-Fri)
  const scopeDayBreakdown = useMemo(() => {
    // Percentage average per day across all rows in 'data'
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    return days.map((d) => {
      const sum = data.reduce((acc, row) => acc + (Number(row[d as keyof UtilRow]) || 0), 0);
      const avg = data.length ? sum / data.length : 0;
      return { day: d, value: avg };
    });
  }, [data]);

  const allDeptList = useMemo(() => {
    // If we had department data in rows, we'd extract it here
    return ['Cardiology', 'Neurology', 'Pediatrics'];
  }, []);

  const scopeLabel = useMemo(() => {
    if (scope === 'city') return crumbs.city || 'City';
    if (scope === 'campus') return crumbs.campus || 'Campus';
    if (scope === 'building') return crumbs.buildingName || 'Building';
    if (scope === 'floor') return `Floor ${crumbs.floor || ''}`;
    return 'Report';
  }, [scope, crumbs]);

  return {
    cityCampusSeries,
    campusSeries,
    floorSeries,
    floorDailyTable,
    scopeDayBreakdown,
    allDeptList,
    scopeLabel,
  };
}
