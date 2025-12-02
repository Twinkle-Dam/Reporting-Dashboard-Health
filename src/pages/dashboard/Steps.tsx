import React from 'react';
import { Badge, colorForKey, rgba } from '../dashboardShared';

type CityViewProps = {
  cities: any[];
  onSelectCity: (cityName: string) => void;
};

type CampusViewProps = {
  city: string;
  campuses: any[];
  onSelectCampus: (campusName: string) => void;
};

type BuildingsListProps = {
  buildings: any[];
  onSelectBuilding: (b: any) => void;
};

type BuildingViewProps = {
  building: any;
  onSelectFloor: (floor: number) => void;
};

export function CityView({ cities, onSelectCity }: CityViewProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-slate-900 text-base font-semibold">Select City</div>
          <div className="text-slate-600 text-xs">Choose a city</div>
        </div>
        <Badge>{cities.length} cities</Badge>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {cities.map((c: any) => (
          <button
            key={c.name}
            onClick={() => onSelectCity(c.name)}
            className="flex items-center justify-between rounded-lg px-3 py-2 text-left hover:shadow"
            style={{
              border: `1px solid ${colorForKey(c.name)}`,
              backgroundColor: rgba(colorForKey(c.name), 0.08),
            }}
          >
            <div>
              <div className="font-medium" style={{ color: colorForKey(c.name) }}>
                {c.name}
              </div>
              <div className="text-xs text-slate-600">
                {c.campuses} campuses • {c.buildings} buildings
              </div>
            </div>
            <span
              className="ml-3 rounded-md px-2 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: colorForKey(c.name) }}
            >
              Select
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function CampusView({ city, campuses, onSelectCampus }: CampusViewProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-slate-900 text-lg font-semibold">Select Campus</div>
          <div className="text-slate-600 text-sm">City: {city}</div>
        </div>
        <Badge>{campuses.length} campuses</Badge>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {campuses.map((camp: any) => (
          <button
            key={camp.name}
            onClick={() => onSelectCampus(camp.name)}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:bg-white hover:shadow"
          >
            <div>
              <div className="text-slate-900 font-medium">{camp.name}</div>
              <div className="text-xs text-slate-600">{camp.buildings} buildings</div>
            </div>
            <span className="ml-3 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white">
              Select
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function BuildingsList({ buildings, onSelectBuilding }: BuildingsListProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-slate-900 text-lg font-semibold">Select Building</div>
          <div className="text-slate-600 text-sm">Choose a building to view floors</div>
        </div>
        <Badge>{buildings.length} buildings</Badge>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
        {buildings.map((b: any) => (
          <button
            key={b.id}
            onClick={() => onSelectBuilding(b)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:bg-white hover:shadow"
          >
            <div className="text-slate-900 font-medium">{b.name}</div>
            <div className="text-xs text-slate-600">
              {b.campus} • {b.address}
            </div>
            {b.phone ? <div className="mt-0.5 text-xs text-slate-700">{b.phone}</div> : null}
            <div className="mt-2">
              <Badge>{b.floors.length} floors</Badge>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function BuildingView({ building, onSelectFloor }: BuildingViewProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-slate-900 text-lg font-semibold">{building.name}</div>
          <div className="text-slate-600 text-sm">
            {building.campus} • {building.address}
          </div>
          {building.phone ? (
            <div className="mt-0.5 text-xs text-slate-600">{building.phone}</div>
          ) : null}
        </div>
        <Badge>{building.floors.length} floors</Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {building.floors.map((f: number) => (
          <button
            key={f}
            onClick={() => onSelectFloor(f)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-800 hover:bg-white hover:shadow"
          >
            Floor {f}
          </button>
        ))}
      </div>
    </div>
  );
}
