/**
 * API エンドポイント
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * sessionStorageキー
 * セキュリティ向上のため、localStorageではなくsessionStorageを使用
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'okiteru_access_token',
  REFRESH_TOKEN: 'okiteru_refresh_token',
  USER: 'okiteru_user',
  USER_ID: 'okiteru_user_id',
} as const;

/**
 * クエリキー
 */
export const QUERY_KEYS = {
  USER: 'user',
  ATTENDANCE: 'attendance',
  ATTENDANCE_TODAY: 'attendance_today',
  DAILY_REPORTS: 'daily_reports',
  STAFF_AVAILABILITY: 'staff_availability',
  WORKSITES: 'worksites',
} as const;

/**
 * ルートパス
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: {
    ATTENDANCE: '/dashboard/attendance',
    REPORTS: '/dashboard/reports',
    SHIFTS: '/dashboard/shifts',
  },
  MANAGER: {
    HOME: '/manager',
    STAFF: '/manager/staff',
    SHIFTS: '/manager/shifts',
    WORKSITES: '/manager/worksites',
  },
  PROFILE: '/profile',
} as const;

/**
 * 勤怠ステータスラベル
 * @deprecated enums.tsのAttendanceStatusLabelを使用してください
 */
export { AttendanceStatusLabel as ATTENDANCE_STATUS_LABELS } from './enums';

/**
 * ロールラベル
 * @deprecated enums.tsのUserRoleLabelを使用してください
 */
export { UserRoleLabel as ROLE_LABELS } from './enums';
