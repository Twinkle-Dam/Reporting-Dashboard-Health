import React, { useEffect, useMemo, useState } from 'react';

import { BUILDINGS } from '../../data/buildings';
import { loadSchedules, upsertDoctorSchedule } from '../../modules/scheduling/scheduleStore';
import { MOCK_DASHBOARD_SCHEDULE_SEED } from '../../data/mockData';
import { useRooms } from '../dashboardFloor';
import { colorForKey, dateKey, seededPercent } from '../dashboardShared';

type Zone = 'all' | 'A' | 'B' | 'C' | 'D';
type FloorView = 'plan' | 'cards';
type PerfMode = 'multi' | 'bars';

type CityPerfItem = {
  id: string;
  label: string;
  avgUtil: number;
  color: string;
};

type Summary = {
  totalCampuses: number;
  totalBuildings: number;
  totalFloors: number;
  avgUtil: number;
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

  const campusesForCity = useMemo(() => {
    if (!selectedCity) return [];
    const byCampus: Record<string, number> = {};
    for (const b of (BUILDINGS as any[]).filter((x) => x.city === selectedCity)) {
      if (!byCampus[b.campus]) byCampus[b.campus] = 0;
      byCampus[b.campus] += 1;
    }
    return Object.entries(byCampus).map(([name, buildings]) => ({ name, buildings }));
  }, [selectedCity]);

  const buildingsForCampus = useMemo(() => {
    if (!selectedCity || !selectedCampus) return [];
    return (BUILDINGS as any[]).filter(
      (b) => b.city === selectedCity && b.campus === selectedCampus
    );
  }, [selectedCity, selectedCampus]);

  // City-level utilization metrics (for top/bottom performers and map badges)
  const cityUtilItems = useMemo<CityPerfItem[]>(() => {
    const byCity: Record<string, { sum: number; count: number }> = {};

    const fromNum = parseInt((dateKey(dateFrom) || '0').split('-').join(''), 10) || 0;
    const toNum = parseInt((dateKey(dateTo || dateFrom) || '0').split('-').join(''), 10) || fromNum;
    const days = Math.max(1, Math.min(7, Math.abs(toNum - fromNum) || 1));

    for (const b of BUILDINGS as any[]) {
      const city = b.city as string;
      if (!byCity[city]) byCity[city] = { sum: 0, count: 0 };
      for (const f of b.floors as number[]) {
        for (let i = 1; i <= 12; i++) {
          const roomNumber = f * 100 + i;
          let pct = 0;
          for (let d = 0; d < days; d++) {
            pct += seededPercent(roomNumber * 13 + d * 17 + (b.id.length + f));
          }
          pct = Math.round(pct / days);
          byCity[city].sum += pct;
          byCity[city].count += 1;
        }
      }
    }

    const items: CityPerfItem[] = [];
    for (const [city, v] of Object.entries(byCity)) {
      const rawAvg = v.count ? Math.round(v.sum / v.count) : 0;
      // Nudge Akron up so it consistently appears as a clear top performer in the demo
      const avgUtil = city === 'Akron' ? Math.max(rawAvg, 86) : rawAvg;
      items.push({
        id: city,
        label: city,
        avgUtil,
        color: colorForKey(city),
      });
    }

    return items;
  }, [dateFrom, dateTo]);

  const cityPerformance = useMemo(() => {
    const sorted = [...cityUtilItems].sort((a, b) => b.avgUtil - a.avgUtil);
    return {
      all: sorted,
      top3: sorted.slice(0, 3),
      bottom3: sorted.slice(-3).reverse(),
    };
  }, [cityUtilItems]);

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
    }));
  }, [selectedCity]);

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
    supportsZones,
  };
}


