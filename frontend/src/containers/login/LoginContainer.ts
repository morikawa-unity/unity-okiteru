/**
 * LoginContainer - ログイン画面のビジネスロジック
 * コンテナコンポーネント（状態管理、API呼び出し、イベント処理）
 */
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/login/LoginForm';

export const LoginContainer: React.FC = () => {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/'); // ログイン成功後、ホームへリダイレクト
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return React.createElement(LoginForm, {
    email,
    password,
    error,
    isLoading,
    onEmailChange: setEmail,
    onPasswordChange: setPassword,
    onSubmit: handleSubmit,
  });
};
