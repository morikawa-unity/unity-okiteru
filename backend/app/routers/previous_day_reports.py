"""
前日報告ルーター
"""
import uuid

from fastapi import APIRouter, status
from sqlalchemy.orm import Session

from app.dependencies import DBSession, User
from app.schemas.previous_day_report import (
    PreviousDayReportCreate,
    PreviousDayReportResponse,
    PreviousDayReportUpdate,
)
from app.services.previous_day_report_service import PreviousDayReportService

router = APIRouter(prefix="/api/previous-day-reports", tags=["previous-day-reports"])


@router.post(
    "",
    response_model=PreviousDayReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="前日報告を登録",
    description="翌日の予定（起床・出発・到着時刻）と写真を登録します",
)
async def create_previous_day_report(
    data: PreviousDayReportCreate,
    db: DBSession,
    current_user: User,
):
    """
    前日報告を登録

    - **report_date**: 報告日（前日報告を行った日）
    - **next_wake_up_time**: 翌日の予定起床時刻
    - **next_departure_time**: 翌日の予定出発時刻
    - **next_arrival_time**: 翌日の予定到着時刻
    - **appearance_photo_url**: 身だしなみ写真URL
    - **route_photo_url**: 経路スクリーンショットURL
    - **notes**: 備考（任意）
    """
    service = PreviousDayReportService(db)
    report = service.create_report(user_id=current_user.id, data=data)
    return report


@router.get(
    "/{report_id}",
    response_model=PreviousDayReportResponse,
    summary="前日報告を取得",
    description="指定したIDの前日報告を取得します",
)
async def get_previous_day_report(
    report_id: uuid.UUID,
    db: DBSession,
    current_user: User,
):
    """
    前日報告を取得

    - **report_id**: 前日報告ID
    """
    service = PreviousDayReportService(db)
    report = service.get_report_by_id(report_id=report_id, user_id=current_user.id)
    return report


@router.get(
    "",
    response_model=list[PreviousDayReportResponse],
    summary="前日報告一覧を取得",
    description="ログインユーザーの前日報告一覧を取得します",
)
async def list_previous_day_reports(
    db: DBSession,
    current_user: User,
    limit: int = 10,
    offset: int = 0,
):
    """
    前日報告一覧を取得

    - **limit**: 取得件数（デフォルト: 10）
    - **offset**: オフセット（デフォルト: 0）
    """
    service = PreviousDayReportService(db)
    reports = service.get_user_reports(
        user_id=current_user.id, limit=limit, offset=offset
    )
    return reports


@router.get(
    "/latest/me",
    response_model=PreviousDayReportResponse | None,
    summary="最新の前日報告を取得",
    description="ログインユーザーの最新の前日報告を取得します",
)
async def get_latest_previous_day_report(
    db: DBSession,
    current_user: User,
):
    """
    最新の前日報告を取得
    """
    service = PreviousDayReportService(db)
    report = service.get_latest_report(user_id=current_user.id)
    return report


@router.put(
    "/{report_id}",
    response_model=PreviousDayReportResponse,
    summary="前日報告を更新",
    description="指定したIDの前日報告を更新します",
)
async def update_previous_day_report(
    report_id: uuid.UUID,
    data: PreviousDayReportUpdate,
    db: DBSession,
    current_user: User,
):
    """
    前日報告を更新

    - **report_id**: 前日報告ID
    """
    service = PreviousDayReportService(db)
    report = service.update_report(
        report_id=report_id, user_id=current_user.id, data=data
    )
    return report


@router.delete(
    "/{report_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="前日報告を削除",
    description="指定したIDの前日報告を削除します",
)
async def delete_previous_day_report(
    report_id: uuid.UUID,
    db: DBSession,
    current_user: User,
):
    """
    前日報告を削除

    - **report_id**: 前日報告ID
    """
    service = PreviousDayReportService(db)
    service.delete_report(report_id=report_id, user_id=current_user.id)
    return None
