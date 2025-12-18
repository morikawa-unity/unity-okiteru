"""
前日報告サービス
"""
import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.previous_day_report import PreviousDayReport
from app.repositories.previous_day_report_repository import PreviousDayReportRepository
from app.schemas.previous_day_report import (
    PreviousDayReportCreate,
    PreviousDayReportUpdate,
)


class PreviousDayReportService:
    """前日報告サービス"""

    def __init__(self, db: Session):
        """
        Args:
            db: データベースセッション
        """
        self.db = db
        self.repository = PreviousDayReportRepository(db)

    def create_report(
        self, user_id: uuid.UUID, data: PreviousDayReportCreate
    ) -> PreviousDayReport:
        """
        前日報告を作成

        Args:
            user_id: ユーザーID
            data: 前日報告作成データ

        Returns:
            作成された前日報告

        Raises:
            HTTPException: 同じ日付の報告が既に存在する場合
        """
        # 同じ日付の報告が既に存在するかチェック
        existing_report = self.repository.get_by_user_and_date(
            user_id=user_id, report_date=data.report_date
        )

        if existing_report:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"前日報告は既に登録されています: {data.report_date}",
            )

        # 前日報告を作成
        report = self.repository.create(user_id=user_id, data=data)

        # コミット
        self.db.commit()
        self.db.refresh(report)

        return report

    def get_report_by_id(
        self, report_id: uuid.UUID, user_id: uuid.UUID
    ) -> PreviousDayReport:
        """
        IDで前日報告を取得

        Args:
            report_id: 前日報告ID
            user_id: ユーザーID（権限チェック用）

        Returns:
            前日報告

        Raises:
            HTTPException: 前日報告が存在しない、または権限がない場合
        """
        report = self.repository.get_by_id(report_id)

        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="前日報告が見つかりません",
            )

        # 自分の報告かチェック（マネージャーの場合は別途権限チェックが必要）
        if report.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="この前日報告にアクセスする権限がありません",
            )

        return report

    def get_user_reports(
        self, user_id: uuid.UUID, limit: int = 10, offset: int = 0
    ) -> list[PreviousDayReport]:
        """
        ユーザーの前日報告一覧を取得

        Args:
            user_id: ユーザーID
            limit: 取得件数
            offset: オフセット

        Returns:
            前日報告リスト
        """
        return self.repository.get_by_user(user_id=user_id, limit=limit, offset=offset)

    def get_latest_report(self, user_id: uuid.UUID) -> PreviousDayReport | None:
        """
        ユーザーの最新の前日報告を取得

        Args:
            user_id: ユーザーID

        Returns:
            最新の前日報告（存在しない場合はNone）
        """
        return self.repository.get_latest_by_user(user_id)

    def update_report(
        self, report_id: uuid.UUID, user_id: uuid.UUID, data: PreviousDayReportUpdate
    ) -> PreviousDayReport:
        """
        前日報告を更新

        Args:
            report_id: 前日報告ID
            user_id: ユーザーID（権限チェック用）
            data: 更新データ

        Returns:
            更新された前日報告

        Raises:
            HTTPException: 前日報告が存在しない、または権限がない場合
        """
        report = self.get_report_by_id(report_id=report_id, user_id=user_id)

        # 更新
        updated_report = self.repository.update(report=report, data=data)

        # コミット
        self.db.commit()
        self.db.refresh(updated_report)

        return updated_report

    def delete_report(self, report_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """
        前日報告を削除

        Args:
            report_id: 前日報告ID
            user_id: ユーザーID（権限チェック用）

        Raises:
            HTTPException: 前日報告が存在しない、または権限がない場合
        """
        report = self.get_report_by_id(report_id=report_id, user_id=user_id)

        # 削除
        self.repository.delete(report)

        # コミット
        self.db.commit()
