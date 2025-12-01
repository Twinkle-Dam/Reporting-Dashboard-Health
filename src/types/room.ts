import { DoctorInfo } from './doctor';

export interface Room {
  id: string;
  number: number;
  floor: number;
  buildingId: string;
  zone: 'A' | 'B' | 'C' | 'D';
  capacity: number;
  currentOccupancy: number;
  doctor?: DoctorInfo;
  isAvailable: boolean;
  lastCleaned?: Date;
  maintenanceNotes?: string;
}

export interface RoomStatus {
  roomId: string;
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning';
  lastUpdated: Date;
  currentDoctor?: string;
  nextAvailable?: Date;
}

export interface RoomFilters {
  zone?: 'all' | 'A' | 'B' | 'C' | 'D';
  status?: 'all' | 'available' | 'occupied' | 'maintenance';
  floor?: number | 'all';
  capacity?: number;
}
