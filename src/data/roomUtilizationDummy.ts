export type RoomUtilizationRow = {
  DateRange: string;
  RoomId: string;
  RoomName: string;
  Monday: string;
  Tuesday: string;
  Wednesday: string;
  Thursday: string;
  Friday: string;
  TotalUtilization: string;
  MondayVisits: number;
  TuesdayVisits: number;
  WednesdayVisits: number;
  ThursdayVisits: number;
  FridayVisits: number;
  TotalVisits: number;
};

// Snapshot-style dummy data used when VM_GetRoomUtilizationSummary is unavailable.
// Rooms are aligned with Ahuja floor 2 synthetic room numbers (201–208) so that
// hash params & room filters match what the main report uses.
export const ROOM_UTILIZATION_DUMMY: RoomUtilizationRow[] = [
  {
    DateRange: 'Nov 2025',
    RoomId: 'BABEEF54-C88A-400E-926E-5317260E5E01',
    RoomName: '201',
    Monday: '65%',
    Tuesday: '70%',
    Wednesday: '72%',
    Thursday: '68%',
    Friday: '60%',
    TotalUtilization: '67%',
    MondayVisits: 12,
    TuesdayVisits: 14,
    WednesdayVisits: 15,
    ThursdayVisits: 13,
    FridayVisits: 11,
    TotalVisits: 65,
  },
  {
    DateRange: 'Nov 2025',
    RoomId: 'BABEEF54-C88A-400E-926E-5317260E5E02',
    RoomName: '202',
    Monday: '50%',
    Tuesday: '60%',
    Wednesday: '75%',
    Thursday: '80%',
    Friday: '70%',
    TotalUtilization: '67%',
    MondayVisits: 9,
    TuesdayVisits: 12,
    WednesdayVisits: 16,
    ThursdayVisits: 18,
    FridayVisits: 14,
    TotalVisits: 69,
  },
  {
    DateRange: 'Nov 2025',
    RoomId: 'BABEEF54-C88A-400E-926E-5317260E5E03',
    RoomName: '203',
    Monday: '40%',
    Tuesday: '55%',
    Wednesday: '60%',
    Thursday: '58%',
    Friday: '45%',
    TotalUtilization: '52%',
    MondayVisits: 8,
    TuesdayVisits: 10,
    WednesdayVisits: 11,
    ThursdayVisits: 10,
    FridayVisits: 9,
    TotalVisits: 48,
  },
  {
    DateRange: 'Nov 2025',
    RoomId: 'BABEEF54-C88A-400E-926E-5317260E5E04',
    RoomName: '204',
    Monday: '30%',
    Tuesday: '40%',
    Wednesday: '45%',
    Thursday: '50%',
    Friday: '35%',
    TotalUtilization: '40%',
    MondayVisits: 5,
    TuesdayVisits: 6,
    WednesdayVisits: 7,
    ThursdayVisits: 8,
    FridayVisits: 6,
    TotalVisits: 32,
  },
  {
    DateRange: 'Nov 2025',
    RoomId: 'BABEEF54-C88A-400E-926E-5317260E5E05',
    RoomName: '205',
    Monday: '80%',
    Tuesday: '85%',
    Wednesday: '90%',
    Thursday: '88%',
    Friday: '82%',
    TotalUtilization: '85%',
    MondayVisits: 18,
    TuesdayVisits: 20,
    WednesdayVisits: 22,
    ThursdayVisits: 21,
    FridayVisits: 19,
    TotalVisits: 100,
  },
  {
    DateRange: 'Nov 2025',
    RoomId: 'BABEEF54-C88A-400E-926E-5317260E5E06',
    RoomName: '206',
    Monday: '20%',
    Tuesday: '25%',
    Wednesday: '30%',
    Thursday: '35%',
    Friday: '28%',
    TotalUtilization: '28%',
    MondayVisits: 3,
    TuesdayVisits: 4,
    WednesdayVisits: 5,
    ThursdayVisits: 6,
    FridayVisits: 4,
    TotalVisits: 22,
  },
  {
    DateRange: 'Nov 2025',
    RoomId: 'BABEEF54-C88A-400E-926E-5317260E5E07',
    RoomName: '207',
    Monday: '55%',
    Tuesday: '60%',
    Wednesday: '65%',
    Thursday: '70%',
    Friday: '58%',
    TotalUtilization: '62%',
    MondayVisits: 11,
    TuesdayVisits: 12,
    WednesdayVisits: 13,
    ThursdayVisits: 14,
    FridayVisits: 12,
    TotalVisits: 62,
  },
  {
    DateRange: 'Nov 2025',
    RoomId: 'BABEEF54-C88A-400E-926E-5317260E5E08',
    RoomName: '208',
    Monday: '10%',
    Tuesday: '15%',
    Wednesday: '20%',
    Thursday: '18%',
    Friday: '12%',
    TotalUtilization: '15%',
    MondayVisits: 2,
    TuesdayVisits: 3,
    WednesdayVisits: 4,
    ThursdayVisits: 4,
    FridayVisits: 3,
    TotalVisits: 16,
  },
];




