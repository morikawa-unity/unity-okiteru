"""
ユーザーAPI
"""
import uuid
from typing import Optional

from fastapi import APIRouter, Query, status

from app.dependencies import DBSession, User as CurrentUser
from app.schemas.user import (
    CurrentUserResponse,
    UserCreate,
    UserListResponse,
    UserResponse,
    UserUpdate,
)
from app.services.user_service import UserService

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=CurrentUserResponse, summary="現在のユーザー情報取得")
async def get_current_user(
    db: DBSession,
    current_user: CurrentUser,
) -> UserResponse:
    """
    現在ログイン中のユーザー情報を取得

    Returns:
        CurrentUserResponse: 現在のユーザー情報
    """
    service = UserService(db)
    user = service.get_by_id(current_user.id)
    return user


@router.get(
    "",
    response_model=UserListResponse,
    summary="ユーザー一覧取得",
)
async def get_users(
    db: DBSession,
    current_user: CurrentUser,
    skip: int = Query(0, ge=0, description="スキップ件数"),
    limit: int = Query(100, ge=1, le=1000, description="取得上限"),
    role: Optional[str] = Query(None, description="ロールフィルター (staff/manager)"),
    active_only: bool = Query(False, description="アクティブユーザーのみ"),
) -> UserListResponse:
    """
    ユーザー一覧を取得（マネージャーのみ）

    Args:
        skip: スキップ件数
        limit: 取得上限
        role: ロールフィルター
        active_only: アクティブユーザーのみ

    Returns:
        UserListResponse: ユーザー一覧と総件数
    """
    service = UserService(db)
    users, total = service.get_all(
        skip=skip, limit=limit, role=role, active_only=active_only
    )

    return UserListResponse(total=total, users=users)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="ユーザー詳細取得",
)
async def get_user(
    user_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> UserResponse:
    """
    指定したユーザーの詳細情報を取得

    Args:
        user_id: ユーザーID

    Returns:
        UserResponse: ユーザー詳細
    """
    service = UserService(db)
    user = service.get_by_id(user_id)
    return user


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="ユーザー作成",
)
async def create_user(
    user_data: UserCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> UserResponse:
    """
    新規ユーザーを作成（マネージャーのみ）

    Args:
        user_data: ユーザー作成データ

    Returns:
        UserResponse: 作成されたユーザー
    """
    service = UserService(db)
    user = service.create(user_data)
    return user


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="ユーザー更新",
)
async def update_user(
    user_id: uuid.UUID,
    user_data: UserUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> UserResponse:
    """
    ユーザー情報を更新

    Args:
        user_id: ユーザーID
        user_data: ユーザー更新データ

    Returns:
        UserResponse: 更新されたユーザー
    """
    service = UserService(db)
    user = service.update(user_id, user_data)
    return user


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="ユーザー削除",
)
async def delete_user(
    user_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """
    ユーザーを削除（論理削除）

    Args:
        user_id: ユーザーID
    """
    service = UserService(db)
    service.delete(user_id)
