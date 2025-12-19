export interface Slot {
  buildingId: string;
  floor: number;
  room: string;
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface DaySchedule {
  slots: Slot[];
}

export type WeekSchedule = Record<string, DaySchedule>;

export interface FullSchedule {
  doctorId: string;
  doctorName: string;
  doctorDepartment: string;
  week: WeekSchedule;
}
