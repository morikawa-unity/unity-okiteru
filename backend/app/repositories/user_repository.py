"""
ユーザーリポジトリ
"""
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    """ユーザーデータアクセス層"""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        """
        IDでユーザーを取得

        Args:
            user_id: ユーザーID

        Returns:
            User: ユーザー（存在しない場合はNone）
        """
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_cognito_id(self, cognito_user_id: str) -> Optional[User]:
        """
        Cognito User IDでユーザーを取得

        Args:
            cognito_user_id: Cognito User ID (sub)

        Returns:
            User: ユーザー（存在しない場合はNone）
        """
        return (
            self.db.query(User)
            .filter(User.cognito_user_id == cognito_user_id)
            .first()
        )

    def get_by_email(self, email: str) -> Optional[User]:
        """
        メールアドレスでユーザーを取得

        Args:
            email: メールアドレス

        Returns:
            User: ユーザー（存在しない場合はNone）
        """
        return self.db.query(User).filter(User.email == email).first()

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        role: Optional[str] = None,
        active_only: bool = False,
    ) -> list[User]:
        """
        ユーザー一覧を取得

        Args:
            skip: スキップ件数
            limit: 取得上限
            role: ロールフィルター
            active_only: アクティブユーザーのみ

        Returns:
            list[User]: ユーザーリスト
        """
        query = self.db.query(User)

        if role:
            query = query.filter(User.role == role)

        if active_only:
            query = query.filter(User.active == True)

        return query.offset(skip).limit(limit).all()

    def count(self, role: Optional[str] = None, active_only: bool = False) -> int:
        """
        ユーザー数を取得

        Args:
            role: ロールフィルター
            active_only: アクティブユーザーのみ

        Returns:
            int: ユーザー数
        """
        query = self.db.query(User)

        if role:
            query = query.filter(User.role == role)

        if active_only:
            query = query.filter(User.active == True)

        return query.count()

    def create(self, user: User) -> User:
        """
        ユーザーを作成

        Args:
            user: ユーザーオブジェクト

        Returns:
            User: 作成されたユーザー
        """
        self.db.add(user)
        self.db.flush()
        self.db.refresh(user)
        return user

    def update(self, user: User) -> User:
        """
        ユーザーを更新

        Args:
            user: ユーザーオブジェクト

        Returns:
            User: 更新されたユーザー
        """
        self.db.flush()
        self.db.refresh(user)
        return user

    def delete(self, user: User) -> None:
        """
        ユーザーを削除（論理削除）

        Args:
            user: ユーザーオブジェクト
        """
        user.active = False
        self.db.flush()
