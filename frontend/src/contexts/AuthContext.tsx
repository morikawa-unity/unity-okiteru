/**
 * 認証Context
 *
 * セキュリティ設計:
 * - ユーザー情報はReact stateでのみ管理（sessionStorageへの重複保存はしない）
 * - Cognitoが内部的にsessionStorageでトークン/セッション管理
 * - データの一元管理により、不整合や削除漏れのリスクを低減
 */
'use client';

import React, { createContext, useState, useEffect } from 'react';
import { CognitoUser, CognitoUserSession, AuthenticationDetails } from 'amazon-cognito-identity-js';
import { userPool } from '@/lib/cognito';
import type { User, AuthContextType, AuthProviderProps } from '@/types/auth';

// Context作成
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * 認証Provider
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 現在のセッションを取得
   */
  const getCurrentSession = async (): Promise<CognitoUserSession | null> => {
    return new Promise((resolve) => {
      const cognitoUser = userPool.getCurrentUser();

      if (!cognitoUser) {
        resolve(null);
        return;
      }

      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session || !session.isValid()) {
          resolve(null);
          return;
        }

        resolve(session);
      });
    });
  };

  /**
   * IDトークンを取得
   */
  const getIdToken = async (): Promise<string | null> => {
    const session = await getCurrentSession();
    return session ? session.getIdToken().getJwtToken() : null;
  };

  /**
   * ログイン処理
   */
  const login = async (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const authenticationDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });

      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (session: CognitoUserSession) => {
          // IDトークンからユーザー情報を取得
          const idToken = session.getIdToken();
          const payload = idToken.payload;

          const userData: User = {
            id: payload.sub,
            email: payload.email,
            name: payload.name || payload.email,
            role: payload['cognito:groups']?.[0] || 'staff',
          };

          setUser(userData);
          setIsAuthenticated(true);

          resolve();
        },
        onFailure: (err: Error) => {
          console.error('Login error:', err);
          reject(err);
        },
        newPasswordRequired: (userAttributes: any) => {
          // 初回ログイン時のパスワード変更が必要な場合
          console.log('New password required:', userAttributes);
          reject(new Error('新しいパスワードの設定が必要です'));
        },
      });
    });
  };

  /**
   * ログアウト処理
   */
  const logout = () => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.signOut();
    }

    setUser(null);
    setIsAuthenticated(false);
  };

  /**
   * 初期化：セッションチェック
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getCurrentSession();

        if (session && session.isValid()) {
          const idToken = session.getIdToken();
          const payload = idToken.payload;

          const userData: User = {
            id: payload.sub,
            email: payload.email,
            name: payload.name || payload.email,
            role: payload['cognito:groups']?.[0] || 'staff',
          };

          setUser(userData);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    getIdToken,
    getCurrentSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
