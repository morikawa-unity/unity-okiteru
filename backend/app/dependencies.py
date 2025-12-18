"""
依存性注入
"""
import uuid
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db


class CurrentUser:
    """現在のユーザー情報"""

    def __init__(self, id: uuid.UUID, role: str = "staff"):
        self.id = id
        self.role = role


async def get_current_user(
    x_user_id: Annotated[str | None, Header()] = None,
    x_user_role: Annotated[str | None, Header()] = "staff",
) -> CurrentUser:
    """
    現在のユーザーを取得

    開発用の簡易実装: ヘッダーからuser_idを取得
    本番環境では、AWS Cognito JWTトークンを検証する必要があります

    Args:
        x_user_id: ユーザーID（ヘッダー）
        x_user_role: ユーザーロール（ヘッダー）

    Returns:
        CurrentUser: 現在のユーザー情報

    Raises:
        HTTPException: 認証情報が無効な場合
    """
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証情報がありません。X-User-Idヘッダーを設定してください。",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = uuid.UUID(x_user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なユーザーIDです",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return CurrentUser(id=user_id, role=x_user_role or "staff")


# 依存性注入のエイリアス
DBSession = Annotated[Session, Depends(get_db)]
User = Annotated[CurrentUser, Depends(get_current_user)]
