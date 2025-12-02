import React, { useMemo, useState } from 'react';
import { BUILDINGS, listRoomsForBuilding } from '../data/buildings';
import { loadSchedules, upsertDoctorSchedule } from '../modules/scheduling/scheduleStore';

type Slot = {
  buildingId: string;
  floor: number;
  room: string;
  start: string; // HH:mm
  end: string; // HH:mm
};

type DaySchedule = {
  slots: Slot[];
};

type WeekSchedule = Record<string, DaySchedule>;

const WEEKDAYS: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DEPARTMENTS: string[] = [
  'Urology',
  'Primary Care',
  'Cardiology',
  'Gastroenterology',
  'Neurology',
  'Orthopedics',
  'Oncology',
  'Pediatrics',
  'Dermatology',
];

function DayEditor({
  value,
  onChange,
}: {
  value: DaySchedule;
  onChange: (v: DaySchedule) => void;
}) {
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const rooms = useMemo(
    () => (selectedBuilding ? listRoomsForBuilding(selectedBuilding, selectedFloor) : []),
    [selectedBuilding, selectedFloor]
  );
  const [justAddedCount, setJustAddedCount] = useState<number>(0);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('12:00');

  // Ensure selected room stays valid for chosen building/floor
  React.useEffect(() => {
    if (rooms.length === 0) {
      setSelectedRoom('');
    } else if (!selectedRoom || !rooms.includes(selectedRoom)) {
      setSelectedRoom(rooms[0]);
    }
  }, [rooms, selectedRoom]);

  const addSlot = () => {
    if (!selectedBuilding) return;
    const next: Slot[] = [
      ...(value.slots || []),
      {
        buildingId: selectedBuilding,
        floor: selectedFloor,
        room: selectedRoom || rooms[0] || '',
        start: startTime || '09:00',
        end: endTime || '12:00',
      },
    ];
    onChange({ ...value, slots: next });
    setJustAddedCount((c) => c + 1);
  };

  const updateSlot = (idx: number, patch: Partial<Slot>) => {
    const next = (value.slots || []).map((s, i) => (i === idx ? ({ ...s, ...patch } as Slot) : s));
    onChange({ ...value, slots: next });
  };

  const removeSlot = (idx: number) => {
    const next = (value.slots || []).filter((_, i) => i !== idx);
    onChange({ ...value, slots: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-slate-600 mb-1">Building</label>
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="">Select building</option>
            {BUILDINGS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Floor</label>
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(Number(e.target.value))}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            disabled={!selectedBuilding}
          >
            {[1, 2, 3, 4, 5].map((f) => (
              <option key={f} value={f}>
                Floor {f}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Room</label>
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            disabled={!selectedBuilding}
          >
            {rooms.map((rm) => (
              <option key={rm} value={rm}>
                {rm}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Start</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            disabled={!selectedBuilding}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">End</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
            disabled={!selectedBuilding}
          />
        </div>
        <button
          onClick={addSlot}
          className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow hover:bg-blue-700 flex items-center gap-2"
          disabled={
            !selectedBuilding ||
            !selectedRoom ||
            !startTime ||
            !endTime ||
            (startTime && endTime && startTime >= endTime)
          }
          title={
            !selectedBuilding
              ? 'Select a building to enable'
              : startTime && endTime && startTime >= endTime
                ? 'End time must be after start time'
                : 'Add slot'
          }
        >
          Add slot
        </button>
      </div>

      {/* Feedback without showing slot details */}
      {(value.slots || []).length > 0 && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          {justAddedCount > 0 ? (
            <span>
              {justAddedCount} slot{justAddedCount > 1 ? 's' : ''} added (unsaved). Click Save to
              persist.
            </span>
          ) : (
            <span>
              {(value.slots || []).length} slot{(value.slots || []).length > 1 ? 's' : ''} pending
              for this day (unsaved). Click Save to persist.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function DoctorSchedule(): React.ReactElement {
  const [doctorId, setDoctorId] = useState<string>('');
  const [doctorName, setDoctorName] = useState<string>('');
  const [doctorDept, setDoctorDept] = useState<string>('');
  const [activeDay, setActiveDay] = useState<string>('Monday');
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editData, setEditData] = useState<null | {
    day: string;
    buildingId: string;
    floor: number;
    room: string;
    start: string;
    end: string;
  }>(null);
  const [state, setState] = useState<WeekSchedule>(() => {
    const all = loadSchedules() as Record<string, any>;
    return (
      all['__draft__'] ||
      WEEKDAYS.reduce((acc, d) => ({ ...acc, [d]: { slots: [] as Slot[] } }), {} as WeekSchedule)
    );
  });

  const [existing, setExisting] = useState<Record<string, any>>(
    () => loadSchedules() as Record<string, any>
  );
  const refreshExisting = React.useCallback(() => {
    try {
      setExisting(loadSchedules() as Record<string, any>);
    } catch {
      setExisting({});
    }
  }, []);

  const doctorOptions = useMemo(() => {
    const entries = Object.entries(existing).filter(([id]) => id !== '__draft__');
    const opts = entries.map(([id, s]) => ({ id, name: (s as any).doctorName || id }));
    if (doctorId && !opts.some((o) => o.id === doctorId)) {
      opts.unshift({ id: doctorId, name: doctorName || doctorId });
    }
    return opts;
  }, [existing, doctorId, doctorName]);

  const nameOptions = useMemo(() => {
    const seen = new Set<string>();
    const entries = Object.entries(existing).filter(([id]) => id !== '__draft__');
    const opts: Array<{ name: string; id: string }> = [];
    for (const [id, s] of entries) {
      const nm = (s as any).doctorName || id;
      if (!seen.has(nm)) {
        seen.add(nm);
        opts.push({ name: nm, id });
      }
    }
    if (doctorName && !seen.has(doctorName)) {
      opts.unshift({ name: doctorName, id: doctorId || doctorName });
    }
    return opts;
  }, [existing, doctorId, doctorName]);

  const loadById = (id: string) => {
    if (!id) return;
    const sched = (loadSchedules() as Record<string, any>)[id];
    if (sched) {
      setDoctorId(sched.doctorId);
      setDoctorName(sched.doctorName || '');
      setDoctorDept(sched.doctorDepartment || '');
      setState(
        sched.week ||
          WEEKDAYS.reduce(
            (acc, d) => ({ ...acc, [d]: { slots: [] as Slot[] } }),
            {} as WeekSchedule
          )
      );
      setEditMode(false);
      setEditData(null);
    } else {
      // Initialize blank for new id
      setDoctorId(id);
      setDoctorName('');
      setDoctorDept(doctorDept || DEPARTMENTS[0] || '');
      setState(
        WEEKDAYS.reduce((acc, d) => ({ ...acc, [d]: { slots: [] as Slot[] } }), {} as WeekSchedule)
      );
      setEditMode(false);
      setEditData(null);
    }
  };

  const loadByName = (name: string) => {
    if (!name) return;
    const entries = Object.entries(loadSchedules() as Record<string, any>).filter(
      ([id]) => id !== '__draft__'
    );
    const found = entries.find(([, s]) => ((s as any).doctorName || '') === name);
    if (found) {
      loadById(found[0]);
    } else {
      // New doctor name, keep current id or set to name
      setDoctorName(name);
      if (!doctorId) setDoctorId(name);
      setDoctorDept(doctorDept || DEPARTMENTS[0] || '');
      setState(
        WEEKDAYS.reduce((acc, d) => ({ ...acc, [d]: { slots: [] as Slot[] } }), {} as WeekSchedule)
      );
      setEditMode(false);
      setEditData(null);
    }
  };

  const summarySlots = useMemo(() => {
    const result: Array<{
      day: string;
      buildingName: string;
      floor: number;
      room: string;
      start: string;
      end: string;
    }> = [];
    try {
      const all = loadSchedules() as Record<string, any>;
      const sched = doctorId ? all[doctorId] : null;
      if (!sched || !sched.week) return result;
      const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      for (const day of order) {
        const list = (sched.week?.[day]?.slots || []) as Slot[];
        for (const s of list) {
          const b = BUILDINGS.find((x) => x.id === s.buildingId);
          result.push({
            day,
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
    return result;
  }, [doctorId, existing]);

  // Seed demo schedules across multiple cities if storage is empty
  React.useEffect(() => {
    const existingAll = loadSchedules() as Record<string, any>;
    const num = Object.keys(existingAll || {}).filter((k) => k !== '__draft__').length;
    if (num >= 3) return;
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
          Monday: {
            slots: [
              {
                buildingId: 'uh-cleveland-medical-center',
                floor: 1,
                room: pickRoom('uh-cleveland-medical-center', 1),
                start: '09:00',
                end: '12:00',
              },
            ],
          },
          Tuesday: {
            slots: [
              {
                buildingId: 'uh-ahuja-medical-center',
                floor: 2,
                room: pickRoom('uh-ahuja-medical-center', 2),
                start: '09:00',
                end: '12:00',
              },
            ],
          },
          Wednesday: {
            slots: [
              {
                buildingId: 'uh-st-john-medical-center',
                floor: 1,
                room: pickRoom('uh-st-john-medical-center', 1),
                start: '13:00',
                end: '16:00',
              },
            ],
          },
          Thursday: {
            slots: [
              {
                buildingId: 'uh-seidman-firelands',
                floor: 1,
                room: pickRoom('uh-seidman-firelands', 1),
                start: '09:00',
                end: '12:00',
              },
            ],
          },
          Friday: {
            slots: [
              {
                buildingId: 'uh-geauga-medical-center',
                floor: 3,
                room: pickRoom('uh-geauga-medical-center', 3),
                start: '10:00',
                end: '13:00',
              },
            ],
          },
        } as WeekSchedule,
      },
      {
        doctorId: 'd2',
        doctorName: 'Dr. Rivera',
        doctorDepartment: 'Gastroenterology',
        week: {
          Monday: {
            slots: [
              {
                buildingId: 'uh-ahuja-medical-center',
                floor: 3,
                room: pickRoom('uh-ahuja-medical-center', 3),
                start: '13:00',
                end: '16:00',
              },
            ],
          },
          Tuesday: {
            slots: [
              {
                buildingId: 'uh-cleveland-medical-center',
                floor: 2,
                room: pickRoom('uh-cleveland-medical-center', 2),
                start: '09:00',
                end: '12:00',
              },
            ],
          },
          Wednesday: {
            slots: [
              {
                buildingId: 'uh-westlake-health-center',
                floor: 1,
                room: pickRoom('uh-westlake-health-center', 1),
                start: '09:30',
                end: '12:30',
              },
            ],
          },
          Thursday: {
            slots: [
              {
                buildingId: 'uh-minoff-chagrin-highlands',
                floor: 2,
                room: pickRoom('uh-minoff-chagrin-highlands', 2),
                start: '13:00',
                end: '16:00',
              },
            ],
          },
          Friday: {
            slots: [
              {
                buildingId: 'uh-fairlawn-health-center',
                floor: 1,
                room: pickRoom('uh-fairlawn-health-center', 1),
                start: '08:30',
                end: '11:30',
              },
            ],
          },
        } as WeekSchedule,
      },
      {
        doctorId: 'd3',
        doctorName: 'Dr. Chen',
        doctorDepartment: 'Urology',
        week: {
          Monday: {
            slots: [
              {
                buildingId: 'uh-landerbrook-health-center',
                floor: 1,
                room: pickRoom('uh-landerbrook-health-center', 1),
                start: '09:00',
                end: '12:00',
              },
            ],
          },
          Tuesday: {
            slots: [
              {
                buildingId: 'uh-mentor-hopkins-health-center',
                floor: 1,
                room: pickRoom('uh-mentor-hopkins-health-center', 1),
                start: '13:00',
                end: '16:00',
              },
            ],
          },
          Wednesday: {
            slots: [
              {
                buildingId: 'uh-st-john-medical-center',
                floor: 2,
                room: pickRoom('uh-st-john-medical-center', 2),
                start: '09:00',
                end: '12:00',
              },
            ],
          },
          Thursday: {
            slots: [
              {
                buildingId: 'uh-cleveland-medical-center',
                floor: 4,
                room: pickRoom('uh-cleveland-medical-center', 4),
                start: '13:00',
                end: '16:00',
              },
            ],
          },
          Friday: {
            slots: [
              {
                buildingId: 'uh-ahuja-medical-center',
                floor: 2,
                room: pickRoom('uh-ahuja-medical-center', 2),
                start: '09:00',
                end: '11:00',
              },
            ],
          },
        } as WeekSchedule,
      },
      {
        doctorId: 'd4',
        doctorName: 'Dr. Williams',
        doctorDepartment: 'Primary Care',
        week: {
          Monday: {
            slots: [
              {
                buildingId: 'uh-seidman-firelands',
                floor: 2,
                room: pickRoom('uh-seidman-firelands', 2),
                start: '13:00',
                end: '16:00',
              },
            ],
          },
          Tuesday: {
            slots: [
              {
                buildingId: 'uh-westlake-health-center',
                floor: 1,
                room: pickRoom('uh-westlake-health-center', 1),
                start: '09:00',
                end: '12:00',
              },
            ],
          },
          Wednesday: {
            slots: [
              {
                buildingId: 'uh-minoff-chagrin-highlands',
                floor: 1,
                room: pickRoom('uh-minoff-chagrin-highlands', 1),
                start: '13:00',
                end: '16:00',
              },
            ],
          },
          Thursday: {
            slots: [
              {
                buildingId: 'uh-landerbrook-health-center',
                floor: 2,
                room: pickRoom('uh-landerbrook-health-center', 2),
                start: '09:00',
                end: '12:00',
              },
            ],
          },
          Friday: {
            slots: [
              {
                buildingId: 'uh-geauga-medical-center',
                floor: 1,
                room: pickRoom('uh-geauga-medical-center', 1),
                start: '13:00',
                end: '16:00',
              },
            ],
          },
        } as WeekSchedule,
      },
    ];
    for (const s of seed) {
      upsertDoctorSchedule(s.doctorId, s);
    }
    refreshExisting();
  }, [refreshExisting]);

  // Load by doctorId from hash if provided
  React.useEffect(() => {
    try {
      const hash = window.location.hash || '';
      const idx = hash.indexOf('?');
      if (idx >= 0) {
        const params = new URLSearchParams(hash.slice(idx + 1));
        const targetId = params.get('doctorId');
        const isNew = params.get('new') === '1' || params.get('new') === 'true';
        const targetName = params.get('doctorName') || '';
        const isEdit = params.get('edit') === '1' || params.get('edit') === 'true';
        const day = params.get('day') || 'Monday';
        const buildingId = params.get('buildingId') || '';
        const floor = Number(params.get('floor') || '1');
        const room = params.get('room') || '';
        const start = params.get('start') || '';
        const end = params.get('end') || '';
        if (targetId) {
          const all = loadSchedules() as Record<string, any>;
          const sched = all[targetId];
          if (!isNew && sched) {
            setDoctorId(sched.doctorId);
            setDoctorName(sched.doctorName || '');
            setDoctorDept(sched.doctorDepartment || '');
            setState(
              sched.week ||
                WEEKDAYS.reduce(
                  (acc, d) => ({ ...acc, [d]: { slots: [] as Slot[] } }),
                  {} as WeekSchedule
                )
            );
          } else {
            // New schedule mode: start blank regardless of existing data
            setDoctorId(targetId);
            setDoctorName(targetName || '');
            // try infer department from any existing schedule by name; else default first option
            const byName = targetName
              ? Object.values(all || {}).find((s: any) => (s as any)?.doctorName === targetName)
              : null;
            setDoctorDept((byName as any)?.doctorDepartment || DEPARTMENTS[0] || '');
            setState(
              WEEKDAYS.reduce(
                (acc, d) => ({ ...acc, [d]: { slots: [] as Slot[] } }),
                {} as WeekSchedule
              )
            );
          }
          if (isEdit) {
            setEditMode(true);
            setActiveDay(day);
            setEditData({ day, buildingId, floor, room, start, end });
          }
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setDay = (day: string, patch: DaySchedule) => setState((s) => ({ ...s, [day]: patch }));

  const save = () => {
    if (!doctorId) return;
    const payload = { doctorId, doctorName, doctorDepartment: doctorDept, week: state };
    upsertDoctorSchedule(doctorId, payload);
    alert('Schedule saved');
    refreshExisting();
  };

  const loadExisting = (id: string) => {
    const sched = (loadSchedules() as Record<string, any>)[id];
    if (sched) {
      setDoctorId(sched.doctorId);
      setDoctorName(sched.doctorName || '');
      setState(
        sched.week ||
          WEEKDAYS.reduce(
            (acc, d) => ({ ...acc, [d]: { slots: [] as Slot[] } }),
            {} as WeekSchedule
          )
      );
    } else {
      alert('No schedule found for that doctor id');
    }
  };

  const saveEdit = () => {
    if (!doctorId || !editMode || !editData) return;
    const all = loadSchedules() as Record<string, any>;
    const current = all[doctorId] || {
      doctorId,
      doctorName,
      doctorDepartment: doctorDept,
      week: WEEKDAYS.reduce(
        (acc, d) => ({ ...acc, [d]: { slots: [] as Slot[] } }),
        {} as WeekSchedule
      ),
    };
    const wk = current.week as WeekSchedule;
    const day = editData.day;
    const list = (wk[day]?.slots || []) as Slot[];
    const idx = list.findIndex(
      (s) =>
        String(s.buildingId) === String(editData.buildingId) &&
        Number(s.floor) === Number(editData.floor) &&
        String(s.room) === String(editData.room) &&
        String(s.start) === String(editData.start) &&
        String(s.end) === String(editData.end)
    );
    const newSlot: Slot = {
      buildingId: editData.buildingId,
      floor: Number(editData.floor),
      room: String(editData.room || ''),
      start: String(editData.start || ''),
      end: String(editData.end || ''),
    };
    if (idx >= 0) {
      list[idx] = newSlot;
    } else {
      list.push(newSlot);
    }
    wk[day] = { slots: [...list] };
    upsertDoctorSchedule(doctorId, {
      doctorId,
      doctorName,
      doctorDepartment: doctorDept || current.doctorDepartment || '',
      week: wk,
    });
    alert('Schedule updated');
    // Optionally exit edit mode
    setEditMode(false);
    setEditData(null);
    refreshExisting();
  };

  const clearDraft = () => {
    setDoctorId('');
    setDoctorName('');
    setState(
      WEEKDAYS.reduce((acc, d) => ({ ...acc, [d]: { slots: [] as Slot[] } }), {} as WeekSchedule)
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            aria-label="Back"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-500 text-rose-600 hover:bg-rose-50"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Doctor Scheduling</h1>
        <div className="text-sm text-slate-600">
          Assign doctors to buildings and rooms with time slots (Mon–Fri). Multiple slots per day
          allow multi-building work.
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Combined Doctor Selector */}
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-600 mb-1">Select Doctor</label>
            <select
              value={doctorId}
              onChange={(e) => {
                const selectedId = e.target.value;
                if (selectedId) {
                  loadById(selectedId);
                } else {
                  // Clear form for new doctor
                  setDoctorId('');
                  setDoctorName('');
                  setDoctorDept('');
                  setState(WEEKDAYS.reduce((acc, d) => ({ ...acc, [d]: { slots: [] } }), {}));
                }
              }}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              <option value=""> Select Doctor</option>
              {doctorOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name} ({existing[opt.id]?.doctorDepartment || 'No Dept'})
                </option>
              ))}
            </select>
          </div>

          {/* Department - Auto-filled but editable */}
          <div>
            <label className="block text-xs text-slate-600 mb-1">Department</label>
            <select
              value={doctorDept}
              onChange={(e) => setDoctorDept(e.target.value)}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              <option value="">Select department</option>
              {DEPARTMENTS.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            {!editMode && (
              <button
                onClick={save}
                className="h-9 rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow hover:bg-blue-700 flex items-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Save Schedule
              </button>
            )}
          </div>
        </div>

        {/* Doctor Name - Only show when creating new */}
        {/* {!doctorId && (
  <div className="mt-3">
    <label className="block text-xs text-slate-600 mb-1">Doctor Name</label>
    <input
      type="text"
      value={doctorName}
      onChange={(e) => setDoctorName(e.target.value)}
      placeholder="Enter full name"
      className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
    />
  </div>
)} */}

        {/* Existing schedule summary table */}
        {!editMode && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold text-slate-900">Weekly Schedule</div>
              {doctorDept && (
                <div className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                  Department: {doctorDept}
                </div>
              )}
            </div>
            {summarySlots.length > 0 ? (
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Day</th>
                      <th className="px-3 py-2 text-left font-semibold">Building</th>
                      <th className="px-3 py-2 text-left font-semibold">Floor</th>
                      <th className="px-3 py-2 text-left font-semibold">Room</th>
                      <th className="px-3 py-2 text-left font-semibold">Start</th>
                      <th className="px-3 py-2 text-left font-semibold">End</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {summarySlots.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-800">{s.day}</td>
                        <td className="px-3 py-2 text-slate-800">{s.buildingName}</td>
                        <td className="px-3 py-2 text-slate-800">Floor {s.floor}</td>
                        <td className="px-3 py-2 text-slate-800">{s.room || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{s.start}</td>
                        <td className="px-3 py-2 text-slate-600">{s.end}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">
                No existing schedules found for this doctor.
              </div>
            )}
          </div>
        )}

        {/* Load existing section removed */}

        {!editMode ? (
          <div className="mt-2">
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => setActiveDay(d)}
                  className={`rounded-md border px-3 py-1 text-sm ${activeDay === d ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'}`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="mt-3">
              <DayEditor
                value={state[activeDay] || { slots: [] }}
                onChange={(v) => setDay(activeDay, v)}
              />
            </div>
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            <div className="text-sm font-semibold text-slate-900">Edit schedule</div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-600 mb-1">Building</label>
                <select
                  value={editData?.buildingId || ''}
                  onChange={(e) =>
                    setEditData((d) => (d ? { ...d, buildingId: e.target.value } : d))
                  }
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
                  disabled
                >
                  <option value="">Select building</option>
                  {BUILDINGS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Floor</label>
                <select
                  value={editData?.floor || 1}
                  onChange={(e) =>
                    setEditData((d) => (d ? { ...d, floor: Number(e.target.value) } : d))
                  }
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
                >
                  {[1, 2, 3, 4, 5].map((f) => (
                    <option key={f} value={f}>
                      Floor {f}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Room</label>
                <select
                  value={editData?.room || ''}
                  onChange={(e) => setEditData((d) => (d ? { ...d, room: e.target.value } : d))}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
                >
                  {(editData
                    ? listRoomsForBuilding(editData.buildingId || '', editData.floor || 1)
                    : []
                  ).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Start</label>
                <input
                  type="time"
                  value={editData?.start || ''}
                  onChange={(e) => setEditData((d) => (d ? { ...d, start: e.target.value } : d))}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">End</label>
                <input
                  type="time"
                  value={editData?.end || ''}
                  onChange={(e) => setEditData((d) => (d ? { ...d, end: e.target.value } : d))}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
                />
              </div>
              <div className="flex justify-end md:col-span-6">
                <button
                  onClick={() => window.history.back()}
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 hover:bg-slate-50 mr-2"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="h-9 rounded-md bg-slate-900 px-3 text-sm font-medium text-white shadow hover:bg-slate-800"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
