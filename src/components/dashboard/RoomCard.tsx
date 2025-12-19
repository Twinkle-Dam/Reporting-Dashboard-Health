import React from 'react';
import { zoneColorHex, occupancyFillHex, hexToRgba } from '../../pages/dashboardShared';
import { looksLikeGuid } from './utils';

export interface DashboardRoomDoctor {
  name: string;
  department?: string;
  resourceId?: string;
  [key: string]: any;
}

export interface DashboardRoom {
  id: string | number;
  roomNumber: string | number;
  roomDisplay?: string;
  isOccupied: boolean;
  occupancyPercent: number;
  doctor: DashboardRoomDoctor;
  roomFilterKey?: string;
  [key: string]: any;
}

interface RoomCardProps {
  room: DashboardRoom;
  zone?: string;
  showZoneIndicator?: boolean;
  onOpenDoctor: (room: DashboardRoom) => void;
  onOpenReport?: (roomKey: string | number, roomName?: string | number) => void;
  onOpenManageDoctor?: (doctor: any) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  zone,
  showZoneIndicator = false,
  onOpenDoctor,
  onOpenReport,
  onOpenManageDoctor,
}) => {
  const barFill = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-600';
    if (pct >= 60) return 'bg-emerald-500';
    if (pct >= 40) return 'bg-amber-500';
    if (pct >= 20) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  const tint = occupancyFillHex(room.occupancyPercent);
  const cardStyle = {
    background: `linear-gradient(0deg, ${hexToRgba(tint, 0.1)} 0%, ${hexToRgba('#ffffff', 1)} 40%)`,
    borderColor: hexToRgba(tint, 0.25),
  };

  const handleReportClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onOpenReport || !room.isOccupied) return;
    const key = looksLikeGuid(room.id)
      ? room.id
      : (room.roomFilterKey ?? room.roomDisplay ?? room.roomNumber);
    const label = room.roomDisplay || `Room ${room.roomNumber}`;
    onOpenReport(key, label);
  };

  const handleManageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenManageDoctor) {
      onOpenManageDoctor({ ...room.doctor, resourceId: room.id });
    }
  };

  return (
    <div
      onClick={() => onOpenDoctor(room)}
      className="relative rounded-xl border bg-white p-4 text-left shadow-sm transition hover:shadow cursor-pointer"
      style={cardStyle as any}
    >
      <div className="flex items-center gap-2 font-semibold text-slate-900">
        <span>{room.roomDisplay || `Room ${room.roomNumber}`}</span>
        <span className="relative inline-flex group">
          <button
            aria-label="Open room allocation report"
            title={room.isOccupied ? 'Room Summary' : 'Room is Open (Empty)'}
            disabled={!room.isOccupied}
            onClick={handleReportClick}
            className={`rounded-md p-1 ${!room.isOccupied ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
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
          <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow opacity-0 transition group-hover:opacity-100 z-10">
            Room Summary
          </div>
        </span>
      </div>

      <div className="mt-1 flex items-center gap-1 text-sm text-slate-600">
        {room.isOccupied ? (
          <span>
            {room.doctor?.name}
            {room.doctor?.department ? ` — ${room.doctor.department}` : ''}
          </span>
        ) : (
          <span>Open</span>
        )}

        {room.isOccupied && (
          <span className="relative inline-flex group">
            <button
              aria-label="Manage schedule"
              title="Manage schedule"
              onClick={handleManageClick}
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
            <div className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow opacity-0 transition group-hover:opacity-100 z-10">
              Manage schedule
            </div>
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {showZoneIndicator && zone ? (
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: zoneColorHex(zone) }}
          ></span>
        ) : null}

        <div className="flex w-full items-center gap-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full ${barFill(room.occupancyPercent)}`}
              style={{
                width: `${Math.min(100, Math.max(0, room.occupancyPercent))}%`,
              }}
            ></div>
          </div>
          <div className="text-xs text-slate-700">{room.occupancyPercent}%</div>
        </div>
      </div>
    </div>
  );
};
