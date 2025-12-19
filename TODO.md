# Okiteru - TODO & 次のステップ

最終更新: 2025-12-19 12:15 JST

---

## 📋 完了済み

### ✅ プロジェクト構造整理
- [x] Dashboard画面をHome画面に統合（ルート画面化）
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
- [x] 前日報告API実装（CRUD）
- [x] リポジトリ・サービス層実装
- [x] ローカル開発環境構築（Docker Compose + PostgreSQL）

### ✅ フロントエンド開発
- [x] Next.js プロジェクト構造構築
- [x] ホーム画面統合（勤怠報告・出社可能日・日報）
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
- [x] パラメータファイル作成（dev / staging / prod）
- [x] インフラREADME作成

### ✅ CI/CD（CodePipeline）
- [x] buildspec.yml 作成（CodeBuild用ビルド仕様）
- [x] CloudFormation template 作成（CodePipeline本体）
- [x] 環境別デプロイスクリプト作成（dev / staging / prod）
- [x] CodePipeline セットアップドキュメント作成
- [x] GitHub Actions ワークフロー削除（CodePipelineに移行）

---

## 🚧 未完了・次のステップ

### Phase 1: AWS初回環境構築 🟡 **最優先**

> **目的**: 各環境（dev/staging/prod）のAWSインフラを構築し、CodePipelineで自動デプロイできる状態にする

---

#### ステップ0: 事前準備

##### 0.1 AWS CLI設定確認
- [ ] AWS CLI v2インストール済み
- [ ] AWS認証情報設定済み（`aws configure`）
- [ ] リージョン: `ap-northeast-1`（東京）

```bash
# AWS CLI バージョン確認
aws --version
# aws-cli/2.x.x 以上

# 認証情報確認
aws sts get-caller-identity
```

##### 0.2 GitHub Personal Access Token取得
- [ ] GitHub Settings → Developer settings → Personal access tokens
- [ ] "Generate new token (classic)" をクリック
- [ ] 権限付与: `repo` (全て), `admin:repo_hook` (全て)
- [ ] トークンをコピー（後で使用）

##### 0.3 GitHub Token を Secrets Manager に保存
- [ ] Secrets Managerに保存

```bash
aws secretsmanager create-secret \
  --name github-token \
  --description "GitHub Personal Access Token for CodePipeline" \
  --secret-string '{"token":"ghp_your_token_here"}' \
  --region ap-northeast-1
```

##### 0.4 パラメータファイル確認・編集
- [ ] `infra/cloudformation/parameters-development.json` 確認
- [ ] `infra/cloudformation/parameters-staging.json` 確認
- [ ] `infra/cloudformation/parameters-production.json` 確認
  - DBPassword を強力なパスワードに変更
  - FrontendDomain を実際のドメインに変更（未決定なら空）

---

#### ステップ1: 開発環境（dev）インフラデプロイ

> **所要時間**: 約30-40分
> **対象環境**: ローカル開発時に接続する開発用AWS環境

##### 1.1 ネットワーク層デプロイ（約5分）
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

##### 1.2 ストレージ層デプロイ（約2分）
- [ ] S3バケット作成（フロントエンド、写真、Lambda用）

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

##### 1.3 認証層デプロイ（約2分）
- [ ] Cognito User Pool、Client、Identity Pool作成

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

##### 1.4 データベース層デプロイ（約10分）
- [ ] RDS PostgreSQLインスタンス作成

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
- [ ] Alembicマイグレーション実行
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

##### 1.6 Lambda & API Gateway層デプロイ（約3分）
- [ ] Lambdaパッケージビルド & S3アップロード
- [ ] Lambda関数、API Gateway作成

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

##### 1.7 CloudFront層デプロイ（約15分）
- [ ] CloudFront Distribution作成

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
- [ ] CodePipeline用の環境変数をParameter Storeに登録

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
- [ ] Cognito User Poolにテストユーザー作成

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

#### ステップ2: CodePipeline セットアップ（dev環境）

> **目的**: GitHubへのpushで自動デプロイが動く環境を構築

##### 2.1 デプロイスクリプト編集
- [ ] `infra/codepipeline/deploy-dev.sh` の `GITHUB_OWNER` を変更

```bash
cd infra/codepipeline
vim deploy-dev.sh
# GITHUB_OWNER="your-github-username" を実際のユーザー名に変更
```

##### 2.2 CodePipeline デプロイ
- [ ] CodePipeline作成

```bash
./deploy-dev.sh
```

##### 2.3 動作確認
- [ ] テストコミット＆プッシュで自動デプロイが動作することを確認

```bash
git checkout develop
git commit --allow-empty -m "test: trigger pipeline"
git push origin develop

# AWSコンソールでCodePipelineを確認
# https://console.aws.amazon.com/codesuite/codepipeline/pipelines
```

---

#### ステップ3: Staging環境構築

> **所要時間**: 約30-40分（dev環境と同様の手順）

- [ ] 環境変数を `ENV=staging` に変更
- [ ] ステップ1（1.1〜1.9）を実行
- [ ] Parameter Storeに環境変数設定（staging用）
- [ ] CodePipeline セットアップ（`deploy-staging.sh`）

---

#### ステップ4: Production環境構築

> **所要時間**: 約30-40分（dev環境と同様の手順）

- [ ] 環境変数を `ENV=production` に変更
- [ ] パラメータファイル確認（DBPassword、ドメイン等）
- [ ] ステップ1（1.1〜1.9）を実行
- [ ] Parameter Storeに環境変数設定（production用）
- [ ] CodePipeline セットアップ（`deploy-prod.sh`）

---

### Phase 2: 機能実装 🔴 **未着手**

#### 2.1 勤怠記録API
- [ ] 起床報告API（POST `/api/attendance/wakeup`）
- [ ] 出発報告API（POST `/api/attendance/departure`）
- [ ] 到着報告API（POST `/api/attendance/arrival`）
- [ ] 勤怠履歴取得API（GET `/api/attendance/history`）

#### 2.2 日報API
- [ ] 日報作成API（POST `/api/daily-reports`）
- [ ] 日報取得API（GET `/api/daily-reports/{id}`）
- [ ] 日報一覧API（GET `/api/daily-reports`）
- [ ] 日報更新API（PUT `/api/daily-reports/{id}`）

#### 2.3 スタッフ管理API（マネージャー向け）
- [ ] スタッフ一覧API（GET `/api/staff`）
- [ ] スタッフ詳細API（GET `/api/staff/{id}`）
- [ ] 出社可能日設定API（POST `/api/staff/{id}/availability`）

#### 2.4 現場管理API
- [ ] 現場一覧API（GET `/api/worksites`）
- [ ] 現場登録API（POST `/api/worksites`）
- [ ] 現場更新API（PUT `/api/worksites/{id}`）

#### 2.5 S3 画像アップロード実装
- [ ] 署名付きURL生成API（POST `/api/upload/presigned-url`）
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
- [ ] API統合テスト
- [ ] テストカバレッジ80%以上

#### 4.2 フロントエンドテスト
- [ ] コンポーネントテスト（Jest + React Testing Library）
- [ ] E2Eテスト（Playwright または Cypress）

---

### Phase 5: 監視・セキュリティ 🔴 **未着手**

#### 5.1 CloudWatch 設定
- [ ] Lambda 関数のログ確認
- [ ] API Gateway のアクセスログ
- [ ] RDS のパフォーマンスインサイト有効化

#### 5.2 アラート設定
- [ ] Lambda エラー率アラート
- [ ] API Gateway 5xxエラーアラート
- [ ] RDS CPU使用率アラート

#### 5.3 セキュリティ強化
- [ ] S3 バケットポリシー見直し
- [ ] IAM ロールの最小権限原則適用
- [ ] Secrets Manager でのシークレットローテーション設定

---

### Phase 6: ドキュメント整備 🔴 **未着手**

- [ ] API仕様書作成（OpenAPI / Swagger）
- [ ] 運用マニュアル作成
- [ ] トラブルシューティングガイド更新

---

## 🎯 優先順位（推奨）

### 最優先: Phase 1完了（AWS初回環境構築） 🟡
1. ⏳ Dev環境のインフラデプロイ ← **次はこれ！**
2. ⏳ Dev環境のCodePipelineセットアップ
3. ⏳ Staging環境のインフラデプロイ
4. ⏳ Staging環境のCodePipelineセットアップ
5. ⏳ Production環境のインフラデプロイ
6. ⏳ Production環境のCodePipelineセットアップ

**完了後の状態**: GitHubへのpushで自動デプロイが動作する

---

### 次: Phase 2（機能実装） 🔴
基本的なAPI実装とフロントエンド統合

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

| 環境 | ブランチ | 自動デプロイ | 承認 |
|------|---------|-------------|------|
| **dev** | `develop` | ✅ | 不要 |
| **staging** | `staging` | ✅ | 不要 |
| **prod** | `main` | ✅ | **必要** |

---

**最終更新**: 2025-12-19 12:15 JST
**次回レビュー**: Phase 1 完了後
