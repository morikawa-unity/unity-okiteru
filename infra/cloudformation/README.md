# Okiteru - CloudFormation インフラストラクチャ

OkiteruアプリケーションのAWSインフラストラクチャをCloudFormationで構築します。

## 📋 概要

### アーキテクチャ

モジュラー構成の6つのCloudFormationスタックで構成：

| スタック | テンプレート | 説明 |
|---------|------------|------|
| **Network** | `01-network.yaml` | VPC, Subnets, Security Groups |
| **Database** | `02-database.yaml` | RDS PostgreSQL |
| **Cognito** | `03-cognito.yaml` | Cognito User Pool, User Groups |
| **Storage** | `04-storage.yaml` | S3 Buckets (Frontend, Photos) |
| **Lambda/API** | `05-lambda-api.yaml` | Lambda Function, API Gateway |
| **CloudFront** | `06-cloudfront.yaml` | CloudFront Distribution |

### デプロイフロー

```
📍 初回のみ（手動実行）
└─ インフラ基盤構築（VPC, RDS, Cognito, S3, Lambda, CloudFront等）
   ./deploy.sh --env <development|staging|production>

🔄 その後は自動デプロイ（CI/CD）
└─ コード更新時（Frontend S3 + Lambda更新）
   git push origin <develop|staging|main> → CodePipeline起動
```

## 🚀 クイックスタート

### 前提条件

- AWS CLI設定済み（`aws configure`）
- 適切なIAM権限（CloudFormation, RDS, Cognito, S3, Lambda等）
- Bash環境

### 開発環境セットアップ（初回のみ）

```bash
cd infra/cloudformation

# 1. スクリプトに実行権限付与
chmod +x *.sh

# 2. インフラデプロイ（15-20分）
./deploy.sh --env development

# 3. Parameter Store設定（1分）
./setup-parameters.sh --env development

# 4. データベース初期化（2-3分）
./init-database.sh --env development

# 5. テストユーザー作成（1分）
./init-cognito.sh --env development

# 6. CI/CDセットアップ
cd ../codepipeline
./deploy-development.sh
```

### Staging/Production環境セットアップ

```bash
# Staging
./deploy.sh --env staging
./setup-parameters.sh --env staging
./init-database.sh --env staging
./init-cognito.sh --env staging

# Production
./deploy.sh --env production
./setup-parameters.sh --env production
./init-database.sh --env production
./init-cognito.sh --env production
```

## 📁 ファイル構成

```
cloudformation/
├── README.md                     # 本ファイル
├── deploy.sh                     # インフラデプロイスクリプト
├── setup-parameters.sh           # Parameter Store設定
├── init-database.sh              # DB初期化（Alembicマイグレーション）
├── init-cognito.sh               # テストユーザー作成
├── cleanup.sh                    # 環境削除
├── 01-network.yaml               # VPC, Subnets, SG
├── 02-database.yaml              # RDS PostgreSQL
├── 03-cognito.yaml               # Cognito User Pool
├── 04-storage.yaml               # S3 Buckets
├── 05-lambda-api.yaml            # Lambda + API Gateway
├── 06-cloudfront.yaml            # CloudFront Distribution
├── parameters-development.json   # Dev環境パラメータ
├── parameters-staging.json       # Staging環境パラメータ
└── parameters-production.json    # Production環境パラメータ
```

## 🔧 スクリプト詳細

### 1. deploy.sh

全てのCloudFormationスタックをデプロイします。

```bash
./deploy.sh --env <development|staging|production>
```

**処理内容:**
- パラメータファイル読み込み
- 6つのスタックを順番にデプロイ（01 → 06）
- スタックの作成/更新を自動判定
- デプロイ完了後、各スタックの出力を表示

**所要時間:** 15-20分

### 2. setup-parameters.sh

CloudFormationの出力をParameter Storeに保存します。

```bash
./setup-parameters.sh --env <development|staging|production>
```

**処理内容:**
- CloudFormationスタックから出力値を取得
- Parameter Storeに保存（DATABASE_URLは暗号化）
- フロントエンド用`.env.<environment>`ファイルを自動生成

**保存されるパラメータ:**
- `/okiteru/<env>/database-url` (SecureString)
- `/okiteru/<env>/cognito-user-pool-id`
- `/okiteru/<env>/cognito-client-id`
- `/okiteru/<env>/api-url`
- その他多数

**所要時間:** 1分

### 3. init-database.sh

RDSデータベースにAlembicマイグレーションを実行します。

```bash
./init-database.sh --env <development|staging|production>
```

**処理内容:**
- Parameter StoreからDATABASE_URLを取得
- Python仮想環境セットアップ
- Alembicマイグレーション実行（`alembic upgrade head`）
- データベース接続テスト

**所要時間:** 2-3分

### 4. init-cognito.sh

Cognitoにテストユーザーを作成します。

```bash
./init-cognito.sh --env <development|staging|production>
```

**処理内容:**
- Parameter StoreからCognito User Pool IDを取得
- テストユーザー作成（staff1, staff2, manager1）
- 各ユーザーを適切なグループに追加

**作成されるユーザー:**
- `staff1@okiteru.test` (password: `Test1234!`) - staff group
- `staff2@okiteru.test` (password: `Test1234!`) - staff group
- `manager1@okiteru.test` (password: `Test1234!`) - manager group

**所要時間:** 1分

### 5. cleanup.sh

全てのインフラリソースを削除します。

```bash
./cleanup.sh --env <development|staging|production>

# 確認をスキップ
./cleanup.sh --env development --yes
```

**⚠️ 警告:** この操作は取り消せません！全てのデータが完全に削除されます。

**処理内容:**
- S3バケットを空にする
- CloudFront Distributionを無効化
- 全スタックを逆順で削除（06 → 01）
- Parameter Storeのパラメータを削除

**所要時間:** 15-20分（CloudFront無効化に時間がかかる）

## 🌍 環境別パラメータ

### parameters-development.json

```json
{
  "EnvironmentName": "development",
  "DBInstanceClass": "db.t4g.micro",
  "DBAllocatedStorage": "20",
  "BackupRetentionPeriod": "1",
  "LambdaMemorySize": "256",
  "LambdaTimeout": "30"
}
```

### parameters-staging.json

```json
{
  "EnvironmentName": "staging",
  "DBInstanceClass": "db.t4g.small",
  "DBAllocatedStorage": "50",
  "BackupRetentionPeriod": "3",
  "LambdaMemorySize": "512",
  "LambdaTimeout": "60"
}
```

### parameters-production.json

```json
{
  "EnvironmentName": "production",
  "DBInstanceClass": "db.t4g.medium",
  "DBAllocatedStorage": "100",
  "BackupRetentionPeriod": "7",
  "LambdaMemorySize": "1024",
  "LambdaTimeout": "60"
}
```

## 💰 コスト見積もり

### Development環境（月額）

| サービス | 仕様 | 月額（USD） |
|---------|------|------------|
| RDS (db.t4g.micro) | 1インスタンス、20GB | $15-20 |
| Lambda | 月100万リクエスト | $1-5 |
| S3 | 1GB保存 | $1未満 |
| CloudFront | 月10GB転送 | $1-3 |
| API Gateway | 月100万リクエスト | $3-4 |
| Cognito | 月1000 MAU以下 | 無料 |
| **合計** | | **$25-35/月** |

### Production環境（月額）

| サービス | 仕様 | 月額（USD） |
|---------|------|------------|
| RDS (db.t4g.medium) | 1インスタンス、100GB | $60-80 |
| Lambda | 月1000万リクエスト | $10-20 |
| S3 | 50GB保存 | $1-2 |
| CloudFront | 月100GB転送 | $8-12 |
| API Gateway | 月1000万リクエスト | $30-40 |
| Cognito | 月10,000 MAU | 無料 |
| **合計** | | **$110-160/月** |

## 📊 リソース構成

### 作成されるリソース

**Network Stack:**
- VPC (10.0.0.0/16)
- Public Subnet × 2
- Private Subnet × 2
- Internet Gateway
- Route Tables
- Security Groups

**Database Stack:**
- RDS PostgreSQL 16
- DB Subnet Group
- Parameter Group
- Option Group

**Cognito Stack:**
- User Pool
- User Pool Client
- User Groups (staff, manager)
- Identity Pool（将来的に追加予定）

**Storage Stack:**
- Frontend S3 Bucket（プライベート、CloudFrontからのみアクセス）
- Photos S3 Bucket（パブリック読み取り、Lambda書き込み）

**Lambda/API Stack:**
- Lambda Function (Python 3.11)
- Lambda Execution Role
- API Gateway REST API
- API Gateway Deployment/Stage

**CloudFront Stack:**
- CloudFront Distribution
- Origin Access Identity (OAI)
- Cache Behaviors

## 🔒 セキュリティ

### 認証情報管理

- **Database認証情報:** Parameter Store (SecureString)
- **Cognito設定:** Parameter Store
- **IAM Roles:** 最小権限の原則

### ネットワークセキュリティ

- **RDS:** Private Subnet配置、外部アクセス不可
- **Lambda:** VPC内配置（Private Subnet）
- **S3 (Frontend):** CloudFrontからのみアクセス
- **S3 (Photos):** パブリック読み取り、Lambda書き込みのみ

## 🆘 トラブルシューティング

### デプロイ失敗

```bash
# ログファイル確認
cat logs/deploy-*.log

# CloudFormationイベント確認
aws cloudformation describe-stack-events \
  --stack-name okiteru-development-network \
  --max-items 20
```

### スタック更新でエラー

```bash
# "No updates to be performed" エラーは無視してOK
# スタック詳細確認
aws cloudformation describe-stacks \
  --stack-name okiteru-development-network
```

### データベース接続エラー

```bash
# Parameter Store確認
aws ssm get-parameter \
  --name /okiteru/development/database-url \
  --with-decryption

# RDSエンドポイント確認
aws rds describe-db-instances \
  --query 'DBInstances[0].Endpoint'
```

### 環境完全リセット

```bash
# 全削除
./cleanup.sh --env development --yes

# 再デプロイ
./deploy.sh --env development
./setup-parameters.sh --env development
./init-database.sh --env development
./init-cognito.sh --env development
```

## 📚 次のステップ

1. **CI/CDセットアップ**
   ```bash
   cd ../codepipeline
   ./deploy-development.sh
   ```

2. **フロントエンドデプロイ**
   - CodePipelineが自動デプロイ（git push後）
   - または手動: `npm run build && aws s3 sync out/ s3://...`

3. **バックエンドデプロイ**
   - CodePipelineが自動デプロイ（git push後）
   - または手動: `aws lambda update-function-code ...`

4. **アプリケーションアクセス**
   - CloudFront URL経由でアクセス
   - テストユーザーでログイン

## 📖 関連ドキュメント

- [インフラ全体ガイド](../README.md)
- [CI/CDガイド](../codepipeline/README.md)
- [メインREADME](../../README.md)

---

**作成日**: 2025-12-19
**更新日**: 2025-12-19
