#!/bin/bash
# データベース初期化スクリプト（Alembic マイグレーション実行）
# Usage: ./init-database.sh --env <development|staging|production>

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
            echo "Usage: ./init-database.sh --env <development|staging|production>"
            exit 1
            ;;
    esac
done

# 環境チェック
if [ -z "$ENVIRONMENT" ]; then
    log_error "Environment is required"
    echo "Usage: ./init-database.sh --env <development|staging|production>"
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
LOG_FILE="${LOG_DIR}/init-database-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log"

log_info "=========================================" | tee -a ${LOG_FILE}
log_info "Database Initialization for ${ENVIRONMENT}" | tee -a ${LOG_FILE}
log_info "=========================================" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# Parameter Store から DATABASE_URL を取得
log_info "Fetching database URL from Parameter Store..." | tee -a ${LOG_FILE}

DATABASE_URL=$(aws ssm get-parameter \
    --name "/okiteru/${ENVIRONMENT}/database-url" \
    --with-decryption \
    --region ${REGION} \
    --query 'Parameter.Value' \
    --output text 2>/dev/null)

if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL not found in Parameter Store"
    log_error "Please run ./setup-parameters.sh --env ${ENVIRONMENT} first"
    exit 1
fi

log_info "✓ Database URL retrieved" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# バックエンドディレクトリに移動
BACKEND_DIR="../../backend"

if [ ! -d "$BACKEND_DIR" ]; then
    log_error "Backend directory not found: $BACKEND_DIR"
    exit 1
fi

log_info "Changing directory to backend..." | tee -a ${LOG_FILE}
cd ${BACKEND_DIR}

# Python仮想環境チェック
if [ ! -d "venv" ]; then
    log_warn "Python virtual environment not found" | tee -a ${LOG_FILE}
    log_info "Creating virtual environment..." | tee -a ${LOG_FILE}
    python3 -m venv venv
fi

# 仮想環境アクティベート
log_info "Activating virtual environment..." | tee -a ${LOG_FILE}
source venv/bin/activate

# 依存パッケージインストール
log_info "Installing dependencies..." | tee -a ${LOG_FILE}
pip install -q --upgrade pip
pip install -q -r requirements-dev.txt

# DATABASE_URLを環境変数に設定
export DATABASE_URL

log_info "" | tee -a ${LOG_FILE}
log_info "Running database migrations..." | tee -a ${LOG_FILE}
log_info "DATABASE_URL: ${DATABASE_URL%%:*}://***:***@${DATABASE_URL##*@}" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}

# Alembic マイグレーション実行
log_info "Step 1: Checking Alembic current version..." | tee -a ${LOG_FILE}
alembic current 2>&1 | tee -a ${LOG_FILE} || log_warn "No current version (first run)"

log_info "" | tee -a ${LOG_FILE}
log_info "Step 2: Upgrading to head..." | tee -a ${LOG_FILE}
alembic upgrade head 2>&1 | tee -a ${LOG_FILE}

if [ $? -eq 0 ]; then
    log_info "" | tee -a ${LOG_FILE}
    log_info "✓ Database migration completed successfully" | tee -a ${LOG_FILE}
else
    log_error "Database migration failed" | tee -a ${LOG_FILE}
    exit 1
fi

# マイグレーション履歴確認
log_info "" | tee -a ${LOG_FILE}
log_info "Step 3: Verifying migration history..." | tee -a ${LOG_FILE}
alembic history 2>&1 | tee -a ${LOG_FILE}

log_info "" | tee -a ${LOG_FILE}
log_info "Step 4: Current version:" | tee -a ${LOG_FILE}
alembic current 2>&1 | tee -a ${LOG_FILE}

# データベース接続テスト（psql経由）
log_info "" | tee -a ${LOG_FILE}
log_info "Step 5: Testing database connection..." | tee -a ${LOG_FILE}

# DATABASE_URLからコンポーネント抽出
DB_USER=$(echo $DATABASE_URL | sed -n 's#.*://\([^:]*\):.*#\1#p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's#.*://[^:]*:\([^@]*\)@.*#\1#p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's#.*@\([^:]*\):.*#\1#p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's#.*:\([0-9]*\)/.*#\1#p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's#.*/\([^?]*\).*#\1#p')

# テーブル一覧取得
export PGPASSWORD="${DB_PASS}"
TABLE_COUNT=$(psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>&1)

if [ $? -eq 0 ]; then
    log_info "✓ Database connection successful" | tee -a ${LOG_FILE}
    log_info "  Tables created: ${TABLE_COUNT}" | tee -a ${LOG_FILE}
else
    log_warn "Could not verify database connection (psql may not be installed)" | tee -a ${LOG_FILE}
fi

# 仮想環境を非アクティベート
deactivate

log_info "" | tee -a ${LOG_FILE}
log_info "=========================================" | tee -a ${LOG_FILE}
log_info "✓ Database initialization completed!" | tee -a ${LOG_FILE}
log_info "=========================================" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "Next steps:" | tee -a ${LOG_FILE}
log_info "1. Create test users with ./init-cognito.sh --env ${ENVIRONMENT}" | tee -a ${LOG_FILE}
log_info "2. Setup CI/CD with cd ../codepipeline && ./deploy-${ENVIRONMENT}.sh" | tee -a ${LOG_FILE}
log_info "" | tee -a ${LOG_FILE}
log_info "Log file saved to: ${LOG_FILE}" | tee -a ${LOG_FILE}
