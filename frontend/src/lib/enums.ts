/**
 * 列挙型定義と固定値管理
 * すべての区分値、ステータス、固定名称を一元管理
 */

// ============================================================================
// 勤怠ステータス (AttendanceStatus)
// ============================================================================

/**
 * 勤怠ステータス値
 */
export const AttendanceStatus = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  COMPLETE: 'complete',
  ACTIVE: 'active',
  RESET: 'reset',
  REOPENED: 'reopened',
  ARCHIVED: 'archived',
} as const;

/**
 * 勤怠ステータス型
 */
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

/**
 * 勤怠ステータスラベルマップ
 */
export const AttendanceStatusLabel: Record<AttendanceStatus, string> = {
  [AttendanceStatus.PENDING]: '未報告',
  [AttendanceStatus.PARTIAL]: '一部報告',
  [AttendanceStatus.COMPLETE]: '報告完了',
  [AttendanceStatus.ACTIVE]: 'アクティブ',
  [AttendanceStatus.RESET]: 'リセット',
  [AttendanceStatus.REOPENED]: '再開',
  [AttendanceStatus.ARCHIVED]: 'アーカイブ',
};

/**
 * 勤怠ステータスのラベルを取得
 */
export const getAttendanceStatusLabel = (status: AttendanceStatus): string => {
  return AttendanceStatusLabel[status] || status;
};

// ============================================================================
// 日報ステータス (ReportStatus)
// ============================================================================

/**
 * 日報ステータス値
 */
export const ReportStatus = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  ARCHIVED: 'archived',
  SUPERSEDED: 'superseded',
} as const;

/**
 * 日報ステータス型
 */
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

/**
 * 日報ステータスラベルマップ
 */
export const ReportStatusLabel: Record<ReportStatus, string> = {
  [ReportStatus.DRAFT]: '下書き',
  [ReportStatus.SUBMITTED]: '提出済み',
  [ReportStatus.ARCHIVED]: 'アーカイブ',
  [ReportStatus.SUPERSEDED]: '更新済み',
};

/**
 * 日報ステータスのラベルを取得
 */
export const getReportStatusLabel = (status: ReportStatus): string => {
  return ReportStatusLabel[status] || status;
};

// ============================================================================
// ユーザーロール (UserRole)
// ============================================================================

/**
 * ユーザーロール値
 */
export const UserRole = {
  STAFF: 'staff',
  MANAGER: 'manager',
} as const;

/**
 * ユーザーロール型
 */
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/**
 * ユーザーロールラベルマップ
 */
export const UserRoleLabel: Record<UserRole, string> = {
  [UserRole.STAFF]: 'スタッフ',
  [UserRole.MANAGER]: 'マネージャー',
};

/**
 * ユーザーロールのラベルを取得
 */
export const getUserRoleLabel = (role: UserRole): string => {
  return UserRoleLabel[role] || role;
};

// ============================================================================
// アクションタイプ (ActionType)
// ============================================================================

/**
 * 勤怠アクションタイプ値
 */
export const ActionType = {
  PREVIOUS_DAY: 'previous-day',
  WAKEUP: 'wakeup',
  DEPARTURE: 'departure',
  ARRIVAL: 'arrival',
  REPORT: 'report',
} as const;

/**
 * 勤怠アクションタイプ型
 */
export type ActionType = (typeof ActionType)[keyof typeof ActionType];

/**
 * 勤怠アクションラベルマップ
 */
export const ActionTypeLabel: Record<ActionType, string> = {
  [ActionType.PREVIOUS_DAY]: '前日報告',
  [ActionType.WAKEUP]: '起床報告',
  [ActionType.DEPARTURE]: '出発報告',
  [ActionType.ARRIVAL]: '到着報告',
  [ActionType.REPORT]: '日報作成',
};

/**
 * 勤怠アクションのラベルを取得
 */
export const getActionTypeLabel = (type: ActionType): string => {
  return ActionTypeLabel[type] || type;
};

// ============================================================================
// ボタンバリアント (ButtonVariant)
// ============================================================================

/**
 * ボタンバリアント値
 */
export const ButtonVariant = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  OUTLINE: 'outline',
  DANGER: 'danger',
  GHOST: 'ghost',
} as const;

/**
 * ボタンバリアント型
 */
export type ButtonVariant = (typeof ButtonVariant)[keyof typeof ButtonVariant];

// ============================================================================
// ボタンサイズ (ButtonSize)
// ============================================================================

/**
 * ボタンサイズ値
 */
export const ButtonSize = {
  SM: 'sm',
  MD: 'md',
  LG: 'lg',
} as const;

/**
 * ボタンサイズ型
 */
export type ButtonSize = (typeof ButtonSize)[keyof typeof ButtonSize];

// ============================================================================
// 日付フォーマット (DateFormat)
// ============================================================================

/**
 * 日付フォーマット定数
 */
export const DateFormat = {
  DATE_ONLY: 'yyyy-MM-dd',
  DATE_JP: 'yyyy年MM月dd日',
  DATE_SLASH: 'yyyy/MM/dd',
  DATETIME: 'yyyy-MM-dd HH:mm:ss',
  DATETIME_JP: 'yyyy年MM月dd日 HH:mm',
  DATETIME_SLASH: 'yyyy/MM/dd HH:mm',
  TIME_ONLY: 'HH:mm',
  TIME_SEC: 'HH:mm:ss',
} as const;

/**
 * 日付フォーマット型
 */
export type DateFormat = (typeof DateFormat)[keyof typeof DateFormat];

// ============================================================================
// ヘルパー関数
// ============================================================================

/**
 * すべての勤怠ステータス値を配列で取得
 */
export const getAllAttendanceStatuses = (): AttendanceStatus[] => {
  return Object.values(AttendanceStatus);
};

/**
 * すべての日報ステータス値を配列で取得
 */
export const getAllReportStatuses = (): ReportStatus[] => {
  return Object.values(ReportStatus);
};

/**
 * すべてのユーザーロール値を配列で取得
 */
export const getAllUserRoles = (): UserRole[] => {
  return Object.values(UserRole);
};

/**
 * 勤怠ステータスの選択肢を取得（セレクトボックス用）
 */
export const getAttendanceStatusOptions = () => {
  return getAllAttendanceStatuses().map((status) => ({
    value: status,
    label: getAttendanceStatusLabel(status),
  }));
};

/**
 * ユーザーロールの選択肢を取得（セレクトボックス用）
 */
export const getUserRoleOptions = () => {
  return getAllUserRoles().map((role) => ({
    value: role,
    label: getUserRoleLabel(role),
  }));
};
