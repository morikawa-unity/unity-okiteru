"""
前日報告スキーマ
"""
import uuid
from datetime import date, time, datetime

from pydantic import BaseModel, Field, ConfigDict


class PreviousDayReportCreate(BaseModel):
    """前日報告作成スキーマ"""

    report_date: date = Field(..., description="報告日（前日報告を行った日）")
    next_wake_up_time: time = Field(..., description="翌日の予定起床時刻")
    next_departure_time: time = Field(..., description="翌日の予定出発時刻")
    next_arrival_time: time = Field(..., description="翌日の予定到着時刻")
    appearance_photo_url: str = Field(..., max_length=500, description="身だしなみ写真URL")
    route_photo_url: str = Field(..., max_length=500, description="経路スクリーンショットURL")
    notes: str | None = Field(None, description="備考")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "report_date": "2025-12-17",
                "next_wake_up_time": "06:00:00",
                "next_departure_time": "07:30:00",
                "next_arrival_time": "09:00:00",
                "appearance_photo_url": "https://s3.amazonaws.com/okiteru-photos/appearance/12345.jpg",
                "route_photo_url": "https://s3.amazonaws.com/okiteru-photos/route/12345.jpg",
                "notes": "特になし",
            }
        }
    )


class PreviousDayReportUpdate(BaseModel):
    """前日報告更新スキーマ"""

    report_date: date | None = None
    next_wake_up_time: time | None = None
    next_departure_time: time | None = None
    next_arrival_time: time | None = None
    appearance_photo_url: str | None = Field(None, max_length=500)
    route_photo_url: str | None = Field(None, max_length=500)
    notes: str | None = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "next_wake_up_time": "06:30:00",
                "notes": "起床時刻を変更",
            }
        }
    )


class PreviousDayReportResponse(BaseModel):
    """前日報告レスポンススキーマ"""

    id: uuid.UUID
    user_id: uuid.UUID
    report_date: date
    next_wake_up_time: time
    next_departure_time: time
    next_arrival_time: time
    appearance_photo_url: str
    route_photo_url: str
    notes: str | None
    # actual_attendance_record_id: uuid.UUID | None  # 将来実装予定
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "report_date": "2025-12-17",
                "next_wake_up_time": "06:00:00",
                "next_departure_time": "07:30:00",
                "next_arrival_time": "09:00:00",
                "appearance_photo_url": "https://s3.amazonaws.com/okiteru-photos/appearance/12345.jpg",
                "route_photo_url": "https://s3.amazonaws.com/okiteru-photos/route/12345.jpg",
                "notes": "特になし",
                "created_at": "2025-12-17T20:00:00Z",
                "updated_at": "2025-12-17T20:00:00Z",
            }
        },
    )
