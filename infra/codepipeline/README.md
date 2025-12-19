# CodePipeline CI/CD セットアップガイド

GitHubからAWSへの自動デプロイメント環境の構築手順

## 概要

このプロジェクトでは、GitHub → CodePipeline → CodeBuild → AWS Lambda/S3 という流れで自動デプロイを行います。

### デプロイフロー

```
1. ローカルで開発
   ↓
2. git push
   ↓
3. GitHub（ソース更新）
   ↓ webhook（自動検知）
4. CodePipeline（起動）
   ↓
5. CodeBuild（ビルド・テスト）
   ↓
6. Lambda + S3へ自動デプロイ
```

### 環境とブランチの対応

| 環境 | ブランチ | 承認 | 用途 |
|------|---------|------|------|
| dev | `develop` | 不要 | 開発環境 |
| staging | `staging` | 不要 | ステージング環境 |
| prod | `main` | **必要** | 本番環境 |

## 前提条件

### 必要なもの

1. **AWS CLI** - バージョン2.x以上
2. **AWS認証情報** - AdministratorAccess権限を持つIAMユーザー
3. **GitHub Personal Access Token** - repo権限が必要
4. **AWS Systems Manager Parameter Store** - 環境変数の設定

### AWS Parameter Store に設定が必要な値

各環境（dev/staging/prod）ごとに以下をParameter Storeに登録：

```bash
# フロントエンド用S3バケット名
/okiteru/{ENV}/s3-bucket-name

# Lambda関数名
/okiteru/{ENV}/lambda-function-name

# データベースURL
/okiteru/{ENV}/database-url

# Cognito設定
/okiteru/{ENV}/cognito-user-pool-id
/okiteru/{ENV}/cognito-client-id
```

## セットアップ手順

### 1. GitHub Personal Access Tokenの作成

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" をクリック
3. 以下の権限を付与：
   - `repo` (全て)
   - `admin:repo_hook` (全て)
4. トークンをコピー（後で使用）

### 2. GitHub TokenをSecrets Managerに保存

```bash
aws secretsmanager create-secret \
  --name github-token \
  --description "GitHub Personal Access Token for CodePipeline" \
  --secret-string '{"token":"ghp_your_token_here"}' \
  --region ap-northeast-1
```

### 3. Parameter Storeに環境変数を設定

**Dev環境の例:**

```bash
# S3バケット名
aws ssm put-parameter \
  --name /okiteru/dev/s3-bucket-name \
  --value "okiteru-frontend-dev" \
  --type String \
  --region ap-northeast-1

# Lambda関数名
aws ssm put-parameter \
  --name /okiteru/dev/lambda-function-name \
  --value "okiteru-api-dev" \
  --type String \
  --region ap-northeast-1

# データベースURL（SecureString推奨）
aws ssm put-parameter \
  --name /okiteru/dev/database-url \
  --value "postgresql://user:pass@host:5432/okiteru_dev" \
  --type SecureString \
  --region ap-northeast-1

# Cognito User Pool ID
aws ssm put-parameter \
  --name /okiteru/dev/cognito-user-pool-id \
  --value "ap-northeast-1_xxxxxxx" \
  --type String \
  --region ap-northeast-1

# Cognito Client ID
aws ssm put-parameter \
  --name /okiteru/dev/cognito-client-id \
  --value "xxxxxxxxxxxxxxxxxxxxxxxxxx" \
  --type String \
  --region ap-northeast-1
```

**Staging/Prod環境も同様に設定してください。**

### 4. デプロイスクリプトの設定

各デプロイスクリプトの`GITHUB_OWNER`を自分のGitHubユーザー名/組織名に変更：

```bash
# deploy-dev.sh, deploy-staging.sh, deploy-prod.sh
GITHUB_OWNER="your-github-username"  # ←ここを変更
```

### 5. CodePipelineのデプロイ

**Dev環境:**

```bash
cd infra/codepipeline
./deploy-dev.sh
```

**Staging環境:**

```bash
./deploy-staging.sh
```

**Production環境:**

```bash
./deploy-prod.sh
# 確認プロンプトで "yes" と入力
```

### 6. 動作確認

1. AWSコンソールでCodePipelineを確認
   - https://console.aws.amazon.com/codesuite/codepipeline/pipelines

2. テストコミット＆プッシュ

```bash
# developブランチにプッシュ
git checkout develop
git commit --allow-empty -m "test: trigger pipeline"
git push origin develop
```

3. CodePipelineが自動的に起動することを確認

## トラブルシューティング

### Pipeline作成時のエラー

**エラー: GitHub connection failed**

→ GitHub Personal Access Tokenが正しいか確認
→ token権限（repo, admin:repo_hook）があるか確認

**エラー: Parameter not found**

→ Parameter Storeに環境変数が設定されているか確認

```bash
aws ssm get-parameter --name /okiteru/dev/s3-bucket-name --region ap-northeast-1
```

### ビルド失敗時の確認方法

1. CodeBuildログを確認
   - CodePipeline → Build ステージ → "Details" をクリック

2. CloudWatch Logsで詳細確認
   - `/aws/codebuild/okiteru-{ENV}` ロググループ

### デプロイ失敗時

**Lambda更新エラー:**

→ IAMロールの権限確認（CodeBuildServiceRoleにLambda更新権限があるか）

**S3同期エラー:**

→ S3バケットが存在するか、バケットポリシーが正しいか確認

## パイプラインの削除

```bash
# Dev環境の削除
aws cloudformation delete-stack --stack-name okiteru-pipeline-dev --region ap-northeast-1

# Staging環境の削除
aws cloudformation delete-stack --stack-name okiteru-pipeline-staging --region ap-northeast-1

# Production環境の削除
aws cloudformation delete-stack --stack-name okiteru-pipeline-prod --region ap-northeast-1
```

## 参考リンク

- [AWS CodePipeline ドキュメント](https://docs.aws.amazon.com/codepipeline/)
- [AWS CodeBuild ドキュメント](https://docs.aws.amazon.com/codebuild/)
- [GitHub Webhook連携](https://docs.aws.amazon.com/codepipeline/latest/userguide/connections-github.html)

## 運用フロー

### 開発フロー

```bash
# 1. featureブランチで開発
git checkout -b feature/new-feature develop

# 2. コミット
git add .
git commit -m "feat: add new feature"

# 3. developにマージ
git checkout develop
git merge feature/new-feature

# 4. プッシュ（自動デプロイが起動）
git push origin develop
# → Dev環境に自動デプロイ
```

### リリースフロー

```bash
# 1. stagingブランチにマージ
git checkout staging
git merge develop
git push origin staging
# → Staging環境に自動デプロイ

# 2. 動作確認後、mainにマージ
git checkout main
git merge staging
git push origin main
# → Production環境に自動デプロイ（承認後）
```

## 通知設定（オプション）

パイプラインの成功/失敗をSlackやメールで受け取るには、SNS Topicにサブスクリプションを追加：

```bash
# メール通知の設定
aws sns subscribe \
  --topic-arn arn:aws:sns:ap-northeast-1:123456789012:okiteru-pipeline-notifications-dev \
  --protocol email \
  --notification-endpoint your-email@example.com
```
