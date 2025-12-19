#!/bin/bash
# Parameter Store セットアップスクリプト（Dev環境）

set -e

STACK_NAME="okiteru-infrastructure-dev"
ENVIRONMENT="dev"
REGION="ap-northeast-1"

# ログファイル設定
LOG_DIR="logs"
mkdir -p ${LOG_DIR}
LOG_FILE="${LOG_DIR}/setup-parameters-$(date +%Y%m%d-%H%M%S).log"

# ログ出力関数
log() {
  echo "$1" | tee -a ${LOG_FILE}
}

log "========================================="
log "Setting up Parameter Store for Dev"
log "========================================="
log ""

# CloudFormationスタックの出力を取得
echo "Fetching CloudFormation stack outputs..."

DB_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
  --output text)

DB_PORT=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabasePort`].OutputValue' \
  --output text)

DB_NAME=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseName`].OutputValue' \
  --output text)

COGNITO_USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`CognitoUserPoolId`].OutputValue' \
  --output text)

COGNITO_CLIENT_ID=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`CognitoClientId`].OutputValue' \
  --output text)

S3_BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)

LAMBDA_FUNCTION_NAME=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`LambdaFunctionName`].OutputValue' \
  --output text)

CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' \
  --output text)

APPLICATION_URL=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`ApplicationUrl`].OutputValue' \
  --output text)

API_URL=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

API_GATEWAY_URL=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' \
  --output text)

PHOTOS_BUCKET_NAME=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`PhotosBucketName`].OutputValue' \
  --output text)

PHOTOS_BUCKET_URL=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query 'Stacks[0].Outputs[?OutputKey==`PhotosBucketUrl`].OutputValue' \
  --output text)

echo ""
echo "Retrieved values:"
echo "  Database Endpoint: ${DB_ENDPOINT}"
echo "  Cognito User Pool ID: ${COGNITO_USER_POOL_ID}"
echo "  Cognito Client ID: ${COGNITO_CLIENT_ID}"
echo "  S3 Bucket (Frontend): ${S3_BUCKET_NAME}"
echo "  S3 Bucket (Photos): ${PHOTOS_BUCKET_NAME}"
echo "  Lambda Function: ${LAMBDA_FUNCTION_NAME}"
echo "  CloudFront Distribution ID: ${CLOUDFRONT_DISTRIBUTION_ID}"
echo "  CloudFront Domain: ${CLOUDFRONT_DOMAIN}"
echo "  Application URL: ${APPLICATION_URL}"
echo "  API URL (via CloudFront): ${API_URL}"
echo "  API Gateway URL (direct): ${API_GATEWAY_URL}"
echo "  Photos Bucket URL: ${PHOTOS_BUCKET_URL}"
echo ""

# データベース認証情報の入力
read -p "Enter database username [okiteru_admin]: " DB_USERNAME
DB_USERNAME=${DB_USERNAME:-okiteru_admin}

read -sp "Enter database password: " DB_PASSWORD
echo ""

# DATABASE_URLの構築
DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_ENDPOINT}:${DB_PORT}/${DB_NAME}"

echo ""
echo "Creating/updating Parameter Store parameters..."

# S3バケット名
aws ssm put-parameter \
  --name /okiteru/${ENVIRONMENT}/s3-bucket-name \
  --value "${S3_BUCKET_NAME}" \
  --type String \
  --overwrite \
  --region ${REGION} \
  --description "Frontend S3 bucket name for ${ENVIRONMENT}" \
  2>/dev/null || echo "✓ /okiteru/${ENVIRONMENT}/s3-bucket-name"

# Lambda関数名
aws ssm put-parameter \
  --name /okiteru/${ENVIRONMENT}/lambda-function-name \
  --value "${LAMBDA_FUNCTION_NAME}" \
  --type String \
  --overwrite \
  --region ${REGION} \
  --description "Lambda function name for ${ENVIRONMENT}" \
  2>/dev/null || echo "✓ /okiteru/${ENVIRONMENT}/lambda-function-name"

# データベースURL（SecureString）
aws ssm put-parameter \
  --name /okiteru/${ENVIRONMENT}/database-url \
  --value "${DATABASE_URL}" \
  --type SecureString \
  --overwrite \
  --region ${REGION} \
  --description "Database connection URL for ${ENVIRONMENT}" \
  2>/dev/null || echo "✓ /okiteru/${ENVIRONMENT}/database-url"

# Cognito User Pool ID
aws ssm put-parameter \
  --name /okiteru/${ENVIRONMENT}/cognito-user-pool-id \
  --value "${COGNITO_USER_POOL_ID}" \
  --type String \
  --overwrite \
  --region ${REGION} \
  --description "Cognito User Pool ID for ${ENVIRONMENT}" \
  2>/dev/null || echo "✓ /okiteru/${ENVIRONMENT}/cognito-user-pool-id"

# Cognito Client ID
aws ssm put-parameter \
  --name /okiteru/${ENVIRONMENT}/cognito-client-id \
  --value "${COGNITO_CLIENT_ID}" \
  --type String \
  --overwrite \
  --region ${REGION} \
  --description "Cognito Client ID for ${ENVIRONMENT}" \
  2>/dev/null || echo "✓ /okiteru/${ENVIRONMENT}/cognito-client-id"

# CloudFront Distribution ID
aws ssm put-parameter \
  --name /okiteru/${ENVIRONMENT}/cloudfront-distribution-id \
  --value "${CLOUDFRONT_DISTRIBUTION_ID}" \
  --type String \
  --overwrite \
  --region ${REGION} \
  --description "CloudFront Distribution ID for ${ENVIRONMENT}" \
  2>/dev/null || echo "✓ /okiteru/${ENVIRONMENT}/cloudfront-distribution-id"

# API URL (via CloudFront)
aws ssm put-parameter \
  --name /okiteru/${ENVIRONMENT}/api-url \
  --value "${API_URL}" \
  --type String \
  --overwrite \
  --region ${REGION} \
  --description "API URL via CloudFront for ${ENVIRONMENT}" \
  2>/dev/null || echo "✓ /okiteru/${ENVIRONMENT}/api-url"

# Application URL (CloudFront)
aws ssm put-parameter \
  --name /okiteru/${ENVIRONMENT}/application-url \
  --value "${APPLICATION_URL}" \
  --type String \
  --overwrite \
  --region ${REGION} \
  --description "Application URL for ${ENVIRONMENT}" \
  2>/dev/null || echo "✓ /okiteru/${ENVIRONMENT}/application-url"

# API Gateway URL (direct)
aws ssm put-parameter \
  --name /okiteru/${ENVIRONMENT}/api-gateway-url \
  --value "${API_GATEWAY_URL}" \
  --type String \
  --overwrite \
  --region ${REGION} \
  --description "API Gateway direct URL for ${ENVIRONMENT}" \
  2>/dev/null || echo "✓ /okiteru/${ENVIRONMENT}/api-gateway-url"

# Photos S3 Bucket Name
aws ssm put-parameter \
  --name /okiteru/${ENVIRONMENT}/photos-bucket-name \
  --value "${PHOTOS_BUCKET_NAME}" \
  --type String \
  --overwrite \
  --region ${REGION} \
  --description "Photos S3 bucket name for ${ENVIRONMENT}" \
  2>/dev/null || echo "✓ /okiteru/${ENVIRONMENT}/photos-bucket-name"

# Photos S3 Bucket URL
aws ssm put-parameter \
  --name /okiteru/${ENVIRONMENT}/photos-bucket-url \
  --value "${PHOTOS_BUCKET_URL}" \
  --type String \
  --overwrite \
  --region ${REGION} \
  --description "Photos S3 bucket URL for ${ENVIRONMENT}" \
  2>/dev/null || echo "✓ /okiteru/${ENVIRONMENT}/photos-bucket-url"

echo ""
echo "========================================="
echo "Parameter Store setup completed!"
echo "========================================="
echo ""
echo "Created/Updated parameters:"
echo "  /okiteru/${ENVIRONMENT}/s3-bucket-name"
echo "  /okiteru/${ENVIRONMENT}/lambda-function-name"
echo "  /okiteru/${ENVIRONMENT}/database-url"
echo "  /okiteru/${ENVIRONMENT}/cognito-user-pool-id"
echo "  /okiteru/${ENVIRONMENT}/cognito-client-id"
echo "  /okiteru/${ENVIRONMENT}/cloudfront-distribution-id"
echo "  /okiteru/${ENVIRONMENT}/api-url"
echo "  /okiteru/${ENVIRONMENT}/application-url"
echo "  /okiteru/${ENVIRONMENT}/api-gateway-url"
echo "  /okiteru/${ENVIRONMENT}/photos-bucket-name"
echo "  /okiteru/${ENVIRONMENT}/photos-bucket-url"
echo ""

# 環境変数ファイルの作成（フロントエンド用）
ENV_FILE="../../frontend/.env.${ENVIRONMENT}"
echo "Creating frontend environment file: ${ENV_FILE}"

cat > ${ENV_FILE} <<EOF
# Auto-generated by setup-parameters.sh
# Do not commit this file to version control

NEXT_PUBLIC_API_URL=${API_URL}
NEXT_PUBLIC_COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
NEXT_PUBLIC_COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}
NEXT_PUBLIC_PHOTOS_BUCKET_URL=${PHOTOS_BUCKET_URL}
NEXT_PUBLIC_ENVIRONMENT=${ENVIRONMENT}
EOF

log "✓ Created ${ENV_FILE}"
log ""
log "Next steps:"
log "1. Initialize the database with ./init-database.sh"
log "2. Deploy the CodePipeline with cd ../codepipeline && ./deploy-dev.sh"
log ""
log "Log file saved to: ${LOG_FILE}"
