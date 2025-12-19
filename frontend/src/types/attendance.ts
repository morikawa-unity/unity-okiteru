import { AttendanceStatus } from '@/lib/enums';

export type { AttendanceStatus };

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  wakeUpTime?: string;
  wakeUpLocation?: string;
  wakeUpNotes?: string;
  departureTime?: string;
  departureLocation?: string;
  departureNotes?: string;
  destination?: string;
  arrivalTime?: string;
  arrivalLocation?: string;
  arrivalGpsLocation?: string;
  arrivalNotes?: string;
  routePhotoUrl?: string;
  appearancePhotoUrl?: string;
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WakeUpReportData {
  wakeUpTime: string;
  wakeUpLocation?: string;
  wakeUpNotes?: string;
}

export interface DepartureReportData {
  departureTime: string;
  departureLocation?: string;
  departureNotes?: string;
  destination?: string;
  routePhotoUrl?: string;
}

export interface ArrivalReportData {
  arrivalTime: string;
  arrivalLocation?: string;
  arrivalGpsLocation?: string;
  arrivalNotes?: string;
  appearancePhotoUrl?: string;
}
