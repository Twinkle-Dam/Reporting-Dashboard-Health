import React, { useEffect, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  CircleMarker,
  Tooltip,
  Circle,
  Polygon,
} from 'react-leaflet';
import L from 'leaflet';
import { Badge } from '../dashboardShared';

type LatLngTuple = [number, number];

type MapPanelProps = {
  buildings: any[];
  onSelectBuilding: (b: any) => void;
  selectedBuilding?: any;
  campusName?: string;
  size?: 'default' | 'compact';
};

export type MapPanelGenericItem = {
  id: string;
  title: string;
  subtitle?: string;
  address?: string;
  latLng: LatLngTuple;
  color?: string;
  avgUtil?: number;
  campuses?: number;
  buildings?: number;
};

type MapPanelGenericProps = {
  title: string;
  subtitle: string;
  items: MapPanelGenericItem[];
  onClickItem: (item: MapPanelGenericItem) => void;
};

function FitToMarkers({ points }: { points: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const unsafe = !(map as any) || !(map as any)._mapPane;
    if (unsafe) return;
    const bounds = L.latLngBounds(points);
    try {
      (map as any).whenReady(() => {
        try {
          map.invalidateSize();
          map.fitBounds(bounds.pad(0.2), { animate: false });
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore if map is mid-transition
    }
  }, [map, points]);
  return null;
}

export function MapPanel({
  buildings,
  onSelectBuilding,
  selectedBuilding,
  campusName,
  size = 'default',
}: MapPanelProps) {
  const center: LatLngTuple = [41.49, -81.69];
  const points = buildings
    .filter((b: any) => Array.isArray(b.latLng))
    .map((b: any) => b.latLng as LatLngTuple);
  const ordered = useMemo(() => {
    try {
      return (points || []).slice().sort((a: any, b: any) => (a?.[1] || 0) - (b?.[1] || 0));
    } catch {
      return points;
    }
  }, [points]);
  const mapKey = useMemo(
    () =>
      (points || []).map((p: any) => (Array.isArray(p) ? p.join(':') : String(p))).join('|') ||
      'empty',
    [points]
  );
  const heightClass = size === 'compact' ? 'h-[320px]' : 'h-[480px]';

  return (
    <div className={`relative ${heightClass} w-full overflow-hidden rounded-xl border border-slate-200`}>
      <MapContainer key={mapKey} {...({ center, zoom: 11, className: 'h-full w-full' } as any)}>
        <TileLayer
          {...({
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          } as any)}
        />
        <FitToMarkers points={points} />
        {ordered.length > 1 ? (
          <>
            {ordered.map((p: any, idx: number) => (
              <CircleMarker
                key={`route-pt-${idx}`}
                {...({
                  center: p,
                  radius: 6,
                  pathOptions: {
                    color: '#2563eb',
                    fillColor: '#2563eb',
                    fillOpacity: 1,
                    weight: 2,
                  },
                } as any)}
              >
                <Tooltip
                  {...({ direction: 'top', offset: [0, -8], opacity: 1, permanent: true } as any)}
                >
                  {idx + 1}
                </Tooltip>
              </CircleMarker>
            ))}
          </>
        ) : null}
        {points.length > 1
          ? (() => {
              const lats = points.map((p: any) => p[0]);
              const lngs = points.map((p: any) => p[1]);
              const minLat = Math.min(...lats),
                maxLat = Math.max(...lats);
              const minLng = Math.min(...lngs),
                maxLng = Math.max(...lngs);
              const padLat = (maxLat - minLat) * 0.12 || 0.01;
              const padLng = (maxLng - minLng) * 0.12 || 0.01;
              const poly = [
                [minLat - padLat, minLng - padLng],
                [minLat - padLat, maxLng + padLng],
                [maxLat + padLat, maxLng + padLng],
                [maxLat + padLat, minLng - padLng],
              ] as any;
              const centerPt = [(minLat + maxLat) / 2, (minLng + maxLng) / 2] as any;
              return (
                <>
                  <Polygon
                    positions={poly}
                    pathOptions={{
                      color: '#10b981',
                      weight: 2,
                      fillColor: '#10b981',
                      fillOpacity: 0.08,
                      opacity: 0.8,
                    }}
                  />
                  {campusName ? (
                    <Tooltip
                      {...({
                        position: centerPt,
                        direction: 'top',
                        permanent: true,
                        opacity: 0.95,
                      } as any)}
                    >
                      <span style={{ fontWeight: 600, color: '#065f46' }}>{campusName}</span>
                    </Tooltip>
                  ) : null}
                </>
              );
            })()
          : null}
        {buildings.map((b: any) => {
          const isSelected = selectedBuilding && selectedBuilding.id === b.id;
          const color = isSelected ? '#f59e0b' : '#2563eb';
          const radius = isSelected ? 16 : 12;
          const weight = isSelected ? 6 : 3;
          const fillOpacity = isSelected ? 0.15 : 0.08;
          return (
            <CircleMarker
              key={`hl-${b.id}`}
              {...({
                center: b.latLng,
                radius,
                pathOptions: { color, weight, fillColor: color, fillOpacity, opacity: 0.9 },
              } as any)}
            />
          );
        })}
        {buildings.map((b: any) => (
          <Marker
            key={b.id}
            position={b.latLng as any}
            eventHandlers={{ click: () => onSelectBuilding(b) }}
          >
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold text-slate-900">{b.name}</div>
                <div className="text-sm text-slate-600">{b.campus}</div>
                <div className="text-xs text-slate-600">{b.address}</div>
                {b.phone ? <div className="text-xs text-slate-700">{b.phone}</div> : null}
                <button
                  onClick={() => onSelectBuilding(b)}
                  className="mt-2 w-full rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800"
                >
                  Open
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="pointer-events-none absolute left-0 top-0 w-full p-2.5">
        <div className="pointer-events-auto flex items-center justify-between rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 shadow-sm">
          <div>
            <div className="text-sm text-slate-700">City Map</div>
            <div className="text-base font-semibold text-slate-900">UH Hospitals & Campuses</div>
          </div>
          <Badge>{buildings.length} locations</Badge>
        </div>
      </div>
    </div>
  );
}

export function MapPanelGeneric({ title, subtitle, items, onClickItem }: MapPanelGenericProps) {
  const center: LatLngTuple = [41.49, -81.69];
  const points = items
    .filter((i: any) => Array.isArray(i.latLng))
    .map((i: any) => i.latLng as LatLngTuple);
  const ordered = useMemo(() => {
    try {
      return (points || []).slice().sort((a: any, b: any) => (a?.[1] || 0) - (b?.[1] || 0));
    } catch {
      return points;
    }
  }, [points]);
  const mapKey = useMemo(
    () =>
      (points || []).map((p: any) => (Array.isArray(p) ? p.join(':') : String(p))).join('|') ||
      'empty',
    [points]
  );

  return (
    <div className="relative h-[320px] w-full overflow-hidden rounded-xl border border-slate-200">
      <MapContainer key={mapKey} {...({ center, zoom: 11, className: 'h-full w-full' } as any)}>
        <TileLayer
          {...({
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          } as any)}
        />
        <FitToMarkers points={points} />
        {items.map((it: any, idx: number) => {
          const col = (it as any).color || '#0ea5e9';
          const avg = (it as any).avgUtil;
          const campuses = (it as any).campuses;
          const buildings = (it as any).buildings;
          return (
            <React.Fragment key={`halo-${idx}`}>
              <Circle
                {...({
                  center: it.latLng,
                  radius: 2200,
                  pathOptions: {
                    color: col,
                    weight: 2,
                    fillColor: col,
                    fillOpacity: 0.08,
                    opacity: 0.8,
                  },
                } as any)}
              />
              <Tooltip
                {...({
                  position: it.latLng,
                  direction: 'top',
                  permanent: true,
                  opacity: 0.95,
                } as any)}
              >
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 600, color: col }}>{it.title}</div>
                  {typeof avg === 'number' && (
                    <div style={{ color: '#334155' }}>
                      {avg}% avg • {campuses ?? '—'} campuses • {buildings ?? '—'} buildings
                    </div>
                  )}
                </div>
              </Tooltip>
            </React.Fragment>
          );
        })}
        {items.map((it: any, idx: number) => {
          const col = (it as any).color || '#2563eb';
          const p = it.latLng;
          const icon = L.divIcon({
            className: 'map-number-badge',
            html: `<div style="width:28px;height:28px;border-radius:9999px;background:#fff;border:2px solid ${col};color:${col};display:flex;align-items:center;justify-content:center;font-weight:600;font-size:12px;box-shadow:0 1px 3px rgba(0,0,0,.2)">${
              idx + 1
            }</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 26],
          });
          return (
            <React.Fragment key={`pt-${idx}`}>
              <CircleMarker
                {...({
                  center: p,
                  radius: 6,
                  pathOptions: { color: col, fillColor: col, fillOpacity: 1, weight: 2 },
                } as any)}
              >
                <Tooltip {...({ direction: 'top', opacity: 0.95, sticky: true } as any)}>
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: col }}>{it.title}</div>
                    {typeof (it as any).avgUtil === 'number' && (
                      <div style={{ color: '#334155' }}>
                        {(it as any).avgUtil}% avg • {(it as any).campuses ?? '—'} campuses •{' '}
                        {(it as any).buildings ?? '—'} buildings
                      </div>
                    )}
                  </div>
                </Tooltip>
              </CircleMarker>
              <Marker {...({ position: p, icon, interactive: false } as any)} />
            </React.Fragment>
          );
        })}
        {items.map((it: any) => (
          <Marker
            key={it.id}
            position={it.latLng as any}
            eventHandlers={{ click: () => onClickItem(it) }}
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <div className="font-semibold text-slate-900">{it.title}</div>
                {typeof (it as any).avgUtil === 'number' && (
                  <div className="text-slate-700">{(it as any).avgUtil}% avg utilization</div>
                )}
                {it.subtitle ? <div className="text-xs text-slate-600">{it.subtitle}</div> : null}
                {typeof (it as any).campuses === 'number' &&
                  typeof (it as any).buildings === 'number' && (
                    <div className="text-xs text-slate-600">
                      {(it as any).campuses} campuses • {(it as any).buildings} buildings
                    </div>
                  )}
                {it.address ? <div className="text-xs text-slate-600">{it.address}</div> : null}
                <button
                  onClick={() => onClickItem(it)}
                  className="mt-2 w-full rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800"
                >
                  Open
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="pointer-events-none absolute left-0 top-0 w-full p-3">
        <div className="pointer-events-auto flex items-center justify-between rounded-lg border border-slate-200 bg-white/90 px-3 py-2 shadow-sm">
          <div>
            <div className="text-sm text-slate-700">{subtitle}</div>
            <div className="text-base font-semibold text-slate-900">{title}</div>
          </div>
          <Badge>{items.length} locations</Badge>
        </div>
      </div>
    </div>
  );
}

export default MapPanel;
