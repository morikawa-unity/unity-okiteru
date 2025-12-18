"""
前日報告モデル
"""
import uuid
from datetime import date, time, datetime

from sqlalchemy import Column, String, Text, Date, Time, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PreviousDayReport(Base):
    """前日報告テーブル"""

    __tablename__ = "previous_day_reports"

    # 主キー
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # 外部キー
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # 報告日
    report_date: Mapped[date] = mapped_column(Date, nullable=False)

    # 翌日の予定時刻
    next_wake_up_time: Mapped[time] = mapped_column(Time, nullable=False)
    next_departure_time: Mapped[time] = mapped_column(Time, nullable=False)
    next_arrival_time: Mapped[time] = mapped_column(Time, nullable=False)

    # 写真URL
    appearance_photo_url: Mapped[str] = mapped_column(String(500), nullable=False)
    route_photo_url: Mapped[str] = mapped_column(String(500), nullable=False)

    # 備考
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # 実際の出勤記録ID（FK）- 将来実装予定
    # actual_attendance_record_id: Mapped[uuid.UUID | None] = mapped_column(
    #     UUID(as_uuid=True),
    #     ForeignKey("attendance_records.id", ondelete="SET NULL"),
    #     nullable=True,
    # )

    # タイムスタンプ
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # リレーションシップ（必要に応じて後で追加）
    # user: Mapped["User"] = relationship(back_populates="previous_day_reports")
    # actual_attendance_record: Mapped["AttendanceRecord"] = relationship(back_populates="previous_day_reports")

    def __repr__(self) -> str:
        return f"<PreviousDayReport(id={self.id}, user_id={self.user_id}, report_date={self.report_date})>"
