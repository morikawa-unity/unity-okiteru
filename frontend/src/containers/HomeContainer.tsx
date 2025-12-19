/**
 * HomeContainer - ホーム画面のビジネスロジック
 * コンテナコンポーネント（状態管理、ルーティング制御）
 */
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { HomeView } from '@/components/home/HomeView';

export const HomeContainer: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // ログイン済みの場合、ロールに応じてリダイレクト
      if (user.role === 'manager') {
        router.push(ROUTES.MANAGER.HOME);
      } else {
        router.push(ROUTES.DASHBOARD.ATTENDANCE);
      }
    }
  }, [user, isLoading, isAuthenticated, router]);

  return <HomeView isLoading={isLoading} isAuthenticated={isAuthenticated} />;
};
