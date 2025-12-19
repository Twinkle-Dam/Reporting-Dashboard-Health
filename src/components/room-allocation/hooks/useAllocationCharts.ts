import { useEffect, useMemo, useState } from 'react';
import { BUILDINGS } from '../../../data/buildings';
import { DEPARTMENT_DATA_DAYWISE_DOCTORWISE_ENDPOINT } from '../../../api/config';
import { Crumbs, Scope } from './useAllocationFilters';
import { UtilRow } from '../roomAllocationUtils';
import { colorForKey } from '../../../pages/dashboardShared';

export async function fetchDepartmentDataDaywiseDoctorwise(startDate: string, endDate: string, visitLocation: string = 'BABEEF54-C88A-400E-926E-5317260E5EA2', floorId: string, roomId: string = null) {
  try {
    let params = new URLSearchParams();
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    params.set('visitLocation', visitLocation);
    params.set('floorId', floorId);
    params.set('roomId', roomId);
    const response = await fetch(`${DEPARTMENT_DATA_DAYWISE_DOCTORWISE_ENDPOINT}?${params.toString()}`);
    const data = await response.json();
    return data;
  }
  catch (err) {
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
  startDate?: string,
  endDate?: string,
  visitLocation?: string,
  roomId?: string,
) {
  const [apiData, setapiData] = useState<any>([]);
  useEffect(() => {
    const fetchData = async () => {
      const data = await fetchDepartmentDataDaywiseDoctorwise(startDate, endDate, visitLocation, floorId, roomId);
      setapiData(data);
    };
    fetchData();
  }, [startDate, endDate, visitLocation, floorId, roomId]);

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
    const primaryCareData = apiData.filter((item) => item.Department === "Primary Care");
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
        'Monday': 'Mon',
        'Tuesday': 'Tue',
        'Wednesday': 'Wed',
        'Thursday': 'Thu',
        'Friday': 'Fri',
      }
      const totalTime = apiData.reduce((acc, curr) => acc + curr[key[d]], 0) == 0 ? 1 : apiData.reduce((acc, curr) => acc + curr[key[d]], 0);
      const cardiologyTotalTime = cardiologyData.reduce((acc, curr) => acc + curr[key[d]], 0);
      const neurologyTotalTime = neurologyData.reduce((acc, curr) => acc + curr[key[d]], 0);
      const pediatricsTotalTime = pediatricsData.reduce((acc, curr) => acc + curr[key[d]], 0);
      const primaryCareTotalTime = primaryCareData.reduce((acc, curr) => acc + curr[key[d]], 0);

      const items = [
        {
          name: cardiologyData.map((curr) => curr.ProviderName).join(' & '),
          percent: cardiologyTotalTime / totalTime * 100, // Oscillates High/Low
          department: 'Cardiology',
        },
        {
          name: neurologyData.map((curr) => curr.ProviderName).join(' & '),
          percent: neurologyTotalTime / totalTime * 100, // Oscillates Low/High
          department: 'Neurology',
        },
        {
          name: pediatricsData.map((curr) => curr.ProviderName).join(' & '),
          percent: pediatricsTotalTime / totalTime * 100, // Linear increase
          department: 'Pediatrics',
        },
        {
          name: primaryCareData.map((curr) => curr.ProviderName).join(' & '),
          percent: primaryCareTotalTime / totalTime * 100, // Linear increase
          department: "Primary Care",
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
