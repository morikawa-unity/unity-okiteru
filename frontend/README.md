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
# API エンドポイント（CloudFront経由）
NEXT_PUBLIC_API_URL=https://xxx.cloudfront.net/api

# AWS Cognito
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# 画像保存用S3バケット
NEXT_PUBLIC_PHOTOS_BUCKET_URL=https://okiteru-photos-dev.s3.ap-northeast-1.amazonaws.com

# 環境
NEXT_PUBLIC_ENVIRONMENT=dev
```

> **開発環境の場合**: `infra/dev/setup-parameters.sh` を実行すると `.env.dev` が自動生成されます。

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
│   │   ├── index.tsx       # ホーム画面（勤怠・シフト・日報）
│   │   └── login/          # ログイン
│   │       └── index.tsx
│   ├── components/         # UIコンポーネント（Presenter）
│   │   ├── common/         # 共通UI（Button, Input等）
│   │   ├── layout/         # レイアウト（Header, Footer等）
│   │   ├── home/           # ホーム画面UI
│   │   │   └── HomeView.tsx
│   │   └── login/          # ログイン画面UI
│   │       └── LoginForm.tsx
│   ├── containers/         # ビジネスロジック（Container）
│   │   ├── home/
│   │   │   └── HomeContainer.ts
│   │   └── login/
│   │       └── LoginContainer.ts
│   ├── contexts/           # React Context
│   │   └── AuthContext.tsx # 認証状態管理
│   ├── hooks/              # カスタムフック
│   │   └── usePreviousDayReport.ts
│   ├── lib/                # ライブラリ・ユーティリティ
│   │   ├── api.ts          # APIクライアント（Axios）
│   │   ├── enums.ts        # Enum定義
│   │   └── queryClient.ts  # TanStack Query設定
│   ├── types/              # TypeScript型定義
│   │   └── home.ts         # ホーム画面の型
│   ├── utils/              # ユーティリティ関数
│   │   ├── dateUtils.ts    # 日付処理
│   │   └── validators.ts   # バリデーション
│   └── styles/             # グローバルスタイル
│       └── globals.css
├── public/                 # 静的ファイル
└── package.json
```

### Container/Presenter パターン

このプロジェクトでは、**Container/Presenter パターン**を採用しています：

- **Container** (`containers/`)
  - `.ts` ファイル（JSXなし）
  - ビジネスロジック、状態管理、API呼び出し
  - `React.createElement()` でPresenterを呼び出し

- **Presenter** (`components/`)
  - `.tsx` ファイル（JSXあり）
  - UIの表示のみ
  - propsを受け取り、イベントをコールバックで返す

**例:**
```typescript
// containers/home/HomeContainer.ts
export const HomeContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HomeTab>(HomeTab.ATTENDANCE);
  // ビジネスロジック...

  return React.createElement(HomeView, {
    activeTab,
    onTabChange: setActiveTab,
    // ...props
  });
};

// components/home/HomeView.tsx
export const HomeView: React.FC<HomeViewProps> = (props) => {
  return <div>...</div>;
};
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

**認証:**
- ✅ ログイン画面（Cognito統合準備完了）
- ✅ AuthContext（認証状態管理）

**ホーム画面:**
- ✅ 勤怠報告（起床・出発・到着）UI
- ✅ 前日報告フォーム UI
- ✅ 出社可能日登録 UI
- ✅ 日報管理 UI
- ✅ タブナビゲーション

**共通:**
- ✅ ヘッダーナビゲーション
- ✅ レイアウトコンポーネント
- ✅ Container/Presenter パターン
- ✅ TanStack Query セットアップ
- ✅ Axios APIクライアント
- ✅ Enum定義（ActionType, AttendanceStatus等）

### 未実装

**バックエンド連携:**
- ❌ 勤怠報告API連携
- ❌ 前日報告API連携
- ❌ 出社可能日API連携
- ❌ 日報API連携
- ❌ 画像アップロード（S3）

**認証:**
- ❌ Cognito実装（準備のみ完了）

**マネージャー機能:**
- ❌ マネージャーダッシュボード
- ❌ スタッフ管理画面
- ❌ 現場マスタ管理

**その他:**
- ❌ テスト（Unit/E2E）
- ❌ エラーハンドリング改善

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
