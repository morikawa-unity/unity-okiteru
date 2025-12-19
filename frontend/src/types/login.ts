/**
 * ログイン画面の型定義
 */

/**
 * ログインフォームのProps
 */
export interface LoginFormProps {
  email: string;
  password: string;
  error: string | null;
  isLoading: boolean;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * ログインフォームデータ
 */
export interface LoginFormData {
  email: string;
  password: string;
}
