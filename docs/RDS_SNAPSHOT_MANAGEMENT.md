# RDS スナップショット管理ガイド

開発環境のコスト削減のため、使用していない期間はRDSインスタンスをスナップショットとして保存し、必要時に復元する運用ガイドです。

---

## 📋 目次

- [背景](#背景)
- [RDS停止の制限](#rds停止の制限)
- [コスト比較](#コスト比較)
- [スナップショット保存手順](#スナップショット保存手順)
- [スナップショット復元手順](#スナップショット復元手順)
- [運用フロー](#運用フロー)
- [スクリプト使用方法](#スクリプト使用方法)
- [よくある質問](#よくある質問)

---

## 背景

### RDS停止の制限

Amazon RDS には**7日間の自動起動制限**があります：

```
RDS インスタンスを停止
↓
7日間経過
↓
自動的に起動される（AWS側のメンテナンスのため）
```

**停止中も課金されるもの:**
- ✅ ストレージ料金（$2.3/月 for 20GB）
- ✅ バックアップ料金
- ❌ インスタンス料金（$13/月）← これだけ節約

**問題点:**
- 7日ごとに手動停止が必要 → 面倒
- 週末や長期休暇で自動起動 → コスト発生
- EventBridgeで自動化しても完全には防げない

**→ スナップショット方式が最適**

---

## コスト比較

### Development環境（db.t4g.micro, 20GB）

| 運用方法 | 月額コスト | 節約率 | 備考 |
|---------|-----------|--------|------|
| **常時起動** | $15/月 | - | 開発中は推奨 |
| **停止（平日のみ起動）** | $10.7/月 | 29% | 7日ごとに手動停止必要 |
| **スナップショット** | **$1.9/月** | **87%** | 使わない期間が長い場合に最適 |
| **ローカルのみ** | $0/月 | 100% | 開発初期は推奨 |

### Staging/Production環境

**→ スナップショット方式は使わない（常時起動）**

本番環境やステージング環境は可用性が重要なため、常時起動を推奨します。

---

## スナップショット保存手順

### 1. スナップショット作成前の準備

**データベースの状態確認:**

```bash
# RDS インスタンス情報確認
aws rds describe-db-instances \
  --db-instance-identifier okiteru-development-database \
  --region ap-northeast-1

# 現在の状態（available/stopped等）を確認
aws rds describe-db-instances \
  --db-instance-identifier okiteru-development-database \
  --region ap-northeast-1 \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text
```

### 2. スナップショット作成

```bash
# スナップショット作成
aws rds create-db-snapshot \
  --db-instance-identifier okiteru-development-database \
  --db-snapshot-identifier okiteru-dev-snapshot-$(date +%Y%m%d-%H%M) \
  --region ap-northeast-1

# 作成完了まで待機（5-10分）
aws rds wait db-snapshot-completed \
  --db-snapshot-identifier okiteru-dev-snapshot-20251219-1500 \
  --region ap-northeast-1

# スナップショット確認
aws rds describe-db-snapshots \
  --db-snapshot-identifier okiteru-dev-snapshot-20251219-1500 \
  --region ap-northeast-1
```

**作成時間:** 5-10分（データベースサイズによる）

### 3. スナップショット情報をParameter Storeに保存

```bash
# 最新スナップショット名を保存
aws ssm put-parameter \
  --name "/okiteru/development/latest-snapshot-id" \
  --value "okiteru-dev-snapshot-20251219-1500" \
  --type String \
  --overwrite \
  --region ap-northeast-1

# スナップショット作成日時も保存
aws ssm put-parameter \
  --name "/okiteru/development/latest-snapshot-date" \
  --value "$(date +%Y-%m-%d_%H:%M:%S)" \
  --type String \
  --overwrite \
  --region ap-northeast-1
```

### 4. RDSインスタンス削除

```bash
# ⚠️ 警告: この操作は取り消せません
# スナップショットが正常に作成されていることを確認してから実行

# 最終スナップショット作成なしで削除
aws rds delete-db-instance \
  --db-instance-identifier okiteru-development-database \
  --skip-final-snapshot \
  --region ap-northeast-1

# 削除完了まで待機（5-10分）
aws rds wait db-instance-deleted \
  --db-instance-identifier okiteru-development-database \
  --region ap-northeast-1
```

**削除時間:** 5-10分

### 5. 削除確認

```bash
# インスタンスが削除されたことを確認
aws rds describe-db-instances \
  --db-instance-identifier okiteru-development-database \
  --region ap-northeast-1 2>&1 | grep "DBInstanceNotFound"

# スナップショット一覧確認
aws rds describe-db-snapshots \
  --region ap-northeast-1 \
  --query 'DBSnapshots[?starts_with(DBSnapshotIdentifier, `okiteru-dev`)].{ID:DBSnapshotIdentifier,Date:SnapshotCreateTime,Size:AllocatedStorage,Status:Status}' \
  --output table
```

---

## スナップショット復元手順

### 1. 最新スナップショット確認

```bash
# Parameter Storeから最新スナップショット取得
SNAPSHOT_ID=$(aws ssm get-parameter \
  --name "/okiteru/development/latest-snapshot-id" \
  --region ap-northeast-1 \
  --query 'Parameter.Value' \
  --output text)

echo "Latest snapshot: ${SNAPSHOT_ID}"

# または、スナップショット一覧から選択
aws rds describe-db-snapshots \
  --region ap-northeast-1 \
  --query 'DBSnapshots[?starts_with(DBSnapshotIdentifier, `okiteru-dev`)].{ID:DBSnapshotIdentifier,Date:SnapshotCreateTime,Status:Status}' \
  --output table
```

### 2. スナップショットから復元

```bash
# CloudFormationスタックからサブネットグループ名を取得
DB_SUBNET_GROUP=$(aws cloudformation describe-stacks \
  --stack-name okiteru-development-database \
  --region ap-northeast-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`DBSubnetGroupName`].OutputValue' \
  --output text)

# セキュリティグループIDを取得
SECURITY_GROUP=$(aws cloudformation describe-stacks \
  --stack-name okiteru-development-network \
  --region ap-northeast-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseSecurityGroupId`].OutputValue' \
  --output text)

# スナップショットから復元
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier okiteru-development-database \
  --db-snapshot-identifier ${SNAPSHOT_ID} \
  --db-instance-class db.t4g.micro \
  --db-subnet-group-name ${DB_SUBNET_GROUP} \
  --vpc-security-group-ids ${SECURITY_GROUP} \
  --no-multi-az \
  --no-publicly-accessible \
  --region ap-northeast-1

# 復元完了まで待機（10-15分）
aws rds wait db-instance-available \
  --db-instance-identifier okiteru-development-database \
  --region ap-northeast-1
```

**復元時間:** 10-15分

### 3. エンドポイント情報を取得

```bash
# 新しいエンドポイントを取得
NEW_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier okiteru-development-database \
  --region ap-northeast-1 \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "New database endpoint: ${NEW_ENDPOINT}"
```

### 4. Parameter Store更新

```bash
# DATABASE_URLを更新（パスワードは既存のものを使用）
DB_USERNAME="okiteru_admin"
DB_PASSWORD="<existing_password>"  # 既存のパスワード
DB_PORT="5432"
DB_NAME="okiteru"

NEW_DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${NEW_ENDPOINT}:${DB_PORT}/${DB_NAME}"

aws ssm put-parameter \
  --name "/okiteru/development/database-url" \
  --value "${NEW_DATABASE_URL}" \
  --type SecureString \
  --overwrite \
  --region ap-northeast-1

aws ssm put-parameter \
  --name "/okiteru/development/database-endpoint" \
  --value "${NEW_ENDPOINT}" \
  --type String \
  --overwrite \
  --region ap-northeast-1
```

### 5. 接続テスト

```bash
# PostgreSQL接続テスト
export PGPASSWORD="${DB_PASSWORD}"
psql -h ${NEW_ENDPOINT} -p 5432 -U ${DB_USERNAME} -d ${DB_NAME} -c "SELECT version();"

# テーブル一覧確認
psql -h ${NEW_ENDPOINT} -p 5432 -U ${DB_USERNAME} -d ${DB_NAME} -c "\dt"
```

### 6. Lambda環境変数更新（必要に応じて）

```bash
# Lambda関数のDATABASE_URL環境変数を更新
LAMBDA_FUNCTION=$(aws ssm get-parameter \
  --name "/okiteru/development/lambda-function-name" \
  --region ap-northeast-1 \
  --query 'Parameter.Value' \
  --output text)

aws lambda update-function-configuration \
  --function-name ${LAMBDA_FUNCTION} \
  --environment "Variables={DATABASE_URL=${NEW_DATABASE_URL}}" \
  --region ap-northeast-1
```

---

## 運用フロー

### 開発開始時

```
1. スナップショット一覧確認
   ↓
2. 最新スナップショットから復元（10-15分）
   ↓
3. Parameter Store更新
   ↓
4. 接続テスト
   ↓
5. 開発作業開始
```

### 開発終了時（長期間使わない場合）

```
1. 作業内容をコミット・プッシュ
   ↓
2. スナップショット作成（5-10分）
   ↓
3. Parameter Storeに保存
   ↓
4. RDSインスタンス削除（5-10分）
   ↓
5. 削除確認
```

### 緊急時（すぐに使いたい場合）

```
スナップショット復元中（10-15分待てない）
   ↓
ローカルPostgreSQLで開発
   ↓
docker-compose up -d postgres
uvicorn app.main:app --reload
```

---

## スクリプト使用方法

便利なスクリプトを `infra/cloudformation/` に用意しています。

### snapshot-save.sh

スナップショット作成 → RDS削除

```bash
cd infra/cloudformation

# Development環境をスナップショット化
./snapshot-save.sh --env development

# 処理内容:
# 1. RDSの状態確認
# 2. スナップショット作成（5-10分）
# 3. Parameter Storeに保存
# 4. RDSインスタンス削除（5-10分）
# 5. 削除確認
```

### snapshot-restore.sh

スナップショットから復元

```bash
cd infra/cloudformation

# Development環境を復元
./snapshot-restore.sh --env development

# 特定のスナップショットから復元
./snapshot-restore.sh --env development --snapshot-id okiteru-dev-snapshot-20251219-1500

# 処理内容:
# 1. 最新スナップショット取得
# 2. CloudFormation出力取得（SubnetGroup, SecurityGroup）
# 3. スナップショットから復元（10-15分）
# 4. Parameter Store更新
# 5. 接続テスト
```

### snapshot-list.sh

スナップショット一覧表示

```bash
cd infra/cloudformation

# Development環境のスナップショット一覧
./snapshot-list.sh --env development

# 出力例:
# Snapshot ID                        | Created              | Size | Status
# okiteru-dev-snapshot-20251219-1500 | 2025-12-19T15:00:00Z | 20GB | available
# okiteru-dev-snapshot-20251218-1000 | 2025-12-18T10:00:00Z | 20GB | available
#
# Total snapshots: 2
# Total cost: $1.9/month
```

### snapshot-delete.sh

古いスナップショット削除

```bash
cd infra/cloudformation

# 特定のスナップショット削除
./snapshot-delete.sh --env development --snapshot-id okiteru-dev-snapshot-20251218-1000

# 30日より古いスナップショットを自動削除
./snapshot-delete.sh --env development --older-than 30
```

---

## よくある質問

### Q1. スナップショット作成中もインスタンス料金はかかりますか？

**A:** はい、スナップショット作成中（5-10分）はインスタンスが稼働しているため料金が発生します。ただし、短時間なので影響は小さいです。

### Q2. スナップショットはいくつまで保存できますか？

**A:** 制限はありませんが、コストがかかります（$0.095/GB/月）。通常は最新1-2個を保持し、古いものは削除することを推奨します。

### Q3. スナップショットから復元したらデータは元通りですか？

**A:** はい、スナップショット作成時点の状態に完全に復元されます。テーブル、データ、インデックス全て含まれます。

### Q4. エンドポイントは変わりますか？

**A:** はい、復元後は新しいエンドポイントが発行されます。Parameter Storeの更新が必要です。

### Q5. スナップショット復元中にエラーが出ました

**A:** よくある原因：
- サブネットグループが存在しない → CloudFormationスタック確認
- セキュリティグループが存在しない → ネットワークスタック確認
- インスタンス名が重複 → 既存インスタンスを削除

### Q6. 週末だけRDSを止めたい場合は？

**A:** スナップショット方式よりも停止方式が簡単です：

```bash
# 金曜夜に停止
aws rds stop-db-instance --db-instance-identifier okiteru-development-database

# 月曜朝に起動
aws rds start-db-instance --db-instance-identifier okiteru-development-database
```

ただし、7日間制限があるため月曜に起動を忘れると自動起動されます。

### Q7. 本番環境でもスナップショットを使いますか？

**A:** いいえ。本番環境は常時起動を推奨します。スナップショットは以下の用途で使用：
- 定期バックアップ（自動）
- メジャーアップグレード前のバックアップ
- 別環境へのデータコピー

---

## コスト削減の推奨運用

### 開発初期（現在）

```
ローカルPostgreSQLのみ使用
↓
AWS RDSは使わない
↓
コスト: $0/月
```

### 定期デモ/検証時

```
デモ前日: スナップショット復元（./snapshot-restore.sh）
↓
デモ当日: RDS使用
↓
デモ終了後: スナップショット保存 + RDS削除（./snapshot-save.sh）
↓
コスト: $1.9/月（スナップショット保存のみ）
```

### 活発な開発期間

```
RDSを常時起動
↓
コスト: $15/月
```

### 長期休暇（1ヶ月以上）

```
スナップショット保存 + RDS削除
↓
コスト: $1.9/月
```

---

## まとめ

| シナリオ | 推奨方法 | 月額コスト |
|---------|---------|-----------|
| 開発初期 | ローカルのみ | $0 |
| 週末のみ停止 | 停止方式 | $10.7 |
| 月1-2回のみ使用 | スナップショット | $1.9 |
| 毎日使用 | 常時起動 | $15 |
| 本番環境 | 常時起動 | $70+ |

**→ 使用頻度に応じて最適な方法を選択しましょう！**

---

## 関連ドキュメント

- [CloudFormation インフラ構築ガイド](../infra/cloudformation/README.md)
- [ローカルデータベース環境構築](LOCAL_DATABASE_SETUP.md)
- [データベース設計書](DATABASE_DESIGN.md)

---

**作成日**: 2025-12-19
**更新日**: 2025-12-19
