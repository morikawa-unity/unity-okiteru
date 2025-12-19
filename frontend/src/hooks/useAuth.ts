/**
 * useAuth Hook
 * 認証状態とユーザー情報を取得するカスタムフック
 */
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import type { User } from '@/contexts/AuthContext';
import type { CognitoUserSession } from 'amazon-cognito-identity-js';

/**
 * 認証Context型定義
 */
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  getIdToken: () => Promise<string | null>;
  getCurrentSession: () => Promise<CognitoUserSession | null>;
}

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
