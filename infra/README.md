# Okiteru - インフラストラクチャ構築ガイド

このディレクトリには、OkiteruアプリケーションのAWSインフラストラクチャをCloudFormationで構築するためのテンプレートが含まれています。

## 📋 目次

- [前提条件](#前提条件)
- [インフラストラクチャ構成](#インフラストラクチャ構成)
- [デプロイ手順](#デプロイ手順)
- [スタック削除手順](#スタック削除手順)
- [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

### 必要なツール

```bash
# AWS CLI v2インストール確認
aws --version

# 未インストールの場合
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### AWS認証情報の設定

```bash
aws configure
# AWS Access Key ID: YOUR_ACCESS_KEY
# AWS Secret Access Key: YOUR_SECRET_KEY
# Default region name: ap-northeast-1
# Default output format: json
```

---

## インフラストラクチャ構成

### スタック構成

| No. | スタック名 | 内容 | 依存関係 |
|-----|-----------|------|---------|
| 1 | `okiteru-network` | VPC、サブネット、セキュリティグループ | なし |
| 2 | `okiteru-database` | RDS PostgreSQL | network |
| 3 | `okiteru-cognito` | Cognito User Pool | なし |
| 4 | `okiteru-storage` | S3バケット | なし |
| 5 | `okiteru-lambda-api` | Lambda、API Gateway | network, database, cognito, storage |
| 6 | `okiteru-cloudfront` | CloudFront Distribution | storage, lambda-api |

### リソース概要

```
┌─────────────────────────────────────────────────────────────┐
│                        CloudFront                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Frontend   │  │     API      │  │    Photos    │     │
│  │      S3      │  │   Gateway    │  │      S3      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
            ┌───────▼────────┐  ┌──────▼──────┐
            │     Lambda     │  │   Cognito   │
            │   (FastAPI)    │  │  User Pool  │
            └───────┬────────┘  └─────────────┘
                    │
                    │ VPC
        ┌───────────┴───────────┐
        │                       │
   ┌────▼─────┐        ┌───────▼────────┐
   │   RDS    │        │   Secrets      │
   │PostgreSQL│        │   Manager      │
   └──────────┘        └────────────────┘
```

---

## デプロイ手順

### 1. パラメータファイルの編集

```bash
cd infra/cloudformation

# 本番環境
cp parameters-production.json parameters-production-local.json
vim parameters-production-local.json
# DBPassword を変更してください

# ステージング環境
cp parameters-staging.json parameters-staging-local.json
vim parameters-staging-local.json
```

**重要**: `*-local.json`ファイルは`.gitignore`に含まれています。

### 2. スタックのデプロイ

#### 方法1: 手動デプロイ（推奨：初回）

```bash
# 環境変数設定
ENV=production  # または staging
REGION=ap-northeast-1

# 1. ネットワーク層
aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-network \
  --template-body file://01-network.yaml \
  --parameters file://parameters-${ENV}-local.json \
  --region ${REGION}

# スタック作成完了まで待機（約5分）
aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-network \
  --region ${REGION}

# 2. ストレージ層（並列実行可）
aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-storage \
  --template-body file://04-storage.yaml \
  --parameters file://parameters-${ENV}-local.json \
  --region ${REGION}

# 3. 認証層（並列実行可）
aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-cognito \
  --template-body file://03-cognito.yaml \
  --parameters file://parameters-${ENV}-local.json \
  --region ${REGION}

# スタック作成完了まで待機
aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-storage \
  --region ${REGION}

aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-cognito \
  --region ${REGION}

# 4. データベース層
aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-database \
  --template-body file://02-database.yaml \
  --parameters file://parameters-${ENV}-local.json \
  --region ${REGION}

# スタック作成完了まで待機（約10分）
aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-database \
  --region ${REGION}

# 5. Lambda & API Gateway層
# まず、Lambda デプロイパッケージをS3にアップロード
cd ../../backend
./scripts/package-lambda.sh  # Lambda パッケージング
aws s3 cp lambda-deployment.zip s3://${ENV}-okiteru-lambda-deployment-$(aws sts get-caller-identity --query Account --output text)/lambda/okiteru-api-latest.zip

cd ../infra/cloudformation

aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-lambda-api \
  --template-body file://05-lambda-api.yaml \
  --parameters file://parameters-${ENV}-local.json \
    ParameterKey=LambdaS3Bucket,ParameterValue=${ENV}-okiteru-lambda-deployment-$(aws sts get-caller-identity --query Account --output text) \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ${REGION}

# スタック作成完了まで待機（約3分）
aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-lambda-api \
  --region ${REGION}

# 6. CloudFront層
aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-cloudfront \
  --template-body file://06-cloudfront.yaml \
  --parameters file://parameters-${ENV}-local.json \
  --region ${REGION}

# スタック作成完了まで待機（約15分）
aws cloudformation wait stack-create-complete \
  --stack-name ${ENV}-okiteru-cloudfront \
  --region ${REGION}
```

#### 方法2: デプロイスクリプト使用

```bash
# デプロイスクリプトを実行可能にする
chmod +x scripts/deploy.sh

# 本番環境デプロイ
./scripts/deploy.sh production

# ステージング環境デプロイ
./scripts/deploy.sh staging
```

### 3. 出力値の確認

```bash
# API エンドポイント取得
aws cloudformation describe-stacks \
  --stack-name ${ENV}-okiteru-lambda-api \
  --query 'Stacks[0].Outputs[?OutputKey==`RestApiUrl`].OutputValue' \
  --output text

# CloudFront URL取得
aws cloudformation describe-stacks \
  --stack-name ${ENV}-okiteru-cloudfront \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontUrl`].OutputValue' \
  --output text

# Cognito User Pool ID取得
aws cloudformation describe-stacks \
  --stack-name ${ENV}-okiteru-cognito \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text
```

### 4. データベースマイグレーション

```bash
cd ../../backend

# 環境変数設定（RDSエンドポイント取得）
export DATABASE_URL="postgresql://okiteru_admin:YOUR_PASSWORD@RDS_ENDPOINT:5432/okiteru"

# マイグレーション実行
source venv/bin/activate
alembic upgrade head

# 初期データ投入
python scripts/seed_data.py
```

### 5. フロントエンドデプロイ

```bash
cd ../frontend

# ビルド
npm run build

# S3にアップロード
aws s3 sync out/ s3://${ENV}-okiteru-frontend-$(aws sts get-caller-identity --query Account --output text)/ --delete

# CloudFront キャッシュ無効化
aws cloudfront create-invalidation \
  --distribution-id $(aws cloudformation describe-stacks --stack-name ${ENV}-okiteru-cloudfront --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' --output text) \
  --paths "/*"
```

---

## スタック削除手順

**⚠️ 警告**: この操作は元に戻せません。本番環境では慎重に実行してください。

```bash
ENV=production
REGION=ap-northeast-1

# 逆順で削除
aws cloudformation delete-stack --stack-name ${ENV}-okiteru-cloudfront --region ${REGION}
aws cloudformation wait stack-delete-complete --stack-name ${ENV}-okiteru-cloudfront --region ${REGION}

aws cloudformation delete-stack --stack-name ${ENV}-okiteru-lambda-api --region ${REGION}
aws cloudformation wait stack-delete-complete --stack-name ${ENV}-okiteru-lambda-api --region ${REGION}

aws cloudformation delete-stack --stack-name ${ENV}-okiteru-database --region ${REGION}
aws cloudformation wait stack-delete-complete --stack-name ${ENV}-okiteru-database --region ${REGION}

aws cloudformation delete-stack --stack-name ${ENV}-okiteru-cognito --region ${REGION}
aws cloudformation wait stack-delete-complete --stack-name ${ENV}-okiteru-cognito --region ${REGION}

# S3バケットは手動で削除（バージョニング有効のため）
aws s3 rm s3://${ENV}-okiteru-frontend-$(aws sts get-caller-identity --query Account --output text) --recursive
aws s3 rb s3://${ENV}-okiteru-frontend-$(aws sts get-caller-identity --query Account --output text)

aws s3 rm s3://${ENV}-okiteru-photos-$(aws sts get-caller-identity --query Account --output text) --recursive
aws s3 rb s3://${ENV}-okiteru-photos-$(aws sts get-caller-identity --query Account --output text)

aws cloudformation delete-stack --stack-name ${ENV}-okiteru-storage --region ${REGION}
aws cloudformation wait stack-delete-complete --stack-name ${ENV}-okiteru-storage --region ${REGION}

aws cloudformation delete-stack --stack-name ${ENV}-okiteru-network --region ${REGION}
aws cloudformation wait stack-delete-complete --stack-name ${ENV}-okiteru-network --region ${REGION}
```

---

## トラブルシューティング

### スタック作成失敗時

```bash
# エラー詳細確認
aws cloudformation describe-stack-events \
  --stack-name ${ENV}-okiteru-network \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`]' \
  --output table
```

### Lambda デプロイエラー

```bash
# Lambda ログ確認
aws logs tail /aws/lambda/${ENV}-okiteru-api --follow
```

### RDS接続エラー

```bash
# セキュリティグループ確認
aws ec2 describe-security-groups \
  --filters "Name=tag:Name,Values=${ENV}-okiteru-rds-sg"

# RDS エンドポイント確認
aws rds describe-db-instances \
  --db-instance-identifier ${ENV}-okiteru-db \
  --query 'DBInstances[0].Endpoint'
```

---

## コスト見積もり

### 月額概算（東京リージョン）

| サービス | インスタンス/容量 | 月額（USD） |
|---------|-----------------|------------|
| RDS PostgreSQL | db.t4g.small (20GB) | ~$30 |
| Lambda | 1M requests/月 | ~$5 |
| API Gateway | 1M requests/月 | ~$3.5 |
| CloudFront | 100GB転送/月 | ~$8.5 |
| S3 | 50GB保存 | ~$1.5 |
| Cognito | 10,000 MAU | 無料 |
| NAT Gateway | 1台 | ~$32 |
| **合計** | | **~$80/月** |

※ 実際のコストは利用量によって変動します。

---

## 参考資料

- [AWS CloudFormation ドキュメント](https://docs.aws.amazon.com/cloudformation/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [FastAPI on AWS Lambda](https://www.serverless.com/examples/aws-python-fastapi-api)

---

**作成日**: 2025-12-18
**バージョン**: 1.0
