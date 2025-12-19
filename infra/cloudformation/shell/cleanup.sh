#!/bin/bash
# CloudFormation スタック 削除スクリプト
# Usage: ./cleanup.sh --env <development|staging|production>

set -e

# 色付きログ
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
            echo "Usage: ./cleanup.sh --env <development|staging|production> [--yes]"
            exit 1
            ;;
    esac
done

# 環境チェック
if [ -z "$ENVIRONMENT" ]; then
    log_error "Environment is required"
    echo "Usage: ./cleanup.sh --env <development|staging|production> [--yes]"
    exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    exit 1
fi

# 設定
REGION="ap-northeast-1"
STACK_PREFIX="okiteru-${ENVIRONMENT}"

# ログディレクトリ
LOG_DIR="logs"
mkdir -p ${LOG_DIR}
LOG_FILE="${LOG_DIR}/cleanup-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"

log_warn "=========================================" | tee -a ${LOG_FILE}
log_warn "CLEANUP: Deleting ALL stacks for ${ENVIRONMENT}" | tee -a ${LOG_FILE}
log_warn "=========================================" | tee -a ${LOG_FILE}
log_warn "" | tee -a ${LOG_FILE}
log_warn "This will DELETE the following stacks:" | tee -a ${LOG_FILE}
log_warn "  - ${STACK_PREFIX}-cloudfront" | tee -a ${LOG_FILE}
log_warn "  - ${STACK_PREFIX}-lambda-api" | tee -a ${LOG_FILE}
log_warn "  - ${STACK_PREFIX}-storage" | tee -a ${LOG_FILE}
log_warn "  - ${STACK_PREFIX}-cognito" | tee -a ${LOG_FILE}
log_warn "  - ${STACK_PREFIX}-database" | tee -a ${LOG_FILE}
log_warn "  - ${STACK_PREFIX}-network" | tee -a ${LOG_FILE}
log_warn "" | tee -a ${LOG_FILE}
log_error "⚠️  WARNING: This action CANNOT be undone!" | tee -a ${LOG_FILE}
log_error "⚠️  All data in RDS, S3, and Cognito will be PERMANENTLY deleted!" | tee -a ${LOG_FILE}
log_warn "" | tee -a ${LOG_FILE}

# 確認
if [ "$SKIP_CONFIRMATION" = false ]; then
    read -p "Are you sure you want to continue? Type 'DELETE' to confirm: " CONFIRMATION
    if [ "$CONFIRMATION" != "DELETE" ]; then
        log_info "Cleanup cancelled"
        exit 0
    fi
    log_warn "" | tee -a ${LOG_FILE}
fi

# スタック定義（削除順序: 逆順）
declare -a STACKS=(
    "cloudfront"
    "lambda-api"
    "storage"
    "cognito"
    "database"
    "network"
)

# S3バケット空にする関数
empty_s3_bucket() {
    local BUCKET_NAME=$1

    log_info "Checking if bucket exists: ${BUCKET_NAME}" | tee -a ${LOG_FILE}

    if aws s3api head-bucket --bucket ${BUCKET_NAME} --region ${REGION} 2>/dev/null; then
        log_info "Emptying S3 bucket: ${BUCKET_NAME}" | tee -a ${LOG_FILE}
        aws s3 rm s3://${BUCKET_NAME} --recursive --region ${REGION} 2>&1 | tee -a ${LOG_FILE} || log_warn "Failed to empty bucket (may already be empty)"

        # バージョニングが有効な場合、削除マーカーも削除
        aws s3api delete-objects --bucket ${BUCKET_NAME} \
            --delete "$(aws s3api list-object-versions --bucket ${BUCKET_NAME} \
            --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' --region ${REGION})" \
            --region ${REGION} 2>/dev/null || log_warn "No versioned objects to delete"

        log_info "✓ Bucket emptied: ${BUCKET_NAME}" | tee -a ${LOG_FILE}
    else
        log_warn "Bucket does not exist: ${BUCKET_NAME}" | tee -a ${LOG_FILE}
    fi
}

# CloudFront Distribution無効化関数
disable_cloudfront() {
    local STACK_NAME="${STACK_PREFIX}-cloudfront"

    log_info "Checking CloudFront distribution..." | tee -a ${LOG_FILE}

    DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --region ${REGION} \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
        --output text 2>/dev/null || echo "")

    if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
        log_info "Disabling CloudFront distribution: ${DISTRIBUTION_ID}" | tee -a ${LOG_FILE}

        # Distribution設定取得
        ETAG=$(aws cloudfront get-distribution-config \
            --id ${DISTRIBUTION_ID} \
            --query 'ETag' \
            --output text 2>/dev/null)

        CONFIG=$(aws cloudfront get-distribution-config \
            --id ${DISTRIBUTION_ID} \
            --query 'DistributionConfig' 2>/dev/null)

        # Disableに変更
        MODIFIED_CONFIG=$(echo $CONFIG | jq '.Enabled = false')

        aws cloudfront update-distribution \
            --id ${DISTRIBUTION_ID} \
            --distribution-config "$MODIFIED_CONFIG" \
            --if-match ${ETAG} \
            --region ${REGION} 2>&1 | tee -a ${LOG_FILE}

        log_warn "Waiting for CloudFront distribution to be disabled (this may take 10-15 minutes)..." | tee -a ${LOG_FILE}
        aws cloudfront wait distribution-deployed --id ${DISTRIBUTION_ID} 2>&1 | tee -a ${LOG_FILE}

        log_info "✓ CloudFront distribution disabled" | tee -a ${LOG_FILE}
    else
        log_warn "CloudFront distribution not found or already disabled" | tee -a ${LOG_FILE}
    fi
}

# スタック削除関数
delete_stack() {
    local STACK_SUFFIX=$1
    local STACK_NAME="${STACK_PREFIX}-${STACK_SUFFIX}"

    log_info "Deleting stack: ${STACK_NAME}" | tee -a ${LOG_FILE}

    # スタック存在チェック
    if ! aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --region ${REGION} >/dev/null 2>&1; then
        log_warn "Stack does not exist: ${STACK_NAME}" | tee -a ${LOG_FILE}
        return 0
    fi

    # スタック削除
    aws cloudformation delete-stack \
        --stack-name ${STACK_NAME} \
        --region ${REGION} \
        2>&1 | tee -a ${LOG_FILE}

    log_info "Waiting for stack deletion to complete..." | tee -a ${LOG_FILE}
    aws cloudformation wait stack-delete-complete \
        --stack-name ${STACK_NAME} \
        --region ${REGION} \
        2>&1 | tee -a ${LOG_FILE}

    if [ $? -eq 0 ]; then
        log_info "✓ Stack deleted: ${STACK_NAME}" | tee -a ${LOG_FILE}
        log_info "" | tee -a ${LOG_FILE}
        return 0
    else
        log_error "✗ Stack deletion failed: ${STACK_NAME}" | tee -a ${LOG_FILE}
        log_error "Check CloudFormation console for details" | tee -a ${LOG_FILE}
        return 1
    fi
}

# 前処理: S3バケットを空にする
log_info "Step 1: Emptying S3 buckets..." | tee -a ${LOG_FILE}
empty_s3_bucket "${ENVIRONMENT}-okiteru-frontend-$(aws sts get-caller-identity --query Account --output text)" || true
empty_s3_bucket "${ENVIRONMENT}-okiteru-photos-$(aws sts get-caller-identity --query Account --output text)" || true
log_info "" | tee -a ${LOG_FILE}

# 前処理: CloudFront Distributionを無効化
log_info "Step 2: Disabling CloudFront distribution..." | tee -a ${LOG_FILE}
disable_cloudfront || log_warn "Failed to disable CloudFront (continuing anyway)"
log_info "" | tee -a ${LOG_FILE}

# 全スタック削除
log_info "Step 3: Deleting CloudFormation stacks..." | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

FAILED_STACKS=()

for stack_suffix in "${STACKS[@]}"; do
    delete_stack "$stack_suffix" || FAILED_STACKS+=("$stack_suffix")
    sleep 3
done

# Parameter Store クリーンアップ
log_info "Step 4: Cleaning up Parameter Store..." | tee -a ${LOG_FILE}
PARAMS=$(aws ssm get-parameters-by-path \
    --path "/okiteru/${ENVIRONMENT}" \
    --region ${REGION} \
    --query 'Parameters[].Name' \
    --output text 2>/dev/null || echo "")

if [ -n "$PARAMS" ]; then
    for param in $PARAMS; do
        log_info "Deleting parameter: ${param}" | tee -a ${LOG_FILE}
        aws ssm delete-parameter --name ${param} --region ${REGION} 2>&1 | tee -a ${LOG_FILE}
    done
    log_info "✓ Parameter Store cleaned up" | tee -a ${LOG_FILE}
else
    log_warn "No parameters found to delete" | tee -a ${LOG_FILE}
fi

log_info "" | tee -a ${LOG_FILE}

# 結果表示
if [ ${#FAILED_STACKS[@]} -eq 0 ]; then
    log_info "=========================================" | tee -a ${LOG_FILE}
    log_info "✓ Cleanup completed successfully!" | tee -a ${LOG_FILE}
    log_info "=========================================" | tee -a ${LOG_FILE}
    log_info "" | tee -a ${LOG_FILE}
    log_info "All ${ENVIRONMENT} environment resources have been deleted." | tee -a ${LOG_FILE}
else
    log_error "=========================================" | tee -a ${LOG_FILE}
    log_error "Cleanup completed with errors" | tee -a ${LOG_FILE}
    log_error "=========================================" | tee -a ${LOG_FILE}
    log_error "" | tee -a ${LOG_FILE}
    log_error "Failed to delete the following stacks:" | tee -a ${LOG_FILE}
    for stack in "${FAILED_STACKS[@]}"; do
        log_error "  - ${STACK_PREFIX}-${stack}" | tee -a ${LOG_FILE}
    done
    log_error "" | tee -a ${LOG_FILE}
    log_error "Please check the CloudFormation console and delete manually." | tee -a ${LOG_FILE}
fi

log_info "" | tee -a ${LOG_FILE}
log_info "Log file saved to: ${LOG_FILE}" | tee -a ${LOG_FILE}
