#!/bin/bash
# RDS スナップショット一覧表示スクリプト
# Usage: ./snapshot-list.sh --env <development|staging|production>

set -e

# 色付きログ
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_header() {
    echo -e "${BLUE}$1${NC}"
}

# 引数解析
ENVIRONMENT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        *)
            echo "Unknown argument: $1"
            echo "Usage: ./snapshot-list.sh --env <development|staging|production>"
            exit 1
            ;;
    esac
done

# 環境チェック
if [ -z "$ENVIRONMENT" ]; then
    echo "Environment is required"
    echo "Usage: ./snapshot-list.sh --env <development|staging|production>"
    exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo "Invalid environment: $ENVIRONMENT"
    exit 1
fi

# 設定
REGION="ap-northeast-1"
STACK_PREFIX="okiteru-${ENVIRONMENT}"

log_header "========================================="
log_header "RDS Snapshots for ${ENVIRONMENT}"
log_header "========================================="
echo ""

# Parameter Store から最新スナップショット取得
log_info "Latest snapshot (from Parameter Store):"
LATEST_SNAPSHOT=$(aws ssm get-parameter \
    --name "/okiteru/${ENVIRONMENT}/latest-snapshot-id" \
    --region ${REGION} \
    --query 'Parameter.Value' \
    --output text 2>/dev/null || echo "Not set")

LATEST_DATE=$(aws ssm get-parameter \
    --name "/okiteru/${ENVIRONMENT}/latest-snapshot-date" \
    --region ${REGION} \
    --query 'Parameter.Value' \
    --output text 2>/dev/null || echo "Not set")

echo "  Snapshot ID: ${LATEST_SNAPSHOT}"
echo "  Saved at: ${LATEST_DATE}"
echo ""

# RDS インスタンス状態確認
log_info "RDS Instance status:"

DB_INSTANCE_ID="${STACK_PREFIX}-database"
if aws rds describe-db-instances \
    --db-instance-identifier ${DB_INSTANCE_ID} \
    --region ${REGION} >/dev/null 2>&1; then

    DB_STATUS=$(aws rds describe-db-instances \
        --db-instance-identifier ${DB_INSTANCE_ID} \
        --region ${REGION} \
        --query 'DBInstances[0].DBInstanceStatus' \
        --output text)

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

    echo "  Instance: ${DB_INSTANCE_ID}"
    echo "  Status: ${DB_STATUS}"
    echo "  Class: ${DB_CLASS}"
    echo "  Size: ${DB_SIZE}GB"
    echo "  Monthly cost: ~\$15/month (running)"
else
    echo "  Instance: Not running (deleted)"
    echo "  Status: Using snapshots only"
fi
echo ""

# 全スナップショット一覧
log_info "All snapshots for this environment:"
echo ""

# スナップショット取得
SNAPSHOTS=$(aws rds describe-db-snapshots \
    --region ${REGION} \
    --query "DBSnapshots[?starts_with(DBSnapshotIdentifier, '${STACK_PREFIX}-snapshot')].{ID:DBSnapshotIdentifier,Date:SnapshotCreateTime,Size:AllocatedStorage,Status:Status}" \
    --output json)

SNAPSHOT_COUNT=$(echo $SNAPSHOTS | jq '. | length')

if [ "$SNAPSHOT_COUNT" -eq 0 ]; then
    log_warn "No snapshots found for ${ENVIRONMENT}"
    echo ""
    echo "To create a snapshot, run:"
    echo "  ./snapshot-save.sh --env ${ENVIRONMENT}"
    exit 0
fi

# ヘッダー
printf "%-40s | %-25s | %-6s | %-10s\n" "Snapshot ID" "Created" "Size" "Status"
printf "%-40s-+-%-25s-+-%-6s-+-%-10s\n" "----------------------------------------" "-------------------------" "------" "----------"

# スナップショット情報表示
TOTAL_SIZE=0
echo "$SNAPSHOTS" | jq -r '.[] | "\(.ID)|\(.Date)|\(.Size)|\(.Status)"' | while IFS='|' read -r id date size status; do
    # 日付フォーマット
    FORMATTED_DATE=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${date%.*}" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "$date")

    # 最新スナップショットにマーク
    if [ "$id" = "$LATEST_SNAPSHOT" ]; then
        printf "%-40s | %-25s | %-6s | %-10s *LATEST*\n" "$id" "$FORMATTED_DATE" "${size}GB" "$status"
    else
        printf "%-40s | %-25s | %-6s | %-10s\n" "$id" "$FORMATTED_DATE" "${size}GB" "$status"
    fi

    TOTAL_SIZE=$((TOTAL_SIZE + size))
done

echo ""

# コスト見積もり
SNAPSHOT_COST=$(echo "scale=2; ${TOTAL_SIZE} * 0.095" | bc 2>/dev/null || echo "N/A")

log_header "Cost Summary:"
echo "  Total snapshots: ${SNAPSHOT_COUNT}"
echo "  Total storage: ${TOTAL_SIZE}GB"
echo "  Monthly cost: ~\$${SNAPSHOT_COST}/month (snapshots only)"
echo ""

if aws rds describe-db-instances --db-instance-identifier ${DB_INSTANCE_ID} --region ${REGION} >/dev/null 2>&1; then
    TOTAL_COST=$(echo "scale=2; ${SNAPSHOT_COST} + 15" | bc 2>/dev/null || echo "N/A")
    echo "  Current total: ~\$${TOTAL_COST}/month (instance + snapshots)"
    echo ""
    log_warn "💡 Tip: Delete the RDS instance to save ~\$13/month"
    echo "  Run: ./snapshot-save.sh --env ${ENVIRONMENT}"
else
    echo "  Current total: ~\$${SNAPSHOT_COST}/month (snapshots only)"
    echo ""
    log_info "✓ Instance is deleted, only paying for snapshots"
fi

echo ""
log_header "========================================="
echo ""

# アクション
echo "Available actions:"
echo "  Restore from snapshot:  ./snapshot-restore.sh --env ${ENVIRONMENT}"
echo "  Create new snapshot:    ./snapshot-save.sh --env ${ENVIRONMENT}"
echo "  Delete old snapshots:   aws rds delete-db-snapshot --db-snapshot-identifier <id>"
echo ""
