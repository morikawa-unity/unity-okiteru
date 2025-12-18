import React, { useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';

interface PreviousDayFormProps {
  onSuccess?: () => void;
}

export const PreviousDayForm: React.FC<PreviousDayFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    nextWakeUpTime: '',
    nextDepartureTime: '',
    nextArrivalTime: '',
    notes: '',
  });
  const [appearancePhoto, setAppearancePhoto] = useState<File | null>(null);
  const [routePhoto, setRoutePhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: 実際のAPI呼び出し
      console.log('前日報告データ:', formData);
      console.log('身だしなみ写真:', appearancePhoto);
      console.log('経路写真:', routePhoto);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      alert('前日報告を送信しました！');
      onSuccess?.();
    } catch (error) {
      console.error('前日報告エラー:', error);
      alert('前日報告の送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card title="前日報告">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-800">
            翌日の予定時刻と準備状況を報告してください。
          </p>
        </div>

        {/* 翌日の予定起床時刻 */}
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

        {/* 翌日の予定出発時刻 */}
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

        {/* 翌日の予定到着時刻 */}
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

        {/* 身だしなみ写真 */}
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
          {appearancePhoto && (
            <p className="mt-2 text-sm text-gray-600">選択: {appearancePhoto.name}</p>
          )}
        </div>

        {/* 経路スクリーンショット */}
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

        {/* 備考 */}
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

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          前日報告を送信
        </Button>
      </form>
    </Card>
  );
};
