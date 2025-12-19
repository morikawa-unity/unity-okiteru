import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { Loading } from '@/components/common/Loading';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { ROUTES } from '@/lib/constants';
import { formatDate } from '@/utils/date';

export default function ReportsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // モックデータ
  const [reports] = useState([
    {
      id: '1',
      date: '2025-12-17',
      content: '渋谷現場での作業を実施。配線工事を完了しました。',
      status: 'submitted',
      submittedAt: '2025-12-17T18:30:00Z',
    },
    {
      id: '2',
      date: '2025-12-16',
      content: '新宿現場の点検業務を実施。異常なし。',
      status: 'submitted',
      submittedAt: '2025-12-16T17:00:00Z',
    },
  ]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(ROUTES.LOGIN);
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: 実際のAPI呼び出し
      console.log('日報内容:', reportContent);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      alert('日報を提出しました！');
      setReportContent('');
      setShowForm(false);
    } catch (error) {
      console.error('日報提出エラー:', error);
      alert('日報の提出に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">日報管理</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'キャンセル' : '新規日報作成'}
        </Button>
      </div>

      {/* 日報作成フォーム */}
      {showForm && (
        <Card title="日報作成" className="mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                本日の業務内容 <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={10}
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="本日実施した業務内容を詳しく記入してください"
              />
              <p className="mt-1 text-sm text-gray-500">
                実施した作業、発生した問題、特記事項などを記載してください
              </p>
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowForm(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" className="flex-1" isLoading={isSubmitting}>
                日報を提出
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 日報一覧 */}
      <Card title="過去の日報">
        <div className="space-y-4">
          {reports.length === 0 ? (
            <p className="text-center text-gray-500 py-8">日報がありません</p>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{formatDate(report.date)}</h3>
                    <p className="text-sm text-gray-500">
                      提出日時: {formatDate(report.submittedAt, 'yyyy/MM/dd HH:mm')}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                    提出済み
                  </span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{report.content}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
