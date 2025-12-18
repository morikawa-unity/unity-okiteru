# CI/CD セットアップガイド

GitHub Actionsを使った自動デプロイの設定手順

---

## 📋 概要

このプロジェクトでは、GitHub Actionsを使って以下を自動化しています：

- ✅ **バックエンドデプロイ**: Lambda関数の自動更新
- ✅ **フロントエンドデプロイ**: S3アップロード + CloudFront無効化

**git pushするだけで自動デプロイされます！**

---

## 🌿 ブランチ戦略

| ブランチ | 環境 | デプロイタイミング |
|---------|------|------------------|
| `main` | production | mainにpushまたはマージ時 |
| `staging` | staging | stagingにpushまたはマージ時 |
| `develop` | development | developにpushまたはマージ時 |

### 推奨ワークフロー

```
feature/xxx → develop → staging → main
   ↓            ↓         ↓        ↓
 開発中     development  staging  production
```

---

## 🔧 初期セットアップ

### 1. GitHub Secrets の設定

GitHubリポジトリの Settings → Secrets and variables → Actions で以下を設定：

#### 必須のシークレット

| シークレット名 | 説明 | 取得方法 |
|---------------|------|---------|
| `AWS_ACCESS_KEY_ID` | AWS アクセスキー | IAMユーザーから取得 |
| `AWS_SECRET_ACCESS_KEY` | AWS シークレットキー | IAMユーザーから取得 |

#### AWS IAM ユーザーの作成

```bash
# AWS CLI で作成（管理者権限がある場合）
aws iam create-user --user-name github-actions-okiteru

# ポリシーをアタッチ
aws iam attach-user-policy \
  --user-name github-actions-okiteru \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess

# アクセスキーを作成
aws iam create-access-key --user-name github-actions-okiteru
```

**出力されたアクセスキーをGitHub Secretsに登録してください。**

---

### 2. CloudFormation スタックのデプロイ

CI/CDが動作するには、事前にCloudFormationスタックをデプロイしておく必要があります。

```bash
# 環境変数設定
ENV=production  # または staging, development
REGION=ap-northeast-1

# 各スタックをデプロイ（infra/README.md 参照）
cd infra/cloudformation

# 1. ネットワーク層
aws cloudformation create-stack \
  --stack-name ${ENV}-okiteru-network \
  --template-body file://01-network.yaml \
  --parameters file://parameters-${ENV}-local.json \
  --region ${REGION}

# ... (以降のスタックも同様にデプロイ)
```

詳細は [`infra/README.md`](../infra/README.md) を参照してください。

---

### 3. ブランチの作成

```bash
# staging ブランチ作成
git checkout -b staging
git push origin staging

# develop ブランチ作成
git checkout -b develop
git push origin develop

# main ブランチに戻る
git checkout main
```

---

## 🚀 使い方

### バックエンドのデプロイ

`backend/` ディレクトリ内のファイルを変更してpushすると自動的にデプロイされます。

```bash
# backend/app/main.py を編集

git add backend/
git commit -m "feat: add new API endpoint"
git push origin main  # production環境にデプロイ
```

**デプロイフロー**:
1. ✅ テスト実行
2. ✅ Lambda パッケージビルド
3. ✅ S3にアップロード
4. ✅ Lambda関数更新
5. ✅ デプロイ完了通知

**所要時間**: 約3〜5分

---

### フロントエンドのデプロイ

`frontend/` ディレクトリ内のファイルを変更してpushすると自動的にデプロイされます。

```bash
# frontend/src/pages/index.tsx を編集

git add frontend/
git commit -m "feat: update home page"
git push origin main  # production環境にデプロイ
```

**デプロイフロー**:
1. ✅ CloudFormation から環境変数取得
2. ✅ 依存関係インストール
3. ✅ Linter実行
4. ✅ Next.jsビルド
5. ✅ S3にアップロード
6. ✅ CloudFrontキャッシュ無効化
7. ✅ デプロイ完了通知

**所要時間**: 約5〜10分

---

### 両方同時にデプロイ

`backend/` と `frontend/` の両方を変更した場合、2つのワークフローが並列実行されます。

```bash
git add backend/ frontend/
git commit -m "feat: add new feature"
git push origin main
```

---

## 📊 デプロイ状況の確認

### GitHub Actions の確認

1. GitHubリポジトリの **Actions** タブを開く
2. 実行中のワークフローを確認
3. ログを確認して進捗状況を追跡

### AWS コンソールでの確認

#### Lambda 関数の確認
```bash
aws lambda get-function \
  --function-name production-okiteru-api \
  --query 'Configuration.[LastModified,CodeSize]'
```

#### CloudFront 無効化の確認
```bash
aws cloudfront list-invalidations \
  --distribution-id YOUR_DISTRIBUTION_ID
```

---

## 🛠️ トラブルシューティング

### デプロイが失敗する

#### 1. GitHub Secrets の確認

```bash
# AWS認証情報が正しいか確認
aws sts get-caller-identity
```

**エラー**: `An error occurred (InvalidClientTokenId)`
→ AWS_ACCESS_KEY_ID が間違っています

#### 2. CloudFormation スタックの確認

```bash
# スタックが存在するか確認
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query 'StackSummaries[?contains(StackName, `okiteru`)].StackName'
```

**エラー**: Stack with id XXX does not exist
→ CloudFormation スタックをデプロイしてください

#### 3. Lambda 関数の確認

```bash
# Lambda関数が存在するか確認
aws lambda get-function --function-name production-okiteru-api
```

**エラー**: ResourceNotFoundException
→ Lambda スタックをデプロイしてください

#### 4. S3 バケットの確認

```bash
# S3バケットが存在するか確認
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws s3 ls s3://production-okiteru-lambda-deployment-${ACCOUNT_ID}
```

**エラー**: NoSuchBucket
→ Storage スタックをデプロイしてください

---

### ビルドエラー

#### Backend

**エラー**: `ModuleNotFoundError: No module named 'mangum'`

```bash
# requirements.txt に mangum を追加
echo "mangum==0.17.0" >> backend/requirements.txt
git add backend/requirements.txt
git commit -m "fix: add mangum dependency"
git push
```

#### Frontend

**エラー**: `Module not found: Can't resolve '@/components/...'`

```bash
# パスエイリアス確認
cat frontend/tsconfig.json
# "@/*": ["./src/*"] が設定されているか確認
```

---

### パフォーマンス最適化

#### Lambda パッケージサイズが大きい

```bash
# パッケージサイズ確認
cd backend
./scripts/package-lambda.sh
du -h lambda-deployment.zip
```

**50MBを超える場合**:
- Lambda Layers の使用を検討
- 不要な依存関係を削除
- `--only-binary=:all:` でバイナリのみインストール

#### CloudFront キャッシュの調整

キャッシュポリシーを調整して配信速度を向上：

```yaml
# infra/cloudformation/06-cloudfront.yaml
CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
# → Managed-CachingOptimized（推奨）
```

---

## 🔒 セキュリティベストプラクティス

### 1. IAM権限の最小化

GitHub Actions用のIAMユーザーに最小限の権限のみを付与：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::*-okiteru-*/*",
        "arn:aws:s3:::*-okiteru-*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:GetFunction",
        "lambda:PublishVersion"
      ],
      "Resource": "arn:aws:lambda:*:*:function:*-okiteru-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:DescribeStacks"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. シークレットの管理

- ✅ GitHub Secrets を使用（コードにハードコードしない）
- ✅ 定期的にアクセスキーをローテーション
- ✅ 不要になったキーは削除

### 3. ブランチ保護

mainブランチを保護：

**Settings → Branches → Branch protection rules**

- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
- ✅ Require linear history

---

## 📈 モニタリング

### CloudWatch Logs

```bash
# Lambda ログ確認
aws logs tail /aws/lambda/production-okiteru-api --follow

# API Gateway ログ確認
aws logs tail /aws/apigateway/production-okiteru-api --follow
```

### メトリクス確認

```bash
# Lambda メトリクス
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=production-okiteru-api \
  --start-time 2025-01-01T00:00:00Z \
  --end-time 2025-01-01T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

---

## 🔄 ロールバック

デプロイに問題がある場合、以前のバージョンにロールバック：

### Backend (Lambda)

```bash
# 以前のバージョンを確認
aws lambda list-versions-by-function \
  --function-name production-okiteru-api

# 特定バージョンにロールバック
aws lambda update-alias \
  --function-name production-okiteru-api \
  --name production \
  --function-version 5
```

### Frontend

```bash
# S3バージョニングから復元
aws s3api list-object-versions \
  --bucket production-okiteru-frontend-xxx \
  --prefix index.html

# 特定バージョンを復元
aws s3api copy-object \
  --copy-source production-okiteru-frontend-xxx/index.html?versionId=xxx \
  --bucket production-okiteru-frontend-xxx \
  --key index.html
```

---

## 📚 参考資料

- [GitHub Actions ドキュメント](https://docs.github.com/ja/actions)
- [AWS Lambda デプロイメント](https://docs.aws.amazon.com/lambda/latest/dg/lambda-deploy-functions.html)
- [CloudFront キャッシュ無効化](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)
- [Mangum ドキュメント](https://mangum.io/)

---

**最終更新**: 2025-12-18
**バージョン**: 1.0
