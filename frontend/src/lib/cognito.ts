/**
 * AWS Cognito設定
 */
import { CognitoUserPool, ICognitoStorage } from 'amazon-cognito-identity-js';

/**
 * sessionStorageを使用するためのカスタムストレージ実装
 * デフォルトのlocalStorageよりセキュア（タブを閉じると自動削除）
 */
class SessionStorageWrapper implements ICognitoStorage {
  setItem(key: string, value: string): void {
    sessionStorage.setItem(key, value);
  }

  getItem(key: string): string | null {
    return sessionStorage.getItem(key);
  }

  removeItem(key: string): void {
    sessionStorage.removeItem(key);
  }

  clear(): void {
    sessionStorage.clear();
  }
}

// 環境変数からCognito設定を取得
const poolData = {
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
  Storage: new SessionStorageWrapper(), // sessionStorageを使用
};

// Cognito User Poolインスタンス
export const userPool = new CognitoUserPool(poolData);

// Cognito設定が正しく設定されているか確認
export const isCognitoConfigured = (): boolean => {
  return !!(poolData.UserPoolId && poolData.ClientId);
};
