/**
 * HomeView - ホーム画面UI
 * 勤怠報告・出社可能日・日報管理を1つの画面で管理
 */
import React, { useState } from 'react';
import { Loading } from '@/components/common/Loading';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { formatDate } from '@/utils/date';
import { ActionType, ReportStatus, HomeTab } from '@/lib/enums';
import { usePreviousDayReportCreate } from '@/hooks/usePreviousDayReport';
import type { HomeViewProps, ActionStatus, AttendanceRecord } from '@/types/home';

// Re-export types for convenience
export type { HomeViewProps, ActionStatus };

// PreviousDayForm コンポーネント
interface PreviousDayFormProps {
  onSuccess?: () => void;
}

const PreviousDayForm: React.FC<PreviousDayFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    nextWakeUpTime: '',
    nextDepartureTime: '',
    nextArrivalTime: '',
    notes: '',
  });
  const [appearancePhoto, setAppearancePhoto] = useState<File | null>(null);
  const [routePhoto, setRoutePhoto] = useState<File | null>(null);

  const createMutation = usePreviousDayReportCreate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!appearancePhoto || !routePhoto) {
      alert('写真を選択してください');
      return;
    }

    try {
      const appearancePhotoUrl = `temp://${appearancePhoto.name}`;
      const routePhotoUrl = `temp://${routePhoto.name}`;
      const today = new Date().toISOString().split('T')[0];
      const formatTime = (time: string) => (time.length === 5 ? `${time}:00` : time);

      await createMutation.mutateAsync({
        reportDate: today,
        nextWakeUpTime: formatTime(formData.nextWakeUpTime),
        nextDepartureTime: formatTime(formData.nextDepartureTime),
        nextArrivalTime: formatTime(formData.nextArrivalTime),
        appearancePhotoUrl,
        routePhotoUrl,
        notes: formData.notes || undefined,
      });

      alert('前日報告を送信しました！');
      setFormData({ nextWakeUpTime: '', nextDepartureTime: '', nextArrivalTime: '', notes: '' });
      setAppearancePhoto(null);
      setRoutePhoto(null);
      onSuccess?.();
    } catch (error) {
      console.error('前日報告エラー:', error);
      alert('前日報告の送信に失敗しました');
    }
  };

  return (
    <Card title="前日報告">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-800">翌日の予定時刻と準備状況を報告してください。</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            翌日の予定起床時刻 <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            required
            value={formData.nextWakeUpTime}
            onChange={(e) => setFormData({ ...formData, nextWakeUpTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            翌日の予定出発時刻 <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            required
            value={formData.nextDepartureTime}
            onChange={(e) => setFormData({ ...formData, nextDepartureTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            翌日の予定到着時刻 <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            required
            value={formData.nextArrivalTime}
            onChange={(e) => setFormData({ ...formData, nextArrivalTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            身だしなみ写真 <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) => setAppearancePhoto(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {appearancePhoto && <p className="mt-2 text-sm text-gray-600">選択: {appearancePhoto.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            経路スクリーンショット <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) => setRoutePhoto(e.target.files?.[0] || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {routePhoto && <p className="mt-2 text-sm text-gray-600">選択: {routePhoto.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="特記事項があれば記入してください"
          />
        </div>

        <Button type="submit" className="w-full" isLoading={createMutation.isPending}>
          前日報告を送信
        </Button>
      </form>
    </Card>
  );
};

// メインコンポーネント
export const HomeView: React.FC<HomeViewProps> = (props) => {
  const {
    isLoading,
    activeTab,
    onTabChange,
    currentRecord,
    actionStatuses,
    activeAction,
    onActionClick,
    onPreviousDaySuccess,
    onCancelPreviousDay,
    showShiftForm,
    selectedDate,
    selectedWorksite,
    shiftNotes,
    isSubmittingShift,
    availabilities,
    worksites,
    onToggleShiftForm,
    onDateChange,
    onWorksiteChange,
    onShiftNotesChange,
    onShiftSubmit,
    onShiftCancel,
    showReportForm,
    reportContent,
    isSubmittingReport,
    reports,
    onToggleReportForm,
    onReportContentChange,
    onReportSubmit,
    onReportCancel,
  } = props;

  if (isLoading) {
    return <Loading fullScreen />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">ホーム</h1>

      {/* タブナビゲーション */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => onTabChange(HomeTab.ATTENDANCE)}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === HomeTab.ATTENDANCE
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            勤怠報告
          </button>
          <button
            onClick={() => onTabChange(HomeTab.SHIFTS)}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === HomeTab.SHIFTS
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            出社可能日
          </button>
          <button
            onClick={() => onTabChange(HomeTab.REPORTS)}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === HomeTab.REPORTS
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            日報管理
          </button>
        </nav>
      </div>

      {/* 勤怠報告タブ */}
      {activeTab === HomeTab.ATTENDANCE && currentRecord && (
        <>
          {/* 次のアクションの推奨表示 */}
          {(() => {
            const nextAction = actionStatuses.find((a) => !a.completed && a.enabled);
            return (
              nextAction && (
                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
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
              )
            );
          })()}

          {/* 前日報告フォーム */}
          {activeAction === ActionType.PREVIOUS_DAY && (
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
                      style={{
                        width: `${
                          (actionStatuses.filter((a) => a.completed).length / actionStatuses.length) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">
                    {actionStatuses.filter((a) => a.completed).length}/{actionStatuses.length}
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
                  <span className="font-semibold">{formatDate(currentRecord.departureTime, 'HH:mm')}</span>
                </div>
              )}

              {currentRecord.arrivalTime && (
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

            {actionStatuses.every((a) => a.completed) && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-center text-green-800 font-semibold">
                  本日の勤怠報告は全て完了しています！お疲れ様でした。
                </p>
              </div>
            )}
          </Card>
        </>
      )}

      {/* 出社可能日タブ */}
      {activeTab === HomeTab.SHIFTS && (
        <>
          <div className="mb-6">
            <Button onClick={onToggleShiftForm} className="w-full">
              {showShiftForm ? '登録をキャンセル' : '新しい出社可能日を登録'}
            </Button>
          </div>

          {showShiftForm && (
            <Card title="出社可能日登録" className="mb-6">
              <form onSubmit={onShiftSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    日付 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => onDateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    現場 <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedWorksite}
                    onChange={(e) => onWorksiteChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">選択してください</option>
                    {worksites.map((ws) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
                  <textarea
                    rows={3}
                    value={shiftNotes}
                    onChange={(e) => onShiftNotesChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="備考があれば記入してください"
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" className="flex-1" isLoading={isSubmittingShift}>
                    登録
                  </Button>
                  <Button type="button" variant="outline" onClick={onShiftCancel} className="flex-1">
                    キャンセル
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card title="出社可能日一覧">
            <div className="space-y-4">
              {availabilities.length === 0 ? (
                <p className="text-center text-gray-500 py-8">登録された出社可能日はありません</p>
              ) : (
                availabilities.map((availability) => (
                  <div key={availability.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold">{availability.date}</span>
                      <span className="px-3 py-1 bg-primary-100 text-primary-800 text-sm font-medium rounded-full">
                        {availability.worksite.name}
                      </span>
                    </div>
                    {availability.notes && (
                      <p className="text-sm text-gray-600 mt-2">備考: {availability.notes}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}

      {/* 日報管理タブ */}
      {activeTab === HomeTab.REPORTS && (
        <>
          <div className="mb-6">
            <Button onClick={onToggleReportForm} className="w-full">
              {showReportForm ? '作成をキャンセル' : '新しい日報を作成'}
            </Button>
          </div>

          {showReportForm && (
            <Card title="日報作成" className="mb-6">
              <form onSubmit={onReportSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    日報内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={8}
                    required
                    value={reportContent}
                    onChange={(e) => onReportContentChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="本日の業務内容を記入してください"
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" className="flex-1" isLoading={isSubmittingReport}>
                    提出
                  </Button>
                  <Button type="button" variant="outline" onClick={onReportCancel} className="flex-1">
                    キャンセル
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <Card title="日報履歴">
            <div className="space-y-4">
              {reports.length === 0 ? (
                <p className="text-center text-gray-500 py-8">提出された日報はありません</p>
              ) : (
                reports.map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-semibold">{report.date}</span>
                      <span
                        className={`px-3 py-1 text-sm font-medium rounded-full ${
                          report.status === ReportStatus.SUBMITTED
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {report.status === ReportStatus.SUBMITTED ? '提出済み' : '下書き'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.content}</p>
                    {report.submittedAt && (
                      <p className="text-xs text-gray-500 mt-2">提出日時: {formatDate(report.submittedAt)}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
