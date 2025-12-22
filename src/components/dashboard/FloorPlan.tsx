import React from 'react';
import { Badge, occupancyColor } from '../../pages/dashboardShared';
import { looksLikeGuid } from './utils';
import { DashboardRoom, DashboardRoomDoctor } from './RoomCard';

interface FloorPlanProps {
  building: { name: string };
  floor: number;
  rooms: DashboardRoom[];
  onOpenDoctor: (room: DashboardRoom) => void;
  onOpenReport?: (roomKey: string | number, roomName?: string | number) => void;
  onOpenManageDoctor?: (doctor: DashboardRoomDoctor & { resourceId?: string | number }) => void;
}

export function FloorPlan({
  building,
  floor,
  rooms,
  onOpenDoctor,
  onOpenReport,
  onOpenManageDoctor,
}: FloorPlanProps) {
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
        {rooms.map((r: any) => (
          <div
            key={r.id}
            className="group relative rounded-lg border border-slate-200 bg-slate-50 p-3 hover:bg-white hover:shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="text-[13px] font-medium text-slate-800">Room {r.roomNumber}</div>
                <button
                  aria-label="Open room allocation report"
                  title={r.isOccupied ? 'Room Summary' : 'Room must be occupied to view summary'}
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
                  className={`rounded-md p-1 transition-colors ${
                    r.isOccupied
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-slate-300 cursor-not-allowed'
                  }`}
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
            {
              <div className="mt-1 text-[11px] text-slate-600">
                {r.isOccupied
                  ? r.doctor.name + (r.doctor?.department ? ` — ${r.doctor.department}` : '')
                  : 'Open'}
              </div>
            }
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
                <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow opacity-0 transition group-hover:opacity-100 hidden group-hover:block z-10">
                  Manage schedule
                </div>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
