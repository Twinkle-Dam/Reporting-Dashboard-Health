// Shared mock time‑series data used by reports.

export const mockData = [
  { id: 1, department: 'Cardiology', visits: 120, revenue: 4000, date: '2025-10-01' },
  { id: 2, department: 'Orthopedics', visits: 90, revenue: 3000, date: '2025-10-01' },
  { id: 3, department: 'Neurology', visits: 70, revenue: 2500, date: '2025-10-02' },
  { id: 4, department: 'Pediatrics', visits: 100, revenue: 3500, date: '2025-10-02' },
  { id: 5, department: 'Dermatology', visits: 45, revenue: 1200, date: '2025-10-03' },
];

// Core mock doctor set reused across dashboard, reports, and replicas.

export const MOCK_DOCTOR_LIST = [
  { id: 'd1', name: 'Dr. Patel', department: 'Cardiology' },
  { id: 'd2', name: 'Dr. Rivera', department: 'Gastroenterology' },
  { id: 'd3', name: 'Dr. Chen', department: 'Urology' },
  { id: 'd4', name: 'Dr. Williams', department: 'Primary Care' },
  { id: 'd5', name: 'Dr. Johnson', department: 'Internal Medicine' },
];

export const MOCK_DOCTOR_NAMES = ['Dr. Patel', 'Dr. Rivera', 'Dr. Chen'];

export const MOCK_DOCTOR_DEPARTMENTS = {
  'Dr. Patel': 'Cardiology',
  'Dr. Rivera': 'Gastroenterology',
  'Dr. Chen': 'Urology',
  'Dr. Williams': 'Primary Care',
  'Dr. Johnson': 'Internal Medicine',
};

// Mock doctor schedule seed used by the dashboard to populate the schedule store.
export const MOCK_DASHBOARD_SCHEDULE_SEED = [
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
];
