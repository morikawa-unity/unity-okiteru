#!/bin/bash
# RDS スナップショット保存 & インスタンス削除スクリプト
# Usage: ./snapshot-save.sh --env <development|staging|production>

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
SKIP_CONFIRMATION=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --yes|-y)
            SKIP_CONFIRMATION=true
            shift
            ;;
        *)
            log_error "Unknown argument: $1"
            echo "Usage: ./snapshot-save.sh --env <development|staging|production> [--yes]"
            exit 1
            ;;
    esac
done

# 環境チェック
if [ -z "$ENVIRONMENT" ]; then
    log_error "Environment is required"
    echo "Usage: ./snapshot-save.sh --env <development|staging|production> [--yes]"
    exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    exit 1
fi

# Production環境の保護
if [ "$ENVIRONMENT" = "production" ] && [ "$SKIP_CONFIRMATION" = false ]; then
    log_error "Production environment snapshots should be automated"
    log_error "This script is intended for development/staging only"
    log_error "Use --yes to override"
    exit 1
fi

# 設定
REGION="ap-northeast-1"
STACK_PREFIX="okiteru-${ENVIRONMENT}"
DB_INSTANCE_ID="${STACK_PREFIX}-database"
SNAPSHOT_ID="${STACK_PREFIX}-snapshot-$(date +%Y%m%d-%H%M)"

# ログディレクトリ
LOG_DIR="logs"
mkdir -p ${LOG_DIR}
LOG_FILE="${LOG_DIR}/snapshot-save-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"

log_info "=========================================" | tee -a ${LOG_FILE}
log_info "RDS Snapshot Save for ${ENVIRONMENT}" | tee -a ${LOG_FILE}
log_info "=========================================" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# Step 1: RDS インスタンス存在確認
log_info "Step 1: Checking RDS instance..." | tee -a ${LOG_FILE}

if ! aws rds describe-db-instances \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --region ${REGION} >/dev/null 2>&1; then
    log_error "RDS instance not found: ${DB_INSTANCE_ID}" | tee -a ${LOG_FILE}
    log_info "Maybe already deleted or snapshot already taken?" | tee -a ${LOG_FILE}
    exit 1
fi

# インスタンス状態取得
DB_STATUS=$(aws rds describe-db-instances \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --region ${REGION} \
    --query 'DBInstances[0].DBInstanceStatus' \
    --output text)

log_info "✓ RDS instance found: ${DB_INSTANCE_ID}" | tee -a ${LOG_FILE}
log_info "  Status: ${DB_STATUS}" | tee -a ${LOG_FILE}

# インスタンス情報取得
DB_CLASS=$(aws rds describe-db-instances \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --region ${REGION} \
    --query 'DBInstances[0].DBInstanceClass' \
    --output text)

DB_SIZE=$(aws rds describe-db-instances \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --region ${REGION} \
    --query 'DBInstances[0].AllocatedStorage' \
    --output text)

log_info "  Instance Class: ${DB_CLASS}" | tee -a ${LOG_FILE}
log_info "  Storage Size: ${DB_SIZE}GB" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# 停止中の場合は起動が必要
if [ "$DB_STATUS" = "stopped" ]; then
    log_warn "RDS instance is stopped. Starting instance to create snapshot..." | tee -a ${LOG_FILE}

    aws rds start-db-instance \
        --db-instance-identifier ${DB_INSTANCE_ID} \
        --region ${REGION} \
        2>&1 | tee -a ${LOG_FILE}

    log_info "Waiting for instance to become available..." | tee -a ${LOG_FILE}
    aws rds wait db-instance-available \
        --db-instance-identifier ${DB_INSTANCE_ID} \
        --region ${REGION} \
        2>&1 | tee -a ${LOG_FILE}

    log_info "✓ Instance started" | tee -a ${LOG_FILE}
    log_info "" | tee -a ${LOG_FILE}
fi

# コスト見積もり表示
SNAPSHOT_COST=$(echo "scale=2; ${DB_SIZE} * 0.095" | bc)

log_info "Cost estimate:" | tee -a ${LOG_FILE}
log_info "  Current (running): ~\$15/month" | tee -a ${LOG_FILE}
log_info "  After snapshot: ~\$${SNAPSHOT_COST}/month" | tee -a ${LOG_FILE}
log_info "  Savings: ~\$$(echo "scale=2; 15 - ${SNAPSHOT_COST}" | bc)/month (~$(echo "scale=0; (15 - ${SNAPSHOT_COST}) / 15 * 100" | bc)%)" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# 確認
if [ "$SKIP_CONFIRMATION" = false ]; then
    log_warn "This will:" | tee -a ${LOG_FILE}
    log_warn "  1. Create snapshot: ${SNAPSHOT_ID}" | tee -a ${LOG_FILE}
    log_warn "  2. Delete RDS instance: ${DB_INSTANCE_ID}" | tee -a ${LOG_FILE}
    log_warn "  3. Keep data in snapshot (can restore later)" | tee -a ${LOG_FILE}
    log_warn "" | tee -a ${LOG_FILE}

    read -p "Continue? (yes/no): " CONFIRMATION
    if [ "$CONFIRMATION" != "yes" ]; then
        log_info "Operation cancelled" | tee -a ${LOG_FILE}
        exit 0
    fi
    log_info "" | tee -a ${LOG_FILE}
fi

# Step 2: スナップショット作成
log_info "Step 2: Creating snapshot..." | tee -a ${LOG_FILE}
log_info "  Snapshot ID: ${SNAPSHOT_ID}" | tee -a ${LOG_FILE}

aws rds create-db-snapshot \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --db-snapshot-identifier ${SNAPSHOT_ID} \
    --region ${REGION} \
    2>&1 | tee -a ${LOG_FILE}

log_info "Waiting for snapshot creation to complete (5-10 minutes)..." | tee -a ${LOG_FILE}
START_TIME=$(date +%s)

aws rds wait db-snapshot-completed \
    --db-snapshot-identifier ${SNAPSHOT_ID} \
    --region ${REGION} \
    2>&1 | tee -a ${LOG_FILE}

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

log_info "✓ Snapshot created successfully in ${DURATION} seconds" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# スナップショット情報取得
SNAPSHOT_SIZE=$(aws rds describe-db-snapshots \
    --db-snapshot-identifier ${SNAPSHOT_ID} \
    --region ${REGION} \
    --query 'DBSnapshots[0].AllocatedStorage' \
    --output text)

SNAPSHOT_TIME=$(aws rds describe-db-snapshots \
    --db-snapshot-identifier ${SNAPSHOT_ID} \
    --region ${REGION} \
    --query 'DBSnapshots[0].SnapshotCreateTime' \
    --output text)

log_info "Snapshot details:" | tee -a ${LOG_FILE}
log_info "  ID: ${SNAPSHOT_ID}" | tee -a ${LOG_FILE}
log_info "  Size: ${SNAPSHOT_SIZE}GB" | tee -a ${LOG_FILE}
log_info "  Created: ${SNAPSHOT_TIME}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# Step 3: Parameter Storeに保存
log_info "Step 3: Saving snapshot info to Parameter Store..." | tee -a ${LOG_FILE}

aws ssm put-parameter \
    --name "/okiteru/${ENVIRONMENT}/latest-snapshot-id" \
    --value "${SNAPSHOT_ID}" \
    --type String \
    --overwrite \
    --region ${REGION} \
    2>&1 | tee -a ${LOG_FILE}

aws ssm put-parameter \
    --name "/okiteru/${ENVIRONMENT}/latest-snapshot-date" \
    --value "$(date +%Y-%m-%d_%H:%M:%S)" \
    --type String \
    --overwrite \
    --region ${REGION} \
    2>&1 | tee -a ${LOG_FILE}

log_info "✓ Snapshot info saved to Parameter Store" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# Step 4: RDSインスタンス削除
log_info "Step 4: Deleting RDS instance..." | tee -a ${LOG_FILE}
log_warn "⚠️  This will delete the running instance (data is safe in snapshot)" | tee -a ${LOG_FILE}

aws rds delete-db-instance \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --skip-final-snapshot \
    --region ${REGION} \
    2>&1 | tee -a ${LOG_FILE}

log_info "Waiting for instance deletion to complete (5-10 minutes)..." | tee -a ${LOG_FILE}
START_TIME=$(date +%s)

aws rds wait db-instance-deleted \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --region ${REGION} \
    2>&1 | tee -a ${LOG_FILE}

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

log_info "✓ Instance deleted successfully in ${DURATION} seconds" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# Step 5: 削除確認
log_info "Step 5: Verifying deletion..." | tee -a ${LOG_FILE}

if aws rds describe-db-instances \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --region ${REGION} >/dev/null 2>&1; then
    log_error "Instance still exists!" | tee -a ${LOG_FILE}
    exit 1
else
    log_info "✓ Instance successfully deleted" | tee -a ${LOG_FILE}
fi

# スナップショット存在確認
if aws rds describe-db-snapshots \
    --db-snapshot-identifier ${SNAPSHOT_ID} \
    --region ${REGION} >/dev/null 2>&1; then
    log_info "✓ Snapshot exists and is available" | tee -a ${LOG_FILE}
else
    log_error "Snapshot not found!" | tee -a ${LOG_FILE}
    exit 1
fi

log_info "" | tee -a ${LOG_FILE}

# 完了サマリー
log_info "=========================================" | tee -a ${LOG_FILE}
log_info "✓ Snapshot save completed successfully!" | tee -a ${LOG_FILE}
log_info "=========================================" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "Summary:" | tee -a ${LOG_FILE}
log_info "  ✓ Snapshot created: ${SNAPSHOT_ID}" | tee -a ${LOG_FILE}
log_info "  ✓ RDS instance deleted: ${DB_INSTANCE_ID}" | tee -a ${LOG_FILE}
log_info "  ✓ Snapshot info saved to Parameter Store" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "Cost savings:" | tee -a ${LOG_FILE}
log_info "  Before: ~\$15/month (running instance)" | tee -a ${LOG_FILE}
log_info "  After: ~\$${SNAPSHOT_COST}/month (snapshot only)" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "To restore the database later, run:" | tee -a ${LOG_FILE}
log_info "  ./snapshot-restore.sh --env ${ENVIRONMENT}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "To list all snapshots, run:" | tee -a ${LOG_FILE}
log_info "  ./snapshot-list.sh --env ${ENVIRONMENT}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "Log file saved to: ${LOG_FILE}" | tee -a ${LOG_FILE}
