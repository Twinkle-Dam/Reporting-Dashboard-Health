import React, { useMemo, useState, useEffect } from 'react';
import type { VmFloorRoom } from '../api/rooms';
import { ReactComponent as AhujaFloor1Svg } from '../assets/floorplans/ahuja-floor1.svg';
import AhujaFloor1Url from '../assets/floorplans/ahuja-floor1.svg';
import ZonesPlusUrl from '../assets/floorplans/zones-plus.svg';
import { BUILDINGS } from '../data/buildings';
import { loadSchedules } from '../modules/scheduling/scheduleStore';
import { MOCK_DOCTOR_LIST } from '../data/mockData';
import {
  Badge,
  occupancyColor,
  occupancyFillClass,
  occupancyFillHex,
  hexToRgba,
  zoneColorHex,
  seededPercent,
  dateKey,
} from './dashboardShared';

type DoctorInfo = { id: string; name: string; department?: string };

// Helper to detect real VM RoomId values (GUID/UUID-style) so we can prefer
// them when opening the utilization report, while falling back to the
// room's filter key/number for purely mock rooms.
const looksLikeGuid = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  const s = String(value).trim();
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);
};

function useRoomsTS(
  buildingId?: string,
  floor?: number,
  fromDate?: string,
  toDate?: string,
  schedulesByDoctor?: any,
  weekday?: string,
  vmRooms?: VmFloorRoom[] | undefined,
) {
  return useMemo(() => {
    if (!buildingId || !floor) return [];
    // While vmRooms is undefined, the floor rooms API is still loading – return
    // an empty array so the caller can show a loader instead of mock data.
    if (typeof vmRooms === 'undefined') return [];

    const apiRooms = vmRooms && vmRooms.length > 0 ? vmRooms : null;
    const total = apiRooms ? apiRooms.length : 24;
    const rooms = Array.from({ length: total }).map((_, idx) => {
      const api = apiRooms ? apiRooms[idx] : undefined;

      // Prefer RoomName; if it's blank, fall back to RoomAlias.
      const rawName = api?.RoomName ? String(api.RoomName).trim() : '';
      const rawAlias = api?.RoomAlias ? String(api.RoomAlias).trim() : '';
      const labelSource = rawName || rawAlias;
      const numericFromLabel = (() => {
        const match = labelSource.match(/(\d+)/);
        return match ? Number(match[1]) : NaN;
      })();
      const roomNumber = Number.isFinite(numericFromLabel)
        ? numericFromLabel
        : floor * 100 + (idx + 1);

      const base = (roomNumber + floor) % MOCK_DOCTOR_LIST.length;
      let doctor = api?.doctor || MOCK_DOCTOR_LIST[base] as DoctorInfo;
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
            doctor = {
              id: (sched as any).doctorId || 'doc',
              name: (sched as any).doctorName || 'Doctor',
              department: (sched as any).doctorDepartment || '',
            };
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

      // For API rooms, the Room Allocation report dropdown uses the same
      // human‑readable label (RoomName/RoomAlias). For mock rooms we use the
      // numeric room number as the underlying value so the "Room 301" option
      // still binds correctly when coming from the dashboard.
      const isApiRoom = !!api;
      const roomFilterKey = isApiRoom ? (labelSource || String(roomNumber)) : String(roomNumber);

      return {
        id: api?.RoomId || `${buildingId}-${floor}-${roomNumber}`,
        roomNumber,
        isOccupied: api?.isOccupied == undefined ? true : api?.isOccupied,
        roomDisplay: labelSource || `Room ${roomNumber}`,
        roomFilterKey,
        doctor,
        occupancyPercent: percent,
        // providerId: api?.ProviderId,
      };
    });
    return rooms;
  }, [buildingId, floor, fromDate, toDate, schedulesByDoctor, weekday, vmRooms]);
}

export function useRooms(
  buildingId?: string,
  floor?: number,
  fromDate?: string,
  toDate?: string,
  schedulesByDoctor?: any,
  weekday?: string,
  vmRooms?: VmFloorRoom[] | undefined,
) {
  return useRoomsTS(buildingId, floor, fromDate, toDate, schedulesByDoctor, weekday, vmRooms);
}

export function generateRoomLayout(rooms: any[], svgWidth = 1000, svgHeight = 600) {
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
    const row = Math.floor(localIndex / columns);
    const col = localIndex % columns;
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

export function FloorPlan({
  building,
  floor,
  rooms,
  onOpenDoctor,
  onOpenReport,
  onOpenManageDoctor
}: {
  building: any;
  floor: number;
  rooms: any[];
  onOpenDoctor: (room: any) => void;
  onOpenReport?: (roomKey: string | number, roomName?: string | number) => void;
  onOpenManageDoctor?: (doctor: any) => void;
}) {
  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => a.roomNumber - b.roomNumber);
  }, [rooms]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-slate-900 text-lg font-semibold">
            {building.name} — Floor {floor}
          </div>
          <div className="text-slate-600 text-sm">Clean plan with rooms and occupancy</div>
        </div>
        <Badge>{rooms.length} rooms</Badge>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {sortedRooms.map((r: any) => (
          <div
            key={r.id}
            className="group relative rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-white hover:shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-[13px] font-medium text-slate-800">Room {r.roomNumber}</div>
                <button
                  aria-label="Open room allocation report"
                  title={`Room ${r.roomNumber} • ${r.occupancyPercent}% • ${r.doctor.name}${r.doctor?.department ? ' — ' + r.doctor.department : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!onOpenReport) return;
                    const key = looksLikeGuid(r.id)
                      ? r.id
                      : r.roomFilterKey ?? r.roomDisplay ?? r.roomNumber;
                    const label = r.roomDisplay || `Room ${r.roomNumber}`;
                    onOpenReport(key, label);
                  }}
                  className="rounded-md p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 3v18h18" />
                    <path d="M7 13l3 3 7-7" />
                  </svg>
                </button>
              </div>
              <div className="ml-2 h-2 w-14 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full ${occupancyColor(r.occupancyPercent)}`}
                  style={{ width: `${Math.min(100, Math.max(0, r.occupancyPercent))}%` }}
                ></div>
              </div>
              <span className="ml-2 text-[11px] text-slate-700">{r.occupancyPercent}%</span>
            </div>
            {<div className="mt-1 text-[11px] text-slate-600">
              {r.isOccupied ? r.doctor.name + (r.doctor?.department ? ` — ${r.doctor.department}` : '') : 'Open'}
            </div>}
            {r.isOccupied && <span className="relative inline-flex group">
              <button
                aria-label="Manage schedule"
                title="Manage schedule"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenManageDoctor && onOpenManageDoctor({ ...r.doctor, resourceId: r.id });
                }}
                className="rounded-md p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </button>
              <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow opacity-0 transition group-hover:opacity-100">
                Manage schedule
              </div>
            </span>}
            {/* <div className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded-lg bg-white/95 p-3 text-center shadow-sm ring-1 ring-slate-200 group-hover:flex">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {r.doctor.name}
                  {r.doctor?.department ? ` — ${r.doctor.department}` : ''}
                </div>
                <div className="mt-1 text-xs text-slate-600">Assigned physician</div>
                <div className="mt-3 flex justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDoctor(r);
                    }}
                    className="pointer-events-auto rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    View schedule
                  </button>
                </div>
              </div>
            </div> */}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RoomCardsGrid({
  rooms,
  zone = 'all',
  supportsZones = true,
  onOpenDoctor,
  onOpenReport,
  onOpenManageDoctor,
}: {
  rooms: any[];
  zone?: 'all' | 'A' | 'B' | 'C' | 'D';
  supportsZones?: boolean;
  onOpenDoctor: (r: any) => void;
  onOpenReport?: (roomKey: string | number, roomName?: string | number) => void;
  onOpenManageDoctor?: (doctor: any) => void;
}) {
  const zoneOfIndex = (idx: number, total: number) => {
    const q = Math.floor((idx / total) * 4);
    return ['A', 'B', 'C', 'D'][Math.min(3, Math.max(0, q))];
  };
  const barFill = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-600';
    if (pct >= 60) return 'bg-emerald-500';
    if (pct >= 40) return 'bg-amber-500';
    if (pct >= 20) return 'bg-orange-500';
    return 'bg-rose-500';
  };
  const zonesEnabled = !!supportsZones;
  const filtered = zonesEnabled
    ? rooms.filter((_: any, i: number) =>
      zone === 'all' ? true : zoneOfIndex(i, rooms.length) === zone
    )
    : rooms;

  if (zonesEnabled && zone === 'all') {
    const zones = ['A', 'B', 'C', 'D'] as const;
    return (
      <div className="space-y-6">
        {zones.map((z) => {
          const zRooms = rooms.filter((_: any, i: number) => zoneOfIndex(i, rooms.length) === z);
          const color = zoneColorHex(z);
          return (
            <div key={z} className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                ></span>
                <div className="text-sm font-semibold text-slate-800">{`Zone ${z}`}</div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
                {zRooms.map((r: any) => {
                  const tint = occupancyFillHex(r.occupancyPercent);
                  const cardStyle = {
                    background: `linear-gradient(0deg, ${hexToRgba(tint, 0.1)} 0%, ${hexToRgba('#ffffff', 1)} 40%)`,
                    borderColor: hexToRgba(tint, 0.25),
                  };
                  return (
                    <div
                      key={r.id}
                      onClick={() => onOpenDoctor(r)}
                      className="relative rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow"
                      style={cardStyle as any}
                    >
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <span>{r.roomDisplay || `Room ${r.roomNumber}`}</span>
                        <span className="relative inline-flex group">
                          <button
                            aria-label="Open room allocation report"
                            title="Room Summary"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!onOpenReport) return;
                              const key = looksLikeGuid(r.id)
                                ? r.id
                                : r.roomFilterKey ?? r.roomDisplay ?? r.roomNumber;
                              const label = r.roomDisplay || `Room ${r.roomNumber}`;
                              onOpenReport(key, label);
                            }}
                            className="rounded-md p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M3 3v18h18" />
                              <path d="M7 13l3 3 7-7" />
                            </svg>
                          </button>
                          <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow opacity-0 transition group-hover:opacity-100">
                            Room Summary
                          </div>
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                        <span>
                          {r.doctor.name}
                          {r.doctor?.department ? ` — ${r.doctor.department}` : ''}
                        </span>
                        <span className="relative inline-flex group">
                          <button
                            aria-label="Manage schedule"
                            title="Manage schedule"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenManageDoctor && onOpenManageDoctor(r.doctor);
                            }}
                            className="rounded-md p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="16" y1="2" x2="16" y2="6" />
                              <line x1="8" y1="2" x2="8" y2="6" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                          </button>
                          <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow opacity-0 transition group-hover:opacity-100">
                            Manage schedule
                          </div>
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ backgroundColor: color }}
                        ></span>
                        <div className="flex w-full items-center gap-2">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full ${barFill(r.occupancyPercent)}`}
                              style={{
                                width: `${Math.min(100, Math.max(0, r.occupancyPercent))}%`,
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-slate-700">{r.occupancyPercent}%</div>
                        </div>
                      </div>
                    </div>
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
      {filtered.map((r: any) => {
        const tint = occupancyFillHex(r.occupancyPercent);
        const cardStyle = {
          background: `linear-gradient(0deg, ${hexToRgba(tint, 0.1)} 0%, ${hexToRgba(
            '#ffffff',
            1
          )} 40%)`,
          borderColor: hexToRgba(tint, 0.25),
        };
        return (
          <div
            key={r.id}
            onClick={() => onOpenDoctor(r)}
            // disabled={!r.isOccupied}
            className="relative rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow"
            style={cardStyle as any}
          >
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <span>{r.roomDisplay || `Room ${r.roomNumber}`}</span>
              <span className="relative inline-flex group">
                <button
                  aria-label="Open room allocation report"
                  title="Room Summary"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!onOpenReport) return;
                    const key = looksLikeGuid(r.id)
                      ? r.id
                      : r.roomFilterKey ?? r.roomDisplay ?? r.roomNumber;
                    const label = r.roomDisplay || `Room ${r.roomNumber}`;
                    onOpenReport(key, label);
                  }}
                  className="rounded-md p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 3v18h18" />
                    <path d="M7 13l3 3 7-7" />
                  </svg>
                </button>
                <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow opacity-0 transition group-hover:opacity-100">
                  Room Summary
                </div>
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-sm text-slate-600">
              {r.isOccupied ?
                <span>
                  {r.doctor?.name}
                  {r.doctor?.department ? ` — ${r.doctor.department}` : ''}
                </span> :
                <span>Open</span>}
              {r.isOccupied && <span className="relative inline-flex group">
                <button
                  aria-label="Manage schedule"
                  title="Manage schedule"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenManageDoctor && onOpenManageDoctor({ ...r.doctor, resourceId: r.id });
                  }}
                  className="rounded-md p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </button>
                <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow opacity-0 transition group-hover:opacity-100">
                  Manage schedule
                </div>
              </span>}
            </div>
            <div className="mt-3 flex items-center gap-2">
              {zonesEnabled ? (
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: zoneColorHex(zone) }}
                ></span>
              ) : null}
              <div className="flex w-full items-center gap-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full ${barFill(r.occupancyPercent)}`}
                    style={{
                      width: `${Math.min(100, Math.max(0, r.occupancyPercent))}%`,
                    }}
                  ></div>
                </div>
                <div className="text-xs text-slate-700">{r.occupancyPercent}%</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function useSchedulesSeed() {
  // Legacy no-op: seeding is now centralized via MOCK_DASHBOARD_SCHEDULE_SEED.
  useEffect(() => { }, []);
}
