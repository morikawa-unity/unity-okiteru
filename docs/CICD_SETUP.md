# CI/CD セットアップガイド

AWS CodePipeline を使った自動デプロイの設定手順

---

## 📋 概要

このプロジェクトでは、AWS CodePipeline を使って以下を自動化しています：

- ✅ **バックエンドデプロイ**: Lambda 関数の自動更新
- ✅ **フロントエンドデプロイ**: S3 アップロード + CloudFront 無効化
- ✅ **インフラ統合**: CloudFormation で一元管理

**git push するだけで自動デプロイされます！**

### アーキテクチャ

```
GitHub → CodePipeline → CodeBuild → Lambda/S3
   ↓         ↓           ↓          ↓
 Webhook   自動起動    ビルド・テスト  デプロイ
```

---

## 🌿 ブランチ戦略

| ブランチ  | 環境        | デプロイタイミング             | 承認     |
| --------- | ----------- | ------------------------------ | -------- |
| `develop` | development | develop に push またはマージ時 | 不要     |
| `staging` | staging     | staging に push またはマージ時 | 不要     |
| `main`    | production  | main に push またはマージ時    | **必要** |

### 推奨ワークフロー

```
feature/xxx → develop → staging → main
   ↓            ↓         ↓        ↓
 開発中     development  staging  production
                                   (承認後)
```

---

## 🔧 初期セットアップ

### 1. GitHub Personal Access Token の設定

CodePipeline が GitHub と連携するために、Personal Access Token が必要です。

#### GitHub Personal Access Token の作成

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" をクリック
3. 以下の権限を付与：
   - `repo` (全て)
   - `admin:repo_hook` (全て)
4. トークンをコピー

#### AWS Secrets Manager に保存

```bash
aws secretsmanager create-secret \
  --name github-token \
  --description "GitHub Personal Access Token for CodePipeline" \
  --secret-string '{"token":"ghp_your_token_here"}' \
  --region ap-northeast-1
```

### 2. CloudFormation パラメータの設定

`infra/cloudformation/parameters-*.json` で GitHub の設定を確認：

```json
{
  "ParameterKey": "GitHubOwner",
  "ParameterValue": "your-github-username"  // ← 実際のユーザー名に変更
},
{
  "ParameterKey": "GitHubRepo",
  "ParameterValue": "unity-okiteru"
},
{
  "ParameterKey": "GitHubBranch",
  "ParameterValue": "develop"  // 環境ごとに異なる
}
```

### 3. インフラのデプロイ

CI/CD パイプラインも含めて全インフラをデプロイ：

```bash
cd infra/cloudformation

# 開発環境
./deploy.sh --env development

# ステージング環境
./deploy.sh --env staging

# 本番環境
./deploy.sh --env production
```

詳細は [`infra/cloudformation/README.md`](../infra/cloudformation/README.md) を参照してください。

---

## 🚀 使い方

### 自動デプロイの流れ

1. **コード変更**: `backend/` または `frontend/` を編集
2. **git push**: 対象ブランチにプッシュ
3. **Webhook 起動**: GitHub から CodePipeline に通知
4. **ビルド実行**: CodeBuild でテスト・ビルド
5. **デプロイ**: Lambda/S3 に自動デプロイ

### バックエンドのデプロイ

```bash
# backend/app/main.py を編集
git add backend/
git commit -m "feat: add new API endpoint"
git push origin develop  # development環境にデプロイ
```

**デプロイフロー**:

1. ✅ Python 依存関係インストール
2. ✅ Linter 実行 (ruff)
3. ✅ テスト実行 (pytest)
4. ✅ Lambda パッケージング
5. ✅ Lambda 関数更新
6. ✅ 環境変数更新

**所要時間**: 約 5〜8 分

### フロントエンドのデプロイ

```bash
# frontend/src/pages/index.tsx を編集
git add frontend/
git commit -m "feat: update home page"
git push origin develop  # development環境にデプロイ
```

**デプロイフロー**:

1. ✅ Node.js 依存関係インストール
2. ✅ Linter 実行 (ESLint)
3. ✅ テスト実行 (Jest)
4. ✅ 環境変数設定
5. ✅ Next.js ビルド
6. ✅ S3 にアップロード
7. ✅ CloudFront キャッシュ無効化

**所要時間**: 約 8〜12 分

### 両方同時にデプロイ

`backend/` と `frontend/` の両方を変更した場合、1 つのパイプラインで処理されます：

```bash
git add backend/ frontend/
git commit -m "feat: add new feature"
git push origin develop
```

---

## 📊 デプロイ状況の確認

### CodePipeline コンソール

1. AWS コンソール → CodePipeline
2. `okiteru-pipeline-{environment}` を選択
3. 実行状況とログを確認

### CodeBuild ログ

```bash
# CloudWatch Logsで詳細確認
aws logs tail /aws/codebuild/okiteru-development --follow
```

### デプロイ結果の確認

#### Lambda 関数の確認

```bash
aws lambda get-function \
  --function-name development-okiteru-api \
  --query 'Configuration.[LastModified,CodeSize]'
```

#### S3 同期の確認

```bash
aws s3 ls s3://development-okiteru-frontend-${AWS_ACCOUNT_ID}/ --recursive
```

#### CloudFront 無効化の確認

```bash
aws cloudfront list-invalidations \
  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID}
```

---

## 🛠️ トラブルシューティング

### パイプライン作成失敗

#### 1. GitHub Token エラー

**エラー**: `GitHub connection failed`

```bash
# Secrets Managerの確認
aws secretsmanager get-secret-value \
  --secret-id github-token \
  --query SecretString --output text
```

**解決方法**:

- GitHub Personal Access Token が正しいか確認
- token 権限（repo, admin:repo_hook）があるか確認

#### 2. Parameter Store エラー

**エラー**: `Parameter not found`

```bash
# Parameter Storeの確認
aws ssm get-parameter \
  --name /okiteru/development/database-url \
  --region ap-northeast-1
```

**解決方法**:

- `./setup-parameters.sh --env development` を実行

### ビルド失敗

#### 1. Backend エラー

**エラー**: `ModuleNotFoundError: No module named 'mangum'`

```bash
# requirements.txt の確認
cat backend/requirements.txt | grep mangum
```

**解決方法**:

```bash
echo "mangum==0.17.0" >> backend/requirements.txt
git add backend/requirements.txt
git commit -m "fix: add mangum dependency"
git push
```

#### 2. Frontend エラー

**エラー**: `Module not found: Can't resolve '@/components/...'`

```bash
# tsconfig.json の確認
cat frontend/tsconfig.json | grep "@/*"
```

**解決方法**:

- パスエイリアス設定を確認
- `"@/*": ["./src/*"]` が設定されているか確認

#### 3. 環境変数エラー

**エラー**: `Environment variable not found`

```bash
# Parameter Store の値を確認
aws ssm get-parameters \
  --names /okiteru/development/api-url \
          /okiteru/development/cognito-user-pool-id \
  --region ap-northeast-1
```

**解決方法**:

- `./setup-parameters.sh --env development` を再実行

### デプロイ失敗

#### 1. Lambda 更新エラー

**エラー**: `AccessDenied: User is not authorized to perform: lambda:UpdateFunctionCode`

**解決方法**:

- CodeBuildServiceRole の権限を確認
- Lambda 関数が存在するか確認

#### 2. S3 同期エラー

**エラー**: `NoSuchBucket: The specified bucket does not exist`

**解決方法**:

- S3 バケットが作成されているか確認
- バケット名が正しいか確認

#### 3. CloudFront 無効化エラー

**エラー**: `InvalidDistributionId: The distribution ID is malformed`

**解決方法**:

- CloudFront Distribution ID を確認
- Parameter Store の値を確認

---

## 🔒 セキュリティベストプラクティス

### 1. IAM 権限の最小化

CodeBuildServiceRole は最小限の権限のみを付与：

- ✅ S3: 対象バケットのみアクセス
- ✅ Lambda: 対象関数のみ更新
- ✅ CloudFront: 無効化のみ
- ✅ Parameter Store: 読み取りのみ

### 2. シークレット管理

- ✅ GitHub Token は Secrets Manager で管理
- ✅ データベース認証情報は Parameter Store (SecureString)
- ✅ 定期的にトークンをローテーション

### 3. ブランチ保護

main ブランチを保護：

**Settings → Branches → Branch protection rules**

- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
- ✅ Require linear history

---

## 📈 モニタリング

### CloudWatch メトリクス

```bash
# CodePipeline 実行状況
aws cloudwatch get-metric-statistics \
  --namespace AWS/CodePipeline \
  --metric-name PipelineExecutionSuccess \
  --dimensions Name=PipelineName,Value=okiteru-pipeline-development \
  --start-time 2025-01-01T00:00:00Z \
  --end-time 2025-01-01T23:59:59Z \
  --period 3600 \
  --statistics Sum

# CodeBuild ビルド時間
aws cloudwatch get-metric-statistics \
  --namespace AWS/CodeBuild \
  --metric-name Duration \
  --dimensions Name=ProjectName,Value=okiteru-build-development \
  --start-time 2025-01-01T00:00:00Z \
  --end-time 2025-01-01T23:59:59Z \
  --period 3600 \
  --statistics Average
```

### SNS 通知

パイプラインの成功/失敗を Slack やメールで受け取る：

```bash
# メール通知の設定
aws sns subscribe \
  --topic-arn arn:aws:sns:ap-northeast-1:123456789012:okiteru-pipeline-notifications-development \
  --protocol email \
  --notification-endpoint your-email@example.com
```

---

## 🔄 ロールバック

### 手動ロールバック

デプロイに問題がある場合の緊急対応：

#### Backend (Lambda)

```bash
# 以前のバージョンを確認
aws lambda list-versions-by-function \
  --function-name development-okiteru-api

# 特定バージョンにロールバック
aws lambda update-alias \
  --function-name development-okiteru-api \
  --name development \
  --function-version 5
```

#### Frontend (S3)

```bash
# S3バージョニングから復元
aws s3api list-object-versions \
  --bucket development-okiteru-frontend-xxx \
  --prefix index.html

# 特定バージョンを復元
aws s3api copy-object \
  --copy-source development-okiteru-frontend-xxx/index.html?versionId=xxx \
  --bucket development-okiteru-frontend-xxx \
  --key index.html

# CloudFrontキャッシュ無効化
aws cloudfront create-invalidation \
  --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} \
  --paths "/*"
```

### Git ベースロールバック

```bash
# 問題のあるコミットをrevert
git revert HEAD
git push origin develop  # 自動的に再デプロイ
```

---

## 🚀 パフォーマンス最適化

### ビルド時間の短縮

#### 1. CodeBuild キャッシュ

```yaml
# buildspec.yml
cache:
  paths:
    - "frontend/node_modules/**/*"
    - "backend/.venv/**/*"
```

#### 2. 並列ビルド

```yaml
# buildspec.yml
phases:
  build:
    commands:
      # フロントエンドとバックエンドを並列処理
      - |
        (cd frontend && npm run build) &
        (cd backend && python -m pip install -r requirements.txt -t .) &
        wait
```

### Lambda パッケージサイズ最適化

```bash
# 不要なファイルを除外
zip -r lambda-deployment.zip . \
  -x "*.git*" \
  -x "*__pycache__*" \
  -x "*.pyc" \
  -x "tests/*" \
  -x "*.pytest_cache*" \
  -x "node_modules/*"
```

---

## 📚 参考資料

- [AWS CodePipeline ドキュメント](https://docs.aws.amazon.com/codepipeline/)
- [AWS CodeBuild ドキュメント](https://docs.aws.amazon.com/codebuild/)
- [GitHub Webhook 連携](https://docs.aws.amazon.com/codepipeline/latest/userguide/connections-github.html)
- [CloudFormation スタック管理](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacks.html)

---

**最終更新**: 2025-12-19
**バージョン**: 2.0 (CodePipeline 統合版)
