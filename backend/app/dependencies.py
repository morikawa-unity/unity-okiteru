"""
依存性注入
"""
import uuid
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.utils.cognito import cognito_verifier
from app.services.user_service import UserService

# HTTPBearer認証スキーム
security = HTTPBearer()


class CurrentUser:
    """現在のユーザー情報"""

    def __init__(self, id: uuid.UUID, cognito_user_id: str, email: str, role: str = "staff"):
        self.id = id
        self.cognito_user_id = cognito_user_id
        self.email = email
        self.role = role


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> CurrentUser:
    """
    現在のユーザーを取得（Cognito JWT検証）

    Args:
        credentials: HTTPベアラートークン
        db: データベースセッション

    Returns:
        CurrentUser: 現在のユーザー情報

    Raises:
        HTTPException: 認証情報が無効な場合
    """
    # Cognito設定が未設定の場合はスキップ（開発用）
    if not settings.COGNITO_USER_POOL_ID or not settings.COGNITO_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Cognito認証が設定されていません。環境変数を確認してください。",
        )

    # JWTトークンを検証
    token = credentials.credentials
    payload = cognito_verifier.verify_token(token)

    # トークンからユーザー情報を取得
    cognito_user_id = payload.get("sub")
    email = payload.get("email")
    name = payload.get("name", email)
    cognito_groups = payload.get("cognito:groups", [])

    # Cognitoグループからロールを判定
    role = "staff"
    if "manager" in cognito_groups:
        role = "manager"
    elif "staff" in cognito_groups:
        role = "staff"

    if not cognito_user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="トークンに必要な情報が含まれていません",
        )

    # データベースからユーザーを取得または作成
    service = UserService(db)
    user = service.get_or_create_by_cognito_id(
        cognito_user_id=cognito_user_id,
        email=email,
        name=name,
        role=role,
    )

    return CurrentUser(
        id=user.id,
        cognito_user_id=user.cognito_user_id,
        email=user.email,
        role=user.role,
    )


# 開発用: ヘッダーから認証情報を取得（Cognito未設定時）
async def get_current_user_dev(
    x_user_id: Annotated[str | None, Header()] = None,
    x_user_role: Annotated[str | None, Header()] = "staff",
) -> CurrentUser:
    """
    現在のユーザーを取得（開発用）

    開発環境でCognitoが未設定の場合に使用
    ヘッダーからuser_idを取得

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

    return CurrentUser(
        id=user_id,
        cognito_user_id="dev-user",
        email="dev@example.com",
        role=x_user_role or "staff",
    )


# 依存性注入のエイリアス
DBSession = Annotated[Session, Depends(get_db)]
User = Annotated[CurrentUser, Depends(get_current_user)]
