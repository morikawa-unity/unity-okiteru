/**
 * AttendanceContainer - 勤怠報告画面のビジネスロジック
 * コンテナコンポーネント（状態管理、API呼び出し、イベント処理）
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { AttendanceRecord } from '@/types/attendance';
import { formatDate } from '@/utils/date';
import {
  AttendanceView,
  ActionType,
  ActionStatus,
} from '@/components/attendance/AttendanceView';

export const AttendanceContainer: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [hasPreviousDayReport, setHasPreviousDayReport] = useState(false);
  const [hasDailyReport, setHasDailyReport] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(ROUTES.LOGIN);
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      // TODO: 実際のAPI呼び出し
      // 今日の勤怠記録と前日報告、日報の状態を取得
      const mockRecord: AttendanceRecord = {
        id: '1',
        staffId: user.id,
        date: formatDate(new Date(), 'yyyy-MM-dd'),
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentRecord(mockRecord);
      setHasPreviousDayReport(false); // モックデータ
      setHasDailyReport(false); // モックデータ
    }
  }, [user]);

  const getActionStatuses = (): ActionStatus[] => {
    if (!currentRecord) return [];

    const previousDayCompleted = hasPreviousDayReport;
    const wakeupCompleted = !!currentRecord.wakeUpTime;
    const departureCompleted = !!currentRecord.departureTime;
    const arrivalCompleted = !!currentRecord.arrivalTime;
    const reportCompleted = hasDailyReport;

    return [
      {
        type: 'previous-day',
        label: '前日報告',
        activeLabel: '前日報告を入力',
        completed: previousDayCompleted,
        enabled: !previousDayCompleted,
        description: '翌日の予定時刻と準備状況を報告',
      },
      {
        type: 'wakeup',
        label: '起床報告',
        activeLabel: '起床報告を送信',
        completed: wakeupCompleted,
        enabled: previousDayCompleted && !wakeupCompleted,
        description: '起床時刻を報告',
      },
      {
        type: 'departure',
        label: '出発報告',
        activeLabel: '出発報告を送信',
        completed: departureCompleted,
        enabled: wakeupCompleted && !departureCompleted,
        description: '自宅を出発した時刻を報告',
      },
      {
        type: 'arrival',
        label: '到着報告',
        activeLabel: '到着報告を送信',
        completed: arrivalCompleted,
        enabled: departureCompleted && !arrivalCompleted,
        description: '現場に到着した時刻を報告',
      },
      {
        type: 'report',
        label: '日報作成',
        activeLabel: '日報を作成',
        completed: reportCompleted,
        enabled: arrivalCompleted && !reportCompleted,
        description: '本日の業務内容を報告',
      },
    ];
  };

  const handlePreviousDaySuccess = () => {
    setHasPreviousDayReport(true);
    setActiveAction(null);
  };

  const handleWakeUp = async () => {
    if (!currentRecord) return;

    setIsSubmitting(true);
    try {
      // TODO: 実際のAPI呼び出し
      const now = new Date().toISOString();
      const updatedRecord: AttendanceRecord = {
        ...currentRecord,
        wakeUpTime: now,
        status: 'partial',
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

  const handleDeparture = async () => {
    if (!currentRecord) return;

    setIsSubmitting(true);
    try {
      // TODO: 実際のAPI呼び出し
      const now = new Date().toISOString();
      const updatedRecord: AttendanceRecord = {
        ...currentRecord,
        departureTime: now,
        status: 'partial',
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

  const handleArrival = async () => {
    if (!currentRecord) return;

    setIsSubmitting(true);
    try {
      // TODO: 実際のAPI呼び出し
      const now = new Date().toISOString();
      const updatedRecord: AttendanceRecord = {
        ...currentRecord,
        arrivalTime: now,
        status: 'complete',
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

  const handleNavigateToReport = () => {
    router.push(ROUTES.DASHBOARD.REPORTS);
  };

  const handleActionClick = (action: ActionStatus) => {
    if (!action.enabled || action.completed) return;

    if (action.type === 'previous-day') {
      setActiveAction('previous-day');
    } else if (action.type === 'wakeup') {
      handleWakeUp();
    } else if (action.type === 'departure') {
      handleDeparture();
    } else if (action.type === 'arrival') {
      handleArrival();
    } else if (action.type === 'report') {
      handleNavigateToReport();
    }
  };

  const handleCancelPreviousDay = () => {
    setActiveAction(null);
  };

  const actionStatuses = getActionStatuses();

  return (
    <AttendanceView
      isLoading={isLoading}
      currentRecord={currentRecord}
      actionStatuses={actionStatuses}
      activeAction={activeAction}
      onActionClick={handleActionClick}
      onPreviousDaySuccess={handlePreviousDaySuccess}
      onCancelPreviousDay={handleCancelPreviousDay}
    />
  );
};
