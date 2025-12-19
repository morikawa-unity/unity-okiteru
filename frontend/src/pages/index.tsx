import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { Loading } from '@/components/common/Loading';
import { ROUTES } from '@/lib/constants';
import Link from 'next/link';

export default function Home() {
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

  if (isLoading) {
    return <Loading fullScreen />;
  }

  if (isAuthenticated) {
    return null; // リダイレクト中
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Okiteru</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">スタッフ管理システム</h2>
        <p className="text-gray-600 mb-8">通信事業部向けのスタッフ勤怠・日報管理システムです</p>

        <div className="space-y-4">
          <Link
            href={ROUTES.LOGIN}
            className="block w-full px-6 py-3 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 transition-colors"
          >
            ログイン
          </Link>
        </div>
      </div>
    </div>
  );
}
