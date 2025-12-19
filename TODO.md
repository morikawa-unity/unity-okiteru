# Okiteru - TODO & 次のステップ

最終更新: 2025-12-19 12:15 JST

---

## 📋 完了済み

### ✅ プロジェクト構造整理

- [x] Dashboard 画面を Home 画面に統合（ルート画面化）
- [x] components/dashboard → components/home に変更
- [x] containers/dashboard → containers/home に変更
- [x] pages/dashboard → pages/index.tsx に統合
- [x] タブ切り替えで勤怠報告・出社可能日・日報を管理
- [x] Container ファイルを .tsx → .ts に変更（ロジック分離）
- [x] types/home.ts 作成（型定義の一元管理）
- [x] HomeTab を enum として lib/enums.ts に追加
- [x] pages/login をフォルダ構造に変更

### ✅ バックエンド開発

- [x] FastAPI プロジェクト構造構築
- [x] データベースモデル定義（User、PreviousDayReport）
- [x] Alembic マイグレーション設定
- [x] 前日報告 API 実装（CRUD）
- [x] リポジトリ・サービス層実装
- [x] ローカル開発環境構築（Docker Compose + PostgreSQL）

### ✅ フロントエンド開発

- [x] Next.js プロジェクト構造構築
- [x] ホーム画面統合（勤怠報告・出社可能日・日報）
- [x] 前日報告フォームコンポーネント作成
- [x] API 通信層実装（TanStack Query）
- [x] カスタムフック作成（usePreviousDayReport）
- [x] ローカル開発環境動作確認

### ✅ インフラストラクチャ

- [x] CloudFormation テンプレート作成（統合版）
  - [x] 01-network.yaml（VPC、サブネット、セキュリティグループ）
  - [x] 02-database.yaml（RDS PostgreSQL）
  - [x] 03-cognito.yaml（Cognito User Pool）
  - [x] 04-storage.yaml（S3 バケット）
  - [x] 05-lambda-api.yaml（Lambda & API Gateway）
  - [x] 06-cloudfront.yaml（CloudFront Distribution）
  - [x] 07-codepipeline.yaml（CI/CD Pipeline）
- [x] パラメータファイル作成（development / staging / production）
- [x] deploy.sh 統合スクリプト作成
- [x] インフラ README 作成

### ✅ CI/CD（CodePipeline 統合）

- [x] buildspec.yml 作成（CodeBuild 用ビルド仕様）
- [x] 07-codepipeline.yaml 作成（CloudFormation に統合）
- [x] infra/cloudformation に統合（一元管理）
- [x] 不要フォルダ削除（infra/codepipeline/, infra/dev/）
- [x] パラメータファイル更新（GitHub 設定追加）
- [x] ドキュメント更新（CICD_SETUP.md, ARCHITECTURE.md 等）

---

## 🚧 未完了・次のステップ

### Phase 1: AWS 初回環境構築 🟡 **最優先**

> **目的**: 各環境（dev/staging/prod）の AWS インフラを構築し、CodePipeline で自動デプロイできる状態にする

---

#### ステップ 0: 事前準備

##### 0.1 AWS CLI 設定確認

- [ ] AWS CLI v2 インストール済み
- [ ] AWS 認証情報設定済み（`aws configure`）
- [ ] リージョン: `ap-northeast-1`（東京）

```bash
# AWS CLI バージョン確認
aws --version
# aws-cli/2.x.x 以上

# 認証情報確認
aws sts get-caller-identity
```

##### 0.2 GitHub Personal Access Token 取得

- [ ] GitHub Settings → Developer settings → Personal access tokens
- [ ] "Generate new token (classic)" をクリック
- [ ] 権限付与: `repo` (全て), `admin:repo_hook` (全て)
- [ ] トークンをコピー（後で使用）

##### 0.3 GitHub Token を Secrets Manager に保存

- [ ] Secrets Manager に保存

```bash
aws secretsmanager create-secret \
  --name github-token \
  --description "GitHub Personal Access Token for CodePipeline" \
  --secret-string '{"token":"ghp_your_token_here"}' \
  --region ap-northeast-1
```

##### 0.4 パラメータファイル確認・編集

- [ ] `infra/parameters-development.json` 確認
- [ ] `infra/parameters-staging.json` 確認
- [ ] `infra/parameters-production.json` 確認
  - DBPassword を強力なパスワードに変更
  - FrontendDomain を実際のドメインに変更（未決定なら空）

---

#### ステップ 1: 開発環境（dev）インフラデプロイ

> **所要時間**: 約 30-40 分
> **対象環境**: ローカル開発時に接続する開発用 AWS 環境

##### 1.1 ネットワーク層デプロイ（約 5 分）

- [ ] VPC、サブネット、NAT Gateway、セキュリティグループの作成

```bash
ENV=development
REGION=ap-northeast-1

cd infra/cloudformation

aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-network \
  --template-body file://01-network.yaml \
  --parameters file://parameters-${ENV}.json \
  --region ${REGION}

# デプロイ完了待機
aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-network \
  --region ${REGION}
```

##### 1.2 ストレージ層デプロイ（約 2 分）

- [ ] S3 バケット作成（フロントエンド、写真、Lambda 用）

```bash
aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-storage \
  --template-body file://04-storage.yaml \
  --parameters file://parameters-${ENV}.json \
  --region ${REGION}

aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-storage \
  --region ${REGION}
```

##### 1.3 認証層デプロイ（約 2 分）

- [ ] Cognito User Pool、Client、Identity Pool 作成

```bash
aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-cognito \
  --template-body file://03-cognito.yaml \
  --parameters file://parameters-${ENV}.json \
  --region ${REGION}

aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-cognito \
  --region ${REGION}

# Cognito情報取得（重要：後で使用）
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name ${ENV}-okiteru-cognito \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text)

CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name ${ENV}-okiteru-cognito \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text)

echo "USER_POOL_ID: ${USER_POOL_ID}"
echo "CLIENT_ID: ${CLIENT_ID}"
```

##### 1.4 データベース層デプロイ（約 10 分）

- [ ] RDS PostgreSQL インスタンス作成

```bash
aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-database \
  --template-body file://02-database.yaml \
  --parameters file://parameters-${ENV}.json \
  --region ${REGION}

aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-database \
  --region ${REGION}

# RDSエンドポイント取得
RDS_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name ${ENV}-okiteru-database \
  --query 'Stacks[0].Outputs[?OutputKey==`DBInstanceEndpoint`].OutputValue' \
  --output text)

echo "RDS_ENDPOINT: ${RDS_ENDPOINT}"
```

##### 1.5 データベースマイグレーション実行

- [ ] Alembic マイグレーション実行
- [ ] 初期データ投入

```bash
# データベース接続情報を環境変数に設定
export DATABASE_URL="postgresql://okiteru_admin:YOUR_PASSWORD@${RDS_ENDPOINT}:5432/okiteru"

cd ../../backend
source venv/bin/activate

# マイグレーション実行
alembic upgrade head

# 初期データ投入
python scripts/seed_data.py
```

##### 1.6 Lambda & API Gateway 層デプロイ（約 3 分）

- [ ] Lambda パッケージビルド & S3 アップロード
- [ ] Lambda 関数、API Gateway 作成

```bash
# Lambdaパッケージビルド
cd backend
rm -rf package
mkdir -p package

pip install -r requirements.txt -t package/ \
  --platform manylinux2014_x86_64 \
  --only-binary=:all:

cp -r app package/
cp lambda_handler.py package/

cd package
zip -r ../lambda-deployment.zip . -x '*.pyc' -x '*__pycache__*'
cd ..

# S3にアップロード
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
S3_BUCKET="${ENV}-okiteru-lambda-deployment-${ACCOUNT_ID}"

aws s3 cp lambda-deployment.zip \
  s3://${S3_BUCKET}/lambda/okiteru-api-latest.zip

# Lambda & API Gatewayスタック作成
cd ../infra/cloudformation

aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-lambda-api \
  --template-body file://05-lambda-api.yaml \
  --parameters file://parameters-${ENV}.json \
    ParameterKey=LambdaS3Bucket,ParameterValue=${S3_BUCKET} \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ${REGION}

aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-lambda-api \
  --region ${REGION}

# API Gateway URL取得
API_URL=$(aws cloudformation describe-stacks \
  --stack-name ${ENV}-okiteru-lambda-api \
  --query 'Stacks[0].Outputs[?OutputKey==`RestApiUrl`].OutputValue' \
  --output text)

echo "API_URL: ${API_URL}"
```

##### 1.7 CloudFront 層デプロイ（約 15 分）

- [ ] CloudFront Distribution 作成

```bash
aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-cloudfront \
  --template-body file://06-cloudfront.yaml \
  --parameters file://parameters-${ENV}.json \
  --region ${REGION}

aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-cloudfront \
  --region ${REGION}

# CloudFront URL取得
CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name ${ENV}-okiteru-cloudfront \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontUrl`].OutputValue' \
  --output text)

echo "CLOUDFRONT_URL: ${CLOUDFRONT_URL}"
```

##### 1.8 Parameter Store に環境変数を設定

- [ ] CodePipeline 用の環境変数を Parameter Store に登録

```bash
# S3バケット名
aws ssm put-parameter \
  --name /okiteru/dev/s3-bucket-name \
  --value "${ENV}-okiteru-frontend-${ACCOUNT_ID}" \
  --type String \
  --region ${REGION}

# Lambda関数名
aws ssm put-parameter \
  --name /okiteru/dev/lambda-function-name \
  --value "${ENV}-okiteru-api" \
  --type String \
  --region ${REGION}

# データベースURL（SecureString推奨）
aws ssm put-parameter \
  --name /okiteru/dev/database-url \
  --value "${DATABASE_URL}" \
  --type SecureString \
  --region ${REGION}

# Cognito User Pool ID
aws ssm put-parameter \
  --name /okiteru/dev/cognito-user-pool-id \
  --value "${USER_POOL_ID}" \
  --type String \
  --region ${REGION}

# Cognito Client ID
aws ssm put-parameter \
  --name /okiteru/dev/cognito-client-id \
  --value "${CLIENT_ID}" \
  --type String \
  --region ${REGION}
```

##### 1.9 テストユーザー作成

- [ ] Cognito User Pool にテストユーザー作成

```bash
# スタッフユーザー作成
aws cognito-idp admin-create-user \
  --user-pool-id ${USER_POOL_ID} \
  --username staff@example.com \
  --user-attributes \
    Name=email,Value=staff@example.com \
    Name=name,Value="テストスタッフ" \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

aws cognito-idp admin-add-user-to-group \
  --user-pool-id ${USER_POOL_ID} \
  --username staff@example.com \
  --group-name staff

# マネージャーユーザー作成
aws cognito-idp admin-create-user \
  --user-pool-id ${USER_POOL_ID} \
  --username manager@example.com \
  --user-attributes \
    Name=email,Value=manager@example.com \
    Name=name,Value="テストマネージャー" \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

aws cognito-idp admin-add-user-to-group \
  --user-pool-id ${USER_POOL_ID} \
  --username manager@example.com \
  --group-name manager
```

---

#### ステップ 2: 統合デプロイ（development 環境）

> **目的**: 全インフラ（CodePipeline も含む）を一括デプロイ

##### 2.1 パラメータファイル確認・編集

- [ ] `infra/parameters-development.json` の `GitHubOwner` を実際のユーザー名に変更

```bash
cd infra
vim parameters-development.json
# "GitHubOwner": "your-github-username" を実際のユーザー名に変更
```

##### 2.2 統合デプロイ実行

- [ ] 全スタック（CodePipeline も含む）を一括デプロイ

```bash
# 全7つのスタックを順次デプロイ（約30-40分）
./deploy.sh --env development
```

##### 2.3 動作確認

- [ ] テストコミット＆プッシュで自動デプロイが動作することを確認

```bash
git checkout develop
git commit --allow-empty -m "test: trigger pipeline"
git push origin develop

# AWSコンソールでCodePipelineを確認
# https://console.aws.amazon.com/codesuite/codepipeline/pipelines
# パイプライン名: okiteru-pipeline-development
```

---

---

## 🎯 開発環境優先の作業計画

### 次のステップ: Development 環境のみ構築 🟡 **最優先**

> **方針**: まずは開発環境のみを完全に構築し、動作確認後に Staging/Production を構築

#### 実行手順（Development 環境のみ）

1. **事前準備**

   - [ ] AWS CLI 設定確認
   - [ ] GitHub Personal Access Token 取得・設定
   - [ ] parameters-development.json の GitHubOwner 編集

2. **統合デプロイ実行**

   ```bash
   cd infra
   ./deploy.sh --env development
   ```

3. **動作確認**

   - [ ] 全スタックのデプロイ完了確認
   - [ ] CodePipeline の動作確認（テスト push）
   - [ ] フロントエンド・バックエンドの動作確認

4. **開発環境での機能実装・テスト**

   - [ ] Phase 2（機能実装）を開発環境で実施
   - [ ] 十分なテスト・検証を実施

5. **Staging/Production 環境構築（後回し）**
   - 開発環境での動作確認完了後に実施

---

#### 後回し: Staging/Production 環境構築 🔵 **低優先度**

> **実施タイミング**: 開発環境での機能実装・テストが完了してから

##### Staging 環境構築

- [ ] parameters-staging.json の確認・編集
- [ ] `./deploy.sh --env staging` 実行
- [ ] 動作確認

##### Production 環境構築

- [ ] parameters-production.json の確認・編集（DBPassword、ドメイン等）
- [ ] `./deploy.sh --env production` 実行
- [ ] 動作確認

---

### Phase 2: 機能実装 🔴 **未着手**

#### 2.1 勤怠記録 API

- [ ] 起床報告 API（POST `/api/attendance/wakeup`）
- [ ] 出発報告 API（POST `/api/attendance/departure`）
- [ ] 到着報告 API（POST `/api/attendance/arrival`）
- [ ] 勤怠履歴取得 API（GET `/api/attendance/history`）

#### 2.2 日報 API

- [ ] 日報作成 API（POST `/api/daily-reports`）
- [ ] 日報取得 API（GET `/api/daily-reports/{id}`）
- [ ] 日報一覧 API（GET `/api/daily-reports`）
- [ ] 日報更新 API（PUT `/api/daily-reports/{id}`）

#### 2.3 スタッフ管理 API（マネージャー向け）

- [ ] スタッフ一覧 API（GET `/api/staff`）
- [ ] スタッフ詳細 API（GET `/api/staff/{id}`）
- [ ] 出社可能日設定 API（POST `/api/staff/{id}/availability`）

#### 2.4 現場管理 API

- [ ] 現場一覧 API（GET `/api/worksites`）
- [ ] 現場登録 API（POST `/api/worksites`）
- [ ] 現場更新 API（PUT `/api/worksites/{id}`）

#### 2.5 S3 画像アップロード実装

- [ ] 署名付き URL 生成 API（POST `/api/upload/presigned-url`）
- [ ] フロントエンド画像アップロードフック（`useImageUpload`）
- [ ] 前日報告フォームに画像アップロード統合

---

### Phase 3: 認証実装 🔴 **未着手**

- [ ] AuthContext の Cognito 連携実装
- [ ] ログイン画面実装
- [ ] トークン管理実装（localStorage）
- [ ] API Gateway で Cognito Authorizer 有効化

---

### Phase 4: テスト 🔴 **未着手**

#### 4.1 バックエンドテスト

- [ ] ユニットテスト作成（pytest）
- [ ] API 統合テスト
- [ ] テストカバレッジ 80%以上

#### 4.2 フロントエンドテスト

- [ ] コンポーネントテスト（Jest + React Testing Library）
- [ ] E2E テスト（Playwright または Cypress）

---

### Phase 5: 監視・セキュリティ 🔴 **未着手**

#### 5.1 CloudWatch 設定

- [ ] Lambda 関数のログ確認
- [ ] API Gateway のアクセスログ
- [ ] RDS のパフォーマンスインサイト有効化

#### 5.2 アラート設定

- [ ] Lambda エラー率アラート
- [ ] API Gateway 5xx エラーアラート
- [ ] RDS CPU 使用率アラート

#### 5.3 セキュリティ強化

- [ ] S3 バケットポリシー見直し
- [ ] IAM ロールの最小権限原則適用
- [ ] Secrets Manager でのシークレットローテーション設定

---

### Phase 6: ドキュメント整備 🔴 **未着手**

- [ ] API 仕様書作成（OpenAPI / Swagger）
- [ ] 運用マニュアル作成
- [ ] トラブルシューティングガイド更新

---

## 🎯 優先順位（推奨）

### 最優先: Development 環境構築 🟡

1. ⏳ Development 環境の統合デプロイ ← **次はこれ！**
   - 全 7 スタック（CodePipeline も含む）を一括デプロイ
   - `./deploy.sh --env development`
2. ⏳ 動作確認・テスト
3. ⏳ 機能実装（Phase 2）を開発環境で実施

**完了後の状態**: 開発環境で GitHub への push で自動デプロイが動作する

---

### 低優先度: Staging/Production 環境構築 🔵

- 開発環境での動作確認完了後に実施
- 同様の手順で `./deploy.sh --env staging/production`

---

### その後: Phase 3〜6（認証・テスト・監視・ドキュメント） 🔴

品質・セキュリティの向上

---

## 📝 デプロイフロー（確認）

```
1. ローカルで開発
   ↓
2. git push (develop / staging / main)
   ↓
3. GitHub（ソース更新） ✅ ソースが保存される
   ↓ webhook（自動検知）
4. CodePipeline（自動起動） ✅
   ↓
5. CodeBuild（ビルド・テスト） ✅
   ↓
6. Lambda + S3へ自動デプロイ ✅
```

---

## 🌳 ブランチ戦略

| 環境            | ブランチ  | 自動デプロイ | 承認     |
| --------------- | --------- | ------------ | -------- |
| **development** | `develop` | ✅           | 不要     |
| **staging**     | `staging` | ✅           | 不要     |
| **production**  | `main`    | ✅           | **必要** |

---

**最終更新**: 2025-12-19 15:30 JST
**次回レビュー**: Development 環境構築完了後
