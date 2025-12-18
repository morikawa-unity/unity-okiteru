import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/common/Loading';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { PreviousDayForm } from '@/components/attendance/PreviousDayForm';
import { ROUTES } from '@/lib/constants';
import { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import { formatDate } from '@/utils/date';

type ActionType = 'previous-day' | 'wakeup' | 'departure' | 'arrival' | 'report';

interface ActionStatus {
  type: ActionType;
  label: string;
  activeLabel: string;
  completed: boolean;
  enabled: boolean;
  description: string;
}

export default function AttendancePage() {
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

  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (!user) {
    return null;
  }

  const actionStatuses = getActionStatuses();
  const nextAction = actionStatuses.find((a) => !a.completed && a.enabled);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">勤怠報告</h1>

      {/* 次のアクションの推奨表示 */}
      {nextAction && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-blue-600 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="text-sm font-semibold text-blue-900">次のアクション</p>
              <p className="text-sm text-blue-700">
                {nextAction.label}: {nextAction.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 前日報告フォーム */}
      {activeAction === 'previous-day' && (
        <div className="mb-6">
          <PreviousDayForm onSuccess={handlePreviousDaySuccess} />
          <Button
            variant="outline"
            onClick={() => setActiveAction(null)}
            className="w-full mt-3"
          >
            キャンセル
          </Button>
        </div>
      )}

      {/* 本日の勤怠状況 */}
      <Card title="本日の勤怠状況" className="mb-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">日付</span>
            <span className="font-semibold">{formatDate(new Date())}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-700">全体の進捗</span>
            <div className="flex items-center space-x-2">
              <div className="w-40 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      (actionStatuses.filter((a) => a.completed).length / actionStatuses.length) *
                      100
                    }%`,
                  }}
                />
              </div>
              <span className="text-sm text-gray-600">
                {actionStatuses.filter((a) => a.completed).length}/{actionStatuses.length}
              </span>
            </div>
          </div>

          {currentRecord?.wakeUpTime && (
            <div className="flex items-center justify-between">
              <span className="text-gray-700">起床時刻</span>
              <span className="font-semibold">{formatDate(currentRecord.wakeUpTime, 'HH:mm')}</span>
            </div>
          )}

          {currentRecord?.departureTime && (
            <div className="flex items-center justify-between">
              <span className="text-gray-700">出発時刻</span>
              <span className="font-semibold">
                {formatDate(currentRecord.departureTime, 'HH:mm')}
              </span>
            </div>
          )}

          {currentRecord?.arrivalTime && (
            <div className="flex items-center justify-between">
              <span className="text-gray-700">到着時刻</span>
              <span className="font-semibold">{formatDate(currentRecord.arrivalTime, 'HH:mm')}</span>
            </div>
          )}
        </div>
      </Card>

      {/* アクション一覧 */}
      <Card title="報告アクション">
        <div className="space-y-3">
          {actionStatuses.map((action) => (
            <div
              key={action.type}
              className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                action.completed
                  ? 'border-green-300 bg-green-50'
                  : action.enabled
                  ? 'border-primary-300 bg-primary-50 cursor-pointer hover:border-primary-400'
                  : 'border-gray-200 bg-gray-50'
              }`}
              onClick={() => handleActionClick(action)}
            >
              <div className="flex items-center space-x-3">
                {action.completed ? (
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : action.enabled ? (
                  <svg
                    className="w-6 h-6 text-primary-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                <div>
                  <p
                    className={`font-semibold ${
                      action.completed
                        ? 'text-green-800'
                        : action.enabled
                        ? 'text-primary-800'
                        : 'text-gray-500'
                    }`}
                  >
                    {action.label}
                  </p>
                  <p
                    className={`text-sm ${
                      action.completed
                        ? 'text-green-600'
                        : action.enabled
                        ? 'text-primary-600'
                        : 'text-gray-400'
                    }`}
                  >
                    {action.description}
                  </p>
                </div>
              </div>
              <div>
                {action.completed && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                    完了
                  </span>
                )}
                {!action.completed && action.enabled && (
                  <span className="px-3 py-1 bg-primary-100 text-primary-800 text-xs font-semibold rounded-full">
                    実行可能
                  </span>
                )}
                {!action.completed && !action.enabled && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">
                    待機中
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {actionStatuses.every((a) => a.completed) && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-center text-green-800 font-semibold">
              本日の勤怠報告は全て完了しています！お疲れ様でした。
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
