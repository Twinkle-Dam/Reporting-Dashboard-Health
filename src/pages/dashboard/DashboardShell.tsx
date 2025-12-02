import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import TopBottomPerformersCard from './TopBottomPerformersCard';
import { MapPanel, MapPanelGeneric } from './MapPanels';
import { CityView, CampusView, BuildingsList, BuildingView } from './Steps';
import { zoneColorHex } from '../dashboardShared';
import { FloorPlan, RoomCardsGrid } from '../dashboardFloor';
import { Modal, DoctorSchedule, DoctorManageModal } from './DoctorModals';
import { useDashboardShell } from './useDashboardShell';

// Fix default marker icon paths for common bundlers
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

type BreadcrumbsProps = {
  city: string | null;
  campus: string | null;
  building: any | null;
  floor: number | null;
  onResetToRoot: () => void;
  onResetToCity?: () => void;
  onResetToCampus?: () => void;
  onResetToBuilding?: () => void;
};

function Breadcrumbs({
  city,
  campus,
  building,
  floor,
  onResetToRoot,
  onResetToCity,
  onResetToCampus,
  onResetToBuilding,
}: BreadcrumbsProps) {
  return (
    <div className="flex items-center text-sm text-slate-600 gap-2">
      <button className="hover:text-slate-900" onClick={onResetToRoot}>
        City
      </button>
      <span>/</span>
      {city ? (
        <button className="hover:text-slate-900" onClick={onResetToCity}>
          {city}
        </button>
      ) : (
        <span className="text-slate-400">City</span>
      )}
      <span>/</span>
      {campus ? (
        <button className="hover:text-slate-900" onClick={onResetToCampus}>
          {campus}
        </button>
      ) : (
        <span className="text-slate-400">Campus</span>
      )}
      <span>/</span>
      {building ? (
        <button className="hover:text-slate-900" onClick={onResetToBuilding}>
          {building.name}
        </button>
      ) : (
        <span className="text-slate-400">Building</span>
      )}
      <span>/</span>
      {floor ? <span>Floor {floor}</span> : <span className="text-slate-400">Floor</span>}
    </div>
  );
}

type DateRange = { from: string; to: string };

function DateRangeControls({
  fromDate,
  toDate,
  onChange,
}: {
  fromDate: string;
  toDate: string;
  onChange: (range: DateRange) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-600">From</label>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => onChange({ from: e.target.value, to: toDate })}
          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-600">To</label>
        <input
          type="date"
          value={toDate}
          onChange={(e) => onChange({ from: fromDate, to: e.target.value })}
          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      </div>
      <button
        onClick={() => {
          const today = new Date().toISOString().slice(0, 10);
          onChange({ from: today, to: today });
        }}
        className="h-9 rounded-md bg-slate-900 px-3 text-sm font-medium text-white shadow hover:bg-slate-800"
      >
        Today
      </button>
    </div>
  );
}

function SummaryCardsTop({ summary }: { summary: { avgUtil: number } }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700 mr-2">
        Avg. Utilization
      </div>
      <div className="text-lg font-semibold text-emerald-700">{summary.avgUtil}%</div>
    </div>
  );
}

export function DashboardShell() {
  const {
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
  } = useDashboardShell();

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-3">
      <div className="mb-2 flex items-center justify-end gap-4">
        <DateRangeControls
          fromDate={dateFrom}
          toDate={dateTo}
          onChange={({ from, to }) => setDateRange(from, to)}
        />
      </div>

      {selectedCity || selectedCampus || selectedBuilding || selectedFloor ? (
        <div className="mb-2">
          <Breadcrumbs
            city={selectedCity}
            campus={selectedCampus}
            building={selectedBuilding}
            floor={selectedFloor}
            onResetToRoot={resetToRoot}
            onResetToCity={selectedCity ? resetToCity : undefined}
            onResetToCampus={selectedCampus ? resetToCampus : undefined}
            onResetToBuilding={selectedBuilding ? resetToBuilding : undefined}
          />
        </div>
      ) : null}

      {/* Step 1: City */}
      {!selectedCity && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 lg:items-stretch">
            <div className="lg:col-span-3">
              <TopBottomPerformersCard
                top={cityPerformance.top3}
                bottom={cityPerformance.bottom3}
                overallAvgUtil={summary.avgUtil}
                mode={perfView}
                onChangeMode={setPerfView}
              />
            </div>
            <div className="lg:col-span-1">
              <MapPanelGeneric
                title="Service Cities"
                subtitle="UH Hospitals & Health Centers by City"
                items={cityPoints}
                onClickItem={(it) => setSelectedCity(it.id)}
              />
            </div>
          </div>
          <CityView
            cities={cityStats}
            onSelectCity={(city) => {
              setSelectedCity(city);
            }}
          />
        </div>
      )}

      {/* Step 2: Campus */}
      {selectedCity && !selectedCampus && (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-800">
            Campus Locations
            <div className="mt-1 text-xs font-normal text-slate-600">
              Click on any campus marker to view buildings and facilities
            </div>
          </div>
          <MapPanelGeneric
            title="Campus Locations"
            subtitle={`City: ${selectedCity}`}
            items={campusPoints}
            onClickItem={(it) => setSelectedCampus(it.id)}
          />
          <CampusView
            city={selectedCity}
            campuses={campusesForCity}
            onSelectCampus={(campus) => setSelectedCampus(campus)}
          />
        </div>
      )}

      {/* Step 3: Building list + Map */}
      {selectedCity && selectedCampus && !selectedBuilding && (
        <div className="mt-6 space-y-6">
          <MapPanel
            buildings={buildingsForCampus}
            onSelectBuilding={setSelectedBuilding}
            selectedBuilding={selectedBuilding as any}
          />
          <BuildingsList buildings={buildingsForCampus} onSelectBuilding={setSelectedBuilding} />
        </div>
      )}

      {/* Step 4: Floors */}
      {selectedBuilding && !selectedFloor && (
        <div className="mt-6">
          <BuildingView building={selectedBuilding} onSelectFloor={setSelectedFloor as any} />
        </div>
      )}

      {/* Step 5: Rooms */}
      {selectedBuilding && selectedFloor && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {supportsZones ? (
              <div className="flex items-center gap-3">
                <div className="text-sm text-slate-600">Zone</div>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                  {(['all', 'A', 'B', 'C', 'D'] as const).map((z) => (
                    <button
                      key={z}
                      onClick={() => setZone(z)}
                      className={`px-3 py-1.5 text-sm rounded-md ${
                        zone === z ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {z === 'all' ? 'All' : `Zone ${z}`}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div />
            )}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              <button
                onClick={() => setFloorView('plan')}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  floorView === 'plan'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Plan
              </button>
              <button
                onClick={() => setFloorView('cards')}
                className={`px-3 py-1.5 text-sm rounded-md ${
                  floorView === 'cards'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Cards
              </button>
            </div>
          </div>

          {floorView === 'plan' ? (
            <FloorPlan
              building={selectedBuilding}
              floor={selectedFloor}
              rooms={rooms}
              onOpenDoctor={setOpenRoom}
              onOpenReport={openRoomReport}
            />
          ) : (
            <RoomCardsGrid
              rooms={rooms}
              zone={zone}
              supportsZones={supportsZones}
              onOpenDoctor={setOpenRoom}
              onOpenReport={openRoomReport}
              onOpenManageDoctor={(doctor) => setManageDoctor(doctor)}
            />
          )}

          {/* Zone legend */}
          {supportsZones ? (
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {(['A', 'B', 'C', 'D'] as const).map((z) => (
                <div key={z} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: zoneColorHex(z) }}
                  ></span>
                  <span className="text-xs text-slate-700">{`Zone ${z}`}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <Modal open={!!openRoom} onClose={() => setOpenRoom(null)}>
        {openRoom && (
          <DoctorSchedule
            room={openRoom}
            date={dateFrom}
            onClose={() => setOpenRoom(null)}
            onOpenDoctorSchedule={goToDoctorSchedule}
          />
        )}
      </Modal>
      <Modal open={!!manageDoctor} onClose={() => setManageDoctor(null)}>
        {manageDoctor && (
          <DoctorManageModal
            doctor={manageDoctor}
            onClose={() => setManageDoctor(null)}
            onOpenDoctorSchedule={goToDoctorSchedule}
          />
        )}
      </Modal>
    </div>
  );
}

export default DashboardShell;
