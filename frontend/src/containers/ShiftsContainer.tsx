/**
 * ShiftsContainer - 出社可能日管理画面のビジネスロジック
 * コンテナコンポーネント（状態管理、API呼び出し、イベント処理）
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { ShiftsView, Availability, Worksite } from '@/components/shifts/ShiftsView';

export const ShiftsContainer: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedWorksite, setSelectedWorksite] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // モックデータ
  const [availabilities] = useState<Availability[]>([
    {
      id: '1',
      date: '2025-12-19',
      worksite: { id: '1', name: '渋谷現場' },
      notes: '通常勤務',
    },
    {
      id: '2',
      date: '2025-12-20',
      worksite: { id: '2', name: '新宿現場' },
      notes: '',
    },
  ]);

  const [worksites] = useState<Worksite[]>([
    { id: '1', name: '渋谷現場' },
    { id: '2', name: '新宿現場' },
    { id: '3', name: '池袋現場' },
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
      console.log('出社可能日:', { selectedDate, selectedWorksite, notes });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      alert('出社可能日を登録しました！');
      setSelectedDate('');
      setSelectedWorksite('');
      setNotes('');
      setShowForm(false);
    } catch (error) {
      console.error('出社可能日登録エラー:', error);
      alert('出社可能日の登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleForm = () => {
    setShowForm(!showForm);
  };

  const handleCancel = () => {
    setShowForm(false);
    setSelectedDate('');
    setSelectedWorksite('');
    setNotes('');
  };

  return (
    <ShiftsView
      isLoading={isLoading}
      showForm={showForm}
      selectedDate={selectedDate}
      selectedWorksite={selectedWorksite}
      notes={notes}
      isSubmitting={isSubmitting}
      availabilities={availabilities}
      worksites={worksites}
      onToggleForm={handleToggleForm}
      onDateChange={setSelectedDate}
      onWorksiteChange={setSelectedWorksite}
      onNotesChange={setNotes}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  );
};
