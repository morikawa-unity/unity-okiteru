/**
 * useAuth Hook
 * 認証状態とユーザー情報を取得するカスタムフック
 */
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import type { AuthContextType } from '@/types/auth';

/**
 * 認証状態を取得するフック
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, login, logout } = useAuth();
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (!isAuthenticated) return <LoginPage />;
 *
 * return <div>Welcome, {user?.name}</div>;
 * ```
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
