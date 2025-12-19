# 開発環境 (Dev) セットアップガイド

このガイドでは、Okiteruアプリケーションの開発環境をAWS上に構築する手順を説明します。

## 📋 目次

1. [前提条件](#前提条件)
2. [構築される環境](#構築される環境)
3. [セットアップ手順](#セットアップ手順)
4. [各スクリプトの詳細](#各スクリプトの詳細)
5. [確認方法](#確認方法)
6. [トラブルシューティング](#トラブルシューティング)
7. [環境の削除](#環境の削除)

## 前提条件

### 必要なツール

- **AWS CLI** - バージョン 2.x 以上
  ```bash
  aws --version
  # aws-cli/2.x.x 以上であることを確認
  ```

- **AWS認証情報** - AdministratorAccess権限を持つIAMユーザー
  ```bash
  aws configure
  # AWS Access Key ID と Secret Access Key を設定
  # デフォルトリージョン: ap-northeast-1
  ```

- **Python 3.11** - バックエンド開発用
  ```bash
  python3 --version
  # Python 3.11.x であることを確認
  ```

- **Node.js 18+** - フロントエンド開発用
  ```bash
  node --version
  # v18.x.x 以上であることを確認
  ```

### 必要な情報

セットアップ時に以下の情報を準備してください：

1. **データベースのマスターユーザー名** (デフォルト: `okiteru_admin`)
2. **データベースのマスターパスワード** (8文字以上)

## 構築される環境

### AWSリソース一覧

| リソース | タイプ | 用途 | 備考 |
|---------|--------|------|------|
| **VPC** | 10.0.0.0/16 | ネットワーク基盤 | パブリック×2、プライベート×2 サブネット |
| **RDS** | PostgreSQL 15.5 | データベース | db.t3.micro, 20GB, 7日バックアップ |
| **Cognito** | User Pool | ユーザー認証 | メール認証、パスワードポリシー設定済み |
| **S3** | Bucket | フロントエンド保存 | プライベート、CloudFrontからのみアクセス |
| **CloudFront** | Distribution | CDN配信 | HTTPSアクセス、グローバル配信 |
| **API Gateway** | REST API | APIエンドポイント | Lambda統合、CORS設定済み |
| **Lambda** | Python 3.11 | バックエンドAPI | VPC内配置、RDSアクセス |
| **IAM** | Role | Lambda実行ロール | SSM、Cognito、VPCアクセス権限 |

### ネットワーク構成

```
                    ユーザー (ブラウザ)
                            ↓ HTTPS
                  ┌──────────────────┐
                  │   CloudFront     │
                  │  (CDN / HTTPS)   │
                  └────────┬─────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
      ┌─────────────┐          ┌──────────────┐
      │  S3 Bucket  │          │ API Gateway  │
      │ (Frontend)  │          │  (REST API)  │
      │  (Private)  │          └──────┬───────┘
      └─────────────┘                 │
                                      ▼
┌──────────────────────────────────────────────────────┐
│ VPC (10.0.0.0/16)                                    │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Public       │  │ Public       │                │
│  │ Subnet 1     │  │ Subnet 2     │                │
│  │ 10.0.1.0/24  │  │ 10.0.2.0/24  │                │
│  └──────────────┘  └──────────────┘                │
│         ↓                 ↓                         │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ Private      │  │ Private      │                │
│  │ Subnet 1     │  │ Subnet 2     │                │
│  │ 10.0.11.0/24 │  │ 10.0.12.0/24 │                │
│  │              │  │              │                │
│  │ [Lambda]     │  │ [RDS]        │                │
│  └──────────────┘  └──────────────┘                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 月額コスト見積もり

| サービス | 仕様 | 月額コスト (概算) |
|---------|------|------------------|
| RDS (db.t3.micro) | 1インスタンス、20GB | $15-20 |
| Lambda | 月100万リクエスト想定 | $1-5 |
| S3 | 1GB、月1万リクエスト | $1未満 |
| CloudFront | 月10GB転送量想定 | $1-3 |
| API Gateway | 月100万リクエスト | $3-4 |
| VPC (NAT Gateway不使用) | - | 無料 |
| Cognito | 月1000 MAU以下 | 無料 |
| **合計** | - | **約 $25-35/月** |

> **注意**: 開発環境では NAT Gateway を使用しないため、Lambda から外部APIへのアクセスはできません。必要な場合は VPC Endpoints または NAT Gateway を追加してください。

## セットアップ手順

### ステップ1: インフラのデプロイ

CloudFormationスタックをデプロイし、AWSリソースを作成します。

```bash
cd infra/dev
chmod +x *.sh
./deploy.sh
```

**実行内容:**
1. データベースのユーザー名とパスワードを入力
2. CloudFormationテンプレートを検証
3. スタック作成（所要時間: 約10-15分）
4. 作成されたリソースの情報を表示

**入力例:**
```
Enter database master username [okiteru_admin]: okiteru_admin
Enter database master password (min 8 characters): ********
```

**出力例:**
```
Deployment completed!
========================================
-----------------------------------------------------------------
|                         DescribeStacks                         |
+----------------------------+-----------------------------------+
| ApiGatewayUrl              | https://abc123.execute-api.ap-northeast-1.amazonaws.com/dev |
| ApiUrl                     | https://d1234abcd5678.cloudfront.net/api |
| ApplicationUrl             | https://d1234abcd5678.cloudfront.net |
| CloudFrontDistributionId   | E1234ABCDEFGHI                     |
| CloudFrontDomainName       | d1234abcd5678.cloudfront.net       |
| CognitoClientId            | 1a2b3c4d5e6f7g8h9i0j               |
| CognitoUserPoolId          | ap-northeast-1_AbCdEfGhI           |
| DatabaseEndpoint           | okiteru-db-dev.xxx.ap-northeast-1.rds.amazonaws.com |
| FrontendBucketName         | okiteru-frontend-dev               |
| LambdaFunctionName         | okiteru-api-dev                    |
+----------------------------+-----------------------------------+
```

### ステップ2: Parameter Store の設定

CloudFormationの出力値をParameter Storeに保存します。

```bash
./setup-parameters.sh
```

**実行内容:**
1. CloudFormationスタックから出力値を取得
2. データベース認証情報を入力
3. Parameter Storeにパラメータを作成/更新
4. フロントエンド用の `.env.dev` ファイルを作成

**入力例:**
```
Enter database username [okiteru_admin]: okiteru_admin
Enter database password: ********
```

**作成されるパラメータ:**
- `/okiteru/dev/s3-bucket-name` - S3バケット名
- `/okiteru/dev/lambda-function-name` - Lambda関数名
- `/okiteru/dev/database-url` - データベース接続URL（暗号化）
- `/okiteru/dev/cognito-user-pool-id` - Cognito User Pool ID
- `/okiteru/dev/cognito-client-id` - Cognito Client ID
- `/okiteru/dev/cloudfront-distribution-id` - CloudFront Distribution ID
- `/okiteru/dev/api-url` - API URL（CloudFront経由）
- `/okiteru/dev/application-url` - アプリケーションURL（CloudFront）
- `/okiteru/dev/api-gateway-url` - API Gateway直接URL

**作成されるファイル:**
- `frontend/.env.dev` - フロントエンド環境変数

### ステップ3: データベースの初期化

Alembicマイグレーションを実行し、テーブルを作成します。

```bash
./init-database.sh
```

**実行内容:**
1. Parameter StoreからDATABASE_URLを取得
2. Python依存関係をインストール
3. Alembicマイグレーションを実行
4. テーブル作成（users, attendance_records, shifts, reports等）

**所要時間:** 約2-3分

### ステップ4: GitHub Tokenの設定

CodePipelineでGitHubと連携するためのトークンを設定します。

#### 4-1. GitHub Personal Access Token の作成

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" をクリック
3. 以下の権限を付与：
   - ✅ `repo` (全て)
   - ✅ `admin:repo_hook` (全て)
4. トークンをコピー（後で使用）

#### 4-2. Secrets Manager に保存

```bash
aws secretsmanager create-secret \
  --name github-token \
  --description "GitHub Personal Access Token for CodePipeline" \
  --secret-string '{"token":"ghp_your_token_here"}' \
  --region ap-northeast-1
```

> **重要**: `ghp_your_token_here` を実際のトークンに置き換えてください。

### ステップ5: CodePipeline のデプロイ

GitHubからの自動デプロイを設定します。

#### 5-1. デプロイスクリプトの編集

```bash
cd ../codepipeline
vi deploy-dev.sh
```

`GITHUB_OWNER` を自分のGitHubユーザー名に変更：

```bash
GITHUB_OWNER="your-github-username"  # ←ここを変更
```

#### 5-2. パイプラインのデプロイ

```bash
./deploy-dev.sh
```

**実行内容:**
1. CloudFormationテンプレートを検証
2. CodePipelineリソースを作成
   - CodeBuild プロジェクト
   - CodePipeline パイプライン
   - GitHub Webhook
   - IAM ロール
3. GitHubリポジトリにWebhookを設定

**所要時間:** 約3-5分

### ステップ6: 動作確認

#### 6-1. CodePipeline の確認

AWSコンソールでパイプラインを確認：
https://console.aws.amazon.com/codesuite/codepipeline/pipelines

#### 6-2. テストデプロイ

```bash
# developブランチにプッシュしてパイプラインをトリガー
git checkout develop
git commit --allow-empty -m "test: trigger pipeline"
git push origin develop
```

CodePipelineが自動的に起動し、以下が実行されます：
1. **Source**: GitHubからコードを取得
2. **Build**:
   - フロントエンドのビルド (`npm run build`)
   - バックエンドのテスト
   - Lambda用のzipファイル作成
3. **Deploy**:
   - S3にフロントエンドをアップロード
   - Lambdaコードを更新

#### 6-3. アプリケーションへのアクセス

**フロントエンド（CloudFront経由）:**
```bash
# アプリケーションURLを確認
aws cloudformation describe-stacks \
  --stack-name okiteru-infrastructure-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApplicationUrl`].OutputValue' \
  --output text

# 出力例: https://d1234abcd5678.cloudfront.net
```

**バックエンドAPI（CloudFront経由）:**
```bash
# API URLを確認
aws cloudformation describe-stacks \
  --stack-name okiteru-infrastructure-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text

# 出力例: https://d1234abcd5678.cloudfront.net/api
```

**API Gateway（直接アクセス）:**
```bash
# API Gateway URLを確認
aws cloudformation describe-stacks \
  --stack-name okiteru-infrastructure-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text

# 出力例: https://abc123.execute-api.ap-northeast-1.amazonaws.com/dev
```

> **推奨**: 通常は CloudFront 経由のURLを使用してください。HTTPS対応、高速配信、統一ドメインのメリットがあります。

## 各スクリプトの詳細

### deploy.sh

**目的**: CloudFormationスタックをデプロイし、AWSインフラを構築

**処理フロー:**
1. ユーザー入力（DBユーザー名、パスワード）
2. CloudFormation デプロイ実行
3. スタック出力を表示

**作成されるリソース:**
- VPC、Subnet、Route Table、Internet Gateway
- RDS PostgreSQL インスタンス
- Cognito User Pool と Client
- S3 Bucket（プライベート、CloudFrontからのみアクセス）
- CloudFront Distribution（CDN、HTTPS対応）
- API Gateway REST API（Lambda統合）
- Lambda Function（VPC内配置）
- IAM Role（Lambda実行ロール）
- Security Group（DB用、Lambda用）

### setup-parameters.sh

**目的**: CloudFormationの出力をParameter Storeに保存し、環境変数を設定

**処理フロー:**
1. CloudFormationスタックから出力値を取得
2. ユーザー入力（DBユーザー名、パスワード）
3. DATABASE_URLを構築
4. Parameter Storeにパラメータを作成
5. `frontend/.env.dev` ファイルを生成

**作成されるパラメータ:**
- S3バケット名
- Lambda関数名
- データベース接続URL（暗号化）
- Cognito設定
- CloudFront Distribution ID
- API URL（CloudFront経由）
- Application URL（CloudFront）
- API Gateway URL（直接アクセス用）

### init-database.sh

**目的**: データベースのマイグレーションを実行し、テーブルを作成

**処理フロー:**
1. Parameter StoreからDATABASE_URLを取得
2. Python依存関係をインストール
3. Alembicマイグレーション実行（`alembic upgrade head`）

**作成されるテーブル:**
- users - ユーザー情報
- attendance_records - 勤怠記録
- shifts - シフト（出社可能日）
- reports - 日報
- worksites - 現場情報
- その他、Alembicマイグレーションで定義されたテーブル

## 確認方法

### 1. CloudFormationスタックの確認

```bash
aws cloudformation describe-stacks \
  --stack-name okiteru-infrastructure-dev \
  --region ap-northeast-1
```

### 2. Parameter Storeの確認

```bash
aws ssm get-parameters-by-path \
  --path /okiteru/dev \
  --region ap-northeast-1
```

### 3. RDSへの接続確認

```bash
# RDSエンドポイントを取得
DB_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name okiteru-infrastructure-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
  --output text)

# Lambda経由またはEC2からの接続が必要（外部からは直接接続不可）
# psql -h ${DB_ENDPOINT} -U okiteru_admin -d okiteru_dev
```

### 4. CloudFront Distribution の確認

```bash
# CloudFront Distribution IDを取得
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name okiteru-infrastructure-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

# Distribution の状態を確認
aws cloudfront get-distribution --id ${DISTRIBUTION_ID}
```

### 5. API Gateway の動作確認

```bash
# API URLを取得（CloudFront経由）
API_URL=$(aws cloudformation describe-stacks \
  --stack-name okiteru-infrastructure-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

# APIにリクエスト送信
curl ${API_URL}
```

### 6. アプリケーション全体の確認

```bash
# アプリケーションURLを取得
APP_URL=$(aws cloudformation describe-stacks \
  --stack-name okiteru-infrastructure-dev \
  --query 'Stacks[0].Outputs[?OutputKey==`ApplicationUrl`].OutputValue' \
  --output text)

# ブラウザで開く
open ${APP_URL}
```

## トラブルシューティング

### エラー: Parameter not found

**原因**: Parameter Storeにパラメータが設定されていない

**解決方法**:
```bash
./setup-parameters.sh
```

### エラー: Database connection failed

**原因**:
1. セキュリティグループの設定が正しくない
2. Lambda が VPC 内にない
3. データベース認証情報が間違っている

**解決方法**:
```bash
# Parameter Store の DATABASE_URL を確認
aws ssm get-parameter \
  --name /okiteru/dev/database-url \
  --with-decryption \
  --region ap-northeast-1
```

### エラー: CloudFormation stack creation failed

**原因**: リソース制限、IAM権限不足、既存リソースとの競合

**解決方法**:
```bash
# スタックイベントを確認
aws cloudformation describe-stack-events \
  --stack-name okiteru-infrastructure-dev \
  --region ap-northeast-1 \
  --max-items 20
```

### Lambdaから外部APIへのアクセスができない

**原因**: NAT Gatewayが設定されていない（コスト削減のため）

**解決方法**:
1. **VPC Endpoints を使用** (推奨 - AWS サービスのみ)
   - S3, DynamoDB等のAWSサービスへのアクセス

2. **NAT Gatewayを追加** (外部APIアクセスが必要な場合)
   ```yaml
   # infrastructure.yml に追加が必要
   # 追加コスト: 約 $30-40/月
   ```

## 環境の削除

開発環境が不要になった場合の削除手順：

### 1. CodePipelineの削除

```bash
cd ../codepipeline
aws cloudformation delete-stack \
  --stack-name okiteru-pipeline-dev \
  --region ap-northeast-1
```

### 2. S3バケットの削除

```bash
# バケット内のオブジェクトを削除
aws s3 rm s3://okiteru-frontend-dev --recursive

# バケット自体は CloudFormation で削除されます
```

### 3. インフラスタックの削除

```bash
cd ../dev
aws cloudformation delete-stack \
  --stack-name okiteru-infrastructure-dev \
  --region ap-northeast-1
```

> **注意**: RDSインスタンスは削除保護が有効な場合、手動で無効化する必要があります。

### 4. Parameter Storeの削除（オプション）

```bash
# 全てのパラメータを削除
aws ssm delete-parameters \
  --names \
    /okiteru/dev/s3-bucket-name \
    /okiteru/dev/lambda-function-name \
    /okiteru/dev/database-url \
    /okiteru/dev/cognito-user-pool-id \
    /okiteru/dev/cognito-client-id \
    /okiteru/dev/lambda-function-url \
  --region ap-northeast-1
```

### 5. GitHub Tokenの削除（オプション）

```bash
aws secretsmanager delete-secret \
  --secret-id github-token \
  --force-delete-without-recovery \
  --region ap-northeast-1
```

## 次のステップ

開発環境の構築が完了したら：

1. **ローカル開発環境の設定**
   ```bash
   # フロントエンド
   cd frontend
   cp .env.dev .env.local
   npm install
   npm run dev

   # バックエンド
   cd backend
   export DATABASE_URL="..." # Parameter Storeから取得
   pip install -r requirements.txt
   uvicorn main:app --reload
   ```

2. **開発ワークフロー**
   - featureブランチで開発
   - developブランチにマージ → 自動デプロイ
   - 開発環境で動作確認

3. **Staging/Production環境の構築**
   - 開発環境で動作確認後
   - `infra/staging` または `infra/prod` を作成
   - 同様の手順で構築

## 参考リンク

- [AWS CloudFormation ドキュメント](https://docs.aws.amazon.com/cloudformation/)
- [AWS RDS ドキュメント](https://docs.aws.amazon.com/rds/)
- [AWS Cognito ドキュメント](https://docs.aws.amazon.com/cognito/)
- [AWS Lambda ドキュメント](https://docs.aws.amazon.com/lambda/)
- [Alembic ドキュメント](https://alembic.sqlalchemy.org/)
