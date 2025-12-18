import React, { useEffect, useMemo, useState } from 'react';
import { BUILDINGS } from '../../data/buildings';
import { loadSchedules, upsertDoctorSchedule } from '../../modules/scheduling/scheduleStore';
import { fetchDoctorByResourceId } from '../../api/doctors';

type DoctorScheduleOpts = {
  newMode?: boolean;
  name?: string;
  edit?: {
    day: string;
    buildingId: string;
    floor: number;
    room: string;
    start: string;
    end: string;
  };
};

export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose}></div>
      <div className="relative z-10 w-[98vw] max-w-6xl overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}

export function DoctorSchedule({
  room,
  date,
  onClose,
  onOpenDoctorSchedule,
}: {
  room: any;
  date: string;
  onClose?: () => void;
  onOpenDoctorSchedule?: (doctorId: string, opts?: DoctorScheduleOpts) => void;
}) {
  const d = new Date(date || new Date());
  const dayName = d.toLocaleDateString(undefined, { weekday: 'long' });
  const dayFull = d.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const saved = loadSchedules();
  const normalize = (s?: string) =>
    String(s || '')
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/\s+/g, '');

  const department = useMemo(() => {
    try {
      const doctorId = room?.doctor?.id;
      let sched = doctorId ? (saved as any)?.[doctorId] : null;
      if (!sched && room?.doctor?.name) {
        const target = normalize(room?.doctor?.name);
        const match = Object.values(saved || {}).find(
          (s: any) => normalize((s as any)?.doctorName) === target
        );
        if (match) sched = match;
      }
      return (sched as any)?.doctorDepartment || '';
    } catch {
      return '';
    }
  }, [saved, room?.doctor?.id]);

  const [showManage, setShowManage] = useState(false);

  const savedSlots = useMemo(() => {
    const slots: Array<{
      buildingId: string;
      buildingName: string;
      floor: number;
      room: string;
      start: string;
      end: string;
    }> = [];
    const doctorId = room?.doctor?.id;
    let sched = doctorId ? (saved as any)?.[doctorId] : null;
    if (!sched && room?.doctor?.name) {
      const target = normalize(room?.doctor?.name);
      const match = Object.values(saved || {}).find(
        (s: any) => normalize((s as any)?.doctorName) === target
      );
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
      const match = Object.values(saved || {}).find(
        (s: any) => normalize((s as any)?.doctorName) === target
      );
      if (match) sched = match;
    }
    const result: Array<{
      day: string;
      buildingId: string;
      buildingName: string;
      floor: number;
      room: string;
      start: string;
      end: string;
    }> = [];
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
      } catch {
        // ignore
      }
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
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back
            </button>
          ) : null}
          <div>
            <div className="text-slate-900 text-base font-semibold">
              <a
                href={`#/doctor-schedule?doctorId=${encodeURIComponent(room.doctor?.id || '')}`}
                onClick={(e) => {
                  e.preventDefault();
                  onOpenDoctorSchedule &&
                    onOpenDoctorSchedule(String(room.doctor?.id || ''), {
                      name: room.doctor?.name,
                    });
                }}
                className="hover:underline"
              >
                {room.doctor.name}
              </a>
              <button
                type="button"
                title="Manage schedule"
                aria-label="Manage schedule"
                onClick={() => setShowManage((v) => !v)}
                className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              >
                <svg
                  width="16"
                  height="16"
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
            </div>
            <div className="text-slate-600 text-sm">
              {department ? `${department} • ` : ''}
              Room {room.roomNumber} • {dayFull}
            </div>
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
                          onClick={(e) => {
                            e.preventDefault();
                            onOpenDoctorSchedule &&
                              onOpenDoctorSchedule(String(room.doctor?.id || ''), {
                                name: room.doctor?.name,
                                edit: {
                                  day: s.day,
                                  buildingId: s.buildingId,
                                  floor: s.floor,
                                  room: s.room,
                                  start: s.start,
                                  end: s.end,
                                },
                              });
                          }}
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
            <div className="mt-3 rounded-md border border-slate-200 p-3 text-sm text-slate-600">
              No schedules found for this doctor.
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <a
              href={`#/doctor-schedule?doctorId=${encodeURIComponent(room.doctor?.id || '')}`}
              onClick={(e) => {
                e.preventDefault();
                onOpenDoctorSchedule &&
                  onOpenDoctorSchedule(String(room.doctor?.id || ''), {
                    newMode: true,
                    name: room.doctor?.name,
                  });
              }}
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
                          onClick={(e) => {
                            e.preventDefault();
                            onOpenDoctorSchedule &&
                              onOpenDoctorSchedule(String(room.doctor?.id || ''), {
                                name: room.doctor?.name,
                                edit: {
                                  day: dayName,
                                  buildingId: s.buildingId,
                                  floor: s.floor,
                                  room: s.room,
                                  start: s.start,
                                  end: s.end,
                                },
                              });
                          }}
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
            <div className="mt-3 rounded-md border border-slate-200 p-3 text-sm text-slate-600">
              No saved schedule for this doctor/day.&nbsp;
              <a
                href={`#/doctor-schedule?doctorId=${encodeURIComponent(room.doctor?.id || '')}&new=1`}
                onClick={(e) => {
                  e.preventDefault();
                  onOpenDoctorSchedule &&
                    onOpenDoctorSchedule(String(room.doctor?.id || ''), {
                      newMode: true,
                      name: room.doctor?.name,
                    });
                }}
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
          <button
            className="mr-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 hover:bg-slate-50"
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>
      )}
    </div>
  );
}

const dayOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function DoctorManageModal({
  doctor,
  onClose,
  onOpenDoctorSchedule,
}: {
  doctor: any;
  onClose?: () => void;
  onOpenDoctorSchedule?: (doctorId: string, opts?: DoctorScheduleOpts) => void;
}) {
  const [refresh, setRefresh] = useState(0);
  const saved = loadSchedules();
  const normalize = (s?: string) =>
    String(s || '')
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/\s+/g, '');

  // console.log('DOCTOR in DoctorModal:', doctor);

  let [schedules, setSchedules] = useState<any>([]);
  // let [department, setDepartment] = useState<string>(null);

  useEffect(() => {
    fetchDoctorByResourceId(doctor?.resourceId).then((res) => {
      console.log('DOCTOR in DoctorModal:', res);
      if (res) {
        setSchedules(prev => res);
        return;
      }
      try {
        const id = String(doctor?.id || '').trim();
        const name = String(doctor?.name || '').trim();
        const byId = id ? (saved as any)?.[id] : null;
        let byName: any = null;
        // if id is not found, try to find by name
        if (!byId && name) {
          const target = normalize(name);
          byName = Object.values(saved || {}).find(
            (s: any) => normalize((s as any)?.doctorName) === target
          );
        }
        const exists = !!(byId || byName);
        console.log('EXISTS:', exists, byId, byName);
        // if not exists, create a new dummy schedule
        if (!exists) {
          const did = id || name || `doc-${Math.random().toString(36).slice(2, 7)}`;
          const dname = name || id || 'Doctor';
          const defaultBuilding = 'uh-cleveland-medical-center';
          const week = {
            Monday: {
              slots: [
                { buildingId: defaultBuilding, floor: 1, room: '101', start: '09:00', end: '12:00' },
              ],
            },
            Tuesday: {
              slots: [
                { buildingId: defaultBuilding, floor: 2, room: '201', start: '09:00', end: '12:00' },
              ],
            },
            Wednesday: {
              slots: [
                { buildingId: defaultBuilding, floor: 3, room: '301', start: '13:00', end: '16:00' },
              ],
            },
            Thursday: {
              slots: [
                { buildingId: defaultBuilding, floor: 1, room: '102', start: '09:00', end: '12:00' },
              ],
            },
            Friday: {
              slots: [
                { buildingId: defaultBuilding, floor: 2, room: '202', start: '10:00', end: '13:00' },
              ],
            },
          } as any;
          // save to local storage
          upsertDoctorSchedule(did, { doctorId: did, doctorName: dname, week });
          setRefresh((x) => x + 1);
        }
      } catch {
        // ignore
      }
    });
  }, [doctor?.id, doctor?.name])

  // let department = schedules?.[0]?.Department;
  // console.log('Department:', department);

  const department = useMemo(() => {
    try {
      const departmentFromSchedulesApi = schedules?.[0]?.Department;
      console.log('Department from schedules API:', departmentFromSchedulesApi);
      if (departmentFromSchedulesApi) return departmentFromSchedulesApi;

      const doctorId = doctor?.id;
      // check if exists in local storage
      let sched = doctorId ? (saved as any)?.[doctorId] : null;
      // if not exists by id in local storage, try to find by name
      if (!sched && doctor?.name) {
        const target = normalize(doctor?.name);
        const match = Object.values(saved || {}).find(
          (s: any) => normalize((s as any)?.doctorName) === target
        );
        if (match) sched = match;
      }
      return (sched as any)?.doctorDepartment || '';
    } catch {
      return '';
    }
  }, [saved, doctor?.id]);

  // let allSlots = schedules?.map((s: any) => {
  //   return {
  //     day: dayOfWeek[s?.DayOfWeek],
  //     buildingId: s?.BuildingId,
  //     buildingName: s?.BuildingName,
  //     floor: s?.FloorName,
  //     room: s?.RoomName,
  //     start: s?.StartTime,
  //     end: s?.EndTime,
  //   };
  // }) ?? [];


  const allSlots = useMemo(() => {

    let schedulesFromApi = schedules?.map((s: any) => {
      return {
        day: dayOfWeek[s?.DayOfWeek],
        buildingId: s?.BuildingId,
        buildingName: s?.BuildingName,
        floor: s?.FloorName,
        room: s?.RoomName,
        start: s?.StartTime,
        end: s?.EndTime,
      };
    }) ?? [];
    if (schedulesFromApi.length > 0) return schedulesFromApi;

    const doctorId = doctor?.id;
    // check if exists in local storage
    let sched = doctorId ? (saved as any)?.[doctorId] : null;
    // if not exists by id in local storage, try to find by name
    if (!sched && doctor?.name) {
      const target = normalize(doctor?.name);
      const match = Object.values(saved || {}).find(
        (s: any) => normalize((s as any)?.doctorName) === target
      );
      if (match) sched = match;
    }
    const result: Array<{
      day: string;
      buildingId: string;
      buildingName: string;
      floor: number;
      room: string;
      start: string;
      end: string;
    }> = [];
    if (sched && (sched as any).week) {
      try {
        // loop through each day
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
      } catch {
        // ignore
      }
    } else {
      try {
        // create dummy data and insert into local storage
        const defaultBuilding = 'uh-cleveland-medical-center';
        const did = String(
          doctor?.id || doctor?.name || `doc-${Math.random().toString(36).slice(2, 7)}`
        );
        const dname = String(doctor?.name || doctor?.id || 'Doctor');
        const genWeek: any = {
          Monday: {
            slots: [
              { buildingId: defaultBuilding, floor: 1, room: '101', start: '09:00', end: '12:00' },
            ],
          },
          Tuesday: {
            slots: [
              { buildingId: defaultBuilding, floor: 2, room: '201', start: '09:00', end: '12:00' },
            ],
          },
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
      } catch {
        // ignore
      }
    }
    if (result.length === 0) {
      // if no slots found, create dummy data
      const b = (BUILDINGS as any[])[0];
      const name = b?.name || 'UH Cleveland Medical Center';
      const bid = b?.id || 'uh-cleveland-medical-center';
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      for (let i = 0; i < days.length; i++) {
        result.push({
          day: days[i],
          buildingId: bid,
          buildingName: name,
          floor: (i % 3) + 1,
          room: String(((i % 3) + 1) * 100 + (i + 1)),
          start: '09:00',
          end: '12:00',
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
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back
            </button>
          ) : null}
          <div>
            <div className="text-slate-900 text-base font-semibold">
              {doctor?.name || 'Manage Schedule'}
            </div>
            <div className="text-slate-600 text-sm">
              {department ? `${department} • ` : ''}
              All schedules (Mon–Fri)
            </div>
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
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenDoctorSchedule &&
                          onOpenDoctorSchedule(String(doctor?.id || ''), {
                            name: doctor?.name,
                            edit: {
                              day: s.day,
                              buildingId: s.buildingId,
                              floor: s.floor,
                              room: s.room,
                              start: s.start,
                              end: s.end,
                            },
                          });
                      }}
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
        <div className="mt-3 rounded-md border border-slate-200 p-3 text-sm text-slate-600">
          No schedules found for this doctor.
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <a
          href={`#/doctor-schedule?doctorId=${encodeURIComponent(doctor?.id || '')}&new=1`}
          onClick={(e) => {
            e.preventDefault();
            onOpenDoctorSchedule &&
              onOpenDoctorSchedule(String(doctor?.id || ''), {
                newMode: true,
                name: doctor?.name,
              });
          }}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add New Schedule
        </a>
      </div>
    </div>
  );
}

export default Modal;
