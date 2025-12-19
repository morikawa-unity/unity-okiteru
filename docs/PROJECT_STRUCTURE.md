# プロジェクト構成

## 1. ディレクトリ構造

```
unity-okiteru/
├── README.md                     # プロジェクト概要
├── CLAUDE.md                     # Claude Code向けガイド
├── .gitignore                    # Git除外ファイル
├── docs/                         # ドキュメント
│   ├── ARCHITECTURE.md           # アーキテクチャ設計書
│   ├── DATABASE_DESIGN.md        # DB設計書
│   ├── PROJECT_STRUCTURE.md      # プロジェクト構成（本ファイル）
│   ├── REQUIREMENTS.md           # 要件定義書
│   ├── API_SPECIFICATION.md      # API仕様書
│   └── DEPLOYMENT.md             # デプロイ手順書
│
├── infra/                        # インフラコード
│   └── cloudformation/           # CloudFormation テンプレート
│       ├── 01-network.yaml       # VPC、サブネット、セキュリティグループ
│       ├── 02-database.yaml      # RDS PostgreSQL
│       ├── 03-cognito.yaml       # Cognito User Pool
│       ├── 04-storage.yaml       # S3バケット
│       ├── 05-lambda-api.yaml    # Lambda、API Gateway
│       ├── 06-cloudfront.yaml    # CloudFront Distribution
│       ├── 07-codepipeline.yaml  # CI/CD Pipeline
│       ├── deploy.sh             # デプロイスクリプト
│       ├── setup-parameters.sh   # Parameter Store設定
│       ├── init-database.sh      # DB初期化
│       ├── init-cognito.sh       # テストユーザー作成
│       ├── cleanup.sh            # 環境削除
│       ├── parameters-*.json     # 環境別パラメータ
│       └── README.md             # インフラ構築手順
│
├── frontend/                     # フロントエンドアプリケーション
│   ├── src/
│   │   ├── pages/                # Next.js Pages Router
│   │   │   ├── _app.tsx          # アプリケーションルート
│   │   │   ├── _document.tsx     # HTMLドキュメント
│   │   │   ├── index.tsx         # トップページ
│   │   │   ├── login.tsx         # ログイン
│   │   │   ├── register.tsx      # 新規登録
│   │   │   ├── dashboard/        # スタッフダッシュボード
│   │   │   │   ├── attendance.tsx    # 勤怠報告
│   │   │   │   ├── reports.tsx       # 日報一覧
│   │   │   │   └── shifts.tsx        # 出社可能日
│   │   │   └── manager/          # マネージャーページ
│   │   │       ├── index.tsx     # ダッシュボード
│   │   │       ├── staff/        # スタッフ管理
│   │   │       │   ├── index.tsx     # 一覧
│   │   │       │   └── [id].tsx      # 詳細
│   │   │       ├── shifts/       # スケジュール管理
│   │   │       │   ├── index.tsx
│   │   │       │   └── [id].tsx
│   │   │       └── worksites/    # 現場マスタ
│   │   │           ├── index.tsx
│   │   │           └── [id].tsx
│   │   ├── components/           # 再利用可能コンポーネント
│   │   │   ├── common/           # 共通UI
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Loading.tsx
│   │   │   │   └── ErrorBoundary.tsx
│   │   │   ├── layout/           # レイアウト
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Footer.tsx
│   │   │   ├── attendance/       # 勤怠関連
│   │   │   │   ├── AttendanceForm.tsx
│   │   │   │   ├── TimeInput.tsx
│   │   │   │   └── PhotoUpload.tsx
│   │   │   ├── reports/          # 日報関連
│   │   │   │   ├── ReportForm.tsx
│   │   │   │   └── ReportList.tsx
│   │   │   └── shifts/           # スケジュール関連
│   │   │       └── ShiftCalendar.tsx
│   │   ├── contexts/             # React Context
│   │   │   ├── AuthContext.tsx   # 認証状態
│   │   │   └── ThemeContext.tsx  # テーマ設定
│   │   ├── hooks/                # カスタムフック
│   │   │   ├── useAuth.ts        # 認証
│   │   │   ├── useAttendance.ts  # 勤怠
│   │   │   ├── useReports.ts     # 日報
│   │   │   ├── useUsers.ts       # ユーザー管理
│   │   │   └── useWorksites.ts   # 現場管理
│   │   ├── lib/                  # ライブラリ・ユーティリティ
│   │   │   ├── api.ts            # API クライアント
│   │   │   ├── cognito.ts        # Cognito SDK
│   │   │   ├── queryClient.ts    # TanStack Query設定
│   │   │   └── constants.ts      # 定数定義
│   │   ├── types/                # TypeScript型定義
│   │   │   ├── user.ts
│   │   │   ├── attendance.ts
│   │   │   ├── report.ts
│   │   │   ├── worksite.ts
│   │   │   └── api.ts            # APIレスポンス型
│   │   ├── schemas/              # Zodスキーマ
│   │   │   ├── attendance.ts     # 勤怠バリデーション
│   │   │   ├── report.ts         # 日報バリデーション
│   │   │   └── user.ts           # ユーザーバリデーション
│   │   ├── styles/               # グローバルスタイル
│   │   │   └── globals.css
│   │   └── utils/                # ユーティリティ関数
│   │       ├── date.ts           # 日付フォーマット
│   │       ├── formatter.ts      # データ整形
│   │       └── validators.ts     # バリデーション
│   ├── public/                   # 静的ファイル
│   │   ├── images/
│   │   └── favicon.ico
│   ├── tests/                    # テストコード
│   │   ├── unit/                 # ユニットテスト
│   │   ├── integration/          # 統合テスト
│   │   └── e2e/                  # E2Eテスト
│   ├── .env.local                # 環境変数（ローカル）
│   ├── .env.example              # 環境変数サンプル
│   ├── next.config.js            # Next.js設定
│   ├── tailwind.config.js        # Tailwind CSS設定
│   ├── tsconfig.json             # TypeScript設定
│   ├── package.json              # npm依存関係
│   └── README.md                 # フロントエンドREADME
│
├── backend/                      # バックエンドアプリケーション
│   ├── app/
│   │   ├── main.py               # FastAPI アプリケーション
│   │   ├── config.py             # 設定管理
│   │   ├── dependencies.py       # DI（認証、DB等）
│   │   ├── database.py           # DB接続管理
│   │   ├── models/               # SQLAlchemyモデル
│   │   │   ├── __init__.py
│   │   │   ├── base.py           # ベースモデル
│   │   │   ├── user.py           # ユーザー
│   │   │   ├── attendance.py     # 勤怠記録
│   │   │   ├── daily_report.py   # 日報
│   │   │   ├── previous_day_report.py  # 前日報告
│   │   │   ├── staff_availability.py   # 出社可能日
│   │   │   ├── worksite.py       # 現場
│   │   │   └── access_log.py     # アクセスログ
│   │   ├── schemas/              # Pydanticスキーマ
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── attendance.py
│   │   │   ├── report.py
│   │   │   ├── worksite.py
│   │   │   └── common.py         # 共通スキーマ（ページネーション等）
│   │   ├── routers/              # APIルーター
│   │   │   ├── __init__.py
│   │   │   ├── auth.py           # 認証（ログイン、登録）
│   │   │   ├── users.py          # ユーザー管理
│   │   │   ├── attendance.py     # 勤怠記録
│   │   │   ├── reports.py        # 日報
│   │   │   ├── previous_reports.py  # 前日報告
│   │   │   ├── availability.py   # 出社可能日
│   │   │   └── worksites.py      # 現場マスタ
│   │   ├── services/             # ビジネスロジック
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py   # 認証サービス
│   │   │   ├── attendance_service.py  # 勤怠サービス
│   │   │   ├── report_service.py      # 日報サービス
│   │   │   └── user_service.py   # ユーザーサービス
│   │   ├── repositories/         # データアクセス層
│   │   │   ├── __init__.py
│   │   │   ├── base_repository.py     # ベースリポジトリ
│   │   │   ├── user_repository.py
│   │   │   ├── attendance_repository.py
│   │   │   ├── report_repository.py
│   │   │   └── worksite_repository.py
│   │   ├── utils/                # ユーティリティ
│   │   │   ├── __init__.py
│   │   │   ├── s3.py             # S3操作（写真アップロード）
│   │   │   ├── cognito.py        # Cognito JWT検証
│   │   │   ├── validators.py     # バリデーション
│   │   │   └── exceptions.py     # カスタム例外
│   │   └── middleware/           # ミドルウェア
│   │       ├── __init__.py
│   │       ├── auth.py           # 認証ミドルウェア
│   │       ├── cors.py           # CORS設定
│   │       └── logging.py        # ロギング
│   ├── alembic/                  # マイグレーション
│   │   ├── versions/             # マイグレーションファイル
│   │   ├── env.py
│   │   └── alembic.ini
│   ├── tests/                    # テストコード
│   │   ├── __init__.py
│   │   ├── conftest.py           # pytest設定
│   │   ├── unit/                 # ユニットテスト
│   │   │   ├── test_services/
│   │   │   └── test_repositories/
│   │   └── integration/          # 統合テスト
│   │       ├── test_routers/
│   │       └── test_database/
│   ├── scripts/                  # ユーティリティスクリプト
│   │   ├── seed_data.py          # 初期データ投入
│   │   └── create_admin.py       # 管理者作成
│   ├── .env                      # 環境変数
│   ├── .env.example              # 環境変数サンプル
│   ├── requirements.txt          # pip依存関係
│   ├── requirements-dev.txt      # 開発用依存関係
│   ├── lambda_handler.py         # Lambda エントリーポイント
│   ├── Dockerfile                # Docker イメージ（ローカル開発用）
│   ├── pyproject.toml            # Python プロジェクト設定
│   └── README.md                 # バックエンドREADME
│
├── .github/                      # GitHub Actions
│   └── workflows/
│       ├── frontend-ci.yml       # フロントエンドCI
│       ├── backend-ci.yml        # バックエンドCI
│       ├── deploy-dev.yml        # 開発環境デプロイ
│       ├── deploy-staging.yml    # ステージングデプロイ
│       └── deploy-prod.yml       # 本番デプロイ
│
└── docker-compose.yml            # ローカル開発環境
```

---

## 2. 主要ファイルの役割

### 2.1 フロントエンド

| ファイル                   | 役割                                                     |
| -------------------------- | -------------------------------------------------------- |
| `pages/_app.tsx`           | アプリケーション全体のラップ、グローバルプロバイダー設定 |
| `pages/_document.tsx`      | HTML ドキュメント構造、meta タグ設定                     |
| `contexts/AuthContext.tsx` | 認証状態管理（ログイン状態、ユーザー情報）               |
| `lib/api.ts`               | API クライアント（axios/fetch ラッパー）                 |
| `lib/queryClient.ts`       | TanStack Query 設定（キャッシュ、リトライ等）            |
| `hooks/useAuth.ts`         | 認証関連カスタムフック                                   |
| `schemas/attendance.ts`    | 勤怠データの Zod バリデーションスキーマ                  |

### 2.2 バックエンド

| ファイル                                | 役割                                                         |
| --------------------------------------- | ------------------------------------------------------------ |
| `main.py`                               | FastAPI アプリケーション定義、ルーター登録                   |
| `config.py`                             | 環境変数読み込み、設定管理                                   |
| `dependencies.py`                       | DI（get_db, get_current_user 等）                            |
| `database.py`                           | SQLAlchemy エンジン、セッション管理                          |
| `models/base.py`                        | SQLAlchemy ベースモデル、共通カラム定義                      |
| `schemas/common.py`                     | 共通 Pydantic スキーマ（ページネーション、エラーレスポンス） |
| `routers/attendance.py`                 | 勤怠 API エンドポイント定義                                  |
| `services/attendance_service.py`        | 勤怠ビジネスロジック                                         |
| `repositories/attendance_repository.py` | 勤怠データアクセス層                                         |
| `utils/s3.py`                           | S3 ファイルアップロード・削除                                |
| `utils/cognito.py`                      | Cognito JWT トークン検証                                     |
| `lambda_handler.py`                     | AWS Lambda エントリーポイント                                |

### 2.3 インフラストラクチャ

| ファイル               | 役割                                            |
| ---------------------- | ----------------------------------------------- |
| `01-network.yaml`      | VPC、サブネット、セキュリティグループ           |
| `02-database.yaml`     | RDS PostgreSQL、パラメータグループ              |
| `03-cognito.yaml`      | Cognito ユーザープール、クライアント            |
| `04-storage.yaml`      | S3 バケット（フロントエンド、写真、デプロイ用） |
| `05-lambda-api.yaml`   | Lambda、API Gateway、IAM ロール                 |
| `06-cloudfront.yaml`   | CloudFront ディストリビューション               |
| `07-codepipeline.yaml` | CodePipeline、CodeBuild、CI/CD                  |
| `deploy.sh`            | 全 CloudFormation スタックデプロイスクリプト    |
| `parameters-*.json`    | 環境別パラメータファイル                        |

---

## 3. 環境変数管理

### 3.1 フロントエンド (.env.local)

```bash
# API エンドポイント
NEXT_PUBLIC_API_URL=https://api.okiteru.example.com

# Cognito
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1

# S3（写真表示用）
NEXT_PUBLIC_S3_BUCKET_URL=https://okiteru-photos.s3.ap-northeast-1.amazonaws.com
```

### 3.2 バックエンド (.env)

```bash
# アプリケーション
APP_NAME=okiteru-api
ENVIRONMENT=production
DEBUG=false

# データベース
DATABASE_URL=postgresql://user:password@okiteru-db.xxxxx.ap-northeast-1.rds.amazonaws.com:5432/okiteru

# AWS Cognito
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxx
COGNITO_REGION=ap-northeast-1
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx

# AWS S3（写真保存用）
S3_BUCKET_NAME=okiteru-photos
S3_REGION=ap-northeast-1

# ログ
LOG_LEVEL=INFO
```

---

## 4. 開発フロー

### 4.1 ローカル開発環境セットアップ

```bash
# 1. リポジトリクローン
git clone https://github.com/your-org/unity-okiteru.git
cd unity-okiteru

# 2. フロントエンド
cd frontend
npm install
cp .env.example .env.local
# .env.localを編集
npm run dev  # http://localhost:3000

# 3. バックエンド
cd ../backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env
# .envを編集
uvicorn app.main:app --reload  # http://localhost:8000

# 4. データベース（Docker）
docker-compose up -d postgres
alembic upgrade head
python scripts/seed_data.py
```

### 4.2 ブランチ戦略

```
main (本番環境)
  ↑
release (ステージング環境)
  ↑
develop (開発環境)
  ↑
feature/xxx (機能開発)
```

---

## 5. 命名規則

### 5.1 ファイル・ディレクトリ

- **React コンポーネント**: PascalCase（`Button.tsx`, `AttendanceForm.tsx`）
- **フック**: camelCase（`useAuth.ts`, `useAttendance.ts`）
- **ユーティリティ**: camelCase（`date.ts`, `validators.ts`）
- **Python モジュール**: snake_case（`user_repository.py`, `auth_service.py`）

### 5.2 変数・関数

- **TypeScript/JavaScript**: camelCase（`userName`, `fetchAttendance()`）
- **React コンポーネント**: PascalCase（`AttendanceForm`, `Button`）
- **Python**: snake_case（`user_name`, `fetch_attendance()`）
- **定数**: UPPER_SNAKE_CASE（`API_URL`, `MAX_FILE_SIZE`）

### 5.3 データベース

- **テーブル名**: snake_case 複数形（`users`, `attendance_records`）
- **カラム名**: snake_case（`user_id`, `created_at`）

---

## 6. テスト戦略

### 6.1 フロントエンド

| テストタイプ       | ツール                       | 対象                      |
| ------------------ | ---------------------------- | ------------------------- |
| **ユニットテスト** | Jest + React Testing Library | コンポーネント、フック    |
| **統合テスト**     | Jest                         | API クライアント、Context |
| **E2E テスト**     | Playwright                   | ユーザーフロー            |

### 6.2 バックエンド

| テストタイプ       | ツール              | 対象                          |
| ------------------ | ------------------- | ----------------------------- |
| **ユニットテスト** | pytest              | Services, Repositories, Utils |
| **統合テスト**     | pytest + TestClient | API エンドポイント            |
| **DB テスト**      | pytest + SQLite     | マイグレーション、モデル      |

---

## 7. ビルド・デプロイ

### 7.1 フロントエンド

```bash
# ビルド
cd frontend
npm run build

# S3 にアップロード
aws s3 sync out/ s3://okiteru-frontend --delete

# CloudFront キャッシュクリア
aws cloudfront create-invalidation --distribution-id EXXX --paths "/*"
```

### 7.2 バックエンド

```bash
# Lambda パッケージ作成
cd backend
pip install -r requirements.txt -t package/
cp -r app package/
cd package
zip -r ../lambda.zip .

# Lambda にデプロイ
aws lambda update-function-code \
  --function-name okiteru-api \
  --zip-file fileb://../lambda.zip
```

---

**作成日**: 2025-12-18
**バージョン**: 1.0
