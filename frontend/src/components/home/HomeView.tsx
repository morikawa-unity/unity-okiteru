/**
 * HomeView - ホーム画面UI
 * プレゼンテーショナルコンポーネント（UIのみ、ロジックなし）
 */
import React from 'react';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { Loading } from '@/components/common/Loading';

export interface HomeViewProps {
  isLoading: boolean;
  isAuthenticated: boolean;
}

export const HomeView: React.FC<HomeViewProps> = ({ isLoading, isAuthenticated }) => {
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
};
