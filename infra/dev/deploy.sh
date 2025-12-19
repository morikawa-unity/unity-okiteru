#!/bin/bash
# Dev環境インフラデプロイスクリプト

set -e

STACK_NAME="okiteru-infrastructure-dev"
ENVIRONMENT="dev"
REGION="ap-northeast-1"

# ログファイル設定
LOG_DIR="logs"
mkdir -p ${LOG_DIR}
LOG_FILE="${LOG_DIR}/deploy-$(date +%Y%m%d-%H%M%S).log"

# ログ出力関数
log() {
  echo "$1" | tee -a ${LOG_FILE}
}

log "========================================="
log "Okiteru Dev Environment Infrastructure"
log "========================================="
log ""

# データベース認証情報の入力
read -sp "Enter database master username [okiteru_admin]: " DB_USERNAME
DB_USERNAME=${DB_USERNAME:-okiteru_admin}
log ""

read -sp "Enter database master password (min 8 characters): " DB_PASSWORD
log ""

if [ ${#DB_PASSWORD} -lt 8 ]; then
  log "Error: Password must be at least 8 characters"
  exit 1
fi

log ""
log "Deploying infrastructure stack..."
log "Stack Name: ${STACK_NAME}"
log "Environment: ${ENVIRONMENT}"
log "Region: ${REGION}"
log ""

# CloudFormationスタックをデプロイ
aws cloudformation deploy \
  --template-file infrastructure.yml \
  --stack-name ${STACK_NAME} \
  --parameter-overrides \
    Environment=${ENVIRONMENT} \
    DBUsername=${DB_USERNAME} \
    DBPassword=${DB_PASSWORD} \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ${REGION} 2>&1 | tee -a ${LOG_FILE}

log ""
log "========================================="
log "Deployment completed!"
log "========================================="
log ""

# スタックの出力を取得
log "Fetching stack outputs..."
aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs' \
  --output table | tee -a ${LOG_FILE}

log ""
log "Next steps:"
log "1. Run ./setup-parameters.sh to configure Parameter Store"
log "2. Initialize the database with ./init-database.sh"
log "3. Create test users with ./init-cognito.sh"
log "4. Deploy the CodePipeline with cd ../codepipeline && ./deploy-dev.sh"
log ""
log "Log file saved to: ${LOG_FILE}"
