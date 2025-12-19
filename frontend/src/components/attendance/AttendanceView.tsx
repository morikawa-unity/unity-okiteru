/**
 * AttendanceView - 勤怠報告画面UI
 * プレゼンテーショナルコンポーネント（UIのみ、ロジックなし）
 */
import React from 'react';
import { Loading } from '@/components/common/Loading';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { PreviousDayForm } from '@/components/attendance/PreviousDayForm';
import { AttendanceRecord } from '@/types/attendance';
import { formatDate } from '@/utils/date';

export type ActionType = 'previous-day' | 'wakeup' | 'departure' | 'arrival' | 'report';

export interface ActionStatus {
  type: ActionType;
  label: string;
  activeLabel: string;
  completed: boolean;
  enabled: boolean;
  description: string;
}

export interface AttendanceViewProps {
  isLoading: boolean;
  currentRecord: AttendanceRecord | null;
  actionStatuses: ActionStatus[];
  activeAction: ActionType | null;
  onActionClick: (action: ActionStatus) => void;
  onPreviousDaySuccess: () => void;
  onCancelPreviousDay: () => void;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  isLoading,
  currentRecord,
  actionStatuses,
  activeAction,
  onActionClick,
  onPreviousDaySuccess,
  onCancelPreviousDay,
}) => {
  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (!currentRecord) {
    return null;
  }

  const nextAction = actionStatuses.find((a) => !a.completed && a.enabled);
  const completedCount = actionStatuses.filter((a) => a.completed).length;
  const totalCount = actionStatuses.length;
  const progressPercentage = (completedCount / totalCount) * 100;
  const allCompleted = actionStatuses.every((a) => a.completed);

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
          <PreviousDayForm onSuccess={onPreviousDaySuccess} />
          <Button variant="outline" onClick={onCancelPreviousDay} className="w-full mt-3">
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
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">
                {completedCount}/{totalCount}
              </span>
            </div>
          </div>

          {currentRecord.wakeUpTime && (
            <div className="flex items-center justify-between">
              <span className="text-gray-700">起床時刻</span>
              <span className="font-semibold">{formatDate(currentRecord.wakeUpTime, 'HH:mm')}</span>
            </div>
          )}

          {currentRecord.departureTime && (
            <div className="flex items-center justify-between">
              <span className="text-gray-700">出発時刻</span>
              <span className="font-semibold">
                {formatDate(currentRecord.departureTime, 'HH:mm')}
              </span>
            </div>
          )}

          {currentRecord.arrivalTime && (
            <div className="flex items-center justify-between">
              <span className="text-gray-700">到着時刻</span>
              <span className="font-semibold">
                {formatDate(currentRecord.arrivalTime, 'HH:mm')}
              </span>
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
              onClick={() => onActionClick(action)}
            >
              <div className="flex items-center space-x-3">
                {action.completed ? (
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
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

        {allCompleted && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-center text-green-800 font-semibold">
              本日の勤怠報告は全て完了しています！お疲れ様でした。
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};
