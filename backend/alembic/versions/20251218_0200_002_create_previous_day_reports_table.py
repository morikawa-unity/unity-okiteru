"""create previous_day_reports table

Revision ID: 002
Revises: 001
Create Date: 2025-12-18 02:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """previous_day_reportsテーブルを作成"""
    op.create_table(
        'previous_day_reports',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('report_date', sa.Date(), nullable=False),
        sa.Column('next_wake_up_time', sa.Time(), nullable=False),
        sa.Column('next_departure_time', sa.Time(), nullable=False),
        sa.Column('next_arrival_time', sa.Time(), nullable=False),
        sa.Column('appearance_photo_url', sa.String(500), nullable=False),
        sa.Column('route_photo_url', sa.String(500), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('actual_attendance_record_id', UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # インデックス作成
    op.create_index('idx_prev_reports_user_date', 'previous_day_reports', ['user_id', 'report_date'])
    op.create_index('idx_prev_reports_date', 'previous_day_reports', ['report_date'])

    # updated_at自動更新トリガー
    op.execute("""
        CREATE TRIGGER update_previous_day_reports_updated_at
        BEFORE UPDATE ON previous_day_reports
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    """)


def downgrade() -> None:
    """previous_day_reportsテーブルを削除"""
    op.execute("DROP TRIGGER IF EXISTS update_previous_day_reports_updated_at ON previous_day_reports;")
    op.drop_index('idx_prev_reports_date', table_name='previous_day_reports')
    op.drop_index('idx_prev_reports_user_date', table_name='previous_day_reports')
    op.drop_table('previous_day_reports')
