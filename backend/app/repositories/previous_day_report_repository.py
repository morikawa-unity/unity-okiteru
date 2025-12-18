"""
前日報告リポジトリ
"""
import uuid
from datetime import date

from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from app.models.previous_day_report import PreviousDayReport
from app.schemas.previous_day_report import PreviousDayReportCreate, PreviousDayReportUpdate


class PreviousDayReportRepository:
    """前日報告リポジトリ"""

    def __init__(self, db: Session):
        """
        Args:
            db: データベースセッション
        """
        self.db = db

    def create(
        self, user_id: uuid.UUID, data: PreviousDayReportCreate
    ) -> PreviousDayReport:
        """
        前日報告を作成

        Args:
            user_id: ユーザーID
            data: 前日報告作成データ

        Returns:
            作成された前日報告
        """
        report = PreviousDayReport(
            user_id=user_id,
            report_date=data.report_date,
            next_wake_up_time=data.next_wake_up_time,
            next_departure_time=data.next_departure_time,
            next_arrival_time=data.next_arrival_time,
            appearance_photo_url=data.appearance_photo_url,
            route_photo_url=data.route_photo_url,
            notes=data.notes,
        )
        self.db.add(report)
        self.db.flush()
        return report

    def get_by_id(self, report_id: uuid.UUID) -> PreviousDayReport | None:
        """
        IDで前日報告を取得

        Args:
            report_id: 前日報告ID

        Returns:
            前日報告（存在しない場合はNone）
        """
        return (
            self.db.query(PreviousDayReport)
            .filter(PreviousDayReport.id == report_id)
            .first()
        )

    def get_by_user_and_date(
        self, user_id: uuid.UUID, report_date: date
    ) -> PreviousDayReport | None:
        """
        ユーザーIDと報告日で前日報告を取得

        Args:
            user_id: ユーザーID
            report_date: 報告日

        Returns:
            前日報告（存在しない場合はNone）
        """
        return (
            self.db.query(PreviousDayReport)
            .filter(
                and_(
                    PreviousDayReport.user_id == user_id,
                    PreviousDayReport.report_date == report_date,
                )
            )
            .first()
        )

    def get_by_user(
        self, user_id: uuid.UUID, limit: int = 10, offset: int = 0
    ) -> list[PreviousDayReport]:
        """
        ユーザーIDで前日報告一覧を取得

        Args:
            user_id: ユーザーID
            limit: 取得件数
            offset: オフセット

        Returns:
            前日報告リスト
        """
        return (
            self.db.query(PreviousDayReport)
            .filter(PreviousDayReport.user_id == user_id)
            .order_by(desc(PreviousDayReport.report_date))
            .limit(limit)
            .offset(offset)
            .all()
        )

    def get_latest_by_user(self, user_id: uuid.UUID) -> PreviousDayReport | None:
        """
        ユーザーIDで最新の前日報告を取得

        Args:
            user_id: ユーザーID

        Returns:
            最新の前日報告（存在しない場合はNone）
        """
        return (
            self.db.query(PreviousDayReport)
            .filter(PreviousDayReport.user_id == user_id)
            .order_by(desc(PreviousDayReport.report_date))
            .first()
        )

    def update(
        self, report: PreviousDayReport, data: PreviousDayReportUpdate
    ) -> PreviousDayReport:
        """
        前日報告を更新

        Args:
            report: 更新対象の前日報告
            data: 更新データ

        Returns:
            更新された前日報告
        """
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(report, key, value)

        self.db.flush()
        return report

    def delete(self, report: PreviousDayReport) -> None:
        """
        前日報告を削除

        Args:
            report: 削除対象の前日報告
        """
        self.db.delete(report)
        self.db.flush()
