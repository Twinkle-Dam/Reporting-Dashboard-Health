export interface DoctorInfo {
  id: string;
  name: string;
  department?: string;
  email?: string;
  phone?: string;
  schedule?: DoctorSchedule;
}

export interface DoctorSchedule {
  [day: string]: {
    available: boolean;
    startTime?: string;
    endTime?: string;
    room?: string;
  };
}
