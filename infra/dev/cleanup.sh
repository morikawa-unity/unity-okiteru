#!/bin/bash
# 開発環境完全削除スクリプト

set -e

STACK_NAME="okiteru-infrastructure-dev"
ENVIRONMENT="dev"
REGION="ap-northeast-1"

# ログファイル設定
LOG_DIR="logs"
mkdir -p ${LOG_DIR}
LOG_FILE="${LOG_DIR}/cleanup-$(date +%Y%m%d-%H%M%S).log"

log() {
  echo "$1" | tee -a ${LOG_FILE}
}

log "========================================="
log "Cleanup Dev Environment"
log "========================================="
log ""

# 確認プロンプト
read -p "⚠️  WARNING: This will delete ALL dev environment resources. Are you sure? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  log "Cleanup cancelled."
  exit 0
fi

log ""
log "Starting cleanup..."
log ""

# 1. Cognitoテストユーザー削除
log "1. Deleting Cognito test users..."
USER_POOL_ID=$(aws ssm get-parameter \
  --name /okiteru/${ENVIRONMENT}/cognito-user-pool-id \
  --query 'Parameter.Value' \
  --output text \
  --region ${REGION} 2>/dev/null || echo "")

if [ ! -z "$USER_POOL_ID" ]; then
  for email in staff1@example.com staff2@example.com manager1@example.com; do
    log "  Deleting user: ${email}"
    aws cognito-idp admin-delete-user \
      --user-pool-id ${USER_POOL_ID} \
      --username ${email} \
      --region ${REGION} 2>&1 | tee -a ${LOG_FILE} || log "  ⚠ User not found: ${email}"
  done
  log "  ✓ Test users deleted"
else
  log "  ⚠ User Pool ID not found, skipping..."
fi

log ""

# 2. S3バケットのオブジェクト削除（CloudFormation削除前に必要）
log "2. Emptying S3 buckets..."

# フロントエンドバケット
FRONTEND_BUCKET="okiteru-frontend-${ENVIRONMENT}"
if aws s3 ls "s3://${FRONTEND_BUCKET}" --region ${REGION} 2>/dev/null; then
  log "  Emptying: ${FRONTEND_BUCKET}"
  aws s3 rm "s3://${FRONTEND_BUCKET}" --recursive --region ${REGION} 2>&1 | tee -a ${LOG_FILE}
  log "  ✓ ${FRONTEND_BUCKET} emptied"
else
  log "  ⚠ Bucket not found: ${FRONTEND_BUCKET}"
fi

# 画像バケット
PHOTOS_BUCKET="okiteru-photos-${ENVIRONMENT}"
if aws s3 ls "s3://${PHOTOS_BUCKET}" --region ${REGION} 2>/dev/null; then
  log "  Emptying: ${PHOTOS_BUCKET}"
  aws s3 rm "s3://${PHOTOS_BUCKET}" --recursive --region ${REGION} 2>&1 | tee -a ${LOG_FILE}
  log "  ✓ ${PHOTOS_BUCKET} emptied"
else
  log "  ⚠ Bucket not found: ${PHOTOS_BUCKET}"
fi

log ""

# 3. CloudFormationスタック削除
log "3. Deleting CloudFormation stack..."
if aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} >/dev/null 2>&1; then

  log "  Stack found: ${STACK_NAME}"
  log "  Deleting stack (this may take 10-15 minutes)..."

  aws cloudformation delete-stack \
    --stack-name ${STACK_NAME} \
    --region ${REGION} 2>&1 | tee -a ${LOG_FILE}

  log "  Waiting for stack deletion..."
  aws cloudformation wait stack-delete-complete \
    --stack-name ${STACK_NAME} \
    --region ${REGION} 2>&1 | tee -a ${LOG_FILE}

  log "  ✓ Stack deleted: ${STACK_NAME}"
else
  log "  ⚠ Stack not found: ${STACK_NAME}"
fi

log ""

# 4. Parameter Store パラメータ削除
log "4. Deleting Parameter Store parameters..."
PARAMS=(
  "/okiteru/${ENVIRONMENT}/s3-bucket-name"
  "/okiteru/${ENVIRONMENT}/lambda-function-name"
  "/okiteru/${ENVIRONMENT}/database-url"
  "/okiteru/${ENVIRONMENT}/cognito-user-pool-id"
  "/okiteru/${ENVIRONMENT}/cognito-client-id"
  "/okiteru/${ENVIRONMENT}/cloudfront-distribution-id"
  "/okiteru/${ENVIRONMENT}/api-url"
  "/okiteru/${ENVIRONMENT}/application-url"
  "/okiteru/${ENVIRONMENT}/api-gateway-url"
  "/okiteru/${ENVIRONMENT}/photos-bucket-name"
  "/okiteru/${ENVIRONMENT}/photos-bucket-url"
)

for param in "${PARAMS[@]}"; do
  if aws ssm get-parameter --name ${param} --region ${REGION} >/dev/null 2>&1; then
    log "  Deleting: ${param}"
    aws ssm delete-parameter --name ${param} --region ${REGION} 2>&1 | tee -a ${LOG_FILE}
  else
    log "  ⚠ Parameter not found: ${param}"
  fi
done

log "  ✓ Parameters deleted"
log ""

# 5. ローカルファイル削除
log "5. Deleting local files..."
if [ -f "../../frontend/.env.${ENVIRONMENT}" ]; then
  rm "../../frontend/.env.${ENVIRONMENT}"
  log "  ✓ Deleted: frontend/.env.${ENVIRONMENT}"
fi

log ""
log "========================================="
log "Cleanup completed!"
log "========================================="
log ""
log "Deleted resources:"
log "  - CloudFormation stack: ${STACK_NAME}"
log "  - S3 buckets: ${FRONTEND_BUCKET}, ${PHOTOS_BUCKET}"
log "  - Cognito test users: 3 users"
log "  - Parameter Store: 11 parameters"
log "  - Local files: .env.${ENVIRONMENT}"
log ""
log "Note: The following are NOT deleted:"
log "  - Database tables (manual cleanup required if DB still exists)"
log "  - GitHub Token in Secrets Manager (if created)"
log "  - CodePipeline stack (delete separately)"
log ""
log "Log file saved to: ${LOG_FILE}"
