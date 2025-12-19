/**
 * ShiftsView - 出社可能日管理画面UI
 * プレゼンテーショナルコンポーネント（UIのみ、ロジックなし）
 */
import React from 'react';
import { Loading } from '@/components/common/Loading';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { formatDate } from '@/utils/date';

export interface Worksite {
  id: string;
  name: string;
}

export interface Availability {
  id: string;
  date: string;
  worksite: Worksite | null;
  notes: string;
}

export interface ShiftsViewProps {
  isLoading: boolean;
  showForm: boolean;
  selectedDate: string;
  selectedWorksite: string;
  notes: string;
  isSubmitting: boolean;
  availabilities: Availability[];
  worksites: Worksite[];
  onToggleForm: () => void;
  onDateChange: (date: string) => void;
  onWorksiteChange: (worksiteId: string) => void;
  onNotesChange: (notes: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const ShiftsView: React.FC<ShiftsViewProps> = ({
  isLoading,
  showForm,
  selectedDate,
  selectedWorksite,
  notes,
  isSubmitting,
  availabilities,
  worksites,
  onToggleForm,
  onDateChange,
  onWorksiteChange,
  onNotesChange,
  onSubmit,
  onCancel,
}) => {
  if (isLoading) {
    return <Loading fullScreen />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">出社可能日管理</h1>
        <Button onClick={onToggleForm}>{showForm ? 'キャンセル' : '新規登録'}</Button>
      </div>

      {/* 出社可能日登録フォーム */}
      {showForm && (
        <Card title="出社可能日登録" className="mb-6">
          <form onSubmit={onSubmit} className="space-y-4">
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
                勤務予定現場
              </label>
              <select
                value={selectedWorksite}
                onChange={(e) => onWorksiteChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">選択してください</option>
                {worksites.map((worksite) => (
                  <option key={worksite.id} value={worksite.id}>
                    {worksite.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">備考・メモ</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="特記事項があれば記入してください"
              />
            </div>

            <div className="flex space-x-3">
              <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                キャンセル
              </Button>
              <Button type="submit" className="flex-1" isLoading={isSubmitting}>
                登録
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 出社可能日一覧 */}
      <Card title="登録済み出社可能日">
        <div className="space-y-3">
          {availabilities.length === 0 ? (
            <p className="text-center text-gray-500 py-8">出社可能日が登録されていません</p>
          ) : (
            availabilities.map((availability) => (
              <div
                key={availability.id}
                className="flex justify-between items-center border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-semibold text-gray-900">
                      {formatDate(availability.date)}
                    </span>
                    {availability.worksite && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {availability.worksite.name}
                      </span>
                    )}
                  </div>
                  {availability.notes && (
                    <p className="text-sm text-gray-600 mt-1">{availability.notes}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    編集
                  </Button>
                  <Button variant="danger" size="sm">
                    削除
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
