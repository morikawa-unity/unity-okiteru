#!/bin/bash
# Parameter Store セットアップスクリプト
# Usage: ./setup-parameters.sh --env <development|staging|production>

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
            echo "Usage: ./setup-parameters.sh --env <development|staging|production>"
            exit 1
            ;;
    esac
done

# 環境チェック
if [ -z "$ENVIRONMENT" ]; then
    log_error "Environment is required"
    echo "Usage: ./setup-parameters.sh --env <development|staging|production>"
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
LOG_FILE="${LOG_DIR}/setup-parameters-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"

log_info "=========================================" | tee -a ${LOG_FILE}
log_info "Setting up Parameter Store for ${ENVIRONMENT}" | tee -a ${LOG_FILE}
log_info "=========================================" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# CloudFormationスタックから出力を取得
get_stack_output() {
    local STACK_NAME=$1
    local OUTPUT_KEY=$2

    aws cloudformation describe-stacks \
        --stack-name ${STACK_NAME} \
        --region ${REGION} \
        --query "Stacks[0].Outputs[?OutputKey=='${OUTPUT_KEY}'].OutputValue" \
        --output text 2>/dev/null || echo ""
}

log_info "Fetching CloudFormation stack outputs..." | tee -a ${LOG_FILE}

# Network Stack
VPC_ID=$(get_stack_output "${STACK_PREFIX}-network" "VPCId")
PRIVATE_SUBNET_1=$(get_stack_output "${STACK_PREFIX}-network" "PrivateSubnet1Id")
PRIVATE_SUBNET_2=$(get_stack_output "${STACK_PREFIX}-network" "PrivateSubnet2Id")
LAMBDA_SECURITY_GROUP=$(get_stack_output "${STACK_PREFIX}-network" "LambdaSecurityGroupId")

# Database Stack
DB_ENDPOINT=$(get_stack_output "${STACK_PREFIX}-database" "DatabaseEndpoint")
DB_PORT=$(get_stack_output "${STACK_PREFIX}-database" "DatabasePort")
DB_NAME=$(get_stack_output "${STACK_PREFIX}-database" "DatabaseName")

# Cognito Stack
COGNITO_USER_POOL_ID=$(get_stack_output "${STACK_PREFIX}-cognito" "UserPoolId")
COGNITO_CLIENT_ID=$(get_stack_output "${STACK_PREFIX}-cognito" "UserPoolClientId")
COGNITO_DOMAIN=$(get_stack_output "${STACK_PREFIX}-cognito" "UserPoolDomain")

# Storage Stack
FRONTEND_BUCKET=$(get_stack_output "${STACK_PREFIX}-storage" "FrontendBucketName")
PHOTOS_BUCKET=$(get_stack_output "${STACK_PREFIX}-storage" "PhotosBucketName")
PHOTOS_BUCKET_URL=$(get_stack_output "${STACK_PREFIX}-storage" "PhotosBucketUrl")

# Lambda/API Stack
LAMBDA_FUNCTION=$(get_stack_output "${STACK_PREFIX}-lambda-api" "LambdaFunctionName")
API_GATEWAY_URL=$(get_stack_output "${STACK_PREFIX}-lambda-api" "ApiGatewayUrl")

# CloudFront Stack
CLOUDFRONT_DISTRIBUTION_ID=$(get_stack_output "${STACK_PREFIX}-cloudfront" "CloudFrontDistributionId")
CLOUDFRONT_DOMAIN=$(get_stack_output "${STACK_PREFIX}-cloudfront" "CloudFrontDomainName")
APPLICATION_URL=$(get_stack_output "${STACK_PREFIX}-cloudfront" "ApplicationUrl")
API_URL=$(get_stack_output "${STACK_PREFIX}-cloudfront" "ApiUrl")

log_info "" | tee -a ${LOG_FILE}
log_info "Retrieved values:" | tee -a ${LOG_FILE}
log_info "  VPC ID: ${VPC_ID}" | tee -a ${LOG_FILE}
log_info "  Database Endpoint: ${DB_ENDPOINT}" | tee -a ${LOG_FILE}
log_info "  Cognito User Pool ID: ${COGNITO_USER_POOL_ID}" | tee -a ${LOG_FILE}
log_info "  Cognito Client ID: ${COGNITO_CLIENT_ID}" | tee -a ${LOG_FILE}
log_info "  Frontend Bucket: ${FRONTEND_BUCKET}" | tee -a ${LOG_FILE}
log_info "  Photos Bucket: ${PHOTOS_BUCKET}" | tee -a ${LOG_FILE}
log_info "  Lambda Function: ${LAMBDA_FUNCTION}" | tee -a ${LOG_FILE}
log_info "  CloudFront Distribution ID: ${CLOUDFRONT_DISTRIBUTION_ID}" | tee -a ${LOG_FILE}
log_info "  CloudFront Domain: ${CLOUDFRONT_DOMAIN}" | tee -a ${LOG_FILE}
log_info "  Application URL: ${APPLICATION_URL}" | tee -a ${LOG_FILE}
log_info "  API URL (via CloudFront): ${API_URL}" | tee -a ${LOG_FILE}
log_info "  API Gateway URL (direct): ${API_GATEWAY_URL}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# データベース認証情報の入力
log_info "Enter database credentials:" | tee -a ${LOG_FILE}
read -p "Database username [okiteru_admin]: " DB_USERNAME
DB_USERNAME=${DB_USERNAME:-okiteru_admin}

read -sp "Database password: " DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    log_error "Database password is required"
    exit 1
fi

# DATABASE_URLの構築
DATABASE_URL="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_ENDPOINT}:${DB_PORT}/${DB_NAME}"

log_info "" | tee -a ${LOG_FILE}
log_info "Creating/updating Parameter Store parameters..." | tee -a ${LOG_FILE}

# Parameter Store に保存する関数
put_parameter() {
    local PARAM_NAME=$1
    local PARAM_VALUE=$2
    local PARAM_TYPE=${3:-String}
    local DESCRIPTION=$4

    aws ssm put-parameter \
        --name "/okiteru/${ENVIRONMENT}/${PARAM_NAME}" \
        --value "${PARAM_VALUE}" \
        --type ${PARAM_TYPE} \
        --overwrite \
        --region ${REGION} \
        --description "${DESCRIPTION}" \
        >/dev/null 2>&1 && log_info "✓ /okiteru/${ENVIRONMENT}/${PARAM_NAME}" | tee -a ${LOG_FILE}
}

# パラメータ保存
put_parameter "vpc-id" "${VPC_ID}" "String" "VPC ID"
put_parameter "private-subnet-1" "${PRIVATE_SUBNET_1}" "String" "Private Subnet 1 ID"
put_parameter "private-subnet-2" "${PRIVATE_SUBNET_2}" "String" "Private Subnet 2 ID"
put_parameter "lambda-security-group" "${LAMBDA_SECURITY_GROUP}" "String" "Lambda Security Group ID"

put_parameter "database-url" "${DATABASE_URL}" "SecureString" "Database connection URL"
put_parameter "database-endpoint" "${DB_ENDPOINT}" "String" "Database endpoint"
put_parameter "database-port" "${DB_PORT}" "String" "Database port"
put_parameter "database-name" "${DB_NAME}" "String" "Database name"

put_parameter "cognito-user-pool-id" "${COGNITO_USER_POOL_ID}" "String" "Cognito User Pool ID"
put_parameter "cognito-client-id" "${COGNITO_CLIENT_ID}" "String" "Cognito Client ID"
put_parameter "cognito-domain" "${COGNITO_DOMAIN}" "String" "Cognito Domain"

put_parameter "frontend-bucket-name" "${FRONTEND_BUCKET}" "String" "Frontend S3 bucket name"
put_parameter "photos-bucket-name" "${PHOTOS_BUCKET}" "String" "Photos S3 bucket name"
put_parameter "photos-bucket-url" "${PHOTOS_BUCKET_URL}" "String" "Photos S3 bucket URL"

put_parameter "lambda-function-name" "${LAMBDA_FUNCTION}" "String" "Lambda function name"
put_parameter "api-gateway-url" "${API_GATEWAY_URL}" "String" "API Gateway direct URL"

put_parameter "cloudfront-distribution-id" "${CLOUDFRONT_DISTRIBUTION_ID}" "String" "CloudFront Distribution ID"
put_parameter "cloudfront-domain" "${CLOUDFRONT_DOMAIN}" "String" "CloudFront Domain Name"
put_parameter "application-url" "${APPLICATION_URL}" "String" "Application URL"
put_parameter "api-url" "${API_URL}" "String" "API URL via CloudFront"

log_info "" | tee -a ${LOG_FILE}
log_info "=========================================" | tee -a ${LOG_FILE}
log_info "✓ Parameter Store setup completed!" | tee -a ${LOG_FILE}
log_info "=========================================" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# フロントエンド用環境変数ファイル作成
ENV_FILE="../../frontend/.env.${ENVIRONMENT}"
log_info "Creating frontend environment file: ${ENV_FILE}" | tee -a ${LOG_FILE}

cat > ${ENV_FILE} <<EOF
# Auto-generated by setup-parameters.sh
# Do not commit this file to version control

NEXT_PUBLIC_API_URL=${API_URL}
NEXT_PUBLIC_COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
NEXT_PUBLIC_COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}
NEXT_PUBLIC_COGNITO_REGION=${REGION}
NEXT_PUBLIC_PHOTOS_BUCKET_URL=${PHOTOS_BUCKET_URL}
NEXT_PUBLIC_ENVIRONMENT=${ENVIRONMENT}
EOF

log_info "✓ Created ${ENV_FILE}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "Next steps:" | tee -a ${LOG_FILE}
log_info "1. Initialize the database with ./init-database.sh --env ${ENVIRONMENT}" | tee -a ${LOG_FILE}
log_info "2. Create test users with ./init-cognito.sh --env ${ENVIRONMENT}" | tee -a ${LOG_FILE}
log_info "3. Setup CI/CD with cd ../codepipeline && ./deploy-${ENVIRONMENT}.sh" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "Log file saved to: ${LOG_FILE}" | tee -a ${LOG_FILE}
