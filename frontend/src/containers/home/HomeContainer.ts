/**
 * HomeContainer - ホーム画面のビジネスロジック
 * 勤怠報告・出社可能日・日報管理のロジックを統合
 */
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { formatDate } from '@/utils/date';
import { ActionType, AttendanceStatus, ReportStatus, HomeTab } from '@/lib/enums';
import { HomeView } from '@/components/home/HomeView';
import type {
  ActionStatus,
  AttendanceRecord,
  Availability,
  Worksite,
  Report,
} from '@/types/home';

export const HomeContainer: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // タブ管理
  const [activeTab, setActiveTab] = useState<HomeTab>(HomeTab.ATTENDANCE);

  // 勤怠報告の状態
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [hasPreviousDayReport, setHasPreviousDayReport] = useState(false);
  const [hasDailyReport, setHasDailyReport] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);

  // 出社可能日の状態
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedWorksite, setSelectedWorksite] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');
  const [isSubmittingShift, setIsSubmittingShift] = useState(false);
  const [availabilities] = useState<Availability[]>([
    {
      id: '1',
      date: '2025-12-19',
      worksite: { id: '1', name: '渋谷現場' },
      notes: '通常勤務',
    },
    {
      id: '2',
      date: '2025-12-20',
      worksite: { id: '2', name: '新宿現場' },
      notes: '',
    },
  ]);
  const [worksites] = useState<Worksite[]>([
    { id: '1', name: '渋谷現場' },
    { id: '2', name: '新宿現場' },
    { id: '3', name: '池袋現場' },
  ]);

  // 日報の状態
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reports] = useState<Report[]>([
    {
      id: '1',
      date: '2025-12-17',
      content: '渋谷現場での作業を実施。配線工事を完了しました。',
      status: ReportStatus.SUBMITTED,
      submittedAt: '2025-12-17T18:30:00Z',
    },
    {
      id: '2',
      date: '2025-12-16',
      content: '新宿現場の点検業務を実施。異常なし。',
      status: ReportStatus.SUBMITTED,
      submittedAt: '2025-12-16T17:00:00Z',
    },
  ]);

  // 認証チェック
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(ROUTES.LOGIN);
    }
  }, [isLoading, isAuthenticated, router]);

  // 勤怠記録の初期化
  useEffect(() => {
    if (user) {
      const mockRecord: AttendanceRecord = {
        id: '1',
        staffId: user.id,
        date: formatDate(new Date(), 'yyyy-MM-dd'),
        status: AttendanceStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentRecord(mockRecord);
      setHasPreviousDayReport(false);
      setHasDailyReport(false);
    }
  }, [user]);

  // 勤怠報告: アクションステータスの取得
  const getActionStatuses = (): ActionStatus[] => {
    if (!currentRecord) return [];

    const previousDayCompleted = hasPreviousDayReport;
    const wakeupCompleted = !!currentRecord.wakeUpTime;
    const departureCompleted = !!currentRecord.departureTime;
    const arrivalCompleted = !!currentRecord.arrivalTime;
    const reportCompleted = hasDailyReport;

    return [
      {
        type: ActionType.PREVIOUS_DAY,
        label: '前日報告',
        activeLabel: '前日報告を入力',
        completed: previousDayCompleted,
        enabled: !previousDayCompleted,
        description: '翌日の予定時刻と準備状況を報告',
      },
      {
        type: ActionType.WAKEUP,
        label: '起床報告',
        activeLabel: '起床報告を送信',
        completed: wakeupCompleted,
        enabled: previousDayCompleted && !wakeupCompleted,
        description: '起床時刻を報告',
      },
      {
        type: ActionType.DEPARTURE,
        label: '出発報告',
        activeLabel: '出発報告を送信',
        completed: departureCompleted,
        enabled: wakeupCompleted && !departureCompleted,
        description: '自宅を出発した時刻を報告',
      },
      {
        type: ActionType.ARRIVAL,
        label: '到着報告',
        activeLabel: '到着報告を送信',
        completed: arrivalCompleted,
        enabled: departureCompleted && !arrivalCompleted,
        description: '現場に到着した時刻を報告',
      },
      {
        type: ActionType.REPORT,
        label: '日報作成',
        activeLabel: '日報を作成',
        completed: reportCompleted,
        enabled: arrivalCompleted && !reportCompleted,
        description: '本日の業務内容を報告',
      },
    ];
  };

  // 勤怠報告: 前日報告成功時の処理
  const handlePreviousDaySuccess = () => {
    setHasPreviousDayReport(true);
    setActiveAction(null);
  };

  // 勤怠報告: 起床報告
  const handleWakeUp = async () => {
    if (!currentRecord) return;

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const updatedRecord: AttendanceRecord = {
        ...currentRecord,
        wakeUpTime: now,
        status: AttendanceStatus.PARTIAL,
      };

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setCurrentRecord(updatedRecord);
      setActiveAction(null);
      alert('起床報告を送信しました！');
    } catch (error) {
      console.error('起床報告エラー:', error);
      alert('起床報告の送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 勤怠報告: 出発報告
  const handleDeparture = async () => {
    if (!currentRecord) return;

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const updatedRecord: AttendanceRecord = {
        ...currentRecord,
        departureTime: now,
        status: AttendanceStatus.PARTIAL,
      };

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setCurrentRecord(updatedRecord);
      setActiveAction(null);
      alert('出発報告を送信しました！');
    } catch (error) {
      console.error('出発報告エラー:', error);
      alert('出発報告の送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 勤怠報告: 到着報告
  const handleArrival = async () => {
    if (!currentRecord) return;

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const updatedRecord: AttendanceRecord = {
        ...currentRecord,
        arrivalTime: now,
        status: AttendanceStatus.COMPLETE,
      };

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setCurrentRecord(updatedRecord);
      setActiveAction(null);
      alert('到着報告を送信しました！');
    } catch (error) {
      console.error('到着報告エラー:', error);
      alert('到着報告の送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 勤怠報告: 日報作成へ遷移
  const handleNavigateToReport = () => {
    setActiveTab(HomeTab.REPORTS);
    setShowReportForm(true);
  };

  // 勤怠報告: アクションクリック
  const handleActionClick = (action: ActionStatus) => {
    if (!action.enabled || action.completed) return;

    if (action.type === ActionType.PREVIOUS_DAY) {
      setActiveAction(ActionType.PREVIOUS_DAY);
    } else if (action.type === ActionType.WAKEUP) {
      handleWakeUp();
    } else if (action.type === ActionType.DEPARTURE) {
      handleDeparture();
    } else if (action.type === ActionType.ARRIVAL) {
      handleArrival();
    } else if (action.type === ActionType.REPORT) {
      handleNavigateToReport();
    }
  };

  // 勤怠報告: 前日報告キャンセル
  const handleCancelPreviousDay = () => {
    setActiveAction(null);
  };

  // 出社可能日: フォーム送信
  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingShift(true);

    try {
      console.log('出社可能日:', { selectedDate, selectedWorksite, shiftNotes });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      alert('出社可能日を登録しました！');
      setSelectedDate('');
      setSelectedWorksite('');
      setShiftNotes('');
      setShowShiftForm(false);
    } catch (error) {
      console.error('出社可能日登録エラー:', error);
      alert('出社可能日の登録に失敗しました');
    } finally {
      setIsSubmittingShift(false);
    }
  };

  // 出社可能日: キャンセル
  const handleShiftCancel = () => {
    setShowShiftForm(false);
    setSelectedDate('');
    setSelectedWorksite('');
    setShiftNotes('');
  };

  // 日報: フォーム送信
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReport(true);

    try {
      console.log('日報内容:', reportContent);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      alert('日報を提出しました！');
      setReportContent('');
      setShowReportForm(false);
    } catch (error) {
      console.error('日報提出エラー:', error);
      alert('日報の提出に失敗しました');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // 日報: キャンセル
  const handleReportCancel = () => {
    setShowReportForm(false);
    setReportContent('');
  };

  const actionStatuses = getActionStatuses();

  return React.createElement(HomeView, {
    isLoading,
    activeTab,
    onTabChange: setActiveTab,
    currentRecord,
    actionStatuses,
    activeAction,
    onActionClick: handleActionClick,
    onPreviousDaySuccess: handlePreviousDaySuccess,
    onCancelPreviousDay: handleCancelPreviousDay,
    showShiftForm,
    selectedDate,
    selectedWorksite,
    shiftNotes,
    isSubmittingShift,
    availabilities,
    worksites,
    onToggleShiftForm: () => setShowShiftForm(!showShiftForm),
    onDateChange: setSelectedDate,
    onWorksiteChange: setSelectedWorksite,
    onShiftNotesChange: setShiftNotes,
    onShiftSubmit: handleShiftSubmit,
    onShiftCancel: handleShiftCancel,
    showReportForm,
    reportContent,
    isSubmittingReport,
    reports,
    onToggleReportForm: () => setShowReportForm(!showReportForm),
    onReportContentChange: setReportContent,
    onReportSubmit: handleReportSubmit,
    onReportCancel: handleReportCancel,
  });
};
