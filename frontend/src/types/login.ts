/**
 * ログイン画面の型定義
 */

/**
 * ログインフォームのProps
 * LoginFormコンポーネントに渡すプロパティ（入力値・状態・イベントハンドラー）
 */
export interface LoginFormProps {
  /** メールアドレス入力値 */
  email: string;
  /** パスワード入力値 */
  password: string;
  /** エラーメッセージ（nullの場合はエラーなし） */
  error: string | null;
  /** ログイン処理中かどうか */
  isLoading: boolean;
  /** メールアドレス変更時のコールバック */
  onEmailChange: (email: string) => void;
  /** パスワード変更時のコールバック */
  onPasswordChange: (password: string) => void;
  /** フォーム送信時のコールバック */
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * ログインフォームデータ
 * ログイン認証に必要なメールアドレスとパスワード
 */
export interface LoginFormData {
  /** ログイン用メールアドレス */
  email: string;
  /** ログイン用パスワード */
  password: string;
}
