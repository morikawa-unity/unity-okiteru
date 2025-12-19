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
 * スタッフの1日の勤怠情報（起床・出発・到着時刻など）を管理
 */
export interface AttendanceRecord {
  /** 勤怠記録ID */
  id: string;
  /** スタッフID */
  staffId: string;
  /** 勤怠日（YYYY-MM-DD形式） */
  date: string;
  /** 起床時刻（ISO文字列） */
  wakeUpTime?: string;
  /** 起床場所 */
  wakeUpLocation?: string;
  /** 起床時の備考 */
  wakeUpNotes?: string;
  /** 出発時刻（ISO文字列） */
  departureTime?: string;
  /** 出発場所 */
  departureLocation?: string;
  /** 出発時の備考 */
  departureNotes?: string;
  /** 目的地 */
  destination?: string;
  /** 到着時刻（ISO文字列） */
  arrivalTime?: string;
  /** 到着場所 */
  arrivalLocation?: string;
  /** 到着時のGPS位置情報 */
  arrivalGpsLocation?: string;
  /** 到着時の備考 */
  arrivalNotes?: string;
  /** 経路写真のURL */
  routePhotoUrl?: string;
  /** 身だしなみ写真のURL */
  appearancePhotoUrl?: string;
  /** 勤怠ステータス */
  status: AttendanceStatus;
  /** 全般的な備考 */
  notes?: string;
  /** 作成日時（ISO文字列） */
  createdAt: string;
  /** 更新日時（ISO文字列） */
  updatedAt: string;
}

/**
 * アクションステータス（勤怠報告の各ステップ）
 * 前日報告→起床報告→出発報告→到着報告→日報作成の進捗状態を管理
 */
export interface ActionStatus {
  /** アクションの種類（前日報告・起床報告など） */
  type: ActionType;
  /** 表示用ラベル（例：「前日報告」） */
  label: string;
  /** アクティブ時のラベル（例：「前日報告を入力」） */
  activeLabel: string;
  /** 完了済みかどうか */
  completed: boolean;
  /** 実行可能かどうか */
  enabled: boolean;
  /** アクションの説明文 */
  description: string;
}

/**
 * 前日報告
 * 翌日の予定時刻と身だしなみ写真・経路スクリーンショットを含む事前報告
 */
export interface PreviousDayReport {
  /** 前日報告ID */
  id: string;
  /** ユーザーID */
  userId: string;
  /** 報告対象日（YYYY-MM-DD形式） */
  reportDate: string;
  /** 翌日の予定起床時刻（HH:mm:ss形式） */
  nextWakeUpTime: string;
  /** 翌日の予定出発時刻（HH:mm:ss形式） */
  nextDepartureTime: string;
  /** 翌日の予定到着時刻（HH:mm:ss形式） */
  nextArrivalTime: string;
  /** 身だしなみ写真のURL */
  appearancePhotoUrl: string;
  /** 経路スクリーンショットのURL */
  routePhotoUrl: string;
  /** 備考・特記事項 */
  notes?: string;
  /** 実際の勤怠記録ID（関連付け用） */
  actualAttendanceRecordId?: string;
  /** 作成日時（ISO文字列） */
  createdAt: string;
  /** 更新日時（ISO文字列） */
  updatedAt: string;
}

/**
 * 前日報告フォームデータ（API送信用）
 * サーバーに送信する完全な前日報告データ（写真URLを含む）
 */
export interface PreviousDayReportFormData {
  /** 報告対象日（YYYY-MM-DD形式） */
  reportDate: string;
  /** 翌日の予定起床時刻（HH:mm:ss形式） */
  nextWakeUpTime: string;
  /** 翌日の予定出発時刻（HH:mm:ss形式） */
  nextDepartureTime: string;
  /** 翌日の予定到着時刻（HH:mm:ss形式） */
  nextArrivalTime: string;
  /** 身だしなみ写真のURL */
  appearancePhotoUrl: string;
  /** 経路スクリーンショットのURL */
  routePhotoUrl: string;
  /** 備考・特記事項 */
  notes?: string;
}

/**
 * 前日報告フォーム入力データ（UI用）
 * フォーム入力で使用する時刻と備考のみのシンプルなデータ
 */
export interface PreviousDayFormData {
  /** 翌日の予定起床時刻（HH:mm形式） */
  nextWakeUpTime: string;
  /** 翌日の予定出発時刻（HH:mm形式） */
  nextDepartureTime: string;
  /** 翌日の予定到着時刻（HH:mm形式） */
  nextArrivalTime: string;
  /** 備考・特記事項 */
  notes: string;
}

// ========================================
// 出社可能日関連
// ========================================

/**
 * 現場情報
 * 作業現場の基本情報（名称・住所・説明）
 */
export interface Worksite {
  /** 現場ID */
  id: string;
  /** 現場名 */
  name: string;
  /** 現場住所 */
  address?: string;
  /** 現場の説明・詳細 */
  description?: string;
}

/**
 * 出社可能日
 * スタッフが出社可能な日付と現場の組み合わせ
 */
export interface Availability {
  /** 出社可能日ID */
  id: string;
  /** 出社可能日（YYYY-MM-DD形式） */
  date: string;
  /** 出社予定の現場情報 */
  worksite: Worksite;
  /** 備考・特記事項 */
  notes?: string;
}

/**
 * 出社可能日フォームデータ
 * 新しい出社可能日を登録する際のフォーム入力データ
 */
export interface AvailabilityFormData {
  /** 出社可能日（YYYY-MM-DD形式） */
  date: string;
  /** 現場ID */
  worksiteId: string;
  /** 備考・特記事項 */
  notes?: string;
}

// ========================================
// 日報関連
// ========================================

/**
 * 日報
 * 1日の業務内容を記録する報告書
 */
export interface Report {
  /** 日報ID */
  id: string;
  /** 日報対象日（YYYY-MM-DD形式） */
  date: string;
  /** 日報内容・業務報告 */
  content: string;
  /** 日報のステータス（提出済み・下書きなど） */
  status: ReportStatus;
  /** 提出日時（ISO文字列） */
  submittedAt?: string;
}

/**
 * 日報フォームデータ
 * 日報作成フォームで入力する業務内容データ
 */
export interface ReportFormData {
  /** 日報内容・業務報告 */
  content: string;
}

// ========================================
// ビューコンポーネントProps
// ========================================

/**
 * ホーム画面ビューのProps
 * HomeViewコンポーネントに渡すすべてのプロパティ（状態・イベントハンドラー）
 */
export interface HomeViewProps {
  // ========================================
  // 共通プロパティ
  // ========================================
  /** ローディング状態 */
  isLoading: boolean;
  /** 現在アクティブなタブ */
  activeTab: HomeTab;
  /** タブ変更時のコールバック */
  onTabChange: (tab: HomeTab) => void;

  // ========================================
  // 勤怠報告関連
  // ========================================
  /** 現在の勤怠記録 */
  currentRecord: AttendanceRecord | null;
  /** アクションステータス一覧 */
  actionStatuses: ActionStatus[];
  /** 現在アクティブなアクション */
  activeAction: ActionType | null;
  /** アクションクリック時のコールバック */
  onActionClick: (action: ActionStatus) => void;
  /** 前日報告送信時のコールバック */
  onPreviousDaySubmit: (e: React.FormEvent) => void;
  /** 前日報告キャンセル時のコールバック */
  onCancelPreviousDay: () => void;

  // ========================================
  // 前日報告フォーム関連
  // ========================================
  /** 前日報告フォームデータ */
  previousDayFormData: PreviousDayFormData;
  /** 前日報告フォーム変更時のコールバック */
  onPreviousDayFormChange: (field: keyof PreviousDayFormData, value: string) => void;
  /** 身だしなみ写真ファイル */
  appearancePhoto: File | null;
  /** 身だしなみ写真変更時のコールバック */
  onAppearancePhotoChange: (file: File | null) => void;
  /** 経路写真ファイル */
  routePhoto: File | null;
  /** 経路写真変更時のコールバック */
  onRoutePhotoChange: (file: File | null) => void;
  /** 前日報告送信中かどうか */
  isPreviousDaySubmitting: boolean;

  // ========================================
  // 出社可能日関連
  // ========================================
  /** 出社可能日フォームの表示状態 */
  showShiftForm: boolean;
  /** 選択された日付 */
  selectedDate: string;
  /** 選択された現場ID */
  selectedWorksite: string;
  /** 出社可能日の備考 */
  shiftNotes: string;
  /** 出社可能日送信中かどうか */
  isSubmittingShift: boolean;
  /** 出社可能日一覧 */
  availabilities: Availability[];
  /** 現場一覧 */
  worksites: Worksite[];
  /** 出社可能日フォーム表示切り替えのコールバック */
  onToggleShiftForm: () => void;
  /** 日付変更時のコールバック */
  onDateChange: (date: string) => void;
  /** 現場変更時のコールバック */
  onWorksiteChange: (worksiteId: string) => void;
  /** 備考変更時のコールバック */
  onShiftNotesChange: (notes: string) => void;
  /** 出社可能日送信時のコールバック */
  onShiftSubmit: (e: React.FormEvent) => void;
  /** 出社可能日キャンセル時のコールバック */
  onShiftCancel: () => void;

  // ========================================
  // 日報関連
  // ========================================
  /** 日報フォームの表示状態 */
  showReportForm: boolean;
  /** 日報内容 */
  reportContent: string;
  /** 日報送信中かどうか */
  isSubmittingReport: boolean;
  /** 日報一覧 */
  reports: Report[];
  /** 日報フォーム表示切り替えのコールバック */
  onToggleReportForm: () => void;
  /** 日報内容変更時のコールバック */
  onReportContentChange: (content: string) => void;
  /** 日報送信時のコールバック */
  onReportSubmit: (e: React.FormEvent) => void;
  /** 日報キャンセル時のコールバック */
  onReportCancel: () => void;
}
