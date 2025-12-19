import React, { useCallback, useRef, useState, useMemo } from 'react';
import { BUILDINGS } from '../data/buildings';
import { useAllocationFilters } from '../components/room-allocation/hooks/useAllocationFilters';
import { useLocationHierarchy } from '../components/room-allocation/hooks/useLocationHierarchy';
import { useRoomList } from '../components/room-allocation/hooks/useRoomList';
import { useDeepLinkSync } from '../components/room-allocation/hooks/useDeepLinkSync';
import { useUtilizationData } from '../components/room-allocation/hooks/useUtilizationData';
import { useAllocationExport } from '../components/room-allocation/hooks/useAllocationExport';
import { useScopedRooms } from '../components/room-allocation/hooks/useScopedRooms';
import { useAllocationCharts } from '../components/room-allocation/hooks/useAllocationCharts';
import { useDoctorPopup } from '../components/room-allocation/useDoctorPopup';

function useQueryParam(key: string) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

export function useRoomAllocationReport() {

  // Read initial params from URL synchronously if possible for initial render
  const initParams = useMemo(() => {
    try {
      if (typeof window !== 'undefined') {
        const hash = window.location.hash || '';
        const qIndex = hash.indexOf('?');
        if (qIndex >= 0) {
          const params = new URLSearchParams(hash.slice(qIndex + 1));
          const rf = params.get('room');
          const rk = params.get('roomKey');
          const buildingId = params.get('buildingId');
          const buildingName = params.get('buildingName');
          const floor = params.get('floor');
          const floorId = params.get('floorId');
          const startDate = params.get('from');
          const endDate = params.get('to');
          return {
            roomFilter: rf ? decodeURIComponent(rf) : null,
            roomKey: rk ? decodeURIComponent(rk) : null,
            buildingId: buildingId ? decodeURIComponent(buildingId) : null,
            buildingName: buildingName ? decodeURIComponent(buildingName) : null,
            floor: floor ? decodeURIComponent(floor) : null,
            floorId: floorId ? decodeURIComponent(floorId) : null,
            startDate: startDate ? decodeURIComponent(startDate) : null,
            endDate: endDate ? decodeURIComponent(endDate) : null,
          };
        }
      }
    } catch { }
    return {};
  }, []);

  // 1. Core State & Filters
  const {
    roomFilter,
    setRoomFilter,
    roomKey,
    setRoomKey,
    range,
    setRange,
    crumbs,
    setCrumbs,
    scope,
    setScope,
    drillFloor,
    setDrillFloor,
    useMock,
    setUseMock,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    buildingId,
    setBuildingId,
    buildingName,
    setBuildingName,
    floor,
    setFloor,
    floorId,
    setFloorId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
  } = useAllocationFilters(initParams);

  const [providerView, setProviderView] = useState<'table' | 'donut' | 'ribbons'>('ribbons');
  const [doctorPopup, setDoctorPopup] = useState<any | null>(null);

  // 2. Location Hierarchy
  const { locationHierarchyRows, resolvedBuilding, resolvedLocationId, buildingMeta } =
    useLocationHierarchy(crumbs);

  // 3. Room Lists (Remote + Mock)
  const { remoteRoomsByBuilding, listRoomsForBuilding } = useRoomList(
    useMock,
    resolvedBuilding,
    typeof crumbs.floor === 'number' ? crumbs.floor : undefined,
    locationHierarchyRows,
    crumbs.buildingId
  );

  // 4. Scoped Rooms (Derived)
  const scopedRooms = useScopedRooms(
    scope,
    crumbs,
    resolvedBuilding,
    roomFilter,
    listRoomsForBuilding,
    buildingMeta
  );

  // 5. Utilization Data Fetching
  const { data, loading, error } = useUtilizationData(
    useMock,
    crumbs,
    roomFilter,
    roomKey,
    range,
    fromDate,
    toDate,
    resolvedLocationId,
    resolvedBuilding,
    remoteRoomsByBuilding,
    scopedRooms
  );

  // 6. Deep Linking / URL Sync
  useDeepLinkSync(
    setRoomKey,
    setRoomFilter,
    setRange,
    setFromDate,
    setToDate,
    setUseMock,
    setCrumbs,
    setScope,
    fromDate,
    toDate,
    range,
    roomFilter
  );

  // 7. Export Helpers
  const { handleExportCSV, handleExportExcel } = useAllocationExport(data);

  // 8. UI Helpers (Popup, Print, Back, Refs)
  const { openDoctorPopup } = useDoctorPopup(crumbs, resolvedBuilding, setDoctorPopup);
  const handlePrint = useCallback(() => window.print(), []);
  const handleBack = useCallback(() => {
    window.history.back();
  }, []);
  const tableRef = useRef<HTMLTableElement | null>(null);

  const syntheticRoomsForFloor = useCallback((floor: number, count: number = 6): number[] => {
    return Array.from({ length: count }).map((_, i) => floor * 100 + (i + 1));
  }, []);

  // 9. Derived UI Data (Dropdown options)
  const floorsCount = useMemo(() => {
    if (buildingMeta?.floors && Number(buildingMeta.floors) > 0) return Number(buildingMeta.floors);
    if (crumbs.buildingName || resolvedBuilding) return 5;
    return undefined;
  }, [buildingMeta?.floors, crumbs.buildingName, resolvedBuilding]);

  const campusBuildings = useMemo(() => {
    if (!crumbs.campus) return [];
    const target = String(crumbs.campus).toLowerCase().trim();
    return (BUILDINGS as any[]).filter((b) => String(b.campus).toLowerCase().trim() === target);
  }, [crumbs.campus]);

  const cityCampuses = useMemo(() => {
    if (!crumbs.city) return [];
    const target = String(crumbs.city).toLowerCase().trim();
    const set = new Set<string>();
    for (const b of BUILDINGS as any[]) {
      if (String(b.city).toLowerCase().trim() === target && b.campus) {
        set.add(b.campus);
      }
    }
    return Array.from(set).sort();
  }, [crumbs.city]);

  // 10. Chart Data
  // fetch data from api
  const {
    cityCampusSeries,
    campusSeries,
    floorSeries,
    floorDailyTable,
    scopeDayBreakdown,
    allDeptList,
    scopeLabel,
  } = useAllocationCharts(data, crumbs, scope, resolvedBuilding, floorsCount, floorId, startDate, endDate);

  return {
    data,
    loading,
    error,
    roomFilter,
    setRoomFilter,
    roomKey,
    setRoomKey,
    range,
    setRange,
    crumbs,
    setCrumbs,
    scope,
    setScope,
    drillFloor,
    setDrillFloor,
    useMock,
    setUseMock,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    handlePrint,
    tableRef,
    handleBack,
    doctorPopup,
    setDoctorPopup,
    openDoctorPopup,
    handleExportCSV,
    handleExportExcel,
    resolvedBuilding,
    listRoomsForBuilding,
    remoteRoomsByBuilding,
    scopedRooms,
    syntheticRoomsForFloor,
    buildingMeta,
    floorsCount,
    campusBuildings,
    cityCampuses,
    providerView,
    setProviderView,
    // Chart Data
    cityCampusSeries,
    campusSeries,
    floorSeries,
    floorDailyTable,
    scopeDayBreakdown,
    allDeptList,
    scopeLabel,
  };
}
