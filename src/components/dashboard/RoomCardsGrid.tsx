import React from 'react';
import { zoneColorHex, occupancyFillHex, hexToRgba } from '../../pages/dashboardShared';
import { looksLikeGuid } from './utils';

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
  console.log(
    'Filtered rooms in dashboardFloor:',
    filtered.filter((r: any) => r.isOccupied)
  );

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
                            title={r.isOccupied ? 'Room Summary' : 'Room is Open (Empty)'}
                            disabled={!r.isOccupied}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!onOpenReport || !r.isOccupied) return;
                              const key = looksLikeGuid(r.id)
                                ? r.id
                                : (r.roomFilterKey ?? r.roomDisplay ?? r.roomNumber);
                              const label = r.roomDisplay || `Room ${r.roomNumber}`;
                              onOpenReport(key, label);
                            }}
                            className={`rounded-md p-1 ${!r.isOccupied ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
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
          <button
            key={r.id}
            onClick={() => onOpenDoctor(r)}
            disabled={!r.isOccupied}
            className="relative rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow"
            style={cardStyle as any}
          >
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <span>{r.roomDisplay || `Room ${r.roomNumber}`}</span>
              <span className="relative inline-flex group">
                <button
                  aria-label="Open room allocation report"
                  title={r.isOccupied ? 'Room Summary' : 'Room is Open (Empty)'}
                  disabled={!r.isOccupied}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!onOpenReport || !r.isOccupied) return;
                    const key = looksLikeGuid(r.id)
                      ? r.id
                      : (r.roomFilterKey ?? r.roomDisplay ?? r.roomNumber);
                    const label = r.roomDisplay || `Room ${r.roomNumber}`;
                    onOpenReport(key, label);
                  }}
                  className={`rounded-md p-1 ${!r.isOccupied ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
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
              {r.isOccupied ? (
                <span>
                  {r.doctor?.name}
                  {r.doctor?.department ? ` — ${r.doctor.department}` : ''}
                </span>
              ) : (
                <span>Open</span>
              )}
              {r.isOccupied && (
                <span className="relative inline-flex group">
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
                </span>
              )}
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
          </button>
        );
      })}
    </div>
  );
}
