#!/bin/bash
# データベース初期化スクリプト（Dev環境）

set -e

ENVIRONMENT="dev"
REGION="ap-northeast-1"

# スクリプト実行ディレクトリを保存
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ログファイル設定
LOG_DIR="${SCRIPT_DIR}/logs"
mkdir -p ${LOG_DIR}
LOG_FILE="${LOG_DIR}/init-database-$(date +%Y%m%d-%H%M%S).log"

# ログ出力関数
log() {
  echo "$1" | tee -a ${LOG_FILE}
}

log "========================================="
log "Database Initialization for Dev"
log "========================================="
log ""

# Parameter StoreからDATABASE_URLを取得
log "Fetching database URL from Parameter Store..."
DATABASE_URL=$(aws ssm get-parameter \
  --name /okiteru/${ENVIRONMENT}/database-url \
  --with-decryption \
  --region ${REGION} \
  --query 'Parameter.Value' \
  --output text)

if [ -z "$DATABASE_URL" ]; then
  log "Error: DATABASE_URL not found in Parameter Store"
  log "Please run ./setup-parameters.sh first"
  exit 1
fi

log "✓ Database URL retrieved"
log ""

# バックエンドディレクトリに移動
cd ../../backend

log "Installing Python dependencies..."
pip install -r requirements.txt 2>&1 | tee -a ${LOG_FILE}

log ""
log "Running Alembic migrations..."

# DATABASE_URLを環境変数にセット
export DATABASE_URL="${DATABASE_URL}"

# Alembicマイグレーションを実行
alembic upgrade head 2>&1 | tee -a ${LOG_FILE}

log ""
log "========================================="
log "Database initialization completed!"
log "========================================="
log ""
log "Database tables have been created."
log "You can now deploy the application code with CodePipeline."
log ""
log "Log file saved to: ${LOG_FILE}"
