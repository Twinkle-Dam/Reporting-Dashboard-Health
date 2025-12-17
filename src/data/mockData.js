// Shared mock time‑series data used by reports.

export const mockData = [
  { id: 1, department: 'Urology -APP', visits: 120, revenue: 4000, date: '2025-10-01' },
  { id: 2, department: 'Urology', visits: 90, revenue: 3000, date: '2025-10-01' },
  { id: 3, department: 'Primary Care', visits: 70, revenue: 2500, date: '2025-10-02' },
  { id: 4, department: 'General Surgery', visits: 100, revenue: 3500, date: '2025-10-02' },
  { id: 5, department: 'Dermatology', visits: 45, revenue: 1200, date: '2025-10-03' },
];

// Core mock doctor set reused across dashboard, reports, and replicas.

export const MOCK_DOCTOR_LIST = [
  { id: 'd1', name: 'Julie', department: 'Urology -APP' },
  { id: 'd2', name: 'Ghayda', department: 'Urology' },
  { id: 'd3', name: 'Loeb, Aram', department: 'Urology' },
  { id: 'd4', name: 'Michael Zell', department: 'Urology' },
  { id: 'd5', name: 'Adam Nagakura', department: 'Primary Care' },
  { id: 'd6', name: 'Parks Jefferey', department: 'General Surgery' },
];

export const MOCK_DOCTOR_NAMES = [
  'Julie',
  'Ghayda',
  'Loeb, Aram',
  'Michael Zell',
  'Adam Nagakura',
  'Parks Jefferey',
];

export const MOCK_DOCTOR_DEPARTMENTS = {
  Julie: 'Urology -APP',
  'Ghayda': 'Urology',
  'Loeb, Aram': 'Urology',
  'Michael Zell': 'Urology',
  'Adam Nagakura': 'Primary Care',
  'Parks Jefferey': 'General Surgery',
};

// Mock doctor schedule seed used by the dashboard to populate the schedule store.
export const MOCK_DASHBOARD_SCHEDULE_SEED = [
  // Julie • Urology -APP
  {
    doctorId: 'd1',
    doctorName: 'Julie',
    doctorDepartment: 'Urology -APP',
    week: {
      Monday: {
        slots: [
          {
            buildingId: 'Drusinsky Family Sports Medicine Complex',
            floor: 3,
            room: null,
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
            room: null,
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
            room: null,
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
            room: null,
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
            room: null,
            start: '10:00',
            end: '13:00',
          },
        ],
      },
    },
  },
  // Ghayda • Urology
  {
    doctorId: 'd2',
    doctorName: 'Ghayda',
    doctorDepartment: 'Urology',
    week: {
      Monday: {
        slots: [
          {
            buildingId: 'uh-ahuja-medical-center',
            floor: 3,
            room: null,
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
            room: null,
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
            room: null,
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
            room: null,
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
            room: null,
            start: '08:30',
            end: '11:30',
          },
        ],
      },
    },
  },
  // Loeb, Aram • Urology
  {
    doctorId: 'd3',
    doctorName: 'Loeb, Aram',
    doctorDepartment: 'Urology',
    week: {
      Monday: {
        slots: [
          {
            buildingId: 'uh-landerbrook-health-center',
            floor: 1,
            room: null,
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
            room: null,
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
            room: null,
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
            room: null,
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
            room: null,
            start: '09:00',
            end: '11:00',
          },
        ],
      },
    },
  },
  // Michael Zell • Urology
  {
    doctorId: 'd4',
    doctorName: 'Michael Zell',
    doctorDepartment: 'Urology',
    week: {
      Monday: {
        slots: [
          {
            buildingId: 'uh-seidman-firelands',
            floor: 2,
            room: null,
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
            room: null,
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
            room: null,
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
            room: null,
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
            room: null,
            start: '13:00',
            end: '16:00',
          },
        ],
      },
    },
  },
  // Adam Nagakura • Primary Care
  {
    doctorId: 'd5',
    doctorName: 'Adam Nagakura',
    doctorDepartment: 'Primary Care',
    week: {
      Tuesday: {
        slots: [
          { buildingId: 'uh-westlake-health-center', floor: 1, room: null, start: '08:00', end: '12:00' },
          { buildingId: 'uh-westlake-health-center', floor: 1, room: null, start: '13:00', end: '17:00' },
        ],
      },
      Wednesday: {
        slots: [
          { buildingId: 'uh-westlake-health-center', floor: 1, room: null, start: '08:00', end: '12:00' },
          { buildingId: 'uh-westlake-health-center', floor: 1, room: null, start: '13:00', end: '17:00' },
        ],
      },
      Thursday: {
        slots: [
          { buildingId: 'uh-westlake-health-center', floor: 1, room: null, start: '08:00', end: '12:00' },
          { buildingId: 'uh-westlake-health-center', floor: 1, room: null, start: '13:00', end: '17:00' },
        ],
      },
      Friday: {
        slots: [
          { buildingId: 'uh-westlake-health-center', floor: 1, room: null, start: '08:00', end: '12:00' },
          { buildingId: 'uh-westlake-health-center', floor: 1, room: null, start: '13:00', end: '17:00' },
        ],
      },
    },
  },
  // Parks Jefferey • General Surgery
  {
    doctorId: 'd6',
    doctorName: 'Parks Jefferey',
    doctorDepartment: 'General Surgery',
    week: {
      Monday: {
        slots: [
          {
            buildingId: 'uh-cleveland-medical-center',
            floor: 2,
            room: null,
            start: '09:00',
            end: '12:00',
          },
        ],
      },
      Thursday: {
        slots: [
          {
            buildingId: 'uh-ahuja-medical-center',
            floor: 3,
            room: null,
            start: '13:00',
            end: '16:00',
          },
        ],
      },
    },
  },
];
