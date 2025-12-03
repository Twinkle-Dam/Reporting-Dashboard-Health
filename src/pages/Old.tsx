import React, { useEffect, useMemo, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker, Tooltip, Circle, Polygon } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { ReactComponent as AhujaFloor1Svg } from '../assets/floorplans/ahuja-floor1.svg';
import AhujaFloor1Url from '../assets/floorplans/ahuja-floor1.svg';
import ZonesPlusUrl from '../assets/floorplans/zones-plus.svg';
import { loadSchedules, upsertDoctorSchedule } from '../modules/scheduling/scheduleStore';
import { BUILDINGS } from '../data/buildings';

// Fix default marker icon paths for common bundlers
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Simple deterministic color palette per key (e.g., city)
const CITY_PALETTE = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#e11d48', '#14b8a6', '#84cc16', '#f97316', '#06b6d4'];
function hashString(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h << 5) - h + key.charCodeAt(i);
    h |= 0;
  }
  return h;
}
function colorForKey(key: string): string {
  const idx = Math.abs(hashString(key)) % CITY_PALETTE.length;
  return CITY_PALETTE[idx];
}
function rgba(hex: string, alpha: number): string {
  try {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return hex;
  }
}

type DoctorInfo = { id: string; name: string; department?: string };
const DOCTORS: DoctorInfo[] = [
  { id: 'd1', name: 'Dr. Patel' },
  { id: 'd2', name: 'Dr. Rivera' },
  { id: 'd3', name: 'Dr. Chen' },
  { id: 'd4', name: 'Dr. Williams' },
  { id: 'd5', name: 'Dr. Johnson' },
];

// deterministic pseudo occupancy for demo based on ids and date
function seededPercent(seed: number) {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * 100);
}

function dateKey(date?: string) {
  if (!date) return '0';
  try {
    const d = new Date(date);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  } catch {
    return '0';
  }
}

// Local typed helpers (from prior TS modules), embedded here to keep dashboard self-contained
function useRoomsTS(buildingId?: string, floor?: number, fromDate?: string, toDate?: string, schedulesByDoctor?: any, weekday?: string) {
  return useMemo(() => {
    if (!buildingId || !floor) return [];
    const total = 24;
    const rooms = Array.from({ length: total }).map((_, idx) => {
      const roomNumber = floor * 100 + (idx + 1);
      let doctor = DOCTORS[(roomNumber + floor) % DOCTORS.length];
      if (schedulesByDoctor && weekday) {
        for (const sched of Object.values(schedulesByDoctor)) {
          const slots = (sched as any)?.week?.[weekday]?.slots || [];
          const hit = slots.find(
            (s: any) =>
              s.buildingId === buildingId &&
              Number(s.floor) === Number(floor) &&
              String(s.room) === String(roomNumber)
          );
          if (hit) {
            doctor = { id: (sched as any).doctorId || 'doc', name: (sched as any).doctorName || 'Doctor', department: (sched as any).doctorDepartment || '' };
            break;
          }
        }
      }
      const fromKey = dateKey(fromDate);
      const toKey = dateKey(toDate || fromDate);
      let percent = 0;
      const startSeed = parseInt((fromKey || '0').split('-').join(''), 10) || 0;
      const endSeed = parseInt((toKey || '0').split('-').join(''), 10) || startSeed;
      const days = Math.max(1, Math.min(7, Math.abs(endSeed - startSeed) || 1));
      for (let i = 0; i < days; i++) {
        percent += seededPercent(roomNumber * 13 + i * 17 + (buildingId.length + floor));
      }
      percent = Math.round(percent / days);
      return {
        id: `${buildingId}-${floor}-${roomNumber}`,
        roomNumber,
        doctor,
        occupancyPercent: percent,
      };
    });
    return rooms;
  }, [buildingId, floor, fromDate, toDate, schedulesByDoctor, weekday]);
}

function zoneColorHexTS(z: string) {
  switch (z) {
    case 'A': return '#3b82f6'; // blue-500
    case 'B': return '#8b5cf6'; // violet-500
    case 'C': return '#f59e0b'; // amber-500
    case 'D': return '#10b981'; // emerald-500
    default: return '#64748b'; // slate-500
  }
}

function buildPlusBandsTS(svgWidth: number, svgHeight: number, corridorY: number, corridorH: number) {
  const topHeight = Math.max(0, corridorY);
  const bottomY = corridorY + corridorH;
  const bottomHeight = Math.max(0, svgHeight - bottomY);
  const midX = svgWidth / 2;
  const armVerticalWidth = 320;
  const armHorizontalHeight = 220;
  const halfVW = armVerticalWidth / 2;
  const corridorCenterY = corridorY + corridorH / 2;
  return [
    { z: 'A', x: midX - halfVW, y: 0, w: armVerticalWidth, h: topHeight }, // top
    { z: 'C', x: midX - halfVW, y: bottomY, w: armVerticalWidth, h: bottomHeight }, // bottom
    { z: 'B', x: 0, y: corridorCenterY - armHorizontalHeight / 2, w: Math.max(0, midX - halfVW), h: armHorizontalHeight }, // left
    { z: 'D', x: midX + halfVW, y: corridorCenterY - armHorizontalHeight / 2, w: Math.max(0, svgWidth - (midX + halfVW)), h: armHorizontalHeight }, // right
  ];
}

function layoutInRectTS(items: any[], rect: { x: number; y: number; w: number; h: number }) {
  const pad = 10;
  const gap = 8;
  const ratio = rect.w / Math.max(1, rect.h);
  const cols = ratio >= 2.5 ? 8 : ratio >= 1.8 ? 6 : ratio >= 1.2 ? 4 : 3;
  const rows = Math.max(1, Math.ceil(items.length / cols));
  const cellW = (rect.w - pad * 2 - gap * (cols - 1)) / cols;
  const cellH = (rect.h - pad * 2 - gap * (rows - 1)) / rows;
  return items.map((it, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    return {
      ...it,
      x: rect.x + pad + c * (cellW + gap),
      y: rect.y + pad + r * (cellH + gap),
      width: cellW,
      height: cellH,
    };
  });
}

function layoutFixed2x2TS(items: any[], rect?: { x: number; y: number; w: number; h: number } | null) {
  if (!rect) return [];
  const pad = 24;
  const gap = 16;
  const cols = 2;
  const rows = 2;
  const cellW = (rect.w - pad * 2 - gap * (cols - 1)) / cols;
  const cellH = (rect.h - pad * 2 - gap * (rows - 1)) / rows;
  const picked = (items || []).slice(0, 4);
  return picked.map((it, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    return {
      ...it,
      x: rect.x + pad + c * (cellW + gap),
      y: rect.y + pad + r * (cellH + gap),
      width: cellW,
      height: cellH,
    };
  });
}

// Wrapper to keep existing call-sites unchanged
function useRooms(buildingId?: string, floor?: number, fromDate?: string, toDate?: string, schedulesByDoctor?: any, weekday?: string) {
  return useRoomsTS(buildingId, floor, fromDate, toDate, schedulesByDoctor, weekday);
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
      {children}
    </span>
  );
}

function FloorPlanImageOverlay({ building, floor, rooms, zone = 'all', onOpenDoctor }) {
  // Use same geometry as vector plan: 1000 x 600 base
  const svgW = 1000, svgH = 600;
  // Corridor proxy similar to generator
  const margin = 40, corridorH = 100, blockGap = 40;
  const sideH = (svgH - margin * 2 - corridorH - blockGap) / 2;
  const corridorY = margin + sideH + (blockGap - corridorH) / 2;

  const midX = svgW / 2;
  const armVerticalWidth = Math.max(380, svgW * 0.35);
  const armHorizontalHeight = Math.max(260, svgH * 0.33);
  const halfVW = armVerticalWidth / 2;
  const corridorCenterY = corridorY + corridorH / 2;
  const topHeight = Math.max(0, corridorY);
  const bottomY = corridorY + corridorH;
  const bottomHeight = Math.max(0, svgH - bottomY);

  const bands = {
    A: { x: midX - halfVW, y: 0, w: armVerticalWidth, h: topHeight },
    B: { x: midX - halfVW, y: bottomY, w: armVerticalWidth, h: bottomHeight },
    D: { x: 0, y: corridorCenterY - armHorizontalHeight / 2, w: Math.max(0, midX - halfVW), h: armHorizontalHeight },
    C: { x: midX + halfVW, y: corridorCenterY - armHorizontalHeight / 2, w: Math.max(0, svgW - (midX + halfVW)), h: armHorizontalHeight },
  };

  // Classify original 24 rooms by A/B/C/D using centers
  const plan = useMemo(() => generateRoomLayout(rooms, svgW, svgH), [rooms]);
  const zoneRooms = useMemo(() => {
    const a: any[] = [], b: any[] = [], c: any[] = [], d: any[] = [];
    for (const r of (plan as any).rooms) {
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      if (cy < corridorY) a.push(r);
      if (cy > corridorY + corridorH) b.push(r);
      if (cx >= midX) c.push(r);
      if (cx < midX) d.push(r);
    }
    // Enforce: Zone A must contain only rooms 1..6 of the floor
    const aFiltered = a.filter((rr) => {
      const n = Number(rr.roomNumber) % 100;
      return n >= 1 && n <= 6;
    });
    return { A: aFiltered, B: b, C: c, D: d };
  }, [plan, corridorY]);

  const rect = zone !== 'all' ? (bands as any)[zone] : null;

  function layoutInRect(items: any[], rect?: any) {
    if (!rect) return [];
    const pad = 10, gap = 8;
    const ratio = rect.w / Math.max(1, rect.h);
    const cols = ratio >= 2.5 ? 8 : ratio >= 1.8 ? 6 : ratio >= 1.2 ? 4 : 3;
    const rows = Math.max(1, Math.ceil(items.length / cols));
    const cellW = (rect.w - pad * 2 - gap * (cols - 1)) / cols;
    const cellH = (rect.h - pad * 2 - gap * (rows - 1)) / rows;
    return items.map((it, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      return {
        ...it,
        x: rect.x + pad + c * (cellW + gap),
        y: rect.y + pad + r * (cellH + gap),
        width: cellW,
        height: cellH,
      };
    });
  }

  const layout = useMemo(() => {
    if (!rect || zone === 'all') return [];
    return layoutInRect((zoneRooms as any)[zone] || [], rect);
  }, [rect, zone, zoneRooms]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-slate-900 text-lg font-semibold">{building.name} — Floor {floor}</div>
          <div className="text-slate-600 text-sm">Image overlay with rooms positioned in selected zone</div>
        </div>
        <Badge>{rooms.length} rooms</Badge>
      </div>

      
      <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="block w-full h-auto">
          <image href={AhujaFloor1Url} x="0" y="0" width={svgW} height={svgH} preserveAspectRatio="xMidYMid slice" />
          {/* plus-shape zones */}
          {(['D','C','A','B'] as const).map((z) => {
            const b = (bands as any)[z];
            const active = zone === 'all' || zone === z;
            const color = zoneColorHex(z);
            return (
              <g key={`band-${z}`}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={hexToRgba(color, active ? 0.10 : 0.06)} />
              </g>
            );
          })}
          {/* corridor hint */}
          <rect x={margin} y={corridorY} width={svgW - margin * 2} height={corridorH} rx="8" className="fill-slate-100 stroke-slate-300" strokeWidth="1" />
          <text x={svgW/2} y={corridorY + corridorH/2} textAnchor="middle" dominantBaseline="middle" className="fill-slate-500" fontSize="14">Corridor</text>

          {(zone === 'all' ? (plan as any).rooms : layout).map((r: any) => {
            const barMargin = 6, barHeight = 6;
            const barWidth = Math.max(0, Math.min(r.width - barMargin * 2, (r.width - barMargin * 2) * (r.occupancyPercent / 100)));
            const tint = occupancyFillHex(r.occupancyPercent);
            return (
              <g key={r.id} className="cursor-pointer transition-transform duration-150 hover:scale-[1.015]" onClick={() => onOpenDoctor(r)}>
                <rect x={r.x} y={r.y} width={r.width} height={r.height} rx="8" className="fill-white stroke-slate-300 hover:stroke-slate-400" strokeWidth="1.5" />
                <rect x={r.x} y={r.y} width={r.width} height={r.height} rx="8" fill={tint} opacity="0.10" />
                <rect x={r.x + 8} y={r.y + 8} width={Math.max(0, r.width - 16)} height={46} rx="10" className="fill-white stroke-slate-200" opacity="0.95" />
                <rect x={r.x + barMargin} y={r.y + r.height - barMargin - barHeight} width={r.width - barMargin * 2} height={barHeight} rx="6" className="fill-slate-200" />
                <rect x={r.x + barMargin} y={r.y + r.height - barMargin - barHeight} width={barWidth} height={barHeight} rx="6" className={occupancyFillClass(r.occupancyPercent)} />
                {zone !== 'all' && (
                  <g transform={`translate(${r.x + r.width - 40}, ${r.y + 14})`}>
                    <rect width="28" height="28" rx="8" className="fill-white" stroke="#cbd5e1" />
                    <text x="14" y="18" textAnchor="middle" className="fill-slate-800" fontSize="12" fontWeight="700">{zone}</text>
                  </g>
                )}
                <text x={r.x + 12} y={r.y + 20} className="fill-slate-800" fontSize="13" fontWeight="600">{`Room ${r.roomNumber}`}</text>
                <text x={r.x + 12} y={r.y + 38} className="fill-slate-600" fontSize="11">{r.doctor.name}{r.doctor?.department ? ` — ${r.doctor.department}` : ''}</text>
                {/* Percent label aligned to bar right edge (like cards) */}
                <text x={r.x + r.width - barMargin - 2} y={r.y + r.height - barMargin - barHeight / 2 + 3} textAnchor="end" className="fill-slate-700" fontSize="10">
                  {`${r.occupancyPercent}%`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function Breadcrumbs({ city, campus, building, floor, onResetToRoot, onResetToCity, onResetToCampus, onResetToBuilding }) {
  return (
    <div className="flex items-center text-sm text-slate-600 gap-2">
      <button className="hover:text-slate-900" onClick={onResetToRoot}>City</button>
      <span>/</span>
      {city ? (
        <button className="hover:text-slate-900" onClick={onResetToCity}>{city}</button>
      ) : (
        <span className="text-slate-400">City</span>
      )}
      <span>/</span>
      {campus ? (
        <button className="hover:text-slate-900" onClick={onResetToCampus}>{campus}</button>
      ) : (
        <span className="text-slate-400">Campus</span>
      )}
      <span>/</span>
      {building ? (
        <button className="hover:text-slate-900" onClick={onResetToBuilding}>{building.name}</button>
      ) : (
        <span className="text-slate-400">Building</span>
      )}
      <span>/</span>
      {floor ? <span>Floor {floor}</span> : <span className="text-slate-400">Floor</span>}
    </div>
  );
}

function DateRangeControls({ fromDate, toDate, onChange }) {
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

function FitToMarkers({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    // Guard against timing issues when map is mounting/unmounting (back navigation)
    const unsafe = !(map as any) || !(map as any)._mapPane;
    if (unsafe) return;
    const bounds = L.latLngBounds(points);
    try {
      // Defer to after map is ready and disable animation to avoid transition races
      (map as any).whenReady(() => {
        try {
          map.invalidateSize();
          map.fitBounds(bounds.pad(0.2), { animate: false });
        } catch {}
      });
    } catch {
      // ignore if map is mid-transition
    }
  }, [map, points]);
  return null;
}

function MapPanel({ buildings, onSelectBuilding, selectedBuilding, campusName }: { buildings: any[]; onSelectBuilding: (b: any) => void; selectedBuilding?: any; campusName?: string }) {
  const center = [41.49, -81.69]; // Greater Cleveland default center
  const points = buildings.filter((b: any) => Array.isArray(b.latLng)).map((b: any) => b.latLng);
  const ordered = useMemo(() => {
    try {
      return (points || []).slice().sort((a: any, b: any) => (a?.[1] || 0) - (b?.[1] || 0));
    } catch { return points; }
  }, [points]);
  const mapKey = useMemo(() => (points || []).map((p: any) => (Array.isArray(p) ? p.join(':') : String(p))).join('|') || 'empty', [points]);
  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-xl border border-slate-200">
      <MapContainer key={mapKey} {...({ center, zoom: 11, className: 'h-full w-full' } as any)}>
        <TileLayer {...({
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        } as any)} />
        <FitToMarkers points={points} />
        {ordered.length > 1 ? (
          <>
            {/* Distance lines removed */}
            {/* Numbered waypoints */}
            {ordered.map((p: any, idx: number) => (
              <CircleMarker key={`route-pt-${idx}`} {...({ center: p, radius: 6, pathOptions: { color: '#2563eb', fillColor: '#2563eb', fillOpacity: 1, weight: 2 } } as any)}>
                <Tooltip {...({ direction: 'top', offset: [0, -8], opacity: 1, permanent: true } as any)}>
                  {idx + 1}
                </Tooltip>
              </CircleMarker>
            ))}
          </>
        ) : null}
        {/* Campus area highlight (bounds box) */}
        {points.length > 1 ? (() => {
          const lats = points.map((p: any) => p[0]);
          const lngs = points.map((p: any) => p[1]);
          const minLat = Math.min(...lats), maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
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
              <Polygon positions={poly} pathOptions={{ color: '#10b981', weight: 2, fillColor: '#10b981', fillOpacity: 0.08, opacity: 0.8 }} />
              {campusName ? (
                <Tooltip {...({ position: centerPt, direction: 'top', permanent: true, opacity: 0.95 } as any)}>
                  <span style={{ fontWeight: 600, color: '#065f46' }}>{campusName}</span>
                </Tooltip>
              ) : null}
            </>
          );
        })() : null}
        {/* Building highlights */}
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
                pathOptions: { color, weight, fillColor: color, fillOpacity, opacity: 0.9 }
              } as any)}
            />
          );
        })}
        {buildings.map((b: any) => (
          <Marker key={b.id} position={b.latLng as any} eventHandlers={{ click: () => onSelectBuilding(b) }}>
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
      <div className="pointer-events-none absolute left-0 top-0 w-full p-3">
        <div className="pointer-events-auto flex items-center justify-between rounded-lg border border-slate-200 bg-white/90 px-3 py-2 shadow-sm">
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

function MapPanelGeneric({ title, subtitle, items, onClickItem }) {
  const center = [41.49, -81.69];
  const points = items.filter((i: any) => Array.isArray(i.latLng)).map((i: any) => i.latLng);
  const ordered = useMemo(() => {
    try {
      return (points || []).slice().sort((a: any, b: any) => (a?.[1] || 0) - (b?.[1] || 0));
    } catch { return points; }
  }, [points]);
  const mapKey = useMemo(() => (points || []).map((p: any) => (Array.isArray(p) ? p.join(':') : String(p))).join('|') || 'empty', [points]);
  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-xl border border-slate-200">
      <MapContainer key={mapKey} {...({ center, zoom: 11, className: 'h-full w-full' } as any)}>
        <TileLayer {...({
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        } as any)} />
        <FitToMarkers points={points} />
        {/* Area halos + labels for each item (colorized per city if provided) */}
        {items.map((it: any, idx: number) => {
          const col = (it as any).color || '#0ea5e9';
          return (
            <React.Fragment key={`halo-${idx}`}>
              <Circle {...({ center: it.latLng, radius: 2200, pathOptions: { color: col, weight: 2, fillColor: col, fillOpacity: 0.1, opacity: 0.8 } } as any)} />
              <Tooltip {...({ position: it.latLng, direction: 'top', permanent: true, opacity: 0.95 } as any)}>
                <span style={{ fontWeight: 600, color: col }}>{it.title}</span>
              </Tooltip>
            </React.Fragment>
          );
        })}
        {/* Colored dots + circular number badges for each item */}
        {items.map((it: any, idx: number) => {
          const col = (it as any).color || '#2563eb';
          const p = it.latLng;
          const icon = L.divIcon({
            className: 'map-number-badge',
            html: `<div style="width:28px;height:28px;border-radius:9999px;background:#fff;border:2px solid ${col};color:${col};display:flex;align-items:center;justify-content:center;font-weight:600;font-size:12px;box-shadow:0 1px 3px rgba(0,0,0,.2)">${idx + 1}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 26],
          });
          return (
            <React.Fragment key={`pt-${idx}`}>
              <CircleMarker {...({ center: p, radius: 6, pathOptions: { color: col, fillColor: col, fillOpacity: 1, weight: 2 } } as any)} />
              <Marker {...({ position: p, icon, interactive: false } as any)} />
            </React.Fragment>
          );
        })}
        {items.map((it: any) => (
          <Marker key={it.id} position={it.latLng as any} eventHandlers={{ click: () => onClickItem(it) }}>
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold text-slate-900">{it.title}</div>
                {it.subtitle ? <div className="text-sm text-slate-600">{it.subtitle}</div> : null}
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

function CityView({ cities, onSelectCity }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-slate-900 text-lg font-semibold">Select City</div>
          <div className="text-slate-600 text-sm">Start by choosing a city</div>
        </div>
        <Badge>{cities.length} cities</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {cities.map((c: any) => (
          <button
            key={c.name}
            onClick={() => onSelectCity(c.name)}
            className="flex items-center justify-between rounded-lg px-4 py-3 text-left hover:shadow"
            style={{ border: `1px solid ${colorForKey(c.name)}`, backgroundColor: rgba(colorForKey(c.name), 0.08) }}
          >
            <div>
              <div className="font-medium" style={{ color: colorForKey(c.name) }}>{c.name}</div>
              <div className="text-xs text-slate-600">{c.campuses} campuses • {c.buildings} buildings</div>
            </div>
            <span className="ml-3 rounded-md px-2 py-1 text-xs font-medium text-white" style={{ backgroundColor: colorForKey(c.name) }}>Select</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CampusView({ city, campuses, onSelectCampus }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-slate-900 text-lg font-semibold">Select Campus</div>
          <div className="text-slate-600 text-sm">City: {city}</div>
        </div>
        <Badge>{campuses.length} campuses</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
            <span className="ml-3 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white">Select</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BuildingsList({ buildings, onSelectBuilding }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-slate-900 text-lg font-semibold">Select Building</div>
          <div className="text-slate-600 text-sm">Choose a building to view floors</div>
        </div>
        <Badge>{buildings.length} buildings</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {buildings.map((b: any) => (
          <button
            key={b.id}
            onClick={() => onSelectBuilding(b)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:bg-white hover:shadow"
          >
            <div className="text-slate-900 font-medium">{b.name}</div>
            <div className="text-xs text-slate-600">{b.campus} • {b.address}</div>
            {b.phone ? <div className="text-xs text-slate-700 mt-0.5">{b.phone}</div> : null}
            <div className="mt-2"><Badge>{b.floors.length} floors</Badge></div>
          </button>
        ))}
      </div>
    </div>
  );
}

function BuildingView({ building, onSelectFloor }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-slate-900 text-lg font-semibold">{building.name}</div>
          <div className="text-slate-600 text-sm">{building.campus} • {building.address}</div>
          {building.phone ? <div className="text-slate-600 text-xs mt-0.5">{building.phone}</div> : null}
        </div>
        <Badge>{building.floors.length} floors</Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
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

function occupancyColor(pct: number) {
  if (pct >= 80) return 'bg-emerald-600';
  if (pct >= 60) return 'bg-emerald-500';
  if (pct >= 40) return 'bg-amber-500';
  if (pct >= 20) return 'bg-orange-500';
  return 'bg-rose-500';
}

// Utility: map occupancy percent to tailwind color (for SVG fills)
function occupancyFillClass(pct: number) {
  if (pct >= 80) return 'fill-emerald-600';
  if (pct >= 60) return 'fill-emerald-500';
  if (pct >= 40) return 'fill-amber-500';
  if (pct >= 20) return 'fill-orange-500';
  return 'fill-rose-500';
}

// Utility: hex color for styling external SVG nodes
function occupancyFillHex(pct: number) {
  if (pct >= 80) return '#059669'; // emerald-600
  if (pct >= 60) return '#10B981'; // emerald-500
  if (pct >= 40) return '#f59e0b'; // amber-500
  if (pct >= 20) return '#f97316'; // orange-500
  return '#f43f5e'; // rose-500
}

function hexToRgba(hex: string, alpha: number) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return `rgba(15,23,42,${alpha})`;
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function zoneColorHex(z: string) {
  return zoneColorHexTS(z);
}

function RoomCardsGrid({ rooms, zone = 'all', supportsZones = true, onOpenDoctor, onOpenReport, onOpenManageDoctor }: { rooms: any[]; zone?: 'all' | 'A' | 'B' | 'C' | 'D'; supportsZones?: boolean; onOpenDoctor: (r: any) => void; onOpenReport?: (roomNumber: number) => void; onOpenManageDoctor?: (doctor: any) => void }) {
  const zoneOfIndex = (idx: number, total: number) => {
    const q = Math.floor((idx / total) * 4);
    return ['A','B','C','D'][Math.min(3, Math.max(0, q))];
  };
  const pillStyle = (pct: number) => {
    const c = occupancyFillHex(pct);
    return { backgroundColor: hexToRgba(c, 0.15), color: c, borderColor: hexToRgba(c, 0.35) };
  };
  const barFill = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-600';
    if (pct >= 60) return 'bg-emerald-500';
    if (pct >= 40) return 'bg-amber-500';
    if (pct >= 20) return 'bg-orange-500';
    return 'bg-rose-500';
  };
  const zonesEnabled = !!supportsZones;
  const filtered = zonesEnabled ? rooms.filter((_: any, i: number) => zone === 'all' ? true : zoneOfIndex(i, rooms.length) === zone) : rooms;
  if (zonesEnabled && zone === 'all') {
    const zones = ['A','B','C','D'] as const;
    return (
      <div className="space-y-6">
        {zones.map((z) => {
          const zRooms = rooms.filter((_: any, i: number) => zoneOfIndex(i, rooms.length) === z);
          const color = zoneColorHex(z);
          return (
            <div key={z} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }}></span>
                <div className="text-sm font-semibold text-slate-800">{`Zone ${z}`}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3">
                {zRooms.map((r: any) => {
                  const tint = occupancyFillHex(r.occupancyPercent);
                  const cardStyle = {
                    background: `linear-gradient(0deg, ${hexToRgba(tint, 0.10)} 0%, ${hexToRgba('#ffffff', 1)} 40%)`,
                    borderColor: hexToRgba(tint, 0.25),
                  };
                  return (
                    <button
                      key={r.id}
                      onClick={() => onOpenDoctor(r)}
                      className="relative rounded-xl border bg-white p-4 text-left shadow-sm hover:shadow transition"
                      style={cardStyle as any}
                    >
                      <div className="flex items-center gap-2 text-slate-900 font-semibold">
                        <span>Room {r.roomNumber}</span>
                        <span className="relative group inline-flex">
                          <button
                            aria-label="Open room allocation report"
                            title="Room Summary"
                            onClick={(e) => { e.stopPropagation(); onOpenReport && onOpenReport(r.roomNumber); }}
                            className="rounded-md p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 3v18h18" />
                              <path d="M7 13l3 3 7-7" />
                            </svg>
                          </button>
                          <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow opacity-0 group-hover:opacity-100 transition">
                            Room Summary
                          </div>
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                        <span>{r.doctor.name}{r.doctor?.department ? ` — ${r.doctor.department}` : ''}</span>
                        <span className="relative group inline-flex">
                          <button
                            aria-label="Manage schedule"
                            title="Manage schedule"
                            onClick={(e) => { e.stopPropagation(); onOpenManageDoctor && onOpenManageDoctor(r.doctor); }}
                            className="rounded-md p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                          </button>
                          <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow opacity-0 group-hover:opacity-100 transition">
                            Manage schedule
                          </div>
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }}></span>
                        <div className="flex items-center w-full gap-2">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div className={`h-full ${barFill(r.occupancyPercent)}`} style={{ width: `${Math.min(100, Math.max(0, r.occupancyPercent))}%` }}></div>
                          </div>
                          <div className="text-xs text-slate-700">{r.occupancyPercent}%</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3">
      {filtered.map((r: any) => {
        const tint = occupancyFillHex(r.occupancyPercent);
        const cardStyle = {
          background: `linear-gradient(0deg, ${hexToRgba(tint, 0.10)} 0%, ${hexToRgba('#ffffff', 1)} 40%)`,
          borderColor: hexToRgba(tint, 0.25),
        };
        return (
        <button
          key={r.id}
          onClick={() => onOpenDoctor(r)}
          className="relative rounded-xl border bg-white p-4 text-left shadow-sm hover:shadow transition"
          style={cardStyle as any}
        >
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <span>Room {r.roomNumber}</span>
            <span className="relative group inline-flex">
              <button
                aria-label="Open room allocation report"
                title="Room Summary"
                onClick={(e) => { e.stopPropagation(); onOpenReport && onOpenReport(r.roomNumber); }}
                className="rounded-md p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" />
                  <path d="M7 13l3 3 7-7" />
                </svg>
              </button>
              <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow opacity-0 group-hover:opacity-100 transition">
                Room Summary
              </div>
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-sm text-slate-600">
            <span>{r.doctor.name}{r.doctor?.department ? ` — ${r.doctor.department}` : ''}</span>
            <span className="relative group inline-flex">
              <button
                aria-label="Manage schedule"
                title="Manage schedule"
                onClick={(e) => { e.stopPropagation(); onOpenManageDoctor && onOpenManageDoctor(r.doctor); }}
                className="rounded-md p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </button>
              <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow opacity-0 group-hover:opacity-100 transition">
                Manage schedule
              </div>
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {zonesEnabled ? <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: zoneColorHex(zone) }}></span> : null}
            <div className="flex items-center w-full gap-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full ${barFill(r.occupancyPercent)}`} style={{ width: `${Math.min(100, Math.max(0, r.occupancyPercent))}%` }}></div>
              </div>
              <div className="text-xs text-slate-700">{r.occupancyPercent}%</div>
            </div>
          </div>
        </button>
      );})}
    </div>
  );
}

// Generate a simple deterministic layout for up to 24 rooms (12 top, 12 bottom) around a corridor
function generateRoomLayout(rooms: any[], svgWidth = 1000, svgHeight = 600) {
  const margin = 40;
  const gap = 12;
  const corridorHeight = 100;
  const blockGap = 40;
  const columns = 6;
  const rowsPerSide = 2;
  const usableWidth = svgWidth - margin * 2;
  const usableHeight = svgHeight - margin * 2 - corridorHeight - blockGap;
  const sideHeight = Math.max(0, usableHeight / 2);
  const roomWidth = (usableWidth - gap * (columns - 1)) / columns;
  const roomHeight = (sideHeight - gap * (rowsPerSide - 1)) / rowsPerSide;

  const positioned = rooms.slice(0, 24).map((room, index) => {
    const isTop = index < 12;
    const localIndex = index % 12;
    const row = Math.floor(localIndex / columns); // 0..1
    const col = localIndex % columns; // 0..5
    const baseYTop = margin;
    const baseYBottom = margin + sideHeight + corridorHeight + blockGap;
    const x = margin + col * (roomWidth + gap);
    const y = (isTop ? baseYTop : baseYBottom) + row * (roomHeight + gap);
    return {
      ...room,
      x,
      y,
      width: roomWidth,
      height: roomHeight,
    };
  });

  return {
    svgWidth,
    svgHeight,
    corridor: {
      x: margin,
      y: margin + sideHeight + (blockGap - corridorHeight) / 2,
      width: usableWidth,
      height: corridorHeight,
    },
    rooms: positioned,
  };
}

function FloorPlan({ building, floor, rooms, onOpenDoctor, onOpenReport }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-slate-900 text-lg font-semibold">{building.name} — Floor {floor}</div>
          <div className="text-slate-600 text-sm">Clean plan with rooms and occupancy</div>
        </div>
        <Badge>{rooms.length} rooms</Badge>
      </div>

      {/* rectangular plan with room boxes */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {rooms.map((r: any) => (
          <div key={r.id} className="group relative rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-white hover:shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-[13px] font-medium text-slate-800">Room {r.roomNumber}</div>
                <span className="relative group inline-flex">
                  <button
                    aria-label="Open room allocation report"
                    title={`Room ${r.roomNumber} • ${r.occupancyPercent}% • ${r.doctor.name}${r.doctor?.department ? ' — ' + r.doctor.department : ''}`}
                    onClick={(e) => { e.stopPropagation(); onOpenReport && onOpenReport(r.roomNumber); }}
                    className="rounded-md p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3v18h18" />
                      <path d="M7 13l3 3 7-7" />
                    </svg>
                  </button>
                  <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow opacity-0 group-hover:opacity-100 transition">
                    Room {r.roomNumber} • {r.occupancyPercent}% • {r.doctor.name}{r.doctor?.department ? ` — ${r.doctor.department}` : ''}
                  </div>
                </span>
              </div>
              <div className="ml-2 h-2 w-14 overflow-hidden rounded-full bg-slate-200">
                <div className={`h-full ${occupancyColor(r.occupancyPercent)}`} style={{ width: `${Math.min(100, Math.max(0, r.occupancyPercent))}%` }}></div>
              </div>
              <span className="ml-2 text-[11px] text-slate-700">{r.occupancyPercent}%</span>
            </div>
        <div className="mt-1 text-[11px] text-slate-600">{r.doctor.name}{r.doctor?.department ? ` — ${r.doctor.department}` : ''}</div>

            {/* Hover overlay */}
            <div className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded-lg bg-white/95 p-3 text-center shadow-sm ring-1 ring-slate-200 group-hover:flex">
              <div>
                <div className="text-sm font-semibold text-slate-900">{r.doctor.name}{r.doctor?.department ? ` — ${r.doctor.department}` : ''}</div>
                <div className="mt-1 text-xs text-slate-600">Assigned physician</div>
                <div className="mt-3 flex justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenDoctor(r); }}
                    className="pointer-events-auto rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    View schedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FloorPlanSvg({ building, floor, rooms, zone = 'all', onOpenDoctor, onSelectZone, onOpenReport, onOpenManageDoctor }: { building: any; floor: number; rooms: any[]; zone?: 'all' | 'A' | 'B' | 'C' | 'D'; onOpenDoctor: (r: any) => void; onSelectZone: (z: any) => void; onOpenReport?: (roomNumber: number) => void; onOpenManageDoctor?: (doctor: any) => void }) {
  const plan = useMemo(() => generateRoomLayout(rooms, 1000, 600), [rooms]);
  // Helper to compute plus-shape zone bands
  const plusBands = useMemo(() => {
    return buildPlusBandsTS((plan as any).svgWidth, (plan as any).svgHeight, (plan as any).corridor.y, (plan as any).corridor.height);
  }, [plan]);

  // Classify all plan rooms into plus zones and then take all rooms of selected zone
  const zoneRoomsAll = useMemo(() => {
    const midX = (plan as any).svgWidth / 2;
    const a: any[] = [], b: any[] = [], c: any[] = [], d: any[] = [];
    for (const r of (plan as any).rooms) {
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      if (cy < (plan as any).corridor.y) a.push(r);
      if (cy > (plan as any).corridor.y + (plan as any).corridor.height) b.push(r);
      if (cx >= midX) c.push(r);
      if (cx < midX) d.push(r);
    }
    const aFiltered = a.filter((rr) => {
      const n = Number(rr.roomNumber) % 100;
      return n >= 1 && n <= 6;
    });
    return { A: aFiltered, B: b, C: c, D: d };
  }, [plan]);

  const zoneRect = useMemo(() => {
    if (zone === 'all') return null;
    const band = (plusBands as any).find((b: any) => b.z === zone);
    return band || null;
  }, [zone, plusBands]);

  function layoutInRect(items: any[], rect?: any) {
    if (!rect) return [];
    return layoutInRectTS(items, rect);
  }

  function layoutFixed2x2(items: any[], rect?: any) {
    if (!rect) return [];
    return layoutFixed2x2TS(items, rect);
  }

  const renderRooms = useMemo(() => {
    const getRect = (z: any) => (plusBands as any).find((b: any) => b.z === z);
    if (zone === 'all') {
      return [
        ...layoutFixed2x2((zoneRoomsAll as any).A, getRect('A')),
        ...layoutFixed2x2((zoneRoomsAll as any).B, getRect('B')),
        ...layoutFixed2x2((zoneRoomsAll as any).C, getRect('C')),
        ...layoutFixed2x2((zoneRoomsAll as any).D, getRect('D')),
      ];
    }
    // Enlarge selected zone area and show ALL its rooms within the enlarged area
    const base = getRect(zone);
    if (!base) return [];
    const pad = 20;
    const fullW = (plan as any).svgWidth - pad * 2;
    const fullH = (plan as any).svgHeight - pad * 2;
    let expanded = { ...base };
    if (zone === 'A') {
      const h = Math.min(fullH, Math.max(base.h + 260, base.h));
      expanded = { x: pad, y: pad, w: fullW, h };
    } else if (zone === 'B') {
      const h = Math.min(fullH, Math.max(base.h + 260, base.h));
      expanded = { x: pad, y: (plan as any).svgHeight - h - pad, w: fullW, h };
    } else if (zone === 'C') {
      const w = Math.min(fullW, Math.max(base.w + 360, base.w));
      expanded = { x: (plan as any).svgWidth - w - pad, y: pad, w, h: fullH };
    } else if (zone === 'D') {
      const w = Math.min(fullW, Math.max(base.w + 360, base.w));
      expanded = { x: pad, y: pad, w, h: fullH };
    }
    return layoutInRect((zoneRoomsAll as any)[zone] || [], expanded);
  }, [zone, zoneRoomsAll, plusBands]);
  const zoneLayout = useMemo(() => {
    if (!zoneRect || zone === 'all') return [];
    const items = (zoneRoomsAll as any)[zone] || [];
    return layoutInRect(items, zoneRect as any);
  }, [zoneRect, zone, zoneRoomsAll]);
  const zoneRooms = useMemo(() => {
    const midX = (plan as any).svgWidth / 2;
    const a: any[] = [], b: any[] = [], c: any[] = [], d: any[] = [];
    for (const r of (plan as any).rooms) {
      const cx = r.x + r.width / 2;
      const cy = r.y + r.height / 2;
      if (cy < (plan as any).corridor.y) a.push(r);
      if (cy > (plan as any).corridor.y + (plan as any).corridor.height) b.push(r);
      if (cx >= midX) c.push(r);
      if (cx < midX) d.push(r);
    }
    // New orientation: A top, B left, C bottom, D right
    return { A: a, B: d, C: b, D: c };
  }, [plan]);

  function ZoneRoomsList({ groups }) {
    const entries = zone === 'all' ? ['A','B','C','D'] : [zone];
    return (
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {entries.map((z) => (
          <div key={z} className="rounded-lg border border-slate-200 bg-white p-2">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: zoneColorHex(z) }}></span>
              <div className="text-xs font-semibold text-slate-800">{`Zone ${z}`} <span className="text-slate-500 font-normal">({groups[z].length})</span></div>
            </div>
            <div className="flex flex-wrap gap-1">
              {groups[z].map((r) => (
                <span key={r.id} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">Room {r.roomNumber}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-slate-900 text-lg font-semibold">{building.name} — Floor {floor}</div>
          <div className="text-slate-600 text-sm">SVG floor plan with clickable rooms</div>
        </div>
        <Badge>{rooms.length} rooms</Badge>
      </div>
      <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <svg viewBox={`0 0 ${(plan as any).svgWidth} ${(plan as any).svgHeight}`} className="block w-full h-auto">
          {/* Background image with zones (+) as SVG */}
          <image href={ZonesPlusUrl} x="0" y="0" width={(plan as any).svgWidth} height={(plan as any).svgHeight} preserveAspectRatio="xMidYMid slice" />
          <defs>
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.10" />
            </filter>
          </defs>
          {/* Invisible hit areas for zones (to keep interactivity) */}
          {(() => {
            const topHeight = Math.max(0, (plan as any).corridor.y);
            const bottomY = (plan as any).corridor.y + (plan as any).corridor.height;
            const bottomHeight = Math.max(0, (plan as any).svgHeight - bottomY);
            const midX = (plan as any).svgWidth / 2;
            // Use the same fixed arm sizes as zones-plus.svg for consistent hit areas
            const armVerticalWidth = 320;
            const armHorizontalHeight = 220;
            const halfVW = armVerticalWidth / 2;
            const corridorCenterY = (plan as any).corridor.y + (plan as any).corridor.height / 2;
            const bands = [
              { z: 'A', x: midX - halfVW, y: 0, w: armVerticalWidth, h: topHeight },                           // top
              { z: 'C', x: midX - halfVW, y: bottomY, w: armVerticalWidth, h: bottomHeight },                  // bottom
              { z: 'D', x: 0, y: corridorCenterY - armHorizontalHeight / 2, w: Math.max(0, midX - halfVW), h: armHorizontalHeight }, // left
              { z: 'B', x: midX + halfVW, y: corridorCenterY - armHorizontalHeight / 2, w: Math.max(0, (plan as any).svgWidth - (midX + halfVW)), h: armHorizontalHeight }, // right
            ];
            return bands.map(b => (
              <g key={`hit-${b.z}`} className="cursor-pointer" onClick={() => onSelectZone && onSelectZone(b.z)}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="transparent" />
              </g>
            ));
          })()}

          {/* Rooms */}
          {(renderRooms.length === 0 && zone === 'all' ? (plan as any).rooms : renderRooms).map((r: any) => {
            // Standardize the card footprint so each block looks identical
            const cardX = r.x + 12;
            const cardY = r.y + 12;
            const cardW = Math.max(0, r.width - 24);
            const cardH = 48; // slightly taller for better spacing
            const barBgX = r.x + 16;
            const barBgY = cardY + cardH + 10;
            const barBgW = Math.max(0, r.width - 32);
            const barH = 8;
            const barFillW = Math.max(0, barBgW * (r.occupancyPercent / 100));
            const dotColor = occupancyFillHex(r.occupancyPercent);
            return (
              <g key={r.id} className="cursor-pointer transition-transform duration-150 hover:scale-[1.01]" onClick={() => onOpenDoctor(r)}>
                <title>{`Room ${r.roomNumber} — ${r.occupancyPercent}% • ${r.doctor.name}${r.doctor?.department ? ' — ' + r.doctor.department : ''}`}</title>
                {/* Card container */}
                <rect x={cardX} y={cardY} width={cardW} height={cardH} rx="12" className="fill-white stroke-slate-200" filter="url(#softShadow)" />
                {/* Title */}
                <text x={cardX + 12} y={cardY + 20} className="fill-slate-800" fontSize="13" fontWeight="700">{`Room ${r.roomNumber}`}</text>
                {/* Summary icon button */}
                <g transform={`translate(${cardX + cardW - 18}, ${cardY + 6})`} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onOpenReport && onOpenReport(r.roomNumber); }}>
                  <title>Room Summary</title>
                  <rect width="16" height="16" rx="3" className="fill-white" stroke="#cbd5e1" />
                  <path d="M3 12 L7 12 L7 9 L11 9" stroke="#334155" strokeWidth="1.5" fill="none" />
                  <path d="M5 7 L7 9 L9 6" stroke="#334155" strokeWidth="1.5" fill="none" />
                </g>
                {/* Manage schedule icon (placed just below summary icon) */}
                <g transform={`translate(${cardX + cardW - 18}, ${cardY + 26})`} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onOpenManageDoctor && onOpenManageDoctor(r.doctor); }}>
                  <title>Manage schedule</title>
                  <rect width="16" height="16" rx="3" className="fill-white" stroke="#cbd5e1" />
                  <line x1="11" y1="3" x2="11" y2="7" stroke="#334155" strokeWidth="1.5" />
                  <line x1="5" y1="3" x2="5" y2="7" stroke="#334155" strokeWidth="1.5" />
                  <line x1="2" y1="9" x2="14" y2="9" stroke="#334155" strokeWidth="1.5" />
                </g>
                {/* Meta line: occupancy dot + doctor name (percent shown on bar) */}
                <circle cx={cardX + 12} cy={cardY + 34} r="3" fill={dotColor} />
                <text x={cardX + 12 + 8} y={cardY + 36} className="fill-slate-600" fontSize="11">
                  {r.doctor.name}{r.doctor?.department ? ` — ${r.doctor.department}` : ''}
                </text>
                {/* Progress bar below card */}
                <rect x={barBgX} y={barBgY} width={barBgW} height={barH} rx="6" className="fill-slate-200" />
                <rect x={barBgX} y={barBgY} width={barFillW} height={barH} rx="6" className={occupancyFillClass(r.occupancyPercent)} />
                {/* Percent label aligned to bar right (like cards) */}
                <text x={barBgX + barBgW + 6} y={barBgY + barH/2 + 3} textAnchor="start" className="fill-slate-700" fontSize="10">
                  {`${r.occupancyPercent}%`}
                </text>
              </g>
            );
          })}

          {/* Legend */}
          <g transform={`translate(${(plan as any).svgWidth - 220}, ${20})`}>
            <rect width="200" height="64" rx="8" className="fill-white stroke-slate-300" />
            <text x="12" y="20" className="fill-slate-700" fontSize="12">Occupancy</text>
            <g transform="translate(12,28)">
              <rect x="0" y="0" width="28" height="8" className="fill-rose-500" rx="4" />
              <rect x="36" y="0" width="28" height="8" className="fill-orange-500" rx="4" />
              <rect x="72" y="0" width="28" height="8" className="fill-amber-500" rx="4" />
              <rect x="108" y="0" width="28" height="8" className="fill-emerald-500" rx="4" />
              <rect x="144" y="0" width="28" height="8" className="fill-emerald-600" rx="4" />
              <text x="0" y="24" className="fill-slate-500" fontSize="10">0%</text>
              <text x="42" y="24" className="fill-slate-500" fontSize="10">20%</text>
              <text x="78" y="24" className="fill-slate-500" fontSize="10">40%</text>
              <text x="114" y="24" className="fill-slate-500" fontSize="10">60%</text>
              <text x="150" y="24" className="fill-slate-500" fontSize="10">80%</text>
            </g>
          </g>
        </svg>
      </div>
      <ZoneRoomsList groups={zoneRooms} />
    </div>
  );
}

function FloorPlanSvgAsset({ building, floor, rooms, zone = 'all', onOpenDoctor, onSelectZone, onOpenReport }) {
  const wrapperRef = React.useRef<SVGSVGElement | null>(null);
  const [overlays, setOverlays] = useState<any[]>([]);
  const [corridorBox, setCorridorBox] = useState<any>(null);
  const zoneRooms = useMemo(() => {
    if (!corridorBox || overlays.length === 0) return { A: [], B: [], C: [], D: [] };
    const midX = 1000 / 2;
    const a: any[] = [], b: any[] = [], c: any[] = [], d: any[] = [];
    overlays.forEach((o) => {
      const cx = o.x + o.width / 2;
      const cy = o.y + o.height / 2;
      if (cy < corridorBox.y) a.push(o.room);
      if (cy > corridorBox.y + corridorBox.height) b.push(o.room);
      if (cx >= midX) c.push(o.room);
      if (cx < midX) d.push(o.room);
    });
    // Align with zones-plus.svg: A=top, C=bottom, B=right, D=left
    const aFiltered = a.filter((rr: any) => {
      const n = Number(rr.roomNumber) % 100;
      return n >= 1 && n <= 6;
    });
    return { A: aFiltered, C: b, B: c, D: d };
  }, [overlays, corridorBox]);

  // Derive the plus-shape rectangle for the selected zone
  const zoneRect = useMemo(() => {
    if (!corridorBox || zone === 'all') return null;
    const midX = 1000 / 2;
    const armVerticalWidth = Math.max(380, 1000 * 0.35);
    const armHorizontalHeight = Math.max(260, 600 * 0.33);
    const halfVW = armVerticalWidth / 2;
    const centerY = corridorBox.y + corridorBox.height / 2;
    const topHeight = Math.max(0, corridorBox.y);
    const bottomY = corridorBox.y + corridorBox.height;
    const bottomHeight = Math.max(0, 600 - bottomY);
    const map = {
      A: { x: midX - halfVW, y: 0, w: armVerticalWidth, h: topHeight },                                      // top
      C: { x: midX - halfVW, y: bottomY, w: armVerticalWidth, h: bottomHeight },                             // bottom
      D: { x: 0, y: centerY - armHorizontalHeight / 2, w: Math.max(0, midX - halfVW), h: armHorizontalHeight }, // left
      B: { x: midX + halfVW, y: centerY - armHorizontalHeight / 2, w: Math.max(0, 1000 - (midX + halfVW)), h: armHorizontalHeight }, // right
    } as any;
    return map[zone] || null;
  }, [zone, corridorBox]);

  // Layout helper: compute grid inside a rect and produce objects with coordinates + room
  function layoutInRect(items: any[], rect?: any) {
    if (!rect) return [];
    const pad = 10;
    const gap = 8;
    const ratio = rect.w / Math.max(1, rect.h);
    const cols = ratio >= 2.5 ? 8 : ratio >= 1.8 ? 6 : ratio >= 1.2 ? 4 : 3;
    const rows = Math.max(1, Math.ceil(items.length / cols));
    const cellW = (rect.w - pad * 2 - gap * (cols - 1)) / cols;
    const cellH = (rect.h - pad * 2 - gap * (rows - 1)) / rows;
    return items.map((it, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      return {
        room: it,
        x: rect.x + pad + c * (cellW + gap),
        y: rect.y + pad + r * (cellH + gap),
        width: cellW,
        height: cellH,
      };
    });
  }

  function layoutFixed2x2(items: any[], rect?: any) {
    if (!rect) return [];
    const pad = 18;
    const gap = 12;
    const cols = 2, rows = 2;
    const cellW = (rect.w - pad * 2 - gap * (cols - 1)) / cols;
    const cellH = (rect.h - pad * 2 - gap * (rows - 1)) / rows;
    const picked = (items || []).slice(0, 4);
    return picked.map((room, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      return {
        x: rect.x + pad + c * (cellW + gap),
        y: rect.y + pad + r * (cellH + gap),
        width: cellW,
        height: cellH,
        room,
      };
    });
  }

  const zoneLayout = useMemo(() => {
    if (!zoneRect || zone === 'all') return [];
    const items = (zoneRooms as any)[zone] || [];
    // Expand the selected zone area to show ALL its rooms
    const pad = 20;
    const fullW = 1000 - pad * 2;
    const fullH = 600 - pad * 2;
    let expanded = { ...(zoneRect as any) };
    if (zone === 'A') {
      const h = Math.min(fullH, Math.max((zoneRect as any).h + 260, (zoneRect as any).h));
      expanded = { x: pad, y: pad, w: fullW, h };
    } else if (zone === 'B') {
      // Right arm → expand width
      const w = Math.min(fullW, Math.max((zoneRect as any).w + 360, (zoneRect as any).w));
      expanded = { x: 1000 - w - pad, y: pad, w, h: fullH };
    } else if (zone === 'C') {
      // Bottom arm → expand height
      const h = Math.min(fullH, Math.max((zoneRect as any).h + 260, (zoneRect as any).h));
      expanded = { x: pad, y: 600 - h - pad, w: fullW, h };
    } else if (zone === 'D') {
      const w = Math.min(fullW, Math.max((zoneRect as any).w + 360, (zoneRect as any).w));
      expanded = { x: pad, y: pad, w, h: fullH };
    }
    return layoutInRect(items, expanded);
  }, [zoneRect, zone, zoneRooms]);

  // Decide which overlay items to render for the asset (avoid complex inline ternaries)
  const overlayItems = useMemo(() => {
    if (zone === 'all') {
      const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
      const midX = 1000 / 2;
      const armVW = Math.max(380, 1000 * 0.35);
      const armHH = Math.max(260, 600 * 0.33);
      const halfVW = armVW / 2;
      const topY = 0;
      const topH = Math.max(320, corridorBox ? corridorBox.y : 240);
      const bottomY = corridorBox ? corridorBox.y + corridorBox.height : 340;
      const bottomH = Math.max(320, 600 - bottomY);
      const centerY = corridorBox ? (corridorBox.y + corridorBox.height / 2) : 300;
      const leftRect = {
        x: clamp(0, 0, 1000),
        y: clamp(centerY - Math.max(300, armHH) / 2, 0, 600 - Math.max(300, armHH)),
        w: Math.max(420, midX - halfVW),
        h: Math.max(300, armHH),
      };
      const rightRect = {
        x: clamp(midX + halfVW - (Math.max(420, (1000 - (midX + halfVW))) - (1000 - (midX + halfVW))), 0, 1000 - Math.max(420, (1000 - (midX + halfVW)))),
        y: clamp(centerY - Math.max(300, armHH) / 2, 0, 600 - Math.max(300, armHH)),
        w: Math.max(420, (1000 - (midX + halfVW))),
        h: Math.max(300, armHH),
      };
      const items = [
        ...layoutFixed2x2((zoneRooms as any).A, { x: midX - halfVW, y: topY, w: armVW, h: topH }),             // A top
        ...layoutFixed2x2((zoneRooms as any).C, { x: midX - halfVW, y: bottomY, w: armVW, h: bottomH }),       // C bottom
        ...layoutFixed2x2((zoneRooms as any).B, rightRect),                                                    // B right
        ...layoutFixed2x2((zoneRooms as any).D, leftRect),                                                     // D left
      ];
      return items.length ? items : overlays;
    }
    return zoneLayout;
  }, [zone, overlays, zoneLayout, zoneRooms, corridorBox]);
  function ZoneRoomsList({ groups }) {
    const entries = zone === 'all' ? ['A','B','C','D'] : [zone];
    return (
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {entries.map((z) => (
          <div key={z} className="rounded-lg border border-slate-200 bg-white p-2">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: zoneColorHex(z) }}></span>
              <div className="text-xs font-semibold text-slate-800">{`Zone ${z}`} <span className="text-slate-500 font-normal">({groups[z].length})</span></div>
            </div>
            <div className="flex flex-wrap gap-1">
              {groups[z].map((r) => (
                <span key={r.id} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">Room {r.roomNumber}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  useEffect(() => {
    const wrapper = (wrapperRef as any).current as SVGSVGElement | null;
    if (!wrapper) return;
    const svg = wrapper.querySelector('svg');
    if (!svg) return;

    const base = floor * 100 + 1; // e.g., floor 1 -> 101
    const idForIndex = (i: number) => `room-${base + i}`;

    const disposers: Array<() => void> = [];
    const computed: any[] = [];
    rooms.slice(0, 24).forEach((room: any, i: number) => {
      const id = idForIndex(i);
      const node = svg.querySelector(`#${(window as any).CSS.escape(id)}`) as any;
      if (!node) return;
      node.style.fill = '#ffffff';
      node.style.stroke = '#cbd5e1';
      node.style.cursor = 'pointer';
      node.style.transition = 'stroke 120ms ease';
      const glow = occupancyFillHex(room.occupancyPercent);
      node.style.filter = `drop-shadow(0 0 0 ${glow})`;

      const onEnter = () => { node.style.stroke = '#0f172a'; };
      const onLeave = () => { node.style.stroke = '#cbd5e1'; };
      const onClick = () => onOpenDoctor(room);
      node.addEventListener('mouseenter', onEnter);
      node.addEventListener('mouseleave', onLeave);
      node.addEventListener('click', onClick);
      disposers.push(() => {
        node.removeEventListener('mouseenter', onEnter);
        node.removeEventListener('mouseleave', onLeave);
        node.removeEventListener('click', onClick);
      });

      let title = node.querySelector('title');
      if (!title) {
        title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        node.appendChild(title);
      }
      (title as any).textContent = `Room ${room.roomNumber} — ${room.occupancyPercent}% • ${room.doctor.name}${room.doctor?.department ? ' — ' + room.doctor.department : ''}`;

      // Compute overlay label positions from bounding boxes
      const bb = node.getBBox ? node.getBBox() : null;
      if (bb) {
        computed.push({
          x: bb.x,
          y: bb.y,
          width: bb.width,
          height: bb.height,
          room,
        });
      }
    });
    setOverlays(computed);

    // capture corridor bbox if present
    const corrNode = svg.querySelector('#corridor') as any;
    if (corrNode && corrNode.getBBox) {
      const bb = corrNode.getBBox();
      setCorridorBox({ x: bb.x, y: bb.y, width: bb.width, height: bb.height });
    } else {
      // fallback matching demo asset
      setCorridorBox({ x: 40, y: 240, width: 900, height: 120 });
    }

    // Hide original room shapes to avoid double boxes; overlay handles rendering/clicks
    const roomNodes = svg.querySelectorAll('.room') as any;
    roomNodes.forEach((n: any) => {
      n.style.opacity = '0';
    });

    return () => { disposers.forEach((d) => d()); };
  }, [rooms, floor, onOpenDoctor]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-slate-900 text-lg font-semibold">{building.name} — Floor {floor}</div>
          <div className="text-slate-600 text-sm">Architectural SVG plan with interactive rooms</div>
        </div>
        <Badge>{rooms.length} rooms</Badge>
      </div>
      <div ref={wrapperRef as any} className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        {/* Zones backdrop as plus shape (A top, B bottom, C right, D left) */}
        {corridorBox && (
          <svg viewBox="0 0 1000 600" className="absolute inset-0 h-full w-full">
            {(() => {
              const topHeight = Math.max(0, corridorBox.y);
              const bottomY = corridorBox.y + corridorBox.height;
              const bottomHeight = Math.max(0, 600 - bottomY);
              const midX = 1000 / 2;
              const armVerticalWidth = Math.max(380, 1000 * 0.35);
              const armHorizontalHeight = Math.max(260, 600 * 0.33);
              const halfVW = armVerticalWidth / 2;
              const corridorCenterY = corridorBox.y + corridorBox.height / 2;
              const bands = [
                { z: 'A', x: midX - halfVW, y: 0, w: armVerticalWidth, h: topHeight, labelX: midX, labelY: Math.min(22, topHeight - 6) },
                { z: 'B', x: midX - halfVW, y: bottomY, w: armVerticalWidth, h: bottomHeight, labelX: midX, labelY: bottomY + Math.min(22, Math.max(16, bottomHeight / 2)) },
                { z: 'D', x: 0, y: corridorCenterY - armHorizontalHeight / 2, w: Math.max(0, midX - halfVW), h: armHorizontalHeight, labelX: Math.max(40, (midX - halfVW) / 2), labelY: corridorCenterY + 4 },
                { z: 'C', x: midX + halfVW, y: corridorCenterY - armHorizontalHeight / 2, w: Math.max(0, 1000 - (midX + halfVW)), h: armHorizontalHeight, labelX: midX + halfVW + Math.max(40, (1000 - (midX + halfVW)) / 2), labelY: corridorCenterY + 4 },
              ];
              return bands.map(b => {
                const active = zone === 'all' || zone === b.z;
                const color = zoneColorHex(b.z);
                return (
                  <g key={b.z} className="cursor-pointer" onClick={() => onSelectZone && onSelectZone(b.z)}>
                    <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={hexToRgba(color, active ? 0.10 : 0.06)} />
                  </g>
                );
              });
            })()}
          </svg>
        )}
        <AhujaFloor1Svg />
        {/* Labels/metrics overlay */}
        <svg viewBox="0 0 1000 600" className="absolute inset-0 h-full w-full">
          {overlayItems.map(({ x, y, width, height, room }) => {
            const barMargin = 10;
            const barHeight = 10;
            const barWidth = Math.max(0, width - barMargin * 2) * (room.occupancyPercent / 100);
            return (
              <g key={room.id} className="cursor-pointer" onClick={() => onOpenDoctor(room)}>
                {/* High-contrast label background */}
                <rect
                  x={x + 8}
                  y={y + 8}
                  width={Math.max(0, width - 16)}
                  height={58}
                  rx="10"
                  className="fill-white"
                  stroke="#e2e8f0"
                  opacity="0.95"
                />
                {/* Zone badge: show selected zone letter when a zone is active */}
                {zone !== 'all' && (
                  <g transform={`translate(${x + width - 40}, ${y + 14})`}>
                    <rect width="28" height="28" rx="8" className="fill-white" stroke="#cbd5e1" />
                    <text x="14" y="18" textAnchor="middle" className="fill-slate-800" fontSize="12" fontWeight="700">
                      {zone}
                    </text>
                  </g>
                )}
                <text x={x + 12} y={y + 22} className="fill-slate-800" fontSize="13" fontWeight="600">{`Room ${room.roomNumber}`}</text>
                <g transform={`translate(${x + width - 22}, ${y + 10})`} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onOpenReport && onOpenReport(room.roomNumber); }}>
                  <title>Room Summary</title>
                  <rect width="18" height="18" rx="3" className="fill-white" stroke="#cbd5e1" />
                  <path d="M4 12 L8 12 L8 9 L13 9" stroke="#334155" strokeWidth="1.5" fill="none" />
                  <path d="M6 7 L8 9 L10 6" stroke="#334155" strokeWidth="1.5" fill="none" />
                </g>
                {/* Doctor only inside card; percent will be on bar */}
                <text x={x + 12} y={y + 54} className="fill-slate-600" fontSize="11">
                  {room.doctor.name}{room.doctor?.department ? ` — ${room.doctor.department}` : ''}
                </text>
                <rect
                  x={x + barMargin}
                  y={y + height - barMargin - barHeight}
                  width={width - barMargin * 2}
                  height={barHeight}
                  rx="6"
                  className="fill-slate-200"
                />
                <rect
                  x={x + barMargin}
                  y={y + height - barMargin - barHeight}
                  width={barWidth}
                  height={barHeight}
                  rx="6"
                  fill={occupancyFillHex(room.occupancyPercent)}
                />
                {/* Percent label aligned to bar right (like cards) */}
                <text x={x + width - barMargin - 2} y={y + height - barMargin - barHeight / 2 + 3} textAnchor="end" className="fill-slate-700" fontSize="10">
                  {`${room.occupancyPercent}%`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <ZoneRoomsList groups={zoneRooms} />
    </div>
  );
}

function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose}></div>
      <div className="relative z-10 w-[98vw] max-w-6xl rounded-xl border border-slate-200 bg-white p-4 shadow-xl overflow-auto">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}

function DoctorSchedule({ room, date, onClose, onOpenDoctorSchedule }: { room: any; date: string; onClose?: () => void; onOpenDoctorSchedule?: (doctorId: string, opts?: { newMode?: boolean; name?: string; edit?: { day: string; buildingId: string; floor: number; room: string; start: string; end: string } }) => void }) {
  const d = new Date(date || new Date());
  const dayName = d.toLocaleDateString(undefined, { weekday: 'long' });
  const dayFull = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
  // pull slots from local schedule store for this room/day
  const saved = loadSchedules();
  const normalize = (s?: string) => String(s || '').toLowerCase().replace(/\./g, '').replace(/\s+/g, '');
  const department = useMemo(() => {
    try {
      const doctorId = room?.doctor?.id;
      let sched = doctorId ? (saved as any)?.[doctorId] : null;
      if (!sched && room?.doctor?.name) {
        const target = normalize(room?.doctor?.name);
        const match = Object.values(saved || {}).find((s: any) => normalize((s as any)?.doctorName) === target);
        if (match) sched = match;
      }
      return (sched as any)?.doctorDepartment || '';
    } catch {
      return '';
    }
  }, [saved, room?.doctor?.id]);
  const [showManage, setShowManage] = React.useState<boolean>(false);
  const savedSlots = useMemo(() => {
    const slots: Array<{ buildingId: string; buildingName: string; floor: number; room: string; start: string; end: string }> = [];
    const doctorId = room?.doctor?.id;
    let sched = doctorId ? (saved as any)?.[doctorId] : null;
    if (!sched && room?.doctor?.name) {
      const target = normalize(room?.doctor?.name);
      const match = Object.values(saved || {}).find((s: any) => normalize((s as any)?.doctorName) === target);
      if (match) sched = match;
    }
    if (sched) {
      const day = (sched as any)?.week?.[dayName];
      const list = day?.slots || [];
      for (const s of list) {
        const b = (BUILDINGS as any[]).find((x) => x.id === s.buildingId);
        slots.push({
          buildingId: s.buildingId,
          buildingName: b?.name || s.buildingId,
          floor: Number(s.floor) || 1,
          room: String(s.room || ''),
          start: s.start,
          end: s.end,
        });
      }
    }
    return slots.sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  }, [saved, dayName, room?.doctor?.id]);

  const allSlots = useMemo(() => {
    const doctorId = room?.doctor?.id;
    let sched = doctorId ? (saved as any)?.[doctorId] : null;
    if (!sched && room?.doctor?.name) {
      const target = normalize(room?.doctor?.name);
      const match = Object.values(saved || {}).find((s: any) => normalize((s as any)?.doctorName) === target);
      if (match) sched = match;
    }
    const result: Array<{ day: string; buildingId: string; buildingName: string; floor: number; room: string; start: string; end: string }> = [];
    if (sched && (sched as any).week) {
      try {
        for (const [day, dayObj] of Object.entries((sched as any).week as any)) {
          const list: any[] = (dayObj as any)?.slots || [];
          for (const s of list) {
            const b = (BUILDINGS as any[]).find((x) => x.id === s.buildingId);
            result.push({
              day: String(day),
              buildingId: s.buildingId,
              buildingName: b?.name || s.buildingId,
              floor: Number(s.floor) || 1,
              room: String(s.room || ''),
              start: s.start,
              end: s.end,
            });
          }
        }
      } catch { /* ignore */ }
    }
    return result;
  }, [saved, room?.doctor?.id]);

  return (
    <div>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back
            </button>
          ) : null}
          <div>
            <div className="text-slate-900 text-lg font-semibold">
              <a
                href={`#/doctor-schedule?doctorId=${encodeURIComponent(room.doctor?.id || '')}`}
                onClick={(e) => { e.preventDefault(); onOpenDoctorSchedule && onOpenDoctorSchedule(String(room.doctor?.id || ''), { name: room.doctor?.name }); }}
                className="hover:underline"
              >
                {room.doctor.name}
              </a>
              <button
                type="button"
                title="Manage schedule"
                aria-label="Manage schedule"
                onClick={() => setShowManage(v => !v)}
                className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 align-middle"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </button>
            </div>
            <div className="text-slate-600 text-sm">{department ? `${department} • ` : ''}Room {room.roomNumber} • {dayFull}</div>
          </div>
        </div>
      </div>
      {showManage ? (
        <>
          {allSlots.length > 0 ? (
            <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Day</th>
                    <th className="px-3 py-2 text-left font-semibold">Building</th>
                    <th className="px-3 py-2 text-left font-semibold">Floor</th>
                    <th className="px-3 py-2 text-left font-semibold">Room</th>
                    <th className="px-3 py-2 text-left font-semibold">Start</th>
                    <th className="px-3 py-2 text-left font-semibold">End</th>
                    <th className="px-3 py-2 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {allSlots.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-800">{s.day}</td>
                      <td className="px-3 py-2 text-slate-800">{s.buildingName}</td>
                      <td className="px-3 py-2 text-slate-800">Floor {s.floor}</td>
                      <td className="px-3 py-2 text-slate-800">{s.room || '-'}</td>
                      <td className="px-3 py-2 text-slate-600">{s.start}</td>
                      <td className="px-3 py-2 text-slate-600">{s.end}</td>
                      <td className="px-3 py-2 text-right">
                        <a
                          href={`#/doctor-schedule?doctorId=${encodeURIComponent(room.doctor?.id || '')}`}
                          onClick={(e) => { e.preventDefault(); onOpenDoctorSchedule && onOpenDoctorSchedule(String(room.doctor?.id || ''), { name: room.doctor?.name, edit: { day: s.day, buildingId: s.buildingId, floor: s.floor, room: s.room, start: s.start, end: s.end } }); }}
                          className="inline-flex rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 hover:bg-slate-50"
                        >
                          Edit
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-3 p-3 text-sm text-slate-600 rounded-md border border-slate-200">
              No schedules found for this doctor.
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <a
              href={`#/doctor-schedule?doctorId=${encodeURIComponent(room.doctor?.id || '')}`}
              onClick={(e) => { e.preventDefault(); onOpenDoctorSchedule && onOpenDoctorSchedule(String(room.doctor?.id || ''), { newMode: true, name: room.doctor?.name }); }}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add New Schedule
            </a>
          </div>
        </>
      ) : (
        <>
          {savedSlots.length > 0 ? (
            <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Building</th>
                    <th className="px-3 py-2 text-left font-semibold">Floor</th>
                    <th className="px-3 py-2 text-left font-semibold">Room</th>
                    <th className="px-3 py-2 text-left font-semibold">Start</th>
                    <th className="px-3 py-2 text-left font-semibold">End</th>
                    <th className="px-3 py-2 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {savedSlots.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-800">{s.buildingName}</td>
                      <td className="px-3 py-2 text-slate-800">Floor {s.floor}</td>
                      <td className="px-3 py-2 text-slate-800">{s.room || '-'}</td>
                      <td className="px-3 py-2 text-slate-600">{s.start}</td>
                      <td className="px-3 py-2 text-slate-600">{s.end}</td>
                      <td className="px-3 py-2 text-right">
                        <a
                          href={`#/doctor-schedule?doctorId=${encodeURIComponent(room.doctor?.id || '')}`}
                          onClick={(e) => { e.preventDefault(); onOpenDoctorSchedule && onOpenDoctorSchedule(String(room.doctor?.id || ''), { name: room.doctor?.name, edit: { day: dayName, buildingId: s.buildingId, floor: s.floor, room: s.room, start: s.start, end: s.end } }); }}
                          className="inline-flex rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 hover:bg-slate-50"
                        >
                          Edit
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-3 p-3 text-sm text-slate-600 rounded-md border border-slate-200">
              No saved schedule for this doctor/day.&nbsp;
              <a
                href={`#/doctor-schedule?doctorId=${encodeURIComponent(room.doctor?.id || '')}&new=1`}
                onClick={(e) => { e.preventDefault(); onOpenDoctorSchedule && onOpenDoctorSchedule(String(room.doctor?.id || ''), { newMode: true, name: room.doctor?.name }); }}
                className="text-slate-900 underline hover:no-underline"
              >
                Create one
              </a>
              .
            </div>
          )}
        </>
      )}
      {!showManage && (
        <div className="mt-4 flex justify-end">
          <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50 mr-2" onClick={() => window.print()}>Print</button>
        </div>
      )}
    </div>
  );
}

function DoctorManageModal({ doctor, onClose, onOpenDoctorSchedule }: { doctor: any; onClose?: () => void; onOpenDoctorSchedule?: (doctorId: string, opts?: { newMode?: boolean; name?: string; edit?: { day: string; buildingId: string; floor: number; room: string; start: string; end: string } }) => void }) {
  const [refresh, setRefresh] = useState(0);
  const saved = loadSchedules();
  const normalize = (s?: string) => String(s || '').toLowerCase().replace(/\./g, '').replace(/\s+/g, '');
  // Ensure a minimal schedule exists for this doctor so modal is never empty
  useEffect(() => {
    try {
      const id = String(doctor?.id || '').trim();
      const name = String(doctor?.name || '').trim();
      const byId = id ? (saved as any)?.[id] : null;
      let byName: any = null;
      if (!byId && name) {
        const target = normalize(name);
        byName = Object.values(saved || {}).find((s: any) => normalize((s as any)?.doctorName) === target);
      }
      const exists = !!(byId || byName);
      if (!exists) {
        const did = id || name || `doc-${Math.random().toString(36).slice(2, 7)}`;
        const dname = name || id || 'Doctor';
        const defaultBuilding = 'uh-cleveland-medical-center';
        const week = {
          Monday:    { slots: [{ buildingId: defaultBuilding, floor: 1, room: '101', start: '09:00', end: '12:00' }] },
          Tuesday:   { slots: [{ buildingId: defaultBuilding, floor: 2, room: '201', start: '09:00', end: '12:00' }] },
          Wednesday: { slots: [{ buildingId: defaultBuilding, floor: 3, room: '301', start: '13:00', end: '16:00' }] },
          Thursday:  { slots: [{ buildingId: defaultBuilding, floor: 1, room: '102', start: '09:00', end: '12:00' }] },
          Friday:    { slots: [{ buildingId: defaultBuilding, floor: 2, room: '202', start: '10:00', end: '13:00' }] },
        } as any;
        upsertDoctorSchedule(did, { doctorId: did, doctorName: dname, week });
        setRefresh((x) => x + 1);
      }
    } catch { /* ignore */ }
  }, [doctor?.id, doctor?.name]);
  const department = useMemo(() => {
    try {
      const doctorId = doctor?.id;
      let sched = doctorId ? (saved as any)?.[doctorId] : null;
      if (!sched && doctor?.name) {
        const target = normalize(doctor?.name);
        const match = Object.values(saved || {}).find((s: any) => normalize((s as any)?.doctorName) === target);
        if (match) sched = match;
      }
      return (sched as any)?.doctorDepartment || '';
    } catch {
      return '';
    }
  }, [saved, doctor?.id]);
  const allSlots = useMemo(() => {
    const doctorId = doctor?.id;
    let sched = doctorId ? (saved as any)?.[doctorId] : null;
    if (!sched && doctor?.name) {
      const target = normalize(doctor?.name);
      const match = Object.values(saved || {}).find((s: any) => normalize((s as any)?.doctorName) === target);
      if (match) sched = match;
    }
    const result: Array<{ day: string; buildingId: string; buildingName: string; floor: number; room: string; start: string; end: string }> = [];
    if (sched && (sched as any).week) {
      try {
        for (const [day, dayObj] of Object.entries((sched as any).week as any)) {
          const list: any[] = (dayObj as any)?.slots || [];
          for (const s of list) {
            const b = (BUILDINGS as any[]).find((x) => x.id === s.buildingId);
            result.push({
              day: String(day),
              buildingId: s.buildingId,
              buildingName: b?.name || s.buildingId,
              floor: Number(s.floor) || 1,
              room: String(s.room || ''),
              start: s.start,
              end: s.end,
            });
          }
        }
      } catch { /* ignore */ }
    } else {
      // Generate an immediate minimal schedule so the modal is never empty
      try {
        const defaultBuilding = 'uh-cleveland-medical-center';
        const did = String(doctor?.id || doctor?.name || `doc-${Math.random().toString(36).slice(2,7)}`);
        const dname = String(doctor?.name || doctor?.id || 'Doctor');
        const genWeek: any = {
          Monday: { slots: [{ buildingId: defaultBuilding, floor: 1, room: '101', start: '09:00', end: '12:00' }] },
          Tuesday: { slots: [{ buildingId: defaultBuilding, floor: 2, room: '201', start: '09:00', end: '12:00' }] },
        };
        upsertDoctorSchedule(did, { doctorId: did, doctorName: dname, week: genWeek });
        for (const [day, dayObj] of Object.entries(genWeek)) {
          const list: any[] = (dayObj as any)?.slots || [];
          for (const s of list) {
            const b = (BUILDINGS as any[]).find((x) => x.id === s.buildingId);
            result.push({
              day: String(day),
              buildingId: s.buildingId,
              buildingName: b?.name || s.buildingId,
              floor: Number(s.floor) || 1,
              room: String(s.room || ''),
              start: s.start,
              end: s.end,
            });
          }
        }
      } catch { /* ignore */ }
    }
    // Final fallback: if still empty, produce transient mock rows for display
    if (result.length === 0) {
      const b = (BUILDINGS as any[])[0];
      const name = b?.name || 'UH Cleveland Medical Center';
      const bid = b?.id || 'uh-cleveland-medical-center';
      const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
      for (let i = 0; i < days.length; i++) {
        result.push({
          day: days[i],
          buildingId: bid,
          buildingName: name,
          floor: (i % 3) + 1,
          room: String(((i % 3) + 1) * 100 + (i + 1)),
          start: '09:00',
          end: '12:00'
        });
      }
    }
    return result;
  }, [saved, doctor?.id]);
  return (
    <div>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back
            </button>
          ) : null}
          <div>
            <div className="text-slate-900 text-lg font-semibold">{doctor?.name || 'Manage Schedule'}</div>
            <div className="text-slate-600 text-sm">{department ? `${department} • ` : ''}All schedules (Mon–Fri)</div>
          </div>
        </div>
      </div>
      {allSlots.length > 0 ? (
        <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Day</th>
                <th className="px-3 py-2 text-left font-semibold">Building</th>
                <th className="px-3 py-2 text-left font-semibold">Floor</th>
                <th className="px-3 py-2 text-left font-semibold">Room</th>
                <th className="px-3 py-2 text-left font-semibold">Start</th>
                <th className="px-3 py-2 text-left font-semibold">End</th>
                <th className="px-3 py-2 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {allSlots.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-slate-800">{s.day}</td>
                  <td className="px-3 py-2 text-slate-800">{s.buildingName}</td>
                  <td className="px-3 py-2 text-slate-800">Floor {s.floor}</td>
                  <td className="px-3 py-2 text-slate-800">{s.room || '-'}</td>
                  <td className="px-3 py-2 text-slate-600">{s.start}</td>
                  <td className="px-3 py-2 text-slate-600">{s.end}</td>
                  <td className="px-3 py-2 text-right">
                    <a
                      href={`#/doctor-schedule?doctorId=${encodeURIComponent(doctor?.id || '')}`}
                      onClick={(e) => { e.preventDefault(); onOpenDoctorSchedule && onOpenDoctorSchedule(String(doctor?.id || ''), { name: doctor?.name, edit: { day: s.day, buildingId: s.buildingId, floor: s.floor, room: s.room, start: s.start, end: s.end } }); }}
                      className="inline-flex rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 hover:bg-slate-50"
                    >
                      Edit
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-3 p-3 text-sm text-slate-600 rounded-md border border-slate-200">
          No schedules found for this doctor.
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <a
          href={`#/doctor-schedule?doctorId=${encodeURIComponent(doctor?.id || '')}&new=1`}
          onClick={(e) => { e.preventDefault(); onOpenDoctorSchedule && onOpenDoctorSchedule(String(doctor?.id || ''), { newMode: true, name: doctor?.name }); }}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add New Schedule
        </a>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [selectedCampus, setSelectedCampus] = useState<any>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [floorView, setFloorView] = useState<'plan' | 'cards'>('cards');
  const [zone, setZone] = useState<'all' | 'A' | 'B' | 'C' | 'D'>('all');
  const [dateFrom, setDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [openRoom, setOpenRoom] = useState<any>(null);
  const [manageDoctor, setManageDoctor] = useState<any>(null);

  // Seed mock schedules if storage is empty, so dashboard has data out of the box
  useEffect(() => {
    try {
      const existingAll = loadSchedules() as Record<string, any>;
      const num = Object.keys(existingAll || {}).filter((k) => k !== '__draft__').length;
      if (num >= 3) return;
      const listRoomsForBuilding = (buildingId: string, floor: number): string[] => {
        // simple synthetic rooms if not available via helper
        return Array.from({ length: 6 }).map((_, i) => String(floor * 100 + (i + 1)));
      };
      const pickRoom = (buildingId: string, floor: number) => {
        const rooms = listRoomsForBuilding(buildingId, floor);
        return rooms[0] || `${floor}01`;
      };
      const seed = [
        {
          doctorId: 'd1',
          doctorName: 'Dr. Patel',
          doctorDepartment: 'Cardiology',
          week: {
            Monday:   { slots: [{ buildingId: 'uh-cleveland-medical-center', floor: 1, room: pickRoom('uh-cleveland-medical-center',1), start: '09:00', end: '12:00' }] },
            Tuesday:  { slots: [{ buildingId: 'uh-ahuja-medical-center', floor: 2, room: pickRoom('uh-ahuja-medical-center',2), start: '09:00', end: '12:00' }] },
            Wednesday:{ slots: [{ buildingId: 'uh-st-john-medical-center', floor: 1, room: pickRoom('uh-st-john-medical-center',1), start: '13:00', end: '16:00' }] },
            Thursday: { slots: [{ buildingId: 'uh-seidman-firelands', floor: 1, room: pickRoom('uh-seidman-firelands',1), start: '09:00', end: '12:00' }] },
            Friday:   { slots: [{ buildingId: 'uh-geauga-medical-center', floor: 3, room: pickRoom('uh-geauga-medical-center',3), start: '10:00', end: '13:00' }] },
          } as any
        },
        {
          doctorId: 'd2',
          doctorName: 'Dr. Rivera',
          doctorDepartment: 'Gastroenterology',
          week: {
            Monday:   { slots: [{ buildingId: 'uh-ahuja-medical-center', floor: 3, room: pickRoom('uh-ahuja-medical-center',3), start: '13:00', end: '16:00' }] },
            Tuesday:  { slots: [{ buildingId: 'uh-cleveland-medical-center', floor: 2, room: pickRoom('uh-cleveland-medical-center',2), start: '09:00', end: '12:00' }] },
            Wednesday:{ slots: [{ buildingId: 'uh-westlake-health-center', floor: 1, room: pickRoom('uh-westlake-health-center',1), start: '09:30', end: '12:30' }] },
            Thursday: { slots: [{ buildingId: 'uh-minoff-chagrin-highlands', floor: 2, room: pickRoom('uh-minoff-chagrin-highlands',2), start: '13:00', end: '16:00' }] },
            Friday:   { slots: [{ buildingId: 'uh-fairlawn-health-center', floor: 1, room: pickRoom('uh-fairlawn-health-center',1), start: '08:30', end: '11:30' }] },
          } as any
        },
        {
          doctorId: 'd3',
          doctorName: 'Dr. Chen',
          doctorDepartment: 'Urology',
          week: {
            Monday:   { slots: [{ buildingId: 'uh-landerbrook-health-center', floor: 1, room: pickRoom('uh-landerbrook-health-center',1), start: '09:00', end: '12:00' }] },
            Tuesday:  { slots: [{ buildingId: 'uh-mentor-hopkins-health-center', floor: 1, room: pickRoom('uh-mentor-hopkins-health-center',1), start: '13:00', end: '16:00' }] },
            Wednesday:{ slots: [{ buildingId: 'uh-st-john-medical-center', floor: 2, room: pickRoom('uh-st-john-medical-center',2), start: '09:00', end: '12:00' }] },
            Thursday: { slots: [{ buildingId: 'uh-cleveland-medical-center', floor: 4, room: pickRoom('uh-cleveland-medical-center',4), start: '13:00', end: '16:00' }] },
            Friday:   { slots: [{ buildingId: 'uh-ahuja-medical-center', floor: 2, room: pickRoom('uh-ahuja-medical-center',2), start: '09:00', end: '11:00' }] },
          } as any
        },
        {
          doctorId: 'd4',
          doctorName: 'Dr. Williams',
          doctorDepartment: 'Primary Care',
          week: {
            Monday:   { slots: [{ buildingId: 'uh-seidman-firelands', floor: 2, room: pickRoom('uh-seidman-firelands',2), start: '13:00', end: '16:00' }] },
            Tuesday:  { slots: [{ buildingId: 'uh-westlake-health-center', floor: 1, room: pickRoom('uh-westlake-health-center',1), start: '09:00', end: '12:00' }] },
            Wednesday:{ slots: [{ buildingId: 'uh-minoff-chagrin-highlands', floor: 1, room: pickRoom('uh-minoff-chagrin-highlands',1), start: '13:00', end: '16:00' }] },
            Thursday: { slots: [{ buildingId: 'uh-landerbrook-health-center', floor: 2, room: pickRoom('uh-landerbrook-health-center',2), start: '09:00', end: '12:00' }] },
            Friday:   { slots: [{ buildingId: 'uh-geauga-medical-center', floor: 1, room: pickRoom('uh-geauga-medical-center',1), start: '13:00', end: '16:00' }] },
          } as any
        },
      ];
      for (const s of seed) {
        upsertDoctorSchedule((s as any).doctorId, s);
      }
    } catch {}
  }, []);

  const schedulesByDoctor = useMemo(() => loadSchedules(), [dateFrom, dateTo]);
  const weekday = useMemo(() => {
    try {
      const d = new Date(dateFrom);
      return d.toLocaleDateString(undefined, { weekday: 'long' });
    } catch { return 'Monday'; }
  }, [dateFrom]);
  const rooms = useRooms(selectedBuilding?.id, selectedFloor || undefined, dateFrom, dateTo, schedulesByDoctor, weekday);
  const openRoomReport = React.useCallback((roomNumber: number) => {
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
    } catch {}
    const params = new URLSearchParams();
    params.set('room', String(roomNumber));
    if (selectedBuilding?.id) params.set('buildingId', String(selectedBuilding.id));
    if (selectedBuilding?.name) params.set('buildingName', String(selectedBuilding.name));
    if (typeof selectedFloor === 'number') params.set('floor', String(selectedFloor));
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    window.location.hash = `#/room-allocation?${params.toString()}`;
  }, [dateFrom, dateTo, selectedCity, selectedCampus, selectedBuilding?.id, selectedBuilding?.name, selectedFloor, floorView, zone]);
  const goToDoctorSchedule = React.useCallback((doctorId: string, opts?: { newMode?: boolean; name?: string; edit?: { day: string; buildingId: string; floor: number; room: string; start: string; end: string } }) => {
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
    } catch {}
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
  }, [dateFrom, dateTo, selectedCity, selectedCampus, selectedBuilding?.id, selectedFloor, floorView, zone]);

  // Restore dashboard context after returning from report page
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
          if (['all','A','B','C','D'].includes(s.zone)) setZone(s.zone);
          if (s.from) setDateFrom(s.from);
          if (s.to) setDateTo(s.to);
        }
        sessionStorage.removeItem('dash_restore');
      }
    } catch {}
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

  // Derive lists for City and Campus steps
  const cityStats = useMemo(() => {
    const byCity: Record<string, { campuses: Set<string>; buildings: number }> = {};
    console.log(byCity, 'byCity');
    
    for (const b of BUILDINGS as any[]) {
      if (!byCity[b.city]) byCity[b.city] = { campuses: new Set(), buildings: 0 };
      byCity[b.city].campuses.add(b.campus);
      byCity[b.city].buildings += 1;
    }
    return Object.entries(byCity).map(([name, s]) => ({ name, campuses: (s as any).campuses.size, buildings: (s as any).buildings }));
  }, []);

  const campusesForCity = useMemo(() => {
    if (!selectedCity) return [];
    const byCampus: Record<string, number> = {};
    for (const b of (BUILDINGS as any[]).filter(x => x.city === selectedCity)) {
      if (!byCampus[b.campus]) byCampus[b.campus] = 0;
      byCampus[b.campus] += 1;
    }
    return Object.entries(byCampus).map(([name, buildings]) => ({ name, buildings }));
  }, [selectedCity]);

  const buildingsForCampus = useMemo(() => {
    if (!selectedCity || !selectedCampus) return [];
    return (BUILDINGS as any[]).filter(b => b.city === selectedCity && b.campus === selectedCampus);
  }, [selectedCity, selectedCampus]);

  // City map points (aggregate all buildings per city)
  const cityPoints = useMemo(() => {
    const byCity: Record<string, { lat: number; lng: number; n: number; campuses: Set<string> }> = {};
    for (const b of BUILDINGS as any[]) {
      if (!byCity[b.city]) byCity[b.city] = { lat: 0, lng: 0, n: 0, campuses: new Set() };
      byCity[b.city].lat += b.latLng[0];
      byCity[b.city].lng += b.latLng[1];
      byCity[b.city].n += 1;
      byCity[b.city].campuses.add(b.campus);
    }
    return Object.entries(byCity).map(([city, v]) => ({
      id: city,
      title: city,
      subtitle: `${(v as any).campuses.size} campuses • ${(v as any).n} buildings`,
      latLng: [(v as any).lat / (v as any).n, (v as any).lng / (v as any).n],
      color: colorForKey(city),
    }));
  }, []);

  // Campus map points for selected city
  const campusPoints = useMemo(() => {
    if (!selectedCity) return [];
    const byCampus: Record<string, { lat: number; lng: number; n: number; address: string }> = {};
    for (const b of (BUILDINGS as any[]).filter(x => x.city === selectedCity)) {
      if (!byCampus[b.campus]) byCampus[b.campus] = { lat: 0, lng: 0, n: 0, address: b.address };
      byCampus[b.campus].lat += b.latLng[0];
      byCampus[b.campus].lng += b.latLng[1];
      byCampus[b.campus].n += 1;
    }
    return Object.entries(byCampus).map(([campus, v]) => ({
      id: campus,
      title: campus,
      subtitle: selectedCity,
      address: (v as any).address,
      latLng: [(v as any).lat / (v as any).n, (v as any).lng / (v as any).n],
    }));
  }, [selectedCity]);

  // Scoped set for summary cards
  const scopedBuildings = useMemo(() => {
    if (!selectedCity) return BUILDINGS as any[];
    if (selectedCity && !selectedCampus) return (BUILDINGS as any[]).filter(b => b.city === selectedCity);
    if (selectedCity && selectedCampus && !selectedBuilding) return (BUILDINGS as any[]).filter(b => b.city === selectedCity && b.campus === selectedCampus);
    if (selectedBuilding) return (BUILDINGS as any[]).filter(b => b.id === selectedBuilding.id);
    return BUILDINGS as any[];
  }, [selectedCity, selectedCampus, selectedBuilding]);

  const summary = useMemo(() => {
    const campusSet = new Set((scopedBuildings as any[]).map(b => `${b.city}|${b.campus}`));
    const totalCampuses = campusSet.size;
    const totalBuildings = (scopedBuildings as any[]).length;
    const totalFloors = (scopedBuildings as any[]).reduce((acc, b) => acc + b.floors.length, 0);

    let sum = 0; let count = 0;
    for (const b of (scopedBuildings as any[])) {
      for (const f of b.floors) {
        for (let i = 1; i <= 12; i++) {
          const roomNumber = f * 100 + i;
          const startSeed = parseInt((dateKey(dateFrom) || '0').split('-').join(''), 10) || 0;
          const endSeed = parseInt((dateKey(dateTo) || '0').split('-').join(''), 10) || startSeed;
          const days = Math.max(1, Math.min(7, Math.abs(endSeed - startSeed) || 1));
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
    const avgUtil = count ? Math.round((sum / count)) : 0;
    return { totalCampuses, totalBuildings, totalFloors, avgUtil };
  }, [scopedBuildings, dateFrom, dateTo]);

  function SummaryCardsTop({ summary }) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 shadow-sm">
          <div className="text-xs font-medium text-blue-700">Total Campuses</div>
          <div className="mt-1 text-xl font-semibold text-blue-900">{summary.totalCampuses}</div>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 shadow-sm">
          <div className="text-xs font-medium text-violet-700">Total Buildings</div>
          <div className="mt-1 text-xl font-semibold text-violet-900">{summary.totalBuildings}</div>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 shadow-sm">
          <div className="text-xs font-medium text-sky-700">Total Floors</div>
          <div className="mt-1 text-xl font-semibold text-sky-900">{summary.totalFloors}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
          <div className="text-xs font-medium text-emerald-700">Avg. Utilization</div>
          <div className="mt-1 text-xl font-semibold text-emerald-700">{summary.avgUtil}%</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-3">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex-1">
          <SummaryCardsTop summary={summary} />
        </div>
        <div className="shrink-0">
          <DateRangeControls
            fromDate={dateFrom}
            toDate={dateTo}
            onChange={({ from, to }) => { setDateFrom(from); setDateTo(to); }}
          />
        </div>
      </div>

      {(selectedCity || selectedCampus || selectedBuilding || selectedFloor) ? (
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
          <MapPanelGeneric
            title="Service Cities"
            subtitle="UH Hospitals & Health Centers by City"
            items={cityPoints}
            onClickItem={(it) => setSelectedCity(it.id)}
          />
          <CityView
            cities={cityStats}
            onSelectCity={(city) => { setSelectedCity(city); }}
          />
        </div>
      )}

      {/* Step 2: Campus */}
      {selectedCity && !selectedCampus && (
        <div className="mt-6 space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-medium text-slate-800">Campus Locations
            <div className="mt-1 text-xs font-normal text-slate-600">Click on any campus marker to view buildings and facilities</div>
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
            onSelectCampus={(campus) => { setSelectedCampus(campus); }}
          />
        </div>
      )}

      {/* Step 3: Building list + Map */}
      {selectedCity && selectedCampus && !selectedBuilding && (
        <div className="mt-6 space-y-6">
          <MapPanel buildings={buildingsForCampus} onSelectBuilding={setSelectedBuilding} selectedBuilding={selectedBuilding as any} />
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
          {(() => {
            const supportsZones = ((selectedBuilding as any)?.id === 'uh-cleveland-medical-center');
            return (
          <div className="flex flex-wrap items-center justify-between gap-3">
            {supportsZones ? (
              <div className="flex items-center gap-3">
                <div className="text-sm text-slate-600">Zone</div>
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                  {(['all','A','B','C','D'] as const).map((z) => (
                    <button
                      key={z}
                      onClick={() => setZone(z)}
                      className={`px-3 py-1.5 text-sm rounded-md ${zone === z ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      {z === 'all' ? 'All' : `Zone ${z}`}
                    </button>
                  ))}
                </div>
              </div>
            ) : <div />}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              <button
                onClick={() => setFloorView('plan')}
                className={`px-3 py-1.5 text-sm rounded-md ${floorView === 'plan' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                Plan
              </button>
              <button
                onClick={() => setFloorView('cards')}
                className={`px-3 py-1.5 text-sm rounded-md ${floorView === 'cards' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                Cards
              </button>
            </div>
          </div>
            );
          })()}

          {(() => {
            const supportsZones = ((selectedBuilding as any)?.id === 'uh-cleveland-medical-center');
            if (floorView === 'plan') {
              if (supportsZones) {
                return (
                  <FloorPlanSvg
                    building={selectedBuilding}
                    floor={selectedFloor}
                    rooms={rooms}
                    zone={zone}
                    onSelectZone={setZone as any}
                    onOpenDoctor={(room) => setOpenRoom(room)}
                    onOpenReport={openRoomReport}
                    onOpenManageDoctor={(doctor) => setManageDoctor(doctor)}
                  />
                );
              }
              // No zones → show simple plan grid
              return (
                <FloorPlan
                  building={selectedBuilding}
                  floor={selectedFloor}
                  rooms={rooms}
                  onOpenDoctor={setOpenRoom}
                  onOpenReport={openRoomReport}
                />
              );
            }
            return (
              <RoomCardsGrid rooms={rooms} zone={zone} supportsZones={((selectedBuilding as any)?.id === 'uh-cleveland-medical-center')} onOpenDoctor={setOpenRoom} onOpenReport={openRoomReport} onOpenManageDoctor={(doctor) => setManageDoctor(doctor)} />
            );
          })()}
          {/* Zone legend */}
          {((selectedBuilding as any)?.id === 'uh-cleveland-medical-center') ? (
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {(['A','B','C','D'] as const).map((z) => (
                <div key={z} className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: zoneColorHex(z) }}></span>
                  <span className="text-xs text-slate-700">{`Zone ${z}`}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <Modal open={!!openRoom} onClose={() => setOpenRoom(null)}>
        {openRoom && (
          <DoctorSchedule room={openRoom} date={dateFrom} onClose={() => setOpenRoom(null)} onOpenDoctorSchedule={goToDoctorSchedule} />
        )}
      </Modal>
      <Modal open={!!manageDoctor} onClose={() => setManageDoctor(null)}>
        {manageDoctor && (
          <DoctorManageModal doctor={manageDoctor} onClose={() => setManageDoctor(null)} onOpenDoctorSchedule={goToDoctorSchedule} />
        )}
      </Modal>
    </div>
  );
}

