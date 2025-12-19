#!/bin/bash
# RDS スナップショット復元スクリプト
# Usage: ./snapshot-restore.sh --env <development|staging|production> [--snapshot-id <id>]

set -e

# 色付きログ
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 引数解析
ENVIRONMENT=""
SNAPSHOT_ID=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --snapshot-id)
            SNAPSHOT_ID="$2"
            shift 2
            ;;
        *)
            log_error "Unknown argument: $1"
            echo "Usage: ./snapshot-restore.sh --env <development|staging|production> [--snapshot-id <id>]"
            exit 1
            ;;
    esac
done

# 環境チェック
if [ -z "$ENVIRONMENT" ]; then
    log_error "Environment is required"
    echo "Usage: ./snapshot-restore.sh --env <development|staging|production> [--snapshot-id <id>]"
    exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    exit 1
fi

# 設定
REGION="ap-northeast-1"
STACK_PREFIX="okiteru-${ENVIRONMENT}"
DB_INSTANCE_ID="${STACK_PREFIX}-database"

# ログディレクトリ
LOG_DIR="logs"
mkdir -p ${LOG_DIR}
LOG_FILE="${LOG_DIR}/snapshot-restore-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"

log_info "=========================================" | tee -a ${LOG_FILE}
log_info "RDS Snapshot Restore for ${ENVIRONMENT}" | tee -a ${LOG_FILE}
log_info "=========================================" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# Step 1: RDS インスタンス存在確認
log_info "Step 1: Checking if RDS instance already exists..." | tee -a ${LOG_FILE}

if aws rds describe-db-instances \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --region ${REGION} >/dev/null 2>&1; then
    log_error "RDS instance already exists: ${DB_INSTANCE_ID}" | tee -a ${LOG_FILE}
    log_error "Please delete it first or use a different name" | tee -a ${LOG_FILE}
    exit 1
fi

log_info "✓ No existing instance found (safe to restore)" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# Step 2: スナップショット取得
log_info "Step 2: Finding snapshot to restore..." | tee -a ${LOG_FILE}

if [ -z "$SNAPSHOT_ID" ]; then
    # Parameter Store から最新スナップショットを取得
    log_info "Fetching latest snapshot from Parameter Store..." | tee -a ${LOG_FILE}

    SNAPSHOT_ID=$(aws ssm get-parameter \
        --name "/okiteru/${ENVIRONMENT}/latest-snapshot-id" \
        --region ${REGION} \
        --query 'Parameter.Value' \
        --output text 2>/dev/null || echo "")

    if [ -z "$SNAPSHOT_ID" ] || [ "$SNAPSHOT_ID" = "None" ]; then
        log_error "No snapshot found in Parameter Store" | tee -a ${LOG_FILE}
        log_info "Available snapshots:" | tee -a ${LOG_FILE}

        aws rds describe-db-snapshots \
            --region ${REGION} \
            --query "DBSnapshots[?starts_with(DBSnapshotIdentifier, '${STACK_PREFIX}-snapshot')].{ID:DBSnapshotIdentifier,Date:SnapshotCreateTime,Status:Status}" \
            --output table | tee -a ${LOG_FILE}

        log_error "Please specify a snapshot ID with --snapshot-id" | tee -a ${LOG_FILE}
        exit 1
    fi

    log_info "✓ Using latest snapshot from Parameter Store" | tee -a ${LOG_FILE}
else
    log_info "✓ Using specified snapshot" | tee -a ${LOG_FILE}
fi

log_info "  Snapshot ID: ${SNAPSHOT_ID}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# スナップショット存在確認
log_info "Verifying snapshot exists..." | tee -a ${LOG_FILE}

if ! aws rds describe-db-snapshots \
    --db-snapshot-identifier ${SNAPSHOT_ID} \
    --region ${REGION} >/dev/null 2>&1; then
    log_error "Snapshot not found: ${SNAPSHOT_ID}" | tee -a ${LOG_FILE}
    exit 1
fi

# スナップショット情報取得
SNAPSHOT_SIZE=$(aws rds describe-db-snapshots \
    --db-snapshot-identifier ${SNAPSHOT_ID} \
    --region ${REGION} \
    --query 'DBSnapshots[0].AllocatedStorage' \
    --output text)

SNAPSHOT_DATE=$(aws rds describe-db-snapshots \
    --db-snapshot-identifier ${SNAPSHOT_ID} \
    --region ${REGION} \
    --query 'DBSnapshots[0].SnapshotCreateTime' \
    --output text)

SNAPSHOT_STATUS=$(aws rds describe-db-snapshots \
    --db-snapshot-identifier ${SNAPSHOT_ID} \
    --region ${REGION} \
    --query 'DBSnapshots[0].Status' \
    --output text)

log_info "✓ Snapshot verified" | tee -a ${LOG_FILE}
log_info "  Size: ${SNAPSHOT_SIZE}GB" | tee -a ${LOG_FILE}
log_info "  Created: ${SNAPSHOT_DATE}" | tee -a ${LOG_FILE}
log_info "  Status: ${SNAPSHOT_STATUS}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

if [ "$SNAPSHOT_STATUS" != "available" ]; then
    log_error "Snapshot is not available (status: ${SNAPSHOT_STATUS})" | tee -a ${LOG_FILE}
    exit 1
fi

# Step 3: CloudFormationから必要な情報を取得
log_info "Step 3: Fetching CloudFormation outputs..." | tee -a ${LOG_FILE}

# DBサブネットグループ
DB_SUBNET_GROUP=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_PREFIX}-database \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`DBSubnetGroupName`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -z "$DB_SUBNET_GROUP" ] || [ "$DB_SUBNET_GROUP" = "None" ]; then
    log_error "DB Subnet Group not found in CloudFormation" | tee -a ${LOG_FILE}
    log_error "Make sure the database stack is deployed" | tee -a ${LOG_FILE}
    exit 1
fi

# セキュリティグループ
SECURITY_GROUP=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_PREFIX}-network \
    --region ${REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`DatabaseSecurityGroupId`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -z "$SECURITY_GROUP" ] || [ "$SECURITY_GROUP" = "None" ]; then
    log_error "Security Group not found in CloudFormation" | tee -a ${LOG_FILE}
    log_error "Make sure the network stack is deployed" | tee -a ${LOG_FILE}
    exit 1
fi

log_info "✓ CloudFormation outputs retrieved" | tee -a ${LOG_FILE}
log_info "  DB Subnet Group: ${DB_SUBNET_GROUP}" | tee -a ${LOG_FILE}
log_info "  Security Group: ${SECURITY_GROUP}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# インスタンスクラス決定
case $ENVIRONMENT in
    development)
        DB_CLASS="db.t4g.micro"
        ;;
    staging)
        DB_CLASS="db.t4g.small"
        ;;
    production)
        DB_CLASS="db.t4g.medium"
        ;;
esac

# Step 4: スナップショットから復元
log_info "Step 4: Restoring from snapshot..." | tee -a ${LOG_FILE}
log_info "  Instance ID: ${DB_INSTANCE_ID}" | tee -a ${LOG_FILE}
log_info "  Instance Class: ${DB_CLASS}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --db-snapshot-identifier ${SNAPSHOT_ID} \
    --db-instance-class ${DB_CLASS} \
    --db-subnet-group-name ${DB_SUBNET_GROUP} \
    --vpc-security-group-ids ${SECURITY_GROUP} \
    --no-multi-az \
    --no-publicly-accessible \
    --region ${REGION} \
    2>&1 | tee -a ${LOG_FILE}

log_info "Waiting for instance to become available (10-15 minutes)..." | tee -a ${LOG_FILE}
log_info "This is a good time to grab a coffee ☕" | tee -a ${LOG_FILE}
START_TIME=$(date +%s)

aws rds wait db-instance-available \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --region ${REGION} \
    2>&1 | tee -a ${LOG_FILE}

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

log_info "✓ Instance restored successfully in ${MINUTES}m ${SECONDS}s" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# Step 5: エンドポイント情報取得
log_info "Step 5: Fetching new endpoint information..." | tee -a ${LOG_FILE}

NEW_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --region ${REGION} \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text)

DB_PORT=$(aws rds describe-db-instances \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --region ${REGION} \
    --query 'DBInstances[0].Endpoint.Port' \
    --output text)

DB_NAME=$(aws rds describe-db-instances \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --region ${REGION} \
    --query 'DBInstances[0].DBName' \
    --output text)

log_info "✓ New endpoint retrieved" | tee -a ${LOG_FILE}
log_info "  Endpoint: ${NEW_ENDPOINT}" | tee -a ${LOG_FILE}
log_info "  Port: ${DB_PORT}" | tee -a ${LOG_FILE}
log_info "  Database: ${DB_NAME}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# Step 6: Parameter Store更新
log_info "Step 6: Updating Parameter Store..." | tee -a ${LOG_FILE}

# 既存のDATABASE_URLから認証情報を取得
EXISTING_DATABASE_URL=$(aws ssm get-parameter \
    --name "/okiteru/${ENVIRONMENT}/database-url" \
    --with-decryption \
    --region ${REGION} \
    --query 'Parameter.Value' \
    --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_DATABASE_URL" ]; then
    # URLから認証情報抽出
    DB_USERNAME=$(echo $EXISTING_DATABASE_URL | sed -n 's#.*://\([^:]*\):.*#\1#p')
    DB_PASSWORD=$(echo $EXISTING_DATABASE_URL | sed -n 's#.*://[^:]*:\([^@]*\)@.*#\1#p')
else
    log_warn "Existing DATABASE_URL not found, using defaults" | tee -a ${LOG_FILE}
    DB_USERNAME="okiteru_admin"
    read -sp "Enter database password: " DB_PASSWORD
    echo ""
fi

# 新しいDATABASE_URLを構築
NEW_DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${NEW_ENDPOINT}:${DB_PORT}/${DB_NAME}"

# Parameter Store更新
aws ssm put-parameter \
    --name "/okiteru/${ENVIRONMENT}/database-url" \
    --value "${NEW_DATABASE_URL}" \
    --type SecureString \
    --overwrite \
    --region ${REGION} \
    2>&1 | tee -a ${LOG_FILE}

aws ssm put-parameter \
    --name "/okiteru/${ENVIRONMENT}/database-endpoint" \
    --value "${NEW_ENDPOINT}" \
    --type String \
    --overwrite \
    --region ${REGION} \
    2>&1 | tee -a ${LOG_FILE}

aws ssm put-parameter \
    --name "/okiteru/${ENVIRONMENT}/database-port" \
    --value "${DB_PORT}" \
    --type String \
    --overwrite \
    --region ${REGION} \
    2>&1 | tee -a ${LOG_FILE}

log_info "✓ Parameter Store updated" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# Step 7: 接続テスト
log_info "Step 7: Testing database connection..." | tee -a ${LOG_FILE}

export PGPASSWORD="${DB_PASSWORD}"

# PostgreSQL接続テスト
if command -v psql >/dev/null 2>&1; then
    psql -h ${NEW_ENDPOINT} -p ${DB_PORT} -U ${DB_USERNAME} -d ${DB_NAME} -c "SELECT version();" 2>&1 | tee -a ${LOG_FILE}

    if [ $? -eq 0 ]; then
        log_info "✓ Database connection successful" | tee -a ${LOG_FILE}

        # テーブル数確認
        TABLE_COUNT=$(psql -h ${NEW_ENDPOINT} -p ${DB_PORT} -U ${DB_USERNAME} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')

        log_info "  Tables found: ${TABLE_COUNT}" | tee -a ${LOG_FILE}
    else
        log_warn "Database connection test failed (but instance is running)" | tee -a ${LOG_FILE}
    fi
else
    log_warn "psql not installed, skipping connection test" | tee -a ${LOG_FILE}
fi

unset PGPASSWORD
log_info "" | tee -a ${LOG_FILE}

# 完了サマリー
log_info "=========================================" | tee -a ${LOG_FILE}
log_info "✓ Snapshot restore completed successfully!" | tee -a ${LOG_FILE}
log_info "=========================================" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "Summary:" | tee -a ${LOG_FILE}
log_info "  ✓ Snapshot: ${SNAPSHOT_ID}" | tee -a ${LOG_FILE}
log_info "  ✓ Instance: ${DB_INSTANCE_ID}" | tee -a ${LOG_FILE}
log_info "  ✓ Endpoint: ${NEW_ENDPOINT}" | tee -a ${LOG_FILE}
log_info "  ✓ Parameter Store updated" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "Database connection:" | tee -a ${LOG_FILE}
log_info "  Host: ${NEW_ENDPOINT}" | tee -a ${LOG_FILE}
log_info "  Port: ${DB_PORT}" | tee -a ${LOG_FILE}
log_info "  Database: ${DB_NAME}" | tee -a ${LOG_FILE}
log_info "  Username: ${DB_USERNAME}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "Next steps:" | tee -a ${LOG_FILE}
log_info "  1. Test your application with the restored database" | tee -a ${LOG_FILE}
log_info "  2. When finished, save snapshot: ./snapshot-save.sh --env ${ENVIRONMENT}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "Log file saved to: ${LOG_FILE}" | tee -a ${LOG_FILE}
