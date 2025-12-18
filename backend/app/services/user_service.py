"""
ユーザーサービス
"""
import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    """ユーザービジネスロジック"""

    def __init__(self, db: Session):
        self.db = db
        self.repository = UserRepository(db)

    def get_or_create_by_cognito_id(
        self, cognito_user_id: str, email: str, name: str, role: str = "staff"
    ) -> User:
        """
        Cognito User IDでユーザーを取得または作成

        初回ログイン時にCognitoから取得した情報でユーザーを自動作成

        Args:
            cognito_user_id: Cognito User ID (sub)
            email: メールアドレス
            name: 氏名
            role: ロール

        Returns:
            User: ユーザー
        """
        # 既存ユーザーを検索
        user = self.repository.get_by_cognito_id(cognito_user_id)

        if user:
            return user

        # 新規ユーザー作成
        new_user = User(
            cognito_user_id=cognito_user_id,
            email=email,
            name=name,
            role=role,
            active=True,
        )

        user = self.repository.create(new_user)
        self.db.commit()

        return user

    def get_by_id(self, user_id: uuid.UUID) -> User:
        """
        IDでユーザーを取得

        Args:
            user_id: ユーザーID

        Returns:
            User: ユーザー

        Raises:
            HTTPException: ユーザーが見つからない場合
        """
        user = self.repository.get_by_id(user_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ユーザーが見つかりません",
            )

        return user

    def get_by_cognito_id(self, cognito_user_id: str) -> Optional[User]:
        """
        Cognito User IDでユーザーを取得

        Args:
            cognito_user_id: Cognito User ID

        Returns:
            User: ユーザー（存在しない場合はNone）
        """
        return self.repository.get_by_cognito_id(cognito_user_id)

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        role: Optional[str] = None,
        active_only: bool = False,
    ) -> tuple[list[User], int]:
        """
        ユーザー一覧を取得

        Args:
            skip: スキップ件数
            limit: 取得上限
            role: ロールフィルター
            active_only: アクティブユーザーのみ

        Returns:
            tuple[list[User], int]: (ユーザーリスト, 総件数)
        """
        users = self.repository.get_all(
            skip=skip, limit=limit, role=role, active_only=active_only
        )
        total = self.repository.count(role=role, active_only=active_only)

        return users, total

    def create(self, user_data: UserCreate) -> User:
        """
        ユーザーを作成

        Args:
            user_data: ユーザー作成データ

        Returns:
            User: 作成されたユーザー

        Raises:
            HTTPException: Cognito IDまたはメールが既に存在する場合
        """
        # Cognito IDの重複チェック
        existing_user = self.repository.get_by_cognito_id(user_data.cognito_user_id)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="このCognito User IDは既に登録されています",
            )

        # メールアドレスの重複チェック
        existing_user = self.repository.get_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="このメールアドレスは既に登録されています",
            )

        # ユーザー作成
        new_user = User(
            cognito_user_id=user_data.cognito_user_id,
            email=user_data.email,
            name=user_data.name,
            phone=user_data.phone,
            role=user_data.role,
            active=True,
        )

        user = self.repository.create(new_user)
        self.db.commit()

        return user

    def update(self, user_id: uuid.UUID, user_data: UserUpdate) -> User:
        """
        ユーザーを更新

        Args:
            user_id: ユーザーID
            user_data: ユーザー更新データ

        Returns:
            User: 更新されたユーザー

        Raises:
            HTTPException: ユーザーが見つからない場合
        """
        user = self.get_by_id(user_id)

        # 更新
        if user_data.name is not None:
            user.name = user_data.name

        if user_data.phone is not None:
            user.phone = user_data.phone

        if user_data.role is not None:
            user.role = user_data.role

        if user_data.active is not None:
            user.active = user_data.active

        updated_user = self.repository.update(user)
        self.db.commit()

        return updated_user

    def delete(self, user_id: uuid.UUID) -> None:
        """
        ユーザーを削除（論理削除）

        Args:
            user_id: ユーザーID

        Raises:
            HTTPException: ユーザーが見つからない場合
        """
        user = self.get_by_id(user_id)
        self.repository.delete(user)
        self.db.commit()
