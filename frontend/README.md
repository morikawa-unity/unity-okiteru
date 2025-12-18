# Okiteru Frontend

Next.js (Pages Router) + TypeScript + Tailwind CSS によるフロントエンドアプリケーション

## 技術スタック

- **React**: 18.x
- **Next.js**: 14.x (Pages Router)
- **TypeScript**: 5.x
- **Tailwind CSS**: 3.x
- **TanStack Query**: 5.x（サーバー状態管理）
- **Axios**: APIクライアント
- **Zod**: バリデーション
- **React Hook Form**: フォーム管理

## 環境構築

### 前提条件

- Node.js 18.x以上
- npm または yarn

### セットアップ

```bash
# 依存パッケージインストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.localを編集してAPI URLなどを設定

# 開発サーバー起動
npm run dev
```

ブラウザで `http://localhost:3000` を開く

## 環境変数

`.env.local` ファイルを作成して以下を設定:

```bash
# API エンドポイント
NEXT_PUBLIC_API_URL=http://localhost:8000

# AWS Cognito（後で設定）
# NEXT_PUBLIC_COGNITO_USER_POOL_ID=
# NEXT_PUBLIC_COGNITO_CLIENT_ID=
# NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1
```

## スクリプト

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# プロダクションサーバー起動
npm start

# Lint
npm run lint

# フォーマット
npm run format
```

## プロジェクト構造

```
frontend/
├── src/
│   ├── pages/              # Next.js Pages Router
│   │   ├── _app.tsx        # アプリケーションルート
│   │   ├── _document.tsx   # HTMLドキュメント
│   │   ├── index.tsx       # トップページ
│   │   ├── login.tsx       # ログイン
│   │   └── dashboard/      # スタッフダッシュボード
│   ├── components/         # 再利用可能コンポーネント
│   │   ├── common/         # 共通UI（Button, Card等）
│   │   └── layout/         # レイアウト（Header等）
│   ├── contexts/           # React Context
│   │   └── AuthContext.tsx # 認証状態管理
│   ├── hooks/              # カスタムフック
│   ├── lib/                # ライブラリ・ユーティリティ
│   │   ├── api.ts          # APIクライアント
│   │   ├── queryClient.ts  # TanStack Query設定
│   │   └── constants.ts    # 定数定義
│   ├── types/              # TypeScript型定義
│   ├── utils/              # ユーティリティ関数
│   └── styles/             # グローバルスタイル
├── public/                 # 静的ファイル
└── package.json
```

## 開発時の注意点

### 認証

現在は開発用のモック認証を使用しています:
- 任意のメール・パスワードでログイン可能
- 実際のCognito統合は後で実装

### API通信

- `src/lib/api.ts` でAxiosクライアントを設定
- 認証トークンは自動的にヘッダーに追加
- エラーハンドリングはインターセプターで一元管理

### 状態管理

- **クライアント状態**: React Context（AuthContext等）
- **サーバー状態**: TanStack Query

## 主要機能

### 実装済み

✅ ログイン画面
✅ トップページ
✅ ヘッダーナビゲーション
✅ 勤怠報告画面（UI のみ）
✅ 認証Context（モック）
✅ APIクライアント

### 未実装

- 日報作成・一覧
- 出社可能日登録
- マネージャーダッシュボード
- スタッフ管理
- 現場マスタ管理
- 実際のAPI連携
- Cognito統合

## ビルド & デプロイ

```bash
# プロダクションビルド
npm run build

# S3にアップロード（本番環境）
aws s3 sync out/ s3://okiteru-frontend --delete

# CloudFront キャッシュクリア
aws cloudfront create-invalidation --distribution-id EXXX --paths "/*"
```

## トラブルシューティング

### `npm run dev` がエラーになる

```bash
# node_modules削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### APIに接続できない

- `.env.local` の `NEXT_PUBLIC_API_URL` を確認
- バックエンドサーバーが起動しているか確認

---

**作成日**: 2025-12-18
