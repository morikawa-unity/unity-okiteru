export type ReportStatus = 'draft' | 'submitted' | 'archived' | 'superseded';

export interface DailyReport {
  id: string;
  staffId: string;
  date: string;
  content: string;
  attendanceRecordId?: string;
  status: ReportStatus;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PreviousDayReport {
  id: string;
  userId: string;
  reportDate: string;
  nextWakeUpTime: string;
  nextDepartureTime: string;
  nextArrivalTime: string;
  appearancePhotoUrl: string;
  routePhotoUrl: string;
  notes?: string;
  actualAttendanceRecordId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyReportFormData {
  content: string;
}

export interface PreviousDayReportFormData {
  reportDate: string;
  nextWakeUpTime: string;
  nextDepartureTime: string;
  nextArrivalTime: string;
  notes?: string;
}
