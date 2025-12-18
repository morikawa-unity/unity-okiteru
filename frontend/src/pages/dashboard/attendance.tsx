import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/common/Loading';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { ROUTES } from '@/lib/constants';
import { getCurrentDateTime } from '@/utils/date';

export default function AttendancePage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(ROUTES.LOGIN);
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">勤怠報告</h1>

      <div className="space-y-6">
        {/* 起床報告 */}
        <Card title="起床報告">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                起床時刻
              </label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                defaultValue={getCurrentDateTime().slice(0, 16)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                起床場所
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="例: 自宅"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備考（健康状態等）
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="健康状態や特記事項があれば記入してください"
              />
            </div>
            <Button className="w-full">起床報告を送信</Button>
          </div>
        </Card>

        {/* 出発報告 */}
        <Card title="出発報告">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                出発時刻
              </label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                出発場所
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="例: 自宅"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                目的地
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="例: 渋谷現場"
              />
            </div>
            <Button className="w-full" disabled>
              出発報告を送信（起床報告後に有効）
            </Button>
          </div>
        </Card>

        {/* 到着報告 */}
        <Card title="到着報告">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                到着時刻
              </label>
              <input
                type="datetime-local"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                到着場所
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="例: 渋谷現場"
              />
            </div>
            <Button className="w-full" disabled>
              到着報告を送信（出発報告後に有効）
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
