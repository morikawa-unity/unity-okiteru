import React, { useState } from 'react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { usePreviousDayReportCreate } from '@/hooks/usePreviousDayReport';

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

  const createMutation = usePreviousDayReportCreate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!appearancePhoto || !routePhoto) {
      alert('写真を選択してください');
      return;
    }

    try {
      // TODO: S3へのアップロード実装
      // 現在は仮のURLを使用
      const appearancePhotoUrl = `temp://${appearancePhoto.name}`;
      const routePhotoUrl = `temp://${routePhoto.name}`;

      // 今日の日付を報告日として使用
      const today = new Date().toISOString().split('T')[0];

      // 時刻を HH:MM:SS 形式に変換（HTMLのinput[type="time"]はHH:MM形式）
      const formatTime = (time: string) => time.length === 5 ? `${time}:00` : time;

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

      // フォームをリセット
      setFormData({
        nextWakeUpTime: '',
        nextDepartureTime: '',
        nextArrivalTime: '',
        notes: '',
      });
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

        <Button type="submit" className="w-full" isLoading={createMutation.isPending}>
          前日報告を送信
        </Button>
      </form>
    </Card>
  );
};
