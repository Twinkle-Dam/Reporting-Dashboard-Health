import React from 'react';
import { zoneColorHex } from '../../pages/dashboardShared';
import { RoomCard, DashboardRoom } from './RoomCard';

export function RoomCardsGrid({
  rooms,
  zone = 'all',
  supportsZones = true,
  onOpenDoctor,
  onOpenReport,
  onOpenManageDoctor,
}: {
  rooms: DashboardRoom[];
  zone?: 'all' | 'A' | 'B' | 'C' | 'D';
  supportsZones?: boolean;
  onOpenDoctor: (r: DashboardRoom) => void;
  onOpenReport?: (roomKey: string | number, roomName?: string | number) => void;
  onOpenManageDoctor?: (doctor: any) => void;
}) {
  const zoneOfIndex = (idx: number, total: number) => {
    const q = Math.floor((idx / total) * 4);
    return ['A', 'B', 'C', 'D'][Math.min(3, Math.max(0, q))];
  };

  const zonesEnabled = !!supportsZones;
  const filtered = zonesEnabled
    ? rooms.filter((_: DashboardRoom, i: number) =>
        zone === 'all' ? true : zoneOfIndex(i, rooms.length) === zone
      )
    : rooms;

  console.log(
    'Filtered rooms in dashboardFloor:',
    filtered.filter((r) => r.isOccupied)
  );

  if (zonesEnabled && zone === 'all') {
    const zones = ['A', 'B', 'C', 'D'] as const;
    return (
      <div className="space-y-6">
        {zones.map((z) => {
          const zRooms = rooms.filter(
            (_: DashboardRoom, i: number) => zoneOfIndex(i, rooms.length) === z
          );
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
                {zRooms.map((r) => (
                  <RoomCard
                    key={r.id}
                    room={r}
                    onOpenDoctor={onOpenDoctor}
                    onOpenReport={onOpenReport}
                    onOpenManageDoctor={onOpenManageDoctor}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
      {filtered.map((r) => (
        <RoomCard
          key={r.id}
          room={r}
          // Only show zone indicator if zones are enabled (e.g., filtered view)
          zone={zonesEnabled ? zone : undefined}
          showZoneIndicator={zonesEnabled}
          onOpenDoctor={onOpenDoctor}
          onOpenReport={onOpenReport}
          onOpenManageDoctor={onOpenManageDoctor}
        />
      ))}
    </div>
  );
}
