"""Alembic環境設定"""
import sys
from pathlib import Path
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# プロジェクトルートをPythonパスに追加
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Alembic Config オブジェクト
config = context.config

# Pythonロギング設定
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# メタデータのインポート
from app.database import Base
from app.models import *  # すべてのモデルをインポート

target_metadata = Base.metadata

# 環境変数からDATABASE_URLを取得
from app.config import settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)


def run_migrations_offline() -> None:
    """オフラインモードでマイグレーションを実行

    SQLファイルとして出力する場合に使用
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """オンラインモードでマイグレーションを実行

    実際のデータベースに接続して実行
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
