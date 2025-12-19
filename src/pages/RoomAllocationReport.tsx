import React from 'react';
import DoctorSlotsPopup from '../components/room-allocation/DoctorSlotsPopup';
import RoomAllocationHeader from '../components/room-allocation/RoomAllocationHeader';
import RoomAllocationSidebar from '../components/room-allocation/RoomAllocationSidebar';
import RoomAllocationInsights from '../components/room-allocation/RoomAllocationInsights';
import CityCampusUtilizationChart from '../components/room-allocation/CityCampusUtilizationChart';
import CampusBuildingUtilizationChart from '../components/room-allocation/CampusBuildingUtilizationChart';
import BuildingFloorUtilizationSection from '../components/room-allocation/BuildingFloorUtilizationSection';
import RoomAllocationExportActions from '../components/room-allocation/RoomAllocationExportActions';
import { useRoomAllocationReport } from './useRoomAllocationReport';

function getUtilizationClass(value: number): string {
  if (value >= 80) return 'bg-green-100 text-green-800';
  if (value >= 60) return 'bg-pink-100 text-pink-800';
  return 'bg-red-100 text-red-800';
}

const RoomAllocationReport: React.FC = () => {
  const {
    data,
    loading,
    error,
    roomFilter,
    setRoomFilter,
    crumbs,
    setCrumbs,
    scope,
    setScope,
    drillFloor,
    setDrillFloor,
    fromDate,
    toDate,
    floorsCount,
    buildingMeta,
    campusBuildings,
    cityCampuses,
    cityCampusSeries,
    campusSeries,
    floorDailyTable,
    floorSeries,
    scopeDayBreakdown,
    allDeptList,
    scopeLabel,
    resolvedBuilding,
    syntheticRoomsForFloor,
    listRoomsForBuilding,
    providerView,
    setProviderView,
    doctorPopup,
    setDoctorPopup,
    openDoctorPopup,
    setRange,
    handleBack,
    handlePrint,
    handleExportCSV,
    handleExportExcel,
  } = useRoomAllocationReport();

  return (
    <div className="m-4">
      <div className="mx-auto w-full max-w-[1400px] rounded-[32px] bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-[0_28px_80px_rgba(15,23,42,0.22)] ring-1 ring-slate-200/80 p-5 md:p-6">
        {loading && (
          <div className="mb-2 flex items-center text-xs text-slate-500">
            <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-violet-500" />
            Refreshing room utilization…
          </div>
        )}
        {error && !loading && (
          <div className="mb-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}
        <RoomAllocationHeader
          scope={scope}
          crumbs={crumbs}
          buildingMeta={buildingMeta}
          campusBuildings={campusBuildings}
          cityCampuses={cityCampuses}
          roomFilter={roomFilter}
          fromDate={fromDate}
          toDate={toDate}
          setScope={setScope}
          setCrumbs={setCrumbs}
          setRoomFilter={setRoomFilter}
          setDrillFloor={setDrillFloor}
          setRange={setRange}
          handleBack={handleBack}
        />
        {/* Summary / filters on the left, insights on the right */}
        <div className="mt-2 grid grid-cols-1 lg:grid-cols-[minmax(320px,380px),minmax(0,1fr)] gap-8 items-start">
          <RoomAllocationSidebar
            scope={scope}
            crumbs={crumbs}
            buildingMeta={buildingMeta}
            campusBuildings={campusBuildings as any[]}
            cityCampuses={cityCampuses}
            floorsCount={floorsCount}
            roomFilter={roomFilter}
            scopeLabel={scopeLabel}
            summaryData={data}
            resolvedBuilding={resolvedBuilding}
            syntheticRoomsForFloor={syntheticRoomsForFloor}
            listRoomsForBuilding={listRoomsForBuilding}
            setScope={setScope}
            setCrumbs={setCrumbs}
            setRoomFilter={setRoomFilter}
            setDrillFloor={setDrillFloor}
          />

          <RoomAllocationInsights
            data={data}
            scopeDayBreakdown={scopeDayBreakdown as any}
            allDepartments={allDeptList}
            providerView={providerView}
            onChangeView={setProviderView}
            onDoctorClick={openDoctorPopup}
            roomFilter={roomFilter}
          />
        </div>
      </div>
      <div className="mt-2 space-y-6">
        {/* Doctor schedules popup */}
        <DoctorSlotsPopup popup={doctorPopup} onClose={() => setDoctorPopup(null)} />

        <CityCampusUtilizationChart
          scope={scope}
          city={crumbs.city}
          data={cityCampusSeries as any}
          onSelectCampus={(name) => {
            setScope('campus');
            setCrumbs((c) => ({
              ...c,
              campus: String(name),
              buildingId: undefined,
              buildingName: undefined,
              floor: undefined,
            }));
            setRoomFilter(null);
            setDrillFloor(null);
          }}
        />

        <CampusBuildingUtilizationChart
          scope={scope}
          campus={crumbs.campus}
          hasResolvedBuilding={!!resolvedBuilding || (crumbs.floor !== undefined && crumbs.floor !== null)}
          data={campusSeries as any}
          onSelectBuilding={(name) => {
            const b = (campusBuildings as any[]).find((x) => String(x.name) === String(name));
            if (b) {
              setScope('building');
              setCrumbs((c) => ({
                ...c,
                buildingId: (b as any).id,
                buildingName: (b as any).name,
                floor: undefined,
              }));
              setRoomFilter(null);
              setDrillFloor(null);
            }
          }}
        />

        <BuildingFloorUtilizationSection
          scope={scope}
          floorDailyTable={floorDailyTable as any}
          hasFloorSeries={floorSeries.length > 0}
          buildingName={crumbs.buildingName}
          drillFloor={drillFloor}
          resolvedBuildingId={((resolvedBuilding as any)?.id) || ''}
          listRoomsForBuilding={listRoomsForBuilding}
          onSelectFloor={(f) => setDrillFloor(f)}
          onSelectRoom={(floor, room) => {
            setScope('floor');
            setCrumbs((c) => ({ ...c, floor: floor || c.floor }));
            setRoomFilter(String(room));
          }}
        />

        <RoomAllocationExportActions
          onPrint={handlePrint}
          onExportCSV={handleExportCSV}
          onExportExcel={handleExportExcel}
        />
      </div>
    </div>
  );
};

export default RoomAllocationReport;


