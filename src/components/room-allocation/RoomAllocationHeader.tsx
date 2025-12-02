import React from 'react';

type Scope = 'city' | 'campus' | 'building' | 'floor';

type Crumbs = {
  city?: string;
  campus?: string;
  buildingId?: string;
  buildingName?: string;
  floor?: number;
};

export interface RoomAllocationHeaderProps {
  scope: Scope;
  crumbs: Crumbs;
  buildingMeta: { floors?: number } | null | undefined;
  campusBuildings: any[];
  cityCampuses: string[];
  roomFilter: string | null;
  fromDate: string;
  toDate: string;
  setScope: (s: Scope) => void;
  setCrumbs: React.Dispatch<React.SetStateAction<Crumbs>>;
  setRoomFilter: (v: string | null) => void;
  setDrillFloor: (v: number | null) => void;
  setRange: (r: { from?: string; to?: string }) => void;
  handleBack: () => void;
}

export const RoomAllocationHeader: React.FC<RoomAllocationHeaderProps> = ({
  scope,
  crumbs,
  buildingMeta,
  campusBuildings,
  cityCampuses,
  roomFilter,
  fromDate,
  toDate,
  setScope,
  setCrumbs,
  setRoomFilter,
  setDrillFloor,
  setRange,
  handleBack,
}) => {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-500 text-rose-600 hover:bg-rose-50"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        {/* Scope breadcrumbs beside back button */}
        <div className="flex flex-wrap items-center text-sm gap-1">
          <button
            type="button"
            className={`px-2 py-1 rounded-full border ${
              scope === 'city'
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-violet-50 hover:border-violet-300'
            }`}
            onClick={() => {
              setScope('city');
              setRoomFilter(null);
              setDrillFloor(null);
              setCrumbs((c) => ({
                ...c,
                campus: undefined,
                buildingId: undefined,
                buildingName: undefined,
                floor: undefined,
              }));
              try {
                const base = '#/room-allocation';
                const params = new URLSearchParams();
                if (crumbs.city) params.set('city', String(crumbs.city));
                if (fromDate) params.set('from', fromDate);
                if (toDate) params.set('to', toDate);
                window.history.replaceState(null, '', `${base}?${params.toString()}`);
              } catch {
                /* ignore */
              }
            }}
            disabled={!crumbs.city}
            title={crumbs.city ? 'View city scope' : 'No city context'}
          >
            City
          </button>
          <span className="text-slate-300">›</span>
          <button
            type="button"
            className={`px-2 py-1 rounded-full border ${
              scope === 'city'
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-violet-50 hover:border-violet-300'
            }`}
            onClick={() => {
              setScope('city');
              setRoomFilter(null);
              setDrillFloor(null);
              setCrumbs((c) => ({
                ...c,
                campus: undefined,
                buildingId: undefined,
                buildingName: undefined,
                floor: undefined,
              }));
              try {
                const base = '#/room-allocation';
                const params = new URLSearchParams();
                if (crumbs.city) params.set('city', String(crumbs.city));
                if (fromDate) params.set('from', fromDate);
                if (toDate) params.set('to', toDate);
                window.history.replaceState(null, '', `${base}?${params.toString()}`);
              } catch {
                /* ignore */
              }
            }}
            disabled={!crumbs.city}
            title={crumbs.city || '—'}
          >
            {crumbs.city || '—'}
          </button>
          <span className="text-slate-300">›</span>
          <button
            type="button"
            className={`px-2 py-1 rounded-full border ${
              scope === 'campus'
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-violet-50 hover:border-violet-300'
            }`}
            onClick={() => {
              setScope('campus');
              setRoomFilter(null);
              setDrillFloor(null);
              setCrumbs((c) => ({
                ...c,
                buildingId: undefined,
                buildingName: undefined,
                floor: undefined,
              }));
              try {
                const base = '#/room-allocation';
                const params = new URLSearchParams();
                if (crumbs.campus) params.set('campus', String(crumbs.campus));
                if (fromDate) params.set('from', fromDate);
                if (toDate) params.set('to', toDate);
                window.history.replaceState(null, '', `${base}?${params.toString()}`);
              } catch {
                /* ignore */
              }
            }}
            disabled={!crumbs.campus}
            title={crumbs.campus || '—'}
          >
            {crumbs.campus || '—'}
          </button>
          <span className="text-slate-300">›</span>
          <button
            type="button"
            className={`px-2 py-1 rounded-full border ${
              scope === 'building'
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-violet-50 hover:border-violet-300'
            }`}
            onClick={() => {
              setScope('building');
              setRoomFilter(null);
              setDrillFloor(null);
              setCrumbs((c) => {
                const id = c.buildingId;
                return { ...c, buildingId: id, floor: undefined };
              });
              try {
                const base = '#/room-allocation';
                const params = new URLSearchParams();
                if (crumbs.buildingId) params.set('buildingId', String(crumbs.buildingId));
                if (crumbs.buildingName) params.set('buildingName', String(crumbs.buildingName));
                if (fromDate) params.set('from', fromDate);
                if (toDate) params.set('to', toDate);
                window.history.replaceState(null, '', `${base}?${params.toString()}`);
              } catch {
                /* ignore */
              }
            }}
            disabled={!(crumbs.buildingId || crumbs.buildingName)}
            title={crumbs.buildingName || '—'}
          >
            {crumbs.buildingName || '—'}
          </button>
          <span className="text-slate-300">›</span>
          <button
            type="button"
            className={`px-2 py-1 rounded-full border ${
              scope === 'floor'
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-violet-50 hover:border-violet-300'
            }`}
            onClick={() => {
              setScope('floor');
              setCrumbs((c) => {
                let nextFloor = c.floor;
                if (typeof nextFloor !== 'number') {
                  const inferred = roomFilter ? Math.floor((parseInt(roomFilter, 10) || 0) / 100) : NaN;
                  if (!Number.isNaN(inferred) && inferred > 0) nextFloor = inferred;
                  else if (buildingMeta?.floors && buildingMeta.floors > 0) nextFloor = 1;
                }
                return { ...c, floor: nextFloor };
              });
            }}
            disabled={!(buildingMeta?.floors && buildingMeta.floors > 0)}
            title={
              buildingMeta?.floors && (scope === 'building' || crumbs.floor === undefined || crumbs.floor === null)
                ? `Floors 1–${buildingMeta.floors}`
                : typeof crumbs.floor === 'number'
                ? `Floor ${crumbs.floor}`
                : 'Floor —'
            }
          >
            {buildingMeta?.floors && (scope === 'building' || crumbs.floor === undefined || crumbs.floor === null)
              ? `Floors 1–${buildingMeta.floors}`
              : typeof crumbs.floor === 'number'
              ? `Floor ${crumbs.floor}`
              : 'Floor —'}
          </button>

          {/* Inline heading for main insights */}
          <span className="ml-4 hidden md:inline-block text-base font-semibold text-slate-900">
            Utilization Insights
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setRange({ from: e.target.value, to: toDate })}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setRange({ from: fromDate, to: e.target.value })}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
      </div>
    </div>
  );
};

export default RoomAllocationHeader;


