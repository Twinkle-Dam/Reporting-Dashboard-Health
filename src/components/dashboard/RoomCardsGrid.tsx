import React from 'react';
import { zoneColorHex } from '../../pages/dashboardShared';
import { RoomCard, DashboardRoom, DashboardRoomDoctor } from './RoomCard';

interface RoomCardsGridProps {
  rooms: DashboardRoom[];
  zone?: 'all' | 'A' | 'B' | 'C' | 'D';
  supportsZones?: boolean;
  onOpenDoctor: (r: DashboardRoom) => void;
  onOpenReport?: (roomKey: string | number, roomName?: string | number) => void;
  onOpenManageDoctor?: (doctor: DashboardRoomDoctor & { resourceId?: string | number }) => void;
}

export function RoomCardsGrid({
  rooms,
  zone = 'all',
  supportsZones = true,
  onOpenDoctor,
  onOpenReport,
  onOpenManageDoctor,
}: RoomCardsGridProps) {
  const zoneOfIndex = (idx: number, total: number) => {
    const q = Math.floor((idx / total) * 4);
    return ['A', 'B', 'C', 'D'][Math.min(3, Math.max(0, q))];
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
                {zRooms.map((r, i) => (
                  <RoomCard
                    key={r.id}
                    room={r}
                    zoneColor={color}
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
      {filtered.map((r, i) => {
        // If specific zone is selected, use that color. If zones disabled, no color dot.
        const color = zonesEnabled ? zoneColorHex(zone === 'all' ? 'A' : zone) : undefined;
        // Actually, if zonesEnabled and zone != 'all', all rooms are in that zone, so use that zone's color.
        // If zones are disabled, we might not want a dot. Logic in original was mostly relying on zone loop.

        // Let's deduce color if needed.
        const effectiveZone = zonesEnabled && zone !== 'all' ? zone : undefined;
        const dotColor = effectiveZone ? zoneColorHex(effectiveZone) : undefined;

        // Note: original code for single-zone view didn't explicitly pass a zone color to the dot inside?
        // Original: const tint = occupancyFillHex...
        // And: {zonesEnabled ? ( <span ... bg={zoneColorHex(zone)} ... /> ) : null}

        return (
          <RoomCard
            key={r.id}
            room={r}
            zoneColor={dotColor}
            onOpenDoctor={onOpenDoctor}
            onOpenReport={onOpenReport}
            onOpenManageDoctor={onOpenManageDoctor}
          />
        );
      })}
    </div>
  );
}
