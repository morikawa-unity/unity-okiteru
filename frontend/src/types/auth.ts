/**
 * 認証関連の型定義
 */
import type { CognitoUserSession } from 'amazon-cognito-identity-js';

/**
 * ユーザー情報
 * 認証済みユーザーの基本情報（ID・メール・名前・権限）
 */
export interface User {
  /** ユーザーID（Cognito sub） */
  id: string;
  /** メールアドレス */
  email: string;
  /** 表示名 */
  name: string;
  /** ユーザー権限（staff, manager等） */
  role: string;
}

/**
 * 認証Context型定義
 * 認証状態とユーザー情報、認証関連の操作メソッドを提供
 */
export interface AuthContextType {
  /** 現在のユーザー情報（未認証の場合はnull） */
  user: User | null;
  /** 認証済みかどうか */
  isAuthenticated: boolean;
  /** 認証状態確認中かどうか */
  isLoading: boolean;
  /** ログイン処理 */
  login: (email: string, password: string) => Promise<void>;
  /** ログアウト処理 */
  logout: () => void;
  /** IDトークンを取得 */
  getIdToken: () => Promise<string | null>;
  /** 現在のCognitoセッションを取得 */
  getCurrentSession: () => Promise<CognitoUserSession | null>;
}

/**
 * 認証プロバイダーのProps
 */
export interface AuthProviderProps {
  /** 子コンポーネント */
  children: React.ReactNode;
}
