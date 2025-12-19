import { useMemo } from 'react';
import type { VmFloorRoom } from '../../../api/rooms';
import { MOCK_DOCTOR_LIST } from '../../../data/mockData';
import { seededPercent, dateKey } from '../../../pages/dashboardShared';

type DoctorInfo = { id: string; name: string; department?: string };

export function useRooms(
  buildingId?: string,
  floor?: number,
  fromDate?: string,
  toDate?: string,
  schedulesByDoctor?: any,
  weekday?: string,
  vmRooms?: VmFloorRoom[] | undefined
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
      let doctor = api?.doctor || (MOCK_DOCTOR_LIST[base] as DoctorInfo);
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
      const roomFilterKey = isApiRoom ? labelSource || String(roomNumber) : String(roomNumber);

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
