# Okiteru - TODO & 次のステップ

最終更新: 2025-12-18 23:30 JST

---

## 📋 完了済み

### ✅ バックエンド開発
- [x] FastAPI プロジェクト構造構築
- [x] データベースモデル定義（User、PreviousDayReport）
- [x] Alembic マイグレーション設定
- [x] 前日報告API実装（CRUD）
- [x] リポジトリ・サービス層実装
- [x] ローカル開発環境構築（Docker Compose + PostgreSQL）

### ✅ フロントエンド開発
- [x] Next.js プロジェクト構造構築
- [x] 前日報告フォームコンポーネント作成
- [x] API通信層実装（TanStack Query）
- [x] カスタムフック作成（usePreviousDayReport）
- [x] ローカル開発環境動作確認

### ✅ インフラストラクチャ
- [x] CloudFormation テンプレート作成
  - [x] ネットワーク層（VPC、サブネット）
  - [x] データベース層（RDS PostgreSQL）
  - [x] 認証層（Cognito）
  - [x] ストレージ層（S3）
  - [x] Lambda & API Gateway層
  - [x] CloudFront層
- [x] パラメータファイル作成（production / staging）
- [x] インフラREADME作成

### ✅ CI/CD（デプロイ自動化）
- [x] Lambda ハンドラー作成（`backend/lambda_handler.py`）
- [x] Lambda パッケージングスクリプト作成
- [x] GitHub Actions - Backend デプロイ
- [x] GitHub Actions - Frontend デプロイ
- [x] CI/CD セットアップドキュメント作成

---

## 🚧 進行中・次のステップ

### 1. Lambda デプロイ準備 ✅ **完了**

#### 1.1 Lambda ハンドラー作成
- [x] `backend/lambda_handler.py` 作成 ✅
  - FastAPI アプリケーションをLambda用にラップ
  - Mangum（ASGI adapter）を使用

#### 1.2 Lambda パッケージング スクリプト作成
- [x] `backend/scripts/package-lambda.sh` 作成 ✅
  - 依存関係のインストール
  - zipファイル作成

#### 1.3 requirements.txt にMangum追加
- [x] `backend/requirements.txt` に `mangum==0.17.0` を追加 ✅

---

### 2. AWSデプロイ準備

#### 2.1 パラメータファイル設定
- [ ] `infra/cloudformation/parameters-production-local.json` 作成
  - `parameters-production.json` をコピー
  - `DBPassword` を安全なパスワードに変更
  - `FrontendDomain` を実際のドメインに変更（未決定の場合は空文字列）

#### 2.2 AWS CLI 設定
- [ ] AWS CLI v2 インストール確認
- [ ] AWS 認証情報設定 (`aws configure`)
- [ ] デプロイ先リージョン確認（推奨: ap-northeast-1）

---

### 3. インフラデプロイ（CloudFormation）

#### 3.1 スタック作成順序

**自動で設定されるもの**:
- ✅ VPC、サブネット、ルートテーブル、NAT Gateway
- ✅ セキュリティグループ（Lambda、RDS用）
- ✅ RDS PostgreSQL インスタンス
- ✅ Secrets Manager（DB認証情報）
- ✅ Cognito User Pool & Identity Pool
- ✅ S3バケット（フロントエンド、写真、Lambda）
- ✅ Lambda 関数（コードは別途アップロード必要）
- ✅ API Gateway（REST API）
- ✅ CloudFront Distribution
- ✅ IAM ロール & ポリシー

**手動で必要なもの**:
- ❌ Lambda デプロイパッケージのS3アップロード
- ❌ データベースマイグレーション実行
- ❌ 初期データ投入
- ❌ フロントエンドビルド & S3アップロード

#### デプロイ手順
```bash
ENV=production
REGION=ap-northeast-1

# 1. ネットワーク層（約5分）
aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-network \
  --template-body file://infra/cloudformation/01-network.yaml \
  --parameters file://infra/cloudformation/parameters-${ENV}-local.json \
  --region ${REGION}

# 待機
aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-network --region ${REGION}

# 2. ストレージ層（約2分）
aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-storage \
  --template-body file://infra/cloudformation/04-storage.yaml \
  --parameters file://infra/cloudformation/parameters-${ENV}-local.json \
  --region ${REGION}

# 3. 認証層（約2分）- 並列実行可
aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-cognito \
  --template-body file://infra/cloudformation/03-cognito.yaml \
  --parameters file://infra/cloudformation/parameters-${ENV}-local.json \
  --region ${REGION}

# 待機
aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-storage --region ${REGION}
aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-cognito --region ${REGION}

# 4. データベース層（約10分）
aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-database \
  --template-body file://infra/cloudformation/02-database.yaml \
  --parameters file://infra/cloudformation/parameters-${ENV}-local.json \
  --region ${REGION}

# 待機
aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-database --region ${REGION}

# 5. Lambda パッケージアップロード
cd backend
./scripts/package-lambda.sh
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws s3 cp lambda-deployment.zip \
  s3://${ENV}-okiteru-lambda-deployment-${ACCOUNT_ID}/lambda/okiteru-api-latest.zip

# 6. Lambda & API Gateway層（約3分）
cd ../infra/cloudformation
aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-lambda-api \
  --template-body file://05-lambda-api.yaml \
  --parameters file://parameters-${ENV}-local.json \
    ParameterKey=LambdaS3Bucket,ParameterValue=${ENV}-okiteru-lambda-deployment-${ACCOUNT_ID} \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ${REGION}

# 待機
aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-lambda-api --region ${REGION}

# 7. CloudFront層（約15分）
aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-cloudfront \
  --template-body file://06-cloudfront.yaml \
  --parameters file://parameters-${ENV}-local.json \
  --region ${REGION}

# 待機
aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-cloudfront --region ${REGION}
```

- [ ] ネットワーク層デプロイ
- [ ] ストレージ層デプロイ
- [ ] 認証層デプロイ
- [ ] データベース層デプロイ
- [ ] Lambda パッケージアップロード
- [ ] Lambda & API Gateway層デプロイ
- [ ] CloudFront層デプロイ

---

### 4. データベースセットアップ

#### 4.1 マイグレーション実行
- [ ] RDS エンドポイント取得
- [ ] VPN または踏み台サーバー経由でRDS接続
- [ ] Alembic マイグレーション実行

```bash
# RDSエンドポイント取得
RDS_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name production-okiteru-database \
  --query 'Stacks[0].Outputs[?OutputKey==`DBInstanceEndpoint`].OutputValue' \
  --output text)

# 環境変数設定
export DATABASE_URL="postgresql://okiteru_admin:YOUR_PASSWORD@${RDS_ENDPOINT}:5432/okiteru"

# マイグレーション実行
cd backend
source venv/bin/activate
alembic upgrade head
```

#### 4.2 初期データ投入
- [ ] シードデータスクリプト作成（`backend/scripts/seed_production.py`）
- [ ] 初期ユーザー作成
- [ ] マスターデータ投入

---

### 5. フロントエンドデプロイ

#### 5.1 環境変数設定
- [ ] `.env.production` 作成

```bash
# frontend/.env.production
NEXT_PUBLIC_API_URL=https://YOUR_CLOUDFRONT_DOMAIN/api
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1
NEXT_PUBLIC_S3_BUCKET_URL=https://YOUR_CLOUDFRONT_DOMAIN/photos
```

#### 5.2 ビルド & デプロイ
- [ ] Next.js ビルド実行
- [ ] S3 にアップロード
- [ ] CloudFront キャッシュ無効化

```bash
cd frontend

# ビルド
npm run build

# S3アップロード
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws s3 sync out/ s3://production-okiteru-frontend-${ACCOUNT_ID}/ --delete

# CloudFront キャッシュ無効化
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name production-okiteru-cloudfront \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

aws cloudfront create-invalidation \
  --distribution-id ${DISTRIBUTION_ID} \
  --paths "/*"
```

---

### 6. 認証設定

#### 6.1 Cognito 初期設定
- [ ] Cognito User Pool にテストユーザー作成
- [ ] スタッフグループ・マネージャーグループへのユーザー追加
- [ ] メール検証設定確認

#### 6.2 フロントエンド認証実装
- [ ] `AuthContext` の Cognito 連携実装
- [ ] ログイン画面実装
- [ ] トークン管理実装

---

### 7. 機能実装（残りのAPI）

#### 7.1 勤怠記録API
- [ ] 起床報告API（POST `/api/attendance/wakeup`）
- [ ] 出発報告API（POST `/api/attendance/departure`）
- [ ] 到着報告API（POST `/api/attendance/arrival`）
- [ ] 勤怠履歴取得API（GET `/api/attendance/history`）

#### 7.2 日報API
- [ ] 日報作成API（POST `/api/daily-reports`）
- [ ] 日報取得API（GET `/api/daily-reports/{id}`）
- [ ] 日報一覧API（GET `/api/daily-reports`）
- [ ] 日報更新API（PUT `/api/daily-reports/{id}`）

#### 7.3 スタッフ管理API（マネージャー向け）
- [ ] スタッフ一覧API（GET `/api/staff`）
- [ ] スタッフ詳細API（GET `/api/staff/{id}`）
- [ ] 出社可能日設定API（POST `/api/staff/{id}/availability`）

#### 7.4 現場管理API
- [ ] 現場一覧API（GET `/api/worksites`）
- [ ] 現場登録API（POST `/api/worksites`）
- [ ] 現場更新API（PUT `/api/worksites/{id}`）

---

### 8. S3 画像アップロード実装

#### 8.1 署名付きURL生成API
- [ ] `backend/app/routers/upload.py` 作成
- [ ] S3 署名付きURL生成エンドポイント（POST `/api/upload/presigned-url`）

#### 8.2 フロントエンド画像アップロード
- [ ] 画像アップロードフック作成（`useImageUpload`）
- [ ] 前日報告フォームに画像アップロード統合

---

### 9. テスト

#### 9.1 バックエンドテスト
- [ ] ユニットテスト作成（pytest）
- [ ] API統合テスト
- [ ] テストカバレッジ80%以上

#### 9.2 フロントエンドテスト
- [ ] コンポーネントテスト（Jest + React Testing Library）
- [ ] E2Eテスト（Playwright または Cypress）

---

### 10. CI/CD パイプライン ✅ **完了**

#### 10.1 GitHub Actions 設定
- [x] `.github/workflows/backend-deploy.yml` 作成 ✅
  - テスト実行
  - Lambda パッケージビルド
  - S3アップロード
  - Lambda デプロイ自動化
- [x] `.github/workflows/frontend-deploy.yml` 作成 ✅
  - Lint、テスト実行
  - Next.js ビルド
  - S3 デプロイ自動化
  - CloudFront キャッシュ無効化
- [x] `docs/CICD_SETUP.md` 作成 ✅
  - セットアップ手順
  - トラブルシューティング
  - セキュリティベストプラクティス

**git pushで自動デプロイが動作します！**

---

### 11. 監視・ログ

#### 11.1 CloudWatch 設定
- [ ] Lambda 関数のログ確認
- [ ] API Gateway のアクセスログ
- [ ] RDS のパフォーマンスインサイト有効化

#### 11.2 アラート設定
- [ ] Lambda エラー率アラート
- [ ] API Gateway 5xxエラーアラート
- [ ] RDS CPU使用率アラート

---

### 12. セキュリティ強化

- [ ] API Gateway で Cognito Authorizer 有効化（現在はコメントアウト）
- [ ] S3 バケットポリシー見直し
- [ ] IAM ロールの最小権限原則適用
- [ ] Secrets Manager でのシークレットローテーション設定

---

### 13. ドキュメント整備

- [ ] API仕様書作成（OpenAPI / Swagger）
- [ ] 運用マニュアル作成
- [ ] デプロイ手順書更新
- [ ] トラブルシューティングガイド作成

---

## 🎯 優先順位（推奨）

### Phase 1: デプロイ可能な最小構成 🟡 **進行中**
1. ✅ Lambda ハンドラー & パッケージング準備（完了）
2. ✅ CI/CD パイプライン構築（完了）
3. ⏳ CloudFormation デプロイ（全スタック）← **次はこれ！**
4. ⏳ データベースマイグレーション実行
5. ⏳ GitHub Secrets 設定
6. ⏳ 前日報告機能の動作確認

**進捗: 33% (2/6)**

### Phase 2: 基本機能実装 🔴 **未着手**
1. 勤怠記録API実装
2. S3 画像アップロード実装
3. Cognito 認証統合

### Phase 3: 管理機能実装 🔴 **未着手**
1. 日報API実装
2. スタッフ管理API実装
3. 現場管理API実装

### Phase 4: 品質向上 🟢 **一部完了**
1. テスト作成（未着手）
2. ✅ CI/CD パイプライン構築（完了）
3. 監視・アラート設定（未着手）

---

## 📝 メモ

### 環境ごとの自動設定について

**CloudFormation で自動設定される内容**:
- ✅ 環境名（`EnvironmentName` パラメータ）に基づいてすべてのリソース名が自動的に設定されます
- ✅ 例: `production-okiteru-vpc`, `staging-okiteru-rds-sg` など
- ✅ 各環境（production / staging / development）で独立したスタックが作成されます
- ✅ 環境間でリソースが干渉することはありません

**環境ごとに異なる設定**:
- RDS インスタンスサイズ（production: db.t4g.small, staging: db.t4g.micro）
- バックアップ保持期間（production: 7日, staging: 3日）
- Lambda メモリサイズ（production: 512MB, staging: 256MB）

**デプロイ後の手動作業が必要な理由**:
1. **セキュリティ**: DBパスワードはCloudFormation外で管理
2. **アプリケーションコード**: Lambda パッケージは別途ビルド & アップロード
3. **データベースマイグレーション**: スキーマ変更は Alembic で管理
4. **フロントエンドビルド**: Next.js の出力は環境ごとに異なる

---

**最終更新**: 2025-12-18
**次回レビュー**: Phase 1 完了後
