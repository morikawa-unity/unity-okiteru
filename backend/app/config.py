"""
アプリケーション設定
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """アプリケーション設定"""

    # アプリケーション
    APP_NAME: str = "okiteru-api"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # データベース
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/okiteru"

    # AWS Cognito
    COGNITO_USER_POOL_ID: str = ""
    COGNITO_REGION: str = "ap-northeast-1"
    COGNITO_CLIENT_ID: str = ""

    # AWS S3
    S3_BUCKET_NAME: str = "okiteru-photos"
    S3_REGION: str = "ap-northeast-1"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )


# グローバル設定インスタンス
settings = Settings()
