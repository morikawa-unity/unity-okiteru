#!/bin/bash
# Cognito テストユーザー作成スクリプト（Dev環境）

set -e

ENVIRONMENT="dev"
REGION="ap-northeast-1"

# スクリプト実行ディレクトリを保存
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ログファイル設定
LOG_DIR="${SCRIPT_DIR}/logs"
mkdir -p ${LOG_DIR}
LOG_FILE="${LOG_DIR}/init-cognito-$(date +%Y%m%d-%H%M%S).log"

# ログ出力関数
log() {
  echo "$1" | tee -a ${LOG_FILE}
}

log "========================================="
log "Cognito Test Users Creation for Dev"
log "========================================="
log ""

# Parameter StoreからCognito情報を取得
log "Fetching Cognito User Pool ID from Parameter Store..."
USER_POOL_ID=$(aws ssm get-parameter \
  --name /okiteru/${ENVIRONMENT}/cognito-user-pool-id \
  --region ${REGION} \
  --query 'Parameter.Value' \
  --output text)

if [ -z "$USER_POOL_ID" ]; then
  log "Error: Cognito User Pool ID not found in Parameter Store"
  log "Please run ./setup-parameters.sh first"
  exit 1
fi

log "✓ User Pool ID: ${USER_POOL_ID}"
log ""

# テストユーザー作成関数
create_test_user() {
  local USERNAME=$1
  local EMAIL=$2
  local NAME=$3
  local GROUP=$4
  local PASSWORD="TestPass123!"

  log "Creating user: ${EMAIL} (${GROUP})..."

  # ユーザーが既に存在するか確認
  if aws cognito-idp admin-get-user \
    --user-pool-id ${USER_POOL_ID} \
    --username ${EMAIL} \
    --region ${REGION} >/dev/null 2>&1; then
    log "  ⚠ User ${EMAIL} already exists, skipping..."
    return
  fi

  # ユーザー作成
  aws cognito-idp admin-create-user \
    --user-pool-id ${USER_POOL_ID} \
    --username ${EMAIL} \
    --user-attributes \
      Name=email,Value=${EMAIL} \
      Name=email_verified,Value=true \
      Name=name,Value="${NAME}" \
    --temporary-password ${PASSWORD} \
    --message-action SUPPRESS \
    --region ${REGION} 2>&1 | tee -a ${LOG_FILE}

  # パスワードを永続化（初回ログイン不要にする）
  aws cognito-idp admin-set-user-password \
    --user-pool-id ${USER_POOL_ID} \
    --username ${EMAIL} \
    --password ${PASSWORD} \
    --permanent \
    --region ${REGION} 2>&1 | tee -a ${LOG_FILE}

  # グループに追加
  aws cognito-idp admin-add-user-to-group \
    --user-pool-id ${USER_POOL_ID} \
    --username ${EMAIL} \
    --group-name ${GROUP} \
    --region ${REGION} 2>&1 | tee -a ${LOG_FILE}

  log "  ✓ User created: ${EMAIL}"
  log "    Password: ${PASSWORD}"
  log ""
}

log "Creating test users..."
log ""

# スタッフユーザー作成
create_test_user "staff1" "staff1@example.com" "テストスタッフ1" "staff"
create_test_user "staff2" "staff2@example.com" "テストスタッフ2" "staff"

# マネージャーユーザー作成
create_test_user "manager1" "manager1@example.com" "テストマネージャー1" "manager"

log "========================================="
log "Cognito test users creation completed!"
log "========================================="
log ""
log "Test Users:"
log ""
log "【スタッフ】"
log "  Email: staff1@example.com"
log "  Password: TestPass123!"
log "  Role: staff"
log ""
log "  Email: staff2@example.com"
log "  Password: TestPass123!"
log "  Role: staff"
log ""
log "【マネージャー】"
log "  Email: manager1@example.com"
log "  Password: TestPass123!"
log "  Role: manager"
log ""
log "Next steps:"
log "1. Use these credentials to log in to the application"
log "2. Deploy the CodePipeline with cd ../codepipeline && ./deploy-dev.sh"
log ""
log "Log file saved to: ${LOG_FILE}"
