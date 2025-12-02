import React, { useCallback } from 'react';

import { BUILDINGS } from '../../data/buildings';
import { loadSchedules, upsertDoctorSchedule } from '../../modules/scheduling/scheduleStore';
import { DoctorPopupData } from './DoctorSlotsPopup';

/**
 * Reusable hook to open/close the doctor schedule popup for a given building context.
 *
 * It looks up (or synthesizes) a doctor's weekly schedule based on their name and
 * the current building, and normalizes it into the `DoctorPopupData` shape used by
 * `DoctorSlotsPopup`.
 */
export function useDoctorPopup(
  crumbs: { buildingId?: string },
  resolvedBuilding: any,
  setDoctorPopup: React.Dispatch<React.SetStateAction<DoctorPopupData | null>>,
): {
  openDoctorPopup: (doctorName: string) => void;
  closeDoctorPopup: () => void;
} {
  const openDoctorPopup = React.useCallback(
    (doctorName: string) => {
      try {
        const all = loadSchedules() as Record<string, any>;
        // try find by exact name; else try normalized name
        const normalize = (s?: string) =>
          String(s || '')
            .toLowerCase()
            .replace(/\./g, '')
            .replace(/\s+/g, '');
        let match = Object.values(all || {}).find(
          (s: any) => (s as any)?.doctorName === doctorName,
        ) as any;
        if (!match) {
          const target = normalize(doctorName);
          match = Object.values(all || {}).find(
            (s: any) => normalize((s as any)?.doctorName) === target,
          ) as any;
        }
        let department = (match as any)?.doctorDepartment || '';
        let doctorId = (match as any)?.doctorId || '';
        let week = (match as any)?.week || {};

        // If no schedule exists, synthesize a minimal Mon–Fri week and persist so subsequent views have data
        const ensureWeek = () => {
          const defaultBuilding =
            (typeof crumbs?.buildingId === 'string' && crumbs.buildingId) ||
            (resolvedBuilding as any)?.id ||
            'uh-cleveland-medical-center';
          const floors = [1, 2, 3, 1, 2];
          const rooms = floors.map((f, i) =>
            String(
              f * 100 +
                (i === 0 ? 1 : i === 1 ? 2 : i === 2 ? 3 : i === 3 ? 4 : 5),
            ),
          );
          const labels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          const gen: any = {};
          for (let i = 0; i < labels.length; i++) {
            gen[labels[i]] = {
              slots: [
                {
                  buildingId: defaultBuilding,
                  floor: floors[i],
                  room: rooms[i],
                  start: '09:00',
                  end: '12:00',
                },
              ],
            };
          }
          return gen;
        };

        if (!match) {
          doctorId = doctorName.toLowerCase().replace(/\s+/g, '-');
          week = ensureWeek();
          try {
            upsertDoctorSchedule(doctorId, {
              doctorId,
              doctorName,
              doctorDepartment: department || '',
              week,
            });
          } catch {
            /* ignore persist errors */
          }
        } else {
          const hasAny = Object.values(week || {}).some(
            (d: any) => (d?.slots || []).length > 0,
          );
          if (!hasAny) {
            week = ensureWeek();
            try {
              upsertDoctorSchedule(
                (match as any)?.doctorId ||
                  doctorName.toLowerCase().replace(/\s+/g, '-'),
                {
                  doctorId:
                    (match as any)?.doctorId ||
                    doctorId ||
                    doctorName.toLowerCase().replace(/\s+/g, '-'),
                  doctorName,
                  doctorDepartment: department || '',
                  week,
                },
              );
            } catch {
              /* ignore persist errors */
            }
          }
        }

        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const slots: Array<{
          day: string;
          buildingId: string;
          buildingName: string;
          floor: number;
          room: string;
          start: string;
          end: string;
        }> = [];
        for (const day of days) {
          const list: any[] = (week?.[day]?.slots) || [];
          for (const s of list) {
            const b = (BUILDINGS as any[]).find(
              (x) => String((x as any).id) === String(s.buildingId),
            );
            slots.push({
              day,
              buildingId: String(s.buildingId || ''),
              buildingName: (b as any)?.name || String(s.buildingId || ''),
              floor: Number(s.floor) || 1,
              room: String(s.room || ''),
              start: String(s.start || ''),
              end: String(s.end || ''),
            });
          }
        }
        setDoctorPopup({ id: doctorId, name: doctorName, department, slots });
      } catch {
        setDoctorPopup({
          id: '',
          name: doctorName,
          department: '',
          slots: [],
        });
      }
    },
    [crumbs?.buildingId, resolvedBuilding],
  );

  const closeDoctorPopup = useCallback(() => setDoctorPopup(null), [setDoctorPopup]);

  return { openDoctorPopup, closeDoctorPopup };
}


