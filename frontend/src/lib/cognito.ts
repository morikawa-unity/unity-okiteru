/**
 * AWS Cognito設定
 */
import { CognitoUserPool } from 'amazon-cognito-identity-js';

// 環境変数からCognito設定を取得
const poolData = {
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
};

// Cognito User Poolインスタンス
export const userPool = new CognitoUserPool(poolData);

// Cognito設定が正しく設定されているか確認
export const isCognitoConfigured = (): boolean => {
  return !!(poolData.UserPoolId && poolData.ClientId);
};
