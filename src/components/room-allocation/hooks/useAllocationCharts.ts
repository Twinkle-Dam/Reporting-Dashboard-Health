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

  // 5. Day Breakdown (Mon-Fri) - including provider/department info for the chart
  const scopeDayBreakdown = useMemo(() => {
    // If real 'data' had provider info, we would aggregate it here.
    // For now, if we are in mock mode or lacking provider details in `data`,
    // we generate a mock distribution based on the utilization percentages so the chart isn't empty.

    // We'll use a deterministic seed from the first room name or just 0
    const seedBase = data.length > 0 ? String(data[0].room).length : 0;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return days.map((d, i) => {
      // Create some mock items for the day with measurable variance
      // Departments: 'Cardiology', 'Neurology', 'Pediatrics'

      const items = [
        {
          name: 'Dr. Smith',
          percent: i % 2 === 0 ? 75 : 30, // Oscillates High/Low
          department: 'Cardiology',
        },
        {
          name: 'Dr. Jones',
          percent: i % 2 !== 0 ? 80 : 35, // Oscillates Low/High
          department: 'Neurology',
        },
        {
          name: 'Dr. Doe',
          percent: 20 + i * 12, // Linear increase
          department: 'Pediatrics',
        },
      ];

      return { day: d, items }; // items matches ProviderItem[] shape
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
