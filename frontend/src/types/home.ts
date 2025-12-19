/**
 * ホーム画面の型定義
 * 勤怠報告・出社可能日・日報管理の統合画面で使用する型
 *
 * Note: Enumは @/lib/enums から直接インポートしてください
 * - ActionType, AttendanceStatus, ReportStatus, HomeTab など
 */
import type { ActionType, AttendanceStatus, ReportStatus, HomeTab } from '@/lib/enums';

// ========================================
// 勤怠報告関連
// ========================================

/**
 * 勤怠記録
 */
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

/**
 * アクションステータス（勤怠報告の各ステップ）
 */
export interface ActionStatus {
  type: ActionType;
  label: string;
  activeLabel: string;
  completed: boolean;
  enabled: boolean;
  description: string;
}

/**
 * 前日報告
 */
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

/**
 * 前日報告フォームデータ
 */
export interface PreviousDayReportFormData {
  reportDate: string;
  nextWakeUpTime: string;
  nextDepartureTime: string;
  nextArrivalTime: string;
  appearancePhotoUrl: string;
  routePhotoUrl: string;
  notes?: string;
}

// ========================================
// 出社可能日関連
// ========================================

/**
 * 現場情報
 */
export interface Worksite {
  id: string;
  name: string;
  address?: string;
  description?: string;
}

/**
 * 出社可能日
 */
export interface Availability {
  id: string;
  date: string;
  worksite: Worksite;
  notes?: string;
}

/**
 * 出社可能日フォームデータ
 */
export interface AvailabilityFormData {
  date: string;
  worksiteId: string;
  notes?: string;
}

// ========================================
// 日報関連
// ========================================

/**
 * 日報
 */
export interface Report {
  id: string;
  date: string;
  content: string;
  status: ReportStatus;
  submittedAt?: string;
}

/**
 * 日報フォームデータ
 */
export interface ReportFormData {
  content: string;
}

// ========================================
// ビューコンポーネントProps
// ========================================

/**
 * ホーム画面ビューのProps
 */
export interface HomeViewProps {
  // 共通
  isLoading: boolean;
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;

  // 勤怠報告
  currentRecord: AttendanceRecord | null;
  actionStatuses: ActionStatus[];
  activeAction: ActionType | null;
  onActionClick: (action: ActionStatus) => void;
  onPreviousDaySuccess: () => void;
  onCancelPreviousDay: () => void;

  // 出社可能日
  showShiftForm: boolean;
  selectedDate: string;
  selectedWorksite: string;
  shiftNotes: string;
  isSubmittingShift: boolean;
  availabilities: Availability[];
  worksites: Worksite[];
  onToggleShiftForm: () => void;
  onDateChange: (date: string) => void;
  onWorksiteChange: (worksiteId: string) => void;
  onShiftNotesChange: (notes: string) => void;
  onShiftSubmit: (e: React.FormEvent) => void;
  onShiftCancel: () => void;

  // 日報
  showReportForm: boolean;
  reportContent: string;
  isSubmittingReport: boolean;
  reports: Report[];
  onToggleReportForm: () => void;
  onReportContentChange: (content: string) => void;
  onReportSubmit: (e: React.FormEvent) => void;
  onReportCancel: () => void;
}
