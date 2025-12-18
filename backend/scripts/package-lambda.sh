#!/bin/bash
set -e

# Lambda デプロイパッケージ作成スクリプト

echo "🚀 Building Lambda deployment package..."

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${BACKEND_DIR}"

# 一時ディレクトリをクリーンアップ
echo "📦 Cleaning up previous builds..."
rm -rf package
rm -f lambda-deployment.zip

# 一時ディレクトリ作成
mkdir -p package

echo "📥 Installing dependencies..."
# 依存関係をインストール
pip install -r requirements.txt \
  -t package/ \
  --platform manylinux2014_x86_64 \
  --only-binary=:all: \
  --upgrade

echo "📂 Copying application code..."
# アプリケーションコードをコピー
cp -r app package/
cp lambda_handler.py package/

# 不要なファイルを削除
echo "🧹 Removing unnecessary files..."
cd package
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "*.dist-info" -exec rm -rf {} + 2>/dev/null || true
find . -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true
find . -type f -name "*.pyo" -delete 2>/dev/null || true
find . -type f -name ".DS_Store" -delete 2>/dev/null || true

# zipファイル作成
echo "🗜️  Creating zip archive..."
zip -r ../lambda-deployment.zip . -q

cd ..

# パッケージサイズ確認
PACKAGE_SIZE=$(du -h lambda-deployment.zip | cut -f1)
echo "✅ Lambda deployment package created successfully!"
echo "📊 Package size: ${PACKAGE_SIZE}"
echo "📁 Location: ${BACKEND_DIR}/lambda-deployment.zip"

# サイズ警告（50MBを超える場合）
PACKAGE_SIZE_BYTES=$(stat -f%z lambda-deployment.zip 2>/dev/null || stat -c%s lambda-deployment.zip 2>/dev/null)
if [ "${PACKAGE_SIZE_BYTES}" -gt 52428800 ]; then
  echo "⚠️  Warning: Package size exceeds 50MB. Consider using Lambda layers for large dependencies."
fi

echo ""
echo "Next steps:"
echo "  1. Upload to S3:"
echo "     aws s3 cp lambda-deployment.zip s3://YOUR_BUCKET/lambda/okiteru-api-latest.zip"
echo "  2. Update Lambda function:"
echo "     aws lambda update-function-code --function-name YOUR_FUNCTION --s3-bucket YOUR_BUCKET --s3-key lambda/okiteru-api-latest.zip"
