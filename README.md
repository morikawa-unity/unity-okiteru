# Okiteru（おきてる）- スタッフ勤怠・日報管理システム

通信事業部向けのスタッフ管理システム。日々の勤怠管理（起床・出発・到着報告）と日報管理を効率化し、マネージャーがスタッフの状況をリアルタイムで把握できるWebアプリケーション。

---

## 📋 目次

- [概要](#概要)
- [主な機能](#主な機能)
- [技術スタック](#技術スタック)
- [アーキテクチャ](#アーキテクチャ)
- [プロジェクト構成](#プロジェクト構成)
- [環境構築](#環境構築)
- [開発](#開発)
- [デプロイ](#デプロイ)
- [ドキュメント](#ドキュメント)
- [ライセンス](#ライセンス)

---

## 概要

### プロジェクト名
**Okiteru（おきてる）** - スタッフ勤怠・日報管理システム

### 目的
- スタッフの日々の勤怠状況（起床・出発・到着）をリアルタイムで可視化
- 前日報告による翌日の予定把握と準備
- 日報の提出促進と一元管理
- マネージャーの管理業務効率化

### 対象ユーザー
- **スタッフ**: 勤怠報告、日報提出、スケジュール登録
- **マネージャー**: スタッフ管理、勤怠・日報閲覧、現場マスタ管理

---

## 主な機能

### スタッフ機能
- ✅ **前日報告**: 翌日の予定（起床・出発・到着時刻）、身だしなみ写真、経路スクリーンショットの登録
- ✅ **当日勤怠報告**: 起床・出発・到着の時刻、場所、備考、写真の記録
- ✅ **日報作成・提出**: 当日の作業内容を日報として記録・提出
- ✅ **出社可能日登録**: 出勤予定をカレンダー形式で登録

### マネージャー機能
- ✅ **ダッシュボード**: 全スタッフの勤怠状況を一覧表示、未報告・遅延の強調表示
- ✅ **スタッフ管理**: スタッフ一覧、詳細情報、勤怠・日報履歴の閲覧
- ✅ **スケジュール管理**: 全スタッフの出社可能日をカレンダー形式で表示
- ✅ **現場マスタ管理**: 勤務先現場の登録・編集・削除

---

## 技術スタック

### インフラストラクチャ（AWS）
| サービス | 用途 |
|---------|------|
| **CloudFront** | CDN、静的ファイル配信 |
| **S3** | 静的ファイル、画像保存 |
| **API Gateway** | REST APIエンドポイント |
| **Lambda** | サーバーレス処理（FastAPI） |
| **RDS PostgreSQL** | データベース |
| **Cognito** | 認証・認可 |
| **CloudFormation** | IaC（インフラ管理） |

### フロントエンド
| 技術 | バージョン |
|------|-----------|
| React | 18.x |
| Next.js | 14.x (Pages Router) |
| TypeScript | 5.x |
| Tailwind CSS | 3.x |
| TanStack Query | 5.x |
| Zod | 3.x |

### バックエンド
| 技術 | バージョン |
|------|-----------|
| Python | 3.11+ |
| FastAPI | 0.104+ |
| SQLAlchemy | 2.0+ |
| Pydantic | 2.x |
| Alembic | 1.12+ |

---

## アーキテクチャ

### システム構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                         ユーザー（ブラウザ）                         │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CloudFront (CDN)                            │
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

詳細は [ARCHITECTURE.md](docs/ARCHITECTURE.md) を参照。

---

## プロジェクト構成

```
unity-okiteru/
├── README.md                     # 本ファイル
├── CLAUDE.md                     # Claude Code向けガイド
├── docs/                         # ドキュメント
│   ├── ARCHITECTURE.md           # アーキテクチャ設計書
│   ├── DATABASE_DESIGN.md        # DB設計書
│   ├── PROJECT_STRUCTURE.md      # プロジェクト構成
│   └── REQUIREMENTS.md           # 要件定義書
├── infrastructure/               # インフラコード（CloudFormation）
├── frontend/                     # フロントエンドアプリケーション（Next.js）
└── backend/                      # バックエンドアプリケーション（FastAPI）
```

詳細は [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) を参照。

---

## 環境構築

### 前提条件
- **Node.js**: 18.x以上
- **Python**: 3.11以上
- **Docker**: 20.x以上（ローカル開発用）
- **AWS CLI**: 2.x以上（デプロイ用）

### 1. リポジトリクローン

```bash
git clone https://github.com/your-org/unity-okiteru.git
cd unity-okiteru
```

### 2. フロントエンド環境構築

```bash
cd frontend
npm install
cp .env.example .env.local
# .env.localを編集（API URL、Cognito設定等）
npm run dev  # http://localhost:3000
```

### 3. バックエンド環境構築

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env
# .envを編集（DATABASE_URL、Cognito設定等）
uvicorn app.main:app --reload  # http://localhost:8000
```

### 4. データベースセットアップ

```bash
# ローカルPostgreSQL起動（Docker）
docker-compose up -d postgres

# マイグレーション実行
cd backend
alembic upgrade head

# 初期データ投入
python scripts/seed_data.py
```

---

## 開発

### フロントエンド

```bash
cd frontend

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# Lint & Format
npm run lint
npm run format

# テスト
npm run test
npm run test:e2e
```

### バックエンド

```bash
cd backend
source venv/bin/activate

# 開発サーバー起動
uvicorn app.main:app --reload

# Lint & Format
black app/ tests/
ruff check app/ tests/

# テスト
pytest
pytest --cov=app --cov-report=html

# マイグレーション作成
alembic revision -m "description"
alembic upgrade head
```

### APIドキュメント

開発サーバー起動後、以下にアクセス:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## デプロイ

### 前提条件
- AWS アカウント
- AWS CLI設定済み
- CloudFormation スタック作成済み

### 1. インフラストラクチャデプロイ

```bash
cd infrastructure
./scripts/deploy.sh --env production --stack-name okiteru-prod
```

### 2. フロントエンドデプロイ

```bash
cd frontend
npm run build
aws s3 sync out/ s3://okiteru-frontend-prod --delete
aws cloudfront create-invalidation --distribution-id EXXX --paths "/*"
```

### 3. バックエンドデプロイ

```bash
cd backend
pip install -r requirements.txt -t package/
cp -r app package/
cd package
zip -r ../lambda.zip .
aws lambda update-function-code \
  --function-name okiteru-api-prod \
  --zip-file fileb://../lambda.zip
```

### CI/CD（GitHub Actions）

- **開発環境**: `develop`ブランチへのpushで自動デプロイ
- **ステージング**: `release`ブランチへのpushで自動デプロイ
- **本番環境**: `main`ブランチへのpushまたはタグ作成で自動デプロイ

---

## ドキュメント

| ドキュメント | 説明 |
|------------|------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | システムアーキテクチャ、技術スタック、設計パターン |
| [DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) | データベース設計、テーブル定義、ER図 |
| [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | ディレクトリ構成、ファイル役割、命名規則 |
| [REQUIREMENTS.md](docs/REQUIREMENTS.md) | 機能要件、非機能要件、API仕様 |
| [CLAUDE.md](CLAUDE.md) | Claude Code向け開発ガイド |

---

## ライセンス

Proprietary - 社内利用専用

---

## 開発チーム

- **プロジェクトマネージャー**: -
- **バックエンド**: -
- **フロントエンド**: -
- **インフラ**: -

---

## サポート

質問や問題がある場合は、以下にお問い合わせください:
- **GitHub Issues**: https://github.com/your-org/unity-okiteru/issues
- **Slack**: #okiteru-support

---

**作成日**: 2025-12-18
**バージョン**: 1.0
