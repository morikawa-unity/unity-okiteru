import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { User, LoginCredentials } from '@/types/user';
import { api } from '@/lib/api';
import { STORAGE_KEYS, ROUTES } from '@/lib/constants';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;

  /**
   * ローカルストレージからユーザー情報を読み込み
   */
  useEffect(() => {
    const loadUser = () => {
      try {
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const savedUser = localStorage.getItem(STORAGE_KEYS.USER);

        if (token && savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error('Failed to load user from localStorage:', error);
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  /**
   * ログイン
   */
  const login = async (credentials: LoginCredentials) => {
    try {
      // TODO: 実際のAPI呼び出しに置き換え
      // const response = await api.post<{ user: User; token: string }>('/api/auth/login', credentials);

      // モックデータ（開発用）
      const mockUser: User = {
        id: '1',
        email: credentials.email,
        name: 'テストユーザー',
        role: 'staff',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockToken = 'mock-jwt-token';

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, mockToken);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));
      setUser(mockUser);

      // ロールに応じてリダイレクト
      if (mockUser.role === 'manager') {
        router.push(ROUTES.MANAGER.HOME);
      } else {
        router.push(ROUTES.DASHBOARD.ATTENDANCE);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  /**
   * ログアウト
   */
  const logout = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setUser(null);
    router.push(ROUTES.LOGIN);
  };

  /**
   * ユーザー情報を再取得
   */
  const refreshUser = async () => {
    try {
      // TODO: 実際のAPI呼び出しに置き換え
      // const userData = await api.get<User>('/api/users/me');
      // localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
      // setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 認証コンテキストを使用するフック
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
