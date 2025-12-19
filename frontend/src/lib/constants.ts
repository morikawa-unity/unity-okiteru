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
 */
export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  pending: '未報告',
  partial: '一部報告',
  complete: '報告完了',
  active: 'アクティブ',
  reset: 'リセット',
  reopened: '再開',
  archived: 'アーカイブ',
};

/**
 * ロールラベル
 */
export const ROLE_LABELS: Record<string, string> = {
  staff: 'スタッフ',
  manager: 'マネージャー',
};
