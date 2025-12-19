# アーキテクチャ設計書

## 1. システム概要

### 1.1 システム名

**Okiteru（おきてる）** - スタッフ勤怠・日報管理システム

### 1.2 目的

通信事業部向けのスタッフ管理システムで、日々の勤怠管理（起床・出発・到着報告）と日報管理を効率化し、マネージャーがスタッフの状況をリアルタイムで把握できるようにする。

### 1.3 主な機能

- **スタッフ機能**

  - 前日報告（翌日の予定入力）
  - 当日勤怠報告（起床・出発・到着時刻、写真アップロード）
  - 日報作成・提出
  - 出社可能日の登録

- **マネージャー機能**
  - スタッフ一覧・詳細表示
  - 勤怠・日報の閲覧・管理
  - 現場マスタ管理
  - スタッフスケジュール管理

---

## 2. インフラストラクチャ（AWS）

### 2.1 全体構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                         ユーザー（ブラウザ）                         │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CloudFront (CDN)                            │
│  - 静的ファイル配信（Next.js フロントエンド）                        │
│  - SSL/TLS終端                                                   │
│  - キャッシュ制御                                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                ┌────────┴────────┐
                │                 │
                ▼                 ▼
    ┌──────────────────┐  ┌──────────────────┐
    │   S3 Bucket      │  │  API Gateway     │
    │  (静的ファイル)   │  │  (REST API)      │
    └──────────────────┘  └────────┬─────────┘
                                   │
                                   ▼
                          ┌──────────────────┐
                          │  Lambda Functions │
                          │  (Python/FastAPI) │
                          └────────┬─────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
                ▼                  ▼                  ▼
    ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
    │  RDS PostgreSQL  │  │   Cognito    │  │   S3 Bucket  │
    │  (データベース)   │  │  (認証管理)   │  │  (画像保存)  │
    └──────────────────┘  └──────────────┘  └──────────────┘
```

### 2.2 AWS サービス構成

| サービス           | 役割               | 詳細                                                  |
| ------------------ | ------------------ | ----------------------------------------------------- |
| **CloudFront**     | CDN                | Next.js アプリケーションの静的ファイル配信、高速化    |
| **S3**             | ストレージ         | フロントエンドの静的ファイル、勤怠写真の保存          |
| **API Gateway**    | API エンドポイント | REST API のエンドポイント管理、リクエストルーティング |
| **Lambda**         | サーバーレス処理   | FastAPI（Python）によるビジネスロジック実行           |
| **RDS PostgreSQL** | データベース       | ユーザー、勤怠、日報などのデータ永続化                |
| **Cognito**        | 認証/認可          | ユーザー認証、JWT トークン発行・検証                  |
| **CloudFormation** | IaC                | インフラのコード管理（YAML）                          |

### 2.3 デプロイフロー

```
GitHub Repository
  │
  ├── frontend/        (Next.js)
  │   └── build → S3 → CloudFront
  │
  └── backend/         (FastAPI)
      └── package → Lambda
```

**CloudFormation テンプレート構成:**

- `infra/01-network.yaml` - VPC、サブネット、セキュリティグループ
- `infra/02-database.yaml` - RDS PostgreSQL
- `infra/03-cognito.yaml` - Cognito User Pool
- `infra/04-storage.yaml` - S3 バケット
- `infra/05-lambda-api.yaml` - Lambda、API Gateway
- `infra/06-cloudfront.yaml` - CloudFront Distribution
- `infra/07-codepipeline.yaml` - CI/CD Pipeline

---

## 3. アプリケーションアーキテクチャ

### 3.1 技術スタック

#### フロントエンド

| 技術               | バージョン          | 用途                         |
| ------------------ | ------------------- | ---------------------------- |
| **React**          | 18.x                | UI フレームワーク            |
| **Next.js**        | 14.x (Pages Router) | SSR、ルーティング            |
| **TypeScript**     | 5.x                 | 型安全性                     |
| **Tailwind CSS**   | 3.x                 | スタイリング                 |
| **Zod**            | 3.x                 | バリデーション               |
| **React Context**  | -                   | 状態管理（クライアント側）   |
| **TanStack Query** | 5.x                 | サーバー状態管理、キャッシュ |

#### バックエンド

| 技術           | バージョン | 用途                         |
| -------------- | ---------- | ---------------------------- |
| **Python**     | 3.11+      | プログラミング言語           |
| **FastAPI**    | 0.104+     | Web フレームワーク           |
| **SQLAlchemy** | 2.0+       | ORM                          |
| **Pydantic**   | 2.x        | バリデーション、スキーマ定義 |
| **Alembic**    | 1.12+      | マイグレーション管理         |
| **psycopg2**   | 2.9+       | PostgreSQL ドライバ          |
| **boto3**      | 1.34+      | AWS SDK（S3 操作）           |

### 3.2 フロントエンド構成

```
frontend/
├── src/
│   ├── pages/                    # Next.js Pages Router
│   │   ├── _app.tsx              # アプリケーションルート
│   │   ├── index.tsx             # トップページ
│   │   ├── login.tsx             # ログイン
│   │   ├── dashboard/            # スタッフダッシュボード
│   │   │   ├── attendance.tsx    # 勤怠報告
│   │   │   ├── reports.tsx       # 日報一覧
│   │   │   └── shifts.tsx        # 出社可能日
│   │   └── manager/              # マネージャーページ
│   │       ├── index.tsx         # ダッシュボード
│   │       ├── staff/            # スタッフ管理
│   │       ├── shifts/           # スケジュール管理
│   │       └── worksites/        # 現場マスタ
│   ├── components/               # 再利用可能コンポーネント
│   │   ├── common/               # 共通UI（Button, Card等）
│   │   ├── attendance/           # 勤怠関連
│   │   ├── reports/              # 日報関連
│   │   └── layout/               # レイアウト
│   ├── contexts/                 # React Context
│   │   ├── AuthContext.tsx       # 認証状態
│   │   └── ThemeContext.tsx      # テーマ設定
│   ├── hooks/                    # カスタムフック
│   │   ├── useAuth.ts            # 認証
│   │   ├── useAttendance.ts      # 勤怠
│   │   └── useReports.ts         # 日報
│   ├── lib/                      # ライブラリ・ユーティリティ
│   │   ├── api.ts                # API クライアント
│   │   ├── cognito.ts            # Cognito SDK
│   │   └── queryClient.ts        # TanStack Query設定
│   ├── types/                    # TypeScript型定義
│   │   ├── user.ts
│   │   ├── attendance.ts
│   │   └── report.ts
│   ├── schemas/                  # Zodスキーマ
│   │   ├── attendance.ts
│   │   └── report.ts
│   └── utils/                    # ユーティリティ関数
│       ├── date.ts
│       └── formatter.ts
├── public/                       # 静的ファイル
└── package.json
```

### 3.3 バックエンド構成

```
backend/
├── app/
│   ├── main.py                   # FastAPIアプリケーション
│   ├── config.py                 # 環境変数・設定
│   ├── dependencies.py           # DI（認証等）
│   ├── database.py               # DB接続管理
│   ├── models/                   # SQLAlchemyモデル
│   │   ├── user.py
│   │   ├── attendance.py
│   │   ├── report.py
│   │   ├── worksite.py
│   │   └── staff_availability.py
│   ├── schemas/                  # Pydanticスキーマ
│   │   ├── user.py
│   │   ├── attendance.py
│   │   └── report.py
│   ├── routers/                  # APIルーター
│   │   ├── auth.py               # 認証
│   │   ├── users.py              # ユーザー管理
│   │   ├── attendance.py         # 勤怠
│   │   ├── reports.py            # 日報
│   │   ├── worksites.py          # 現場
│   │   └── availability.py       # 出社可能日
│   ├── services/                 # ビジネスロジック
│   │   ├── auth_service.py
│   │   ├── attendance_service.py
│   │   └── report_service.py
│   ├── repositories/             # データアクセス層
│   │   ├── user_repository.py
│   │   ├── attendance_repository.py
│   │   └── report_repository.py
│   └── utils/                    # ユーティリティ
│       ├── s3.py                 # S3操作
│       ├── cognito.py            # Cognito検証
│       └── validators.py         # バリデーション
├── alembic/                      # マイグレーション
│   └── versions/
├── tests/                        # テスト
├── requirements.txt              # 依存パッケージ
└── lambda_handler.py             # Lambda エントリーポイント
```

---

## 4. 設計パターン

### 4.1 レイヤードアーキテクチャ（バックエンド）

```
┌─────────────────────────────────────┐
│         Router Layer                │  ← HTTPリクエスト処理
│  (routers/attendance.py)            │     認証、バリデーション
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│        Service Layer                │  ← ビジネスロジック
│  (services/attendance_service.py)   │     複数リポジトリの調整
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│       Repository Layer              │  ← データアクセス
│  (repositories/attendance_repo.py)  │     CRUD操作
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         Model Layer                 │  ← データモデル
│  (models/attendance.py)             │     SQLAlchemy定義
└─────────────────────────────────────┘
```

### 4.2 状態管理（フロントエンド）

#### クライアント状態 - React Context

```typescript
// contexts/AuthContext.tsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>{children}</AuthContext.Provider>;
};
```

#### サーバー状態 - TanStack Query

```typescript
// hooks/useAttendance.ts
export const useAttendance = (date: string) => {
  return useQuery({
    queryKey: ["attendance", date],
    queryFn: () => fetchAttendance(date),
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
};
```

### 4.3 認証フロー

```
1. ユーザーがログイン情報を入力
   ↓
2. フロントエンド → Cognito (InitiateAuth)
   ↓
3. Cognito → フロントエンド (IDToken, AccessToken)
   ↓
4. フロントエンド → API Gateway (Authorization: Bearer {IDToken})
   ↓
5. Lambda → Cognito (トークン検証)
   ↓
6. Lambda → ビジネスロジック実行
   ↓
7. Lambda → レスポンス返却
```

---

## 5. セキュリティ設計

### 5.1 認証・認可

| 項目                 | 実装方法                              |
| -------------------- | ------------------------------------- |
| **認証方式**         | AWS Cognito + JWT                     |
| **トークン保存**     | LocalStorage (暗号化推奨)             |
| **トークン有効期限** | 1 時間（リフレッシュトークン: 30 日） |
| **API 認可**         | JWT トークン検証（全エンドポイント）  |
| **ロールベース制御** | `staff` / `manager` ロール            |

### 5.2 データ保護

- **通信**: HTTPS/TLS 1.2 以上
- **DB 暗号化**: RDS 暗号化（at-rest）
- **S3 暗号化**: サーバーサイド暗号化（SSE-S3）
- **パスワード**: Cognito による管理（bcrypt 相当）
- **環境変数**: AWS Systems Manager Parameter Store

### 5.3 アクセス制御

#### IAM ロール設計

- **Lambda 実行ロール**: RDS、S3、Cognito へのアクセス
- **CloudFront**: S3 への読み取り専用アクセス

#### RLS（Row Level Security）

- PostgreSQL の RLS ポリシーで実装
- スタッフは自分のデータのみアクセス
- マネージャーは全データアクセス

---

## 6. パフォーマンス設計

### 6.1 フロントエンド最適化

| 項目               | 実装                           |
| ------------------ | ------------------------------ |
| **コード分割**     | Next.js Dynamic Import         |
| **画像最適化**     | Next.js Image コンポーネント   |
| **キャッシュ**     | TanStack Query（5 分間）       |
| **CDN**            | CloudFront（エッジキャッシュ） |
| **バンドルサイズ** | Tree Shaking、Code Splitting   |

### 6.2 バックエンド最適化

| 項目                     | 実装                               |
| ------------------------ | ---------------------------------- |
| **DB 接続プール**        | SQLAlchemy（max 5 connections）    |
| **クエリ最適化**         | N+1 問題回避（eager loading）      |
| **Lambda 設定**          | メモリ: 512MB、タイムアウト: 30 秒 |
| **コールドスタート対策** | Lambda SnapStart（Python 3.11+）   |

### 6.3 スケーラビリティ

- **Lambda**: 自動スケーリング（同時実行数: 1000）
- **RDS**: Multi-AZ 配置、リードレプリカ
- **S3**: 無制限スケール
- **CloudFront**: グローバルエッジロケーション

---

## 7. 監視・ログ

### 7.1 ログ戦略

| ログ種別                 | 保存先                      | 保持期間 |
| ------------------------ | --------------------------- | -------- |
| **アプリケーションログ** | CloudWatch Logs             | 30 日    |
| **アクセスログ**         | CloudFront Logs → S3        | 90 日    |
| **エラーログ**           | CloudWatch Logs             | 90 日    |
| **監査ログ**             | RDS（access_logs テーブル） | 1 年     |

### 7.2 メトリクス

- **Lambda**: 実行時間、エラー率、同時実行数
- **API Gateway**: リクエスト数、レイテンシ、エラー率
- **RDS**: CPU、メモリ、接続数、クエリ実行時間

### 7.3 アラート

- Lambda エラー率 > 5%
- API レイテンシ > 3 秒
- RDS CPU > 80%
- RDS ストレージ残量 < 20%

---

## 8. バックアップ・DR

### 8.1 バックアップ戦略

| 対象           | 方法             | 頻度 | 保持期間 |
| -------------- | ---------------- | ---- | -------- |
| **RDS**        | 自動バックアップ | 毎日 | 7 日間   |
| **S3（画像）** | バージョニング   | -    | 30 日間  |

### 8.2 災害復旧（DR）

- **RPO**: 24 時間（1 日前の状態に復旧可能）
- **RTO**: 4 時間（4 時間以内にサービス復旧）
- **復旧手順**: CloudFormation スタック再作成 + RDS スナップショット復元

---

## 9. 開発・デプロイフロー

### 9.1 環境

| 環境            | 用途         | デプロイ方法                            |
| --------------- | ------------ | --------------------------------------- |
| **Local**       | ローカル開発 | Docker Compose                          |
| **Development** | 開発環境     | CodePipeline (develop ブランチ)         |
| **Staging**     | ステージング | CodePipeline (staging ブランチ)         |
| **Production**  | 本番環境     | CodePipeline (main ブランチ + 承認必須) |

### 9.2 CI/CD パイプライン

```
Git Push
  ↓
GitHub Webhook
  ↓
CodePipeline
  ↓
CodeBuild
  ├── Lint & Format (ESLint, Prettier, ruff)
  ├── Unit Tests (Jest, pytest)
  ├── Build
  │   ├── Frontend: next build → S3
  │   └── Backend: package → Lambda
  └── Deploy
      ├── S3 Sync
      ├── CloudFront Invalidation
      └── Lambda Update
```

---

## 10. 非機能要件

| 項目                 | 目標値                             |
| -------------------- | ---------------------------------- |
| **可用性**           | 99.9%（月間ダウンタイム < 43 分）  |
| **レスポンスタイム** | ページ読み込み < 2 秒、API < 500ms |
| **同時接続数**       | 100 ユーザー                       |
| **データ整合性**     | トランザクション保証（ACID）       |
| **セキュリティ**     | OWASP Top 10 対策                  |

---

## 11. 技術選定理由

### 11.1 Next.js Pages Router

- ファイルベースルーティングによる開発効率
- SSR/SSG 対応
- 成熟したエコシステム

### 11.2 FastAPI

- 高速なパフォーマンス（Starlette + Pydantic）
- 自動 API ドキュメント生成
- 型ヒントによる開発効率

### 11.3 AWS Lambda + API Gateway

- サーバーレスによる運用コスト削減
- 自動スケーリング
- 従量課金

### 11.4 PostgreSQL (RDS)

- リレーショナルデータに最適
- JSONB サポート
- RLS（Row Level Security）

### 11.5 Cognito

- AWS 統合認証サービス
- JWT 標準対応
- 多要素認証サポート

---

## 12. 将来的な拡張

- **通知機能**: SNS によるメール・SMS 通知
- **モバイルアプリ**: React Native
- **分析ダッシュボード**: QuickSight
- **リアルタイム通信**: AppSync (GraphQL + WebSocket)
- **画像分析**: Rekognition（位置情報検証）

---

**作成日**: 2025-12-18
**バージョン**: 1.0
