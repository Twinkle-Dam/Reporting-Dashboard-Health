import { useEffect, useMemo, useState } from 'react';
import { BUILDINGS } from '../../../data/buildings';
import { DEPARTMENT_DATA_DAYWISE_DOCTORWISE_ENDPOINT } from '../../../api/config';
import { Crumbs, Scope } from './useAllocationFilters';
import { UtilRow } from '../roomAllocationUtils';
import { colorForKey } from '../../../pages/dashboardShared';

export async function fetchDepartmentDataDaywiseDoctorwise(
  startDate?: string | null,
  endDate?: string | null,
  visitLocation: string = 'BABEEF54-C88A-400E-926E-5317260E5EA2',
  floorId?: string | null,
  roomId?: string | null
) {
  try {
    let params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (visitLocation) params.set('visitLocation', visitLocation);
    if (floorId) params.set('floorId', floorId);
    if (roomId) params.set('roomId', roomId);
    
    // If no dates, we might not want to call or we use current dates
    if (!params.get('startDate') || !params.get('endDate')) {
      return [];
    }

    const response = await fetch(
      `${DEPARTMENT_DATA_DAYWISE_DOCTORWISE_ENDPOINT}?${params.toString()}`
    );
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Error in fetchDepartmentDataDaywiseDoctorwise', err);
    return [];
  }
}

export function useAllocationCharts(
  data: UtilRow[],
  crumbs: Crumbs,
  scope: Scope,
  resolvedBuilding: any,
  floorsCount?: number,
  floorId?: string,
  fromDate?: string,
  toDate?: string,
  visitLocation?: string,
  roomId?: string
) {
  const [apiData, setapiData] = useState<any>([]);
  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchDepartmentDataDaywiseDoctorwise(
        fromDate,
        toDate,
        visitLocation,
        floorId,
        roomId
      );
      setapiData(data);
    };
    fetchData();
  }, [fromDate, toDate, visitLocation, floorId, roomId]);

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
  const dummyScopeDayBreakdown = useMemo(() => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    // Departments: 'Cardiology', 'Neurology', 'Pediatrics', 'Primary Care'
    const DEPARTMENTS = [
      { name: 'Cardiology', providers: ['Dr. Sarah Chen', 'Dr. Michael Ross'] },
      { name: 'Neurology', providers: ['Dr. James Wilson', 'Dr. Lisa Cuddy'] },
      { name: 'Pediatrics', providers: ['Dr. John Dorian', 'Dr. Christopher Turk'] },
      { name: 'Primary Care', providers: ['Dr. Gregory House', 'Dr. Allison Cameron'] }
    ];

    return days.map((d, i) => {
      // Create some stable mock distributions
      const items = DEPARTMENTS.map((dept, j) => {
        // Deterministic but wavy percentages
        const phase = (i * 1.5 + j * 2.2);
        const base = 20 + Math.sin(phase) * 10;
        return {
          name: dept.providers[i % dept.providers.length],
          percent: Math.max(5, base),
          department: dept.name,
        };
      });

      // Normalize to ~85% total occupancy
      const currentSum = items.reduce((sum, it) => sum + it.percent, 0);
      const target = 75 + Math.sin(i) * 10;
      const normalized = items.map(it => ({
        ...it,
        percent: (it.percent / currentSum) * target
      }));

      return { day: d, items: normalized };
    });
  }, []);

  // 5. Day Breakdown (Mon-Fri) - including provider/department info for the chart
  const scopeDayBreakdown = useMemo(() => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    console.log('scopeDayBreakdown2 apiData', apiData);

    if (apiData.length === 0) {
      return dummyScopeDayBreakdown;
    }

    const cardiologyData = apiData.filter((item) => item.Department === 'Cardiology');
    const neurologyData = apiData.filter((item) => item.Department === 'Neurology');
    const pediatricsData = apiData.filter((item) => item.Department === 'Pediatrics');
    const primaryCareData = apiData.filter((item) => item.Department === 'Primary Care');
    // console.log('cardiologyData', cardiologyData);
    // console.log('neurologyData', neurologyData);
    // console.log('pediatricsData', pediatricsData);
    // console.log('primaryCareData', primaryCareData, primaryCareData.map((curr) => curr.ProviderName).join(' & '));
    return days.map((d, i) => {
      // Create some mock items for the day with measurable variance
      // Departments: 'Cardiology', 'Neurology', 'Pediatrics'
      // filter by department name

      // total time per day
      let key = {
        Monday: 'Mon',
        Tuesday: 'Tue',
        Wednesday: 'Wed',
        Thursday: 'Thu',
        Friday: 'Fri',
      };
      const totalTime =
        apiData.reduce((acc, curr) => acc + curr[key[d]], 0) == 0
          ? 1
          : apiData.reduce((acc, curr) => acc + curr[key[d]], 0);
      const cardiologyTotalTime = cardiologyData.reduce((acc, curr) => acc + curr[key[d]], 0);
      const neurologyTotalTime = neurologyData.reduce((acc, curr) => acc + curr[key[d]], 0);
      const pediatricsTotalTime = pediatricsData.reduce((acc, curr) => acc + curr[key[d]], 0);
      const primaryCareTotalTime = primaryCareData.reduce((acc, curr) => acc + curr[key[d]], 0);

      const items = [
        {
          name: cardiologyData.map((curr) => curr.ProviderName).join(' & '),
          percent: (cardiologyTotalTime / totalTime) * 100, // Oscillates High/Low
          department: 'Cardiology',
        },
        {
          name: neurologyData.map((curr) => curr.ProviderName).join(' & '),
          percent: (neurologyTotalTime / totalTime) * 100, // Oscillates Low/High
          department: 'Neurology',
        },
        {
          name: pediatricsData.map((curr) => curr.ProviderName).join(' & '),
          percent: (pediatricsTotalTime / totalTime) * 100, // Linear increase
          department: 'Pediatrics',
        },
        {
          name: primaryCareData.map((curr) => curr.ProviderName).join(' & '),
          percent: (primaryCareTotalTime / totalTime) * 100, // Linear increase
          department: 'Primary Care',
        },
      ];
      // console.log('Scope Day Breakdown2', { day: d, items });
      return { day: d, items }; // items matches ProviderItem[] shape
    });
  }, [apiData]);

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
