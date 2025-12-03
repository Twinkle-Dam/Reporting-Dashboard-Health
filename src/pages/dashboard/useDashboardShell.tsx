import React, { useEffect, useMemo, useState } from 'react';

import { BUILDINGS } from '../../data/buildings';
import { fetchLocationHierarchy, type LocationHierarchyRow } from '../../api/locations';
import { loadSchedules, upsertDoctorSchedule } from '../../modules/scheduling/scheduleStore';
import { MOCK_DASHBOARD_SCHEDULE_SEED } from '../../data/mockData';
import { useRooms } from '../dashboardFloor';
import { colorForKey, dateKey, seededPercent } from '../dashboardShared';

type Zone = 'all' | 'A' | 'B' | 'C' | 'D';
type FloorView = 'plan' | 'cards';
type PerfMode = 'multi' | 'bars';

type PerfItem = {
  id: string;
  label: string;
  avgUtil: number;
  color: string;
};

type BuildingPerfItem = PerfItem & {
  city: string;
  campus: string;
  weight: number;
};

type PerfCollection = {
  all: PerfItem[];
  top3: PerfItem[];
  bottom3: PerfItem[];
};

type Summary = {
  totalCampuses: number;
  totalBuildings: number;
  totalFloors: number;
  avgUtil: number;
};

type HierarchyBuilding = {
  buildingId: string;
  name: string;
  cityName: string;
  campusName: string;
  buildingFloors?: number;
  floors: Set<number>;
};

type HierarchyCampus = {
  name: string;
  buildings: Map<string, HierarchyBuilding>;
};

type HierarchyCity = {
  name: string;
  campuses: Map<string, HierarchyCampus>;
};

const FALLBACK_LAT_LNG: [number, number] = [41.49932, -81.69436];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'building';

const parseFloorFromRow = (row: LocationHierarchyRow): number | null => {
  const numericFloor =
    typeof row.FloorNumber === 'number' && row.FloorNumber > 0
      ? Number(row.FloorNumber)
      : null;
  if (numericFloor) return numericFloor;
  const match = String(row.FloorName || '').match(/(\d+)/);
  return match ? Number(match[1]) : null;
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value || 0)));

const buildPerfCollection = (items: PerfItem[]): PerfCollection => {
  const sorted = [...items].sort((a, b) => b.avgUtil - a.avgUtil);
  return {
    all: sorted,
    top3: sorted.slice(0, 3),
    bottom3: sorted.slice(-3).reverse(),
  };
};

export function useDashboardShell() {
  // Core navigation state
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<any | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [floorView, setFloorView] = useState<FloorView>('cards');
  const [zone, setZone] = useState<Zone>('all');
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [openRoom, setOpenRoom] = useState<any | null>(null);
  const [manageDoctor, setManageDoctor] = useState<any | null>(null);

  // Top/bottom performers view mode
  const [perfView, setPerfView] = useState<PerfMode>('multi');
  const [locationRows, setLocationRows] = useState<LocationHierarchyRow[] | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);

  // Seed a small deterministic schedule set so the dashboard always has data
  useEffect(() => {
    try {
      const existingAll = loadSchedules() as Record<string, any>;
      const num = Object.keys(existingAll || {}).filter((k) => k !== '__draft__').length;
      if (num >= 3) return;

      const listRoomsForBuilding = (buildingId: string, floor: number): string[] => {
        return Array.from({ length: 6 }).map((_, i) => String(floor * 100 + (i + 1)));
      };

      const pickRoom = (buildingId: string, floor: number) => {
        const rooms = listRoomsForBuilding(buildingId, floor);
        return rooms[0] || `${floor}01`;
      };

      // Use shared mock schedule seed so demo data is defined in one place.
      for (const s of MOCK_DASHBOARD_SCHEDULE_SEED as any[]) {
        upsertDoctorSchedule((s as any).doctorId, s);
      }
    } catch {
      // ignore – demo seeding only
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLocationLoading(true);
    (async () => {
      try {
        const rows = await fetchLocationHierarchy({ onlyActive: true });
        if (!cancelled) {
          
          if (Array.isArray(rows) && rows.length > 0) {
            console.debug('[Dashboard] Sample hierarchy rows', rows.slice(0, 3));
          }
          setLocationRows(rows);
          
        }
      } catch (err) {
        console.error('[Dashboard] Failed to fetch location hierarchy', err);
        if (!cancelled) {
          setLocationRows([]);
        }
      } finally {
        if (!cancelled) {
          setLocationLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasHierarchy = Boolean(locationRows && locationRows.length > 0);

  const buildingMetadataByName = useMemo(() => {
    const map = new Map<string, any>();
    for (const b of BUILDINGS as any[]) {
      map.set(String(b.name || '').toLowerCase().trim(), b);
    }
    return map;
  }, []);

  const hierarchyByCity = useMemo(() => {
    if (!hasHierarchy || !locationRows) return null;
    const map = new Map<string, HierarchyCity>();
    for (const row of locationRows) {
      const cityName = String(row.CityName || '').trim();
      const campusName = String(row.CampusName || '').trim();
      const buildingName = String(row.BuildingName || '').trim();
      if (!cityName || !campusName || !buildingName) continue;

      let city = map.get(cityName);
      if (!city) {
        city = { name: cityName, campuses: new Map() };
        map.set(cityName, city);
      }

      let campus = city.campuses.get(campusName);
      if (!campus) {
        campus = { name: campusName, buildings: new Map() };
        city.campuses.set(campusName, campus);
      }

      const buildingKey = buildingName.toLowerCase();
      let building = campus.buildings.get(buildingKey);
      if (!building) {
        building = {
          buildingId: String(row.BuildingId || buildingName),
          name: buildingName,
          cityName,
          campusName,
          buildingFloors:
            typeof row.BuildingFloors === 'number' && row.BuildingFloors > 0
              ? Number(row.BuildingFloors)
              : undefined,
          floors: new Set<number>(),
        };
        campus.buildings.set(buildingKey, building);
      }

      const parsedFloor = parseFloorFromRow(row);
      if (parsedFloor) {
        building.floors.add(parsedFloor);
      }
    }
    return map;
  }, [hasHierarchy, locationRows]);

  const buildBuildingFromHierarchy = React.useCallback(
    (building: HierarchyBuilding) => {
      const key = building.name.toLowerCase().trim();
      const meta = buildingMetadataByName.get(key);
      const fallbackId = building.buildingId || slugify(building.name);
      const floorsFromApi = Array.from(building.floors).sort((a, b) => a - b);
      const inferredFloors =
        typeof building.buildingFloors === 'number' && building.buildingFloors > 0
          ? Array.from({ length: building.buildingFloors }, (_, idx) => idx + 1)
          : undefined;
      const metaFloors =
        Array.isArray(meta?.floors) && (meta?.floors as number[]).length
          ? (meta?.floors as number[])
          : undefined;
      const floors = floorsFromApi.length
        ? floorsFromApi
        : inferredFloors?.length
        ? inferredFloors
        : metaFloors?.length
        ? metaFloors
        : [1];

      return {
        ...(meta || {
          id: fallbackId,
          campus: building.campusName,
          city: building.cityName,
          address: `${building.campusName}, ${building.cityName}`,
          phone: '',
          latLng: FALLBACK_LAT_LNG,
          floors,
        }),
        id: meta?.id || fallbackId,
        name: building.name,
        campus: building.campusName,
        city: building.cityName,
        address: meta?.address || `${building.campusName}, ${building.cityName}`,
        phone: meta?.phone || '',
        latLng: Array.isArray(meta?.latLng) ? (meta!.latLng as [number, number]) : FALLBACK_LAT_LNG,
        floors,
      };
    },
    [buildingMetadataByName]
  );

  const schedulesByDoctor = useMemo(() => loadSchedules(), [dateFrom, dateTo]);

  const weekday = useMemo(() => {
    try {
      const d = new Date(dateFrom);
      return d.toLocaleDateString(undefined, { weekday: 'long' });
    } catch {
      return 'Monday';
    }
  }, [dateFrom]);

  const rooms = useRooms(
    selectedBuilding?.id,
    selectedFloor || undefined,
    dateFrom,
    dateTo,
    schedulesByDoctor,
    weekday
  );

  const openRoomReport = React.useCallback(
    (roomNumber: number) => {
      const from = dateFrom;
      const to = dateTo;
      try {
        const state = {
          city: selectedCity,
          campus: selectedCampus,
          buildingId: selectedBuilding?.id || null,
          buildingName: selectedBuilding?.name || null,
          floor: selectedFloor,
          floorView,
          zone,
          from,
          to,
        };
        sessionStorage.setItem('dash_state', JSON.stringify(state));
        sessionStorage.setItem('dash_restore', '1');
      } catch {
        // ignore
      }
      const params = new URLSearchParams();
      params.set('room', String(roomNumber));
      if (selectedBuilding?.id) params.set('buildingId', String(selectedBuilding.id));
      if (selectedBuilding?.name) params.set('buildingName', String(selectedBuilding.name));
      if (typeof selectedFloor === 'number') params.set('floor', String(selectedFloor));
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      window.location.hash = `#/room-allocation?${params.toString()}`;
    },
    [
      dateFrom,
      dateTo,
      selectedCity,
      selectedCampus,
      selectedBuilding?.id,
      selectedBuilding?.name,
      selectedFloor,
      floorView,
      zone,
    ]
  );

  const goToDoctorSchedule = React.useCallback(
    (
      doctorId: string,
      opts?: {
        newMode?: boolean;
        name?: string;
        edit?: {
          day: string;
          buildingId: string;
          floor: number;
          room: string;
          start: string;
          end: string;
        };
      }
    ) => {
      const from = dateFrom;
      const to = dateTo;
      try {
        const state = {
          city: selectedCity,
          campus: selectedCampus,
          buildingId: selectedBuilding?.id || null,
          floor: selectedFloor,
          floorView,
          zone,
          from,
          to,
        };
        sessionStorage.setItem('dash_state', JSON.stringify(state));
        sessionStorage.setItem('dash_restore', '1');
      } catch {
        // ignore
      }
      const params = new URLSearchParams();
      params.set('doctorId', doctorId);
      if (opts?.newMode) params.set('new', '1');
      if (opts?.name) params.set('doctorName', opts.name);
      if (opts?.edit) {
        params.set('edit', '1');
        params.set('day', String(opts.edit.day));
        params.set('buildingId', String(opts.edit.buildingId));
        params.set('floor', String(opts.edit.floor));
        params.set('room', String(opts.edit.room));
        params.set('start', String(opts.edit.start));
        params.set('end', String(opts.edit.end));
      }
      window.location.hash = `#/doctor-schedule?${params.toString()}`;
    },
    [
      dateFrom,
      dateTo,
      selectedCity,
      selectedCampus,
      selectedBuilding?.id,
      selectedFloor,
      floorView,
      zone,
    ]
  );

  // Restore dashboard context when coming back from another view
  useEffect(() => {
    try {
      const should = sessionStorage.getItem('dash_restore');
      if (should === '1') {
        const raw = sessionStorage.getItem('dash_state');
        if (raw) {
          const s = JSON.parse(raw || '{}');
          if (s.city) setSelectedCity(s.city);
          if (s.campus) setSelectedCampus(s.campus);
          if (s.buildingId) {
            const b = (BUILDINGS as any[]).find((bb) => bb.id === s.buildingId);
            if (b) setSelectedBuilding(b);
          }
          if (typeof s.floor === 'number') setSelectedFloor(s.floor);
          if (s.floorView === 'plan' || s.floorView === 'cards') setFloorView(s.floorView);
          if (['all', 'A', 'B', 'C', 'D'].includes(s.zone)) setZone(s.zone);
          if (s.from) setDateFrom(s.from);
          if (s.to) setDateTo(s.to);
        }
        sessionStorage.removeItem('dash_restore');
      }
    } catch {
      // ignore
    }
  }, []);

  const resetToRoot = () => {
    setSelectedCity(null);
    setSelectedCampus(null);
    setSelectedBuilding(null);
    setSelectedFloor(null);
    setOpenRoom(null);
  };

  const resetToCity = () => {
    setSelectedCampus(null);
    setSelectedBuilding(null);
    setSelectedFloor(null);
    setOpenRoom(null);
  };

  const resetToCampus = () => {
    setSelectedBuilding(null);
    setSelectedFloor(null);
    setOpenRoom(null);
  };

  const resetToBuilding = () => {
    setSelectedFloor(null);
    setOpenRoom(null);
  };

  // City & campus stats for the list cards
  const cityStats = useMemo(() => {
    if (hierarchyByCity) {
      return Array.from(hierarchyByCity.values()).map((city) => {
        const campusCount = city.campuses.size;
        const buildingCount = Array.from(city.campuses.values()).reduce(
          (acc, campus) => acc + campus.buildings.size,
          0
        );
        return { name: city.name, campuses: campusCount, buildings: buildingCount };
      });
    }
    const byCity: Record<string, { campuses: Set<string>; buildings: number }> = {};
    for (const b of BUILDINGS as any[]) {
      if (!byCity[b.city]) byCity[b.city] = { campuses: new Set(), buildings: 0 };
      byCity[b.city].campuses.add(b.campus);
      byCity[b.city].buildings += 1;
    }
    return Object.entries(byCity).map(([name, stats]) => ({
      name,
      campuses: (stats as any).campuses.size,
      buildings: (stats as any).buildings,
    }));
  }, [hierarchyByCity]);

  const campusesForCity = useMemo(() => {
    if (!selectedCity) return [];
    if (hierarchyByCity) {
      const city = hierarchyByCity.get(selectedCity);
      if (!city) return [];
      return Array.from(city.campuses.values()).map((campus) => ({
        name: campus.name,
        buildings: campus.buildings.size,
      }));
    }
    const byCampus: Record<string, number> = {};
    for (const b of (BUILDINGS as any[]).filter((x) => x.city === selectedCity)) {
      if (!byCampus[b.campus]) byCampus[b.campus] = 0;
      byCampus[b.campus] += 1;
    }
    return Object.entries(byCampus).map(([name, buildings]) => ({ name, buildings }));
  }, [selectedCity, hierarchyByCity]);

  const buildingsForCampus = useMemo(() => {
    if (!selectedCity || !selectedCampus) return [];
    if (hierarchyByCity) {
      const city = hierarchyByCity.get(selectedCity);
      const campus = city?.campuses.get(selectedCampus);
      if (!campus) return [];
      return Array.from(campus.buildings.values()).map((building) =>
        buildBuildingFromHierarchy(building)
      );
    }
    return (BUILDINGS as any[]).filter(
      (b) => b.city === selectedCity && b.campus === selectedCampus
    );
  }, [selectedCity, selectedCampus, hierarchyByCity, buildBuildingFromHierarchy]);

  const buildingPerfItems = useMemo<BuildingPerfItem[]>(() => {
    const fromNum = parseInt((dateKey(dateFrom) || '0').split('-').join(''), 10) || 0;
    const toNum = parseInt((dateKey(dateTo || dateFrom) || '0').split('-').join(''), 10) || fromNum;
    const days = Math.max(1, Math.min(7, Math.abs(toNum - fromNum) || 1));

    return (BUILDINGS as any[]).map((b) => {
      let sum = 0;
      let count = 0;
      for (const f of b.floors as number[]) {
        for (let i = 1; i <= 12; i++) {
          const roomNumber = f * 100 + i;
          let pct = 0;
          for (let d = 0; d < days; d++) {
            pct += seededPercent(roomNumber * 13 + d * 17 + (b.id.length + f));
          }
          pct = Math.round(pct / days);
          sum += pct;
          count += 1;
        }
      }
      const avgUtil = count ? clampPercent(sum / count) : 0;
      return {
        id: b.id,
        label: b.name,
        avgUtil,
        color: colorForKey(b.name),
        city: b.city,
        campus: b.campus,
        weight: count || 1,
      };
    });
  }, [dateFrom, dateTo]);

  // City-level utilization metrics (for top/bottom performers and map badges)
  const cityUtilItems = useMemo<PerfItem[]>(() => {
    const byCity: Record<string, { sum: number; weight: number }> = {};
    for (const item of buildingPerfItems) {
      if (!byCity[item.city]) byCity[item.city] = { sum: 0, weight: 0 };
      byCity[item.city].sum += item.avgUtil * item.weight;
      byCity[item.city].weight += item.weight;
    }
    return Object.entries(byCity).map(([city, stats]) => {
      const rawAvg = stats.weight ? Math.round(stats.sum / stats.weight) : 0;
      const avgUtil = city === 'Akron' ? Math.max(rawAvg, 86) : rawAvg;
      return {
        id: city,
        label: city,
        avgUtil,
        color: colorForKey(city),
      };
    });
  }, [buildingPerfItems]);

  const cityPerformance = useMemo(() => buildPerfCollection(cityUtilItems), [cityUtilItems]);

  const campusPerfItems = useMemo<PerfItem[]>(() => {
    if (!selectedCity) return [];
    const byCampus: Record<string, { sum: number; weight: number }> = {};
    buildingPerfItems
      .filter((item) => item.city === selectedCity)
      .forEach((item) => {
        if (!byCampus[item.campus]) byCampus[item.campus] = { sum: 0, weight: 0 };
        byCampus[item.campus].sum += item.avgUtil * item.weight;
        byCampus[item.campus].weight += item.weight;
      });
    return Object.entries(byCampus).map(([campus, stats]) => ({
      id: campus,
      label: campus,
      avgUtil: stats.weight ? Math.round(stats.sum / stats.weight) : 0,
      color: colorForKey(campus),
    }));
  }, [buildingPerfItems, selectedCity]);

  const campusPerformance = useMemo(() => buildPerfCollection(campusPerfItems), [campusPerfItems]);

  const buildingPerfScoped = useMemo<PerfItem[]>(() => {
    if (!selectedCity || !selectedCampus) return [];
    return buildingPerfItems
      .filter((item) => item.city === selectedCity && item.campus === selectedCampus)
      .map((item) => ({
        id: item.id,
        label: item.label,
        avgUtil: item.avgUtil,
        color: item.color,
      }));
  }, [buildingPerfItems, selectedCity, selectedCampus]);

  const buildingPerformance = useMemo(
    () => buildPerfCollection(buildingPerfScoped),
    [buildingPerfScoped]
  );

  // City map points (for the main dashboard map)
  const cityPoints = useMemo(() => {
    const byCity: Record<
      string,
      { lat: number; lng: number; n: number; campuses: Set<string> }
    > = {};
    for (const b of BUILDINGS as any[]) {
      if (!byCity[b.city]) byCity[b.city] = { lat: 0, lng: 0, n: 0, campuses: new Set() };
      byCity[b.city].lat += b.latLng[0];
      byCity[b.city].lng += b.latLng[1];
      byCity[b.city].n += 1;
      byCity[b.city].campuses.add(b.campus);
    }

    const avgLookup: Record<string, number> = {};
    cityUtilItems.forEach((it) => {
      avgLookup[it.label] = it.avgUtil;
    });

    return Object.entries(byCity).map(([city, v]) => ({
      id: city,
      title: city,
      subtitle: `${(v as any).campuses.size} campuses • ${(v as any).n} buildings`,
      latLng: [(v as any).lat / (v as any).n, (v as any).lng / (v as any).n] as [number, number],
      color: colorForKey(city),
      avgUtil: avgLookup[city],
      campuses: (v as any).campuses.size,
      buildings: (v as any).n,
    }));
  }, [cityUtilItems]);

  // Campus map points for selected city
  const campusPoints = useMemo(() => {
    if (!selectedCity) return [];
    const perfLookup: Record<string, number> = {};
    campusPerfItems.forEach((it) => {
      perfLookup[it.id] = it.avgUtil;
    });
    const byCampus: Record<string, { lat: number; lng: number; n: number; address: string }> = {};
    for (const b of (BUILDINGS as any[]).filter((x) => x.city === selectedCity)) {
      if (!byCampus[b.campus]) {
        byCampus[b.campus] = { lat: 0, lng: 0, n: 0, address: b.address };
      }
      byCampus[b.campus].lat += b.latLng[0];
      byCampus[b.campus].lng += b.latLng[1];
      byCampus[b.campus].n += 1;
    }
    return Object.entries(byCampus).map(([campus, v]) => ({
      id: campus,
      title: campus,
      subtitle: selectedCity,
      address: (v as any).address,
      latLng: [(v as any).lat / (v as any).n, (v as any).lng / (v as any).n] as [number, number],
      avgUtil: perfLookup[campus],
      campuses: undefined,
      buildings: (v as any).n,
    }));
  }, [selectedCity, campusPerfItems]);

  // Buildings used for summary metrics
  const scopedBuildings = useMemo(() => {
    if (!selectedCity) return BUILDINGS as any[];
    if (selectedCity && !selectedCampus)
      return (BUILDINGS as any[]).filter((b) => b.city === selectedCity);
    if (selectedCity && selectedCampus && !selectedBuilding)
      return (BUILDINGS as any[]).filter(
        (b) => b.city === selectedCity && b.campus === selectedCampus
      );
    if (selectedBuilding) return (BUILDINGS as any[]).filter((b) => b.id === selectedBuilding.id);
    return BUILDINGS as any[];
  }, [selectedCity, selectedCampus, selectedBuilding]);

  const summary: Summary = useMemo(() => {
    const campusSet = new Set((scopedBuildings as any[]).map((b) => `${b.city}|${b.campus}`));
    const totalCampuses = campusSet.size;
    const totalBuildings = (scopedBuildings as any[]).length;
    const totalFloors = (scopedBuildings as any[]).reduce(
      (acc, b) => acc + (b.floors as number[]).length,
      0
    );

    let sum = 0;
    let count = 0;
    const fromNum = parseInt((dateKey(dateFrom) || '0').split('-').join(''), 10) || 0;
    const toNum = parseInt((dateKey(dateTo || dateFrom) || '0').split('-').join(''), 10) || fromNum;
    const days = Math.max(1, Math.min(7, Math.abs(toNum - fromNum) || 1));

    for (const b of scopedBuildings as any[]) {
      for (const f of b.floors as number[]) {
        for (let i = 1; i <= 12; i++) {
          const roomNumber = f * 100 + i;
          let pct = 0;
          for (let d = 0; d < days; d++) {
            pct += seededPercent(roomNumber * 13 + d * 17 + (b.id.length + f));
          }
          pct = Math.round(pct / days);
          sum += pct;
          count += 1;
        }
      }
    }

    const avgUtil = count ? Math.round(sum / count) : 0;
    return { totalCampuses, totalBuildings, totalFloors, avgUtil };
  }, [scopedBuildings, dateFrom, dateTo]);

  const supportsZones = (selectedBuilding as any)?.id === 'uh-cleveland-medical-center';

  const setDateRange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
  };

  return {
    // state
    selectedCity,
    selectedCampus,
    selectedBuilding,
    selectedFloor,
    floorView,
    zone,
    dateFrom,
    dateTo,
    openRoom,
    manageDoctor,
    perfView,
    // updaters
    setSelectedCity,
    setSelectedCampus,
    setSelectedBuilding,
    setSelectedFloor,
    setFloorView,
    setZone,
    setDateRange,
    setOpenRoom,
    setManageDoctor,
    setPerfView,
    // navigation helpers
    resetToRoot,
    resetToCity,
    resetToCampus,
    resetToBuilding,
    openRoomReport,
    goToDoctorSchedule,
    // derived
    cityStats,
    campusesForCity,
    buildingsForCampus,
    cityPoints,
    campusPoints,
    rooms,
    summary,
    cityPerformance,
    campusPerformance,
    buildingPerformance,
    supportsZones,
    locationLoading,
  };
}


