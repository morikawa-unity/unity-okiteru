#!/bin/bash
# Cognito テストユーザー作成スクリプト
# Usage: ./init-cognito.sh --env <development|staging|production>

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
while [[ $# -gt 0 ]]; do
    case $1 in
        --env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        *)
            log_error "Unknown argument: $1"
            echo "Usage: ./init-cognito.sh --env <development|staging|production>"
            exit 1
            ;;
    esac
done

# 環境チェック
if [ -z "$ENVIRONMENT" ]; then
    log_error "Environment is required"
    echo "Usage: ./init-cognito.sh --env <development|staging|production>"
    exit 1
fi

if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    log_error "Invalid environment: $ENVIRONMENT"
    exit 1
fi

# 設定
REGION="ap-northeast-1"

# ログディレクトリ
LOG_DIR="logs"
mkdir -p ${LOG_DIR}
LOG_FILE="${LOG_DIR}/init-cognito-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"

log_info "=========================================" | tee -a ${LOG_FILE}
log_info "Cognito Test Users Creation for ${ENVIRONMENT}" | tee -a ${LOG_FILE}
log_info "=========================================" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# Parameter Store から Cognito 情報を取得
log_info "Fetching Cognito User Pool ID from Parameter Store..." | tee -a ${LOG_FILE}

USER_POOL_ID=$(aws ssm get-parameter \
    --name "/okiteru/${ENVIRONMENT}/cognito-user-pool-id" \
    --region ${REGION} \
    --query 'Parameter.Value' \
    --output text 2>/dev/null)

if [ -z "$USER_POOL_ID" ]; then
    log_error "Cognito User Pool ID not found in Parameter Store"
    log_error "Please run ./setup-parameters.sh --env ${ENVIRONMENT} first"
    exit 1
fi

log_info "✓ User Pool ID: ${USER_POOL_ID}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# ユーザー作成関数
create_user() {
    local EMAIL=$1
    local USERNAME=$2
    local PASSWORD=$3
    local GROUP=$4
    local NAME=$5

    log_info "Creating user: ${USERNAME} (${EMAIL}) in group '${GROUP}'..." | tee -a ${LOG_FILE}

    # ユーザーが既に存在するかチェック
    if aws cognito-idp admin-get-user \
        --user-pool-id ${USER_POOL_ID} \
        --username ${USERNAME} \
        --region ${REGION} >/dev/null 2>&1; then
        log_warn "User ${USERNAME} already exists, skipping..." | tee -a ${LOG_FILE}
        return 0
    fi

    # ユーザー作成
    aws cognito-idp admin-create-user \
        --user-pool-id ${USER_POOL_ID} \
        --username ${USERNAME} \
        --user-attributes \
            Name=email,Value=${EMAIL} \
            Name=email_verified,Value=true \
            Name=name,Value="${NAME}" \
        --temporary-password ${PASSWORD} \
        --message-action SUPPRESS \
        --region ${REGION} \
        2>&1 | tee -a ${LOG_FILE}

    # パスワードを恒久化（初回ログイン要求をスキップ）
    aws cognito-idp admin-set-user-password \
        --user-pool-id ${USER_POOL_ID} \
        --username ${USERNAME} \
        --password ${PASSWORD} \
        --permanent \
        --region ${REGION} \
        2>&1 | tee -a ${LOG_FILE}

    # グループに追加
    aws cognito-idp admin-add-user-to-group \
        --user-pool-id ${USER_POOL_ID} \
        --username ${USERNAME} \
        --group-name ${GROUP} \
        --region ${REGION} \
        2>&1 | tee -a ${LOG_FILE}

    log_info "✓ User ${USERNAME} created successfully" | tee -a ${LOG_FILE}
    log_info "" | tee -a ${LOG_FILE}
}

# テストパスワード
TEST_PASSWORD="Test1234!"

log_info "Creating test users..." | tee -a ${LOG_FILE}
log_info "Default password for all users: ${TEST_PASSWORD}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# スタッフユーザー作成
create_user \
    "staff1@okiteru.test" \
    "staff1" \
    "${TEST_PASSWORD}" \
    "staff" \
    "テストスタッフ1"

create_user \
    "staff2@okiteru.test" \
    "staff2" \
    "${TEST_PASSWORD}" \
    "staff" \
    "テストスタッフ2"

# マネージャーユーザー作成
create_user \
    "manager1@okiteru.test" \
    "manager1" \
    "${TEST_PASSWORD}" \
    "manager" \
    "テストマネージャー1"

log_info "=========================================" | tee -a ${LOG_FILE}
log_info "✓ Test users created successfully!" | tee -a ${LOG_FILE}
log_info "=========================================" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "Test user credentials:" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "Staff Users:" | tee -a ${LOG_FILE}
log_info "  Username: staff1" | tee -a ${LOG_FILE}
log_info "  Email: staff1@okiteru.test" | tee -a ${LOG_FILE}
log_info "  Password: ${TEST_PASSWORD}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "  Username: staff2" | tee -a ${LOG_FILE}
log_info "  Email: staff2@okiteru.test" | tee -a ${LOG_FILE}
log_info "  Password: ${TEST_PASSWORD}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "Manager Users:" | tee -a ${LOG_FILE}
log_info "  Username: manager1" | tee -a ${LOG_FILE}
log_info "  Email: manager1@okiteru.test" | tee -a ${LOG_FILE}
log_info "  Password: ${TEST_PASSWORD}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "=========================================" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "Next steps:" | tee -a ${LOG_FILE}
log_info "1. Setup CI/CD with cd ../codepipeline && ./deploy-${ENVIRONMENT}.sh" | tee -a ${LOG_FILE}
log_info "2. Access the application at the CloudFront URL" | tee -a ${LOG_FILE}
log_info "3. Login with one of the test users above" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "Log file saved to: ${LOG_FILE}" | tee -a ${LOG_FILE}
