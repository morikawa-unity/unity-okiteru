import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';
import { ROUTES, ROLE_LABELS } from '@/lib/constants';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* ロゴ */}
          <Link href={ROUTES.HOME} className="flex items-center">
            <h1 className="text-2xl font-bold text-primary-600">Okiteru</h1>
          </Link>

          {/* ナビゲーション */}
          {isAuthenticated && user && (
            <nav className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.name} ({ROLE_LABELS[user.role]})
              </span>
              <Button variant="outline" size="sm" onClick={logout}>
                ログアウト
              </Button>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};
