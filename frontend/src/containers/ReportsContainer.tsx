/**
 * ReportsContainer - 日報管理画面のビジネスロジック
 * コンテナコンポーネント（状態管理、API呼び出し、イベント処理）
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { ReportsView, Report } from '@/components/reports/ReportsView';

export const ReportsContainer: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // モックデータ
  const [reports] = useState<Report[]>([
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

  const handleToggleForm = () => {
    setShowForm(!showForm);
  };

  const handleCancel = () => {
    setShowForm(false);
    setReportContent('');
  };

  return (
    <ReportsView
      isLoading={isLoading}
      showForm={showForm}
      reportContent={reportContent}
      isSubmitting={isSubmitting}
      reports={reports}
      onToggleForm={handleToggleForm}
      onReportContentChange={setReportContent}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
};
