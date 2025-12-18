"""
ユーザースキーマ
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    """ユーザーベーススキーマ"""

    email: EmailStr = Field(..., description="メールアドレス")
    name: str = Field(..., min_length=1, max_length=100, description="氏名")
    phone: Optional[str] = Field(None, max_length=20, description="電話番号")
    role: str = Field("staff", description="ロール (staff/manager)")


class UserCreate(UserBase):
    """ユーザー作成スキーマ"""

    cognito_user_id: str = Field(..., description="Cognito User ID (sub)")


class UserUpdate(BaseModel):
    """ユーザー更新スキーマ"""

    name: Optional[str] = Field(None, min_length=1, max_length=100, description="氏名")
    phone: Optional[str] = Field(None, max_length=20, description="電話番号")
    role: Optional[str] = Field(None, description="ロール")
    active: Optional[bool] = Field(None, description="アクティブ状態")


class UserResponse(UserBase):
    """ユーザーレスポンススキーマ"""

    id: uuid.UUID = Field(..., description="ユーザーID")
    cognito_user_id: str = Field(..., description="Cognito User ID")
    active: bool = Field(..., description="アクティブ状態")
    created_at: datetime = Field(..., description="作成日時")
    updated_at: datetime = Field(..., description="更新日時")

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """ユーザー一覧レスポンススキーマ"""

    total: int = Field(..., description="総件数")
    users: list[UserResponse] = Field(..., description="ユーザーリスト")


class CurrentUserResponse(UserResponse):
    """現在のユーザーレスポンススキーマ"""

    pass
