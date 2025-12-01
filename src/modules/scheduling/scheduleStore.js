const STORAGE_KEY = 'doctor_schedules_v1';

function seedSchedules() {
  const pick = (floor, idx) => String(floor * 100 + idx);
  const make = (id, name, dept, defs) => ({
    doctorId: id,
    doctorName: name,
    doctorDepartment: dept,
    week: defs
  });
  const s1 = make('d1', 'Dr. Patel', 'Cardiology', {
    Monday:   { slots: [{ buildingId: 'uh-cleveland-medical-center', floor: 1, room: pick(1,1), start: '09:00', end: '12:00' }] },
    Tuesday:  { slots: [{ buildingId: 'uh-ahuja-medical-center', floor: 2, room: pick(2,1), start: '09:00', end: '12:00' }] },
    Wednesday:{ slots: [{ buildingId: 'uh-st-john-medical-center', floor: 1, room: pick(1,1), start: '13:00', end: '16:00' }] },
    Thursday: { slots: [{ buildingId: 'uh-seidman-firelands', floor: 1, room: pick(1,1), start: '09:00', end: '12:00' }] },
    Friday:   { slots: [{ buildingId: 'uh-geauga-medical-center', floor: 3, room: pick(3,1), start: '10:00', end: '13:00' }] },
  });
  const s2 = make('d2', 'Dr. Rivera', 'Gastroenterology', {
    Monday:   { slots: [{ buildingId: 'uh-ahuja-medical-center', floor: 3, room: pick(3,1), start: '13:00', end: '16:00' }] },
    Tuesday:  { slots: [{ buildingId: 'uh-cleveland-medical-center', floor: 2, room: pick(2,1), start: '09:00', end: '12:00' }] },
    Wednesday:{ slots: [{ buildingId: 'uh-westlake-health-center', floor: 1, room: pick(1,1), start: '09:30', end: '12:30' }] },
    Thursday: { slots: [{ buildingId: 'uh-minoff-chagrin-highlands', floor: 2, room: pick(2,1), start: '13:00', end: '16:00' }] },
    Friday:   { slots: [{ buildingId: 'uh-fairlawn-health-center', floor: 1, room: pick(1,1), start: '08:30', end: '11:30' }] },
  });
  const s3 = make('d3', 'Dr. Chen', 'Urology', {
    Monday:   { slots: [{ buildingId: 'uh-landerbrook-health-center', floor: 1, room: pick(1,1), start: '09:00', end: '12:00' }] },
    Tuesday:  { slots: [{ buildingId: 'uh-mentor-hopkins-health-center', floor: 1, room: pick(1,1), start: '13:00', end: '16:00' }] },
    Wednesday:{ slots: [{ buildingId: 'uh-st-john-medical-center', floor: 2, room: pick(2,1), start: '09:00', end: '12:00' }] },
    Thursday: { slots: [{ buildingId: 'uh-cleveland-medical-center', floor: 4, room: pick(4,1), start: '13:00', end: '16:00' }] },
    Friday:   { slots: [{ buildingId: 'uh-ahuja-medical-center', floor: 2, room: pick(2,1), start: '09:00', end: '11:00' }] },
  });
  const s4 = make('d4', 'Dr. Williams', 'Primary Care', {
    Monday:   { slots: [{ buildingId: 'uh-seidman-firelands', floor: 2, room: pick(2,1), start: '13:00', end: '16:00' }] },
    Tuesday:  { slots: [{ buildingId: 'uh-westlake-health-center', floor: 1, room: pick(1,1), start: '09:00', end: '12:00' }] },
    Wednesday:{ slots: [{ buildingId: 'uh-minoff-chagrin-highlands', floor: 1, room: pick(1,1), start: '13:00', end: '16:00' }] },
    Thursday: { slots: [{ buildingId: 'uh-landerbrook-health-center', floor: 2, room: pick(2,1), start: '09:00', end: '12:00' }] },
    Friday:   { slots: [{ buildingId: 'uh-geauga-medical-center', floor: 1, room: pick(1,1), start: '13:00', end: '16:00' }] },
  });
  const seeded = { d1: s1, d2: s2, d3: s3, d4: s4 };
  saveSchedules(seeded);
  return seeded;
}

export function loadSchedules() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed) {
      const hasReal = Object.keys(parsed).some((k) => k !== '__draft__');
      if (hasReal) return parsed;
    }
    return seedSchedules();
  } catch {
    // on any error, seed to ensure app shows data
    return seedSchedules();
  }
}

export function saveSchedules(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function upsertDoctorSchedule(doctorId, schedule) {
  const all = loadSchedules();
  all[doctorId] = schedule;
  saveSchedules(all);
  return all[doctorId];
}

export function deleteDoctorSchedule(doctorId) {
  const all = loadSchedules();
  delete all[doctorId];
  saveSchedules(all);
}




