"""
AWS Lambda ハンドラー

FastAPI アプリケーションをAWS Lambda上で実行するためのハンドラー。
Mangum（ASGI adapter）を使用してFastAPIをLambdaイベントに変換します。
"""
from mangum import Mangum
from app.main import app

# Mangum でFastAPIアプリケーションをラップ
# lifespan="off" は Lambda の制約により起動時処理を無効化
handler = Mangum(app, lifespan="off")


# Lambda ハンドラー関数
def lambda_handler(event, context):
    """
    AWS Lambda エントリーポイント

    Args:
        event: Lambda イベントオブジェクト（API Gatewayからのリクエスト）
        context: Lambda コンテキストオブジェクト

    Returns:
        API Gateway プロキシ統合形式のレスポンス
    """
    return handler(event, context)
