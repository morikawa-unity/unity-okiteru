"""
FastAPIメインアプリケーション
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import previous_day_reports

# FastAPIアプリケーションの作成
app = FastAPI(
    title="Okiteru API",
    description="スタッフ勤怠・日報管理システム API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターの登録
app.include_router(previous_day_reports.router)


@app.get("/")
async def root():
    """
    ルートエンドポイント
    """
    return {
        "message": "Okiteru API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """
    ヘルスチェック
    """
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
