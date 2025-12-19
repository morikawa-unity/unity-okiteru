#!/bin/bash
# CloudFormation スタック デプロイスクリプト
# Usage: ./deploy.sh --env <development|staging|production>

set -e

# 色付きログ
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        *)
            log_error "Unknown argument: $1"
            echo "Usage: ./deploy.sh --env <development|staging|production>"
            exit 1
            ;;
    esac
done

# 環境チェック
if [ -z "$ENVIRONMENT" ]; then
    log_error "Environment is required"
    echo "Usage: ./deploy.sh --env <development|staging|production>"
    exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    echo "Valid values: development, staging, production"
    exit 1
fi

# 設定
REGION="ap-northeast-1"
STACK_PREFIX="okiteru-${ENVIRONMENT}"
PARAMETERS_FILE="parameters-${ENVIRONMENT}.json"

# ログディレクトリ作成
LOG_DIR="logs"
mkdir -p ${LOG_DIR}
LOG_FILE="${LOG_DIR}/deploy-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"

log_info "========================================="
log_info "Okiteru Infrastructure Deployment"
log_info "Environment: ${ENVIRONMENT}"
log_info "Region: ${REGION}"
log_info "========================================="
log_info ""

# パラメータファイル存在チェック
if [ ! -f "$PARAMETERS_FILE" ]; then
    log_error "Parameters file not found: $PARAMETERS_FILE"
    exit 1
fi

log_info "Using parameters file: $PARAMETERS_FILE"
log_info ""

# スタック定義（デプロイ順序）
declare -a STACKS=(
    "01-network:network"
    "02-database:database"
    "03-cognito:cognito"
    "04-storage:storage"
    "05-lambda-api:lambda-api"
    "06-cloudfront:cloudfront"
)

# スタックデプロイ関数
deploy_stack() {
    local TEMPLATE_FILE=$1
    local STACK_SUFFIX=$2
    local STACK_NAME="${STACK_PREFIX}-${STACK_SUFFIX}"

    log_info "Deploying stack: ${STACK_NAME}"
    log_info "Template: ${TEMPLATE_FILE}"

    # スタック存在チェック
    if aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --region ${REGION} >/dev/null 2>&1; then
        log_warn "Stack already exists, updating..."
        ACTION="update"
    else
        log_info "Creating new stack..."
        ACTION="create"
    fi

    # デプロイ実行
    if [ "$ACTION" = "create" ]; then
        aws cloudformation create-stack \
            --stack-name ${STACK_NAME} \
            --template-body file://${TEMPLATE_FILE} \
            --parameters file://${PARAMETERS_FILE} \
            --capabilities CAPABILITY_NAMED_IAM \
            --region ${REGION} \
            --tags Key=Environment,Value=${ENVIRONMENT} \
                   Key=Project,Value=Okiteru \
            2>&1 | tee -a ${LOG_FILE}

        log_info "Waiting for stack creation to complete..."
        aws cloudformation wait stack-create-complete \
            --stack-name ${STACK_NAME} \
            --region ${REGION} \
            2>&1 | tee -a ${LOG_FILE}
    else
        aws cloudformation update-stack \
            --stack-name ${STACK_NAME} \
            --template-body file://${TEMPLATE_FILE} \
            --parameters file://${PARAMETERS_FILE} \
            --capabilities CAPABILITY_NAMED_IAM \
            --region ${REGION} \
            2>&1 | tee -a ${LOG_FILE} || {
                if [[ $? -eq 254 ]]; then
                    log_warn "No updates to be performed"
                    return 0
                else
                    log_error "Stack update failed"
                    return 1
                fi
            }

        log_info "Waiting for stack update to complete..."
        aws cloudformation wait stack-update-complete \
            --stack-name ${STACK_NAME} \
            --region ${REGION} \
            2>&1 | tee -a ${LOG_FILE}
    fi

    if [ $? -eq 0 ]; then
        log_info "✓ Stack deployed successfully: ${STACK_NAME}"
        log_info ""
        return 0
    else
        log_error "✗ Stack deployment failed: ${STACK_NAME}"
        log_error "Check logs: ${LOG_FILE}"
        return 1
    fi
}

# 全スタックデプロイ
log_info "Starting deployment of ${#STACKS[@]} stacks..."
log_info ""

for stack in "${STACKS[@]}"; do
    IFS=':' read -r template suffix <<< "$stack"
    TEMPLATE_FILE="${template}.yaml"

    if [ ! -f "$TEMPLATE_FILE" ]; then
        log_error "Template file not found: $TEMPLATE_FILE"
        exit 1
    fi

    deploy_stack "$TEMPLATE_FILE" "$suffix" || {
        log_error "Deployment failed at stack: ${suffix}"
        log_error "Aborting deployment"
        exit 1
    }

    # 次のスタックデプロイ前に少し待機
    sleep 5
done

log_info "========================================="
log_info "✓ All stacks deployed successfully!"
log_info "========================================="
log_info ""
log_info "Stack outputs:"
log_info ""

# 各スタックの出力を表示
for stack in "${STACKS[@]}"; do
    IFS=':' read -r template suffix <<< "$stack"
    STACK_NAME="${STACK_PREFIX}-${suffix}"

    log_info "--- ${STACK_NAME} ---"
    aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --region ${REGION} \
        --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
        --output table 2>&1 | tee -a ${LOG_FILE}
    log_info ""
done

log_info "========================================="
log_info "Next steps:"
log_info "1. Run ./setup-parameters.sh --env ${ENVIRONMENT} to configure Parameter Store"
log_info "2. Run ./init-database.sh --env ${ENVIRONMENT} to initialize the database"
log_info "3. Run ./init-cognito.sh --env ${ENVIRONMENT} to create test users"
log_info "4. Setup CI/CD with cd ../codepipeline && ./deploy-${ENVIRONMENT}.sh"
log_info "========================================="
log_info ""
log_info "Log file saved to: ${LOG_FILE}"
