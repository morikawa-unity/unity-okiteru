"""
シードデータ投入スクリプト
"""
import sys
from pathlib import Path

# プロジェクトルートをパスに追加
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from app.database import SessionLocal, engine
from app.config import settings

def seed_users():
    """テストユーザーを作成"""
    db = SessionLocal()
    try:
        # テストユーザー1: スタッフ
        db.execute(
            text("""
                INSERT INTO users (cognito_user_id, email, role, name, phone, active)
                VALUES (:cognito_user_id, :email, :role, :name, :phone, :active)
                ON CONFLICT (email) DO NOTHING
            """),
            {
                "cognito_user_id": "test-staff-001",
                "email": "staff001@example.com",
                "role": "staff",
                "name": "テストスタッフ001",
                "phone": "090-1234-5678",
                "active": True,
            }
        )

        # テストユーザー2: スタッフ
        db.execute(
            text("""
                INSERT INTO users (cognito_user_id, email, role, name, phone, active)
                VALUES (:cognito_user_id, :email, :role, :name, :phone, :active)
                ON CONFLICT (email) DO NOTHING
            """),
            {
                "cognito_user_id": "test-staff-002",
                "email": "staff002@example.com",
                "role": "staff",
                "name": "テストスタッフ002",
                "phone": "090-2345-6789",
                "active": True,
            }
        )

        # テストユーザー3: マネージャー
        db.execute(
            text("""
                INSERT INTO users (cognito_user_id, email, role, name, phone, active)
                VALUES (:cognito_user_id, :email, :role, :name, :phone, :active)
                ON CONFLICT (email) DO NOTHING
            """),
            {
                "cognito_user_id": "test-manager-001",
                "email": "manager001@example.com",
                "role": "manager",
                "name": "テストマネージャー001",
                "phone": "090-3456-7890",
                "active": True,
            }
        )

        db.commit()
        print("✓ ユーザーシードデータを投入しました")

        # 投入されたユーザーを表示
        result = db.execute(text("SELECT id, email, role, name FROM users"))
        print("\n登録されたユーザー:")
        for row in result:
            print(f"  - {row.name} ({row.email}) - {row.role} [ID: {row.id}]")

    except Exception as e:
        print(f"✗ エラーが発生しました: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def main():
    """メイン処理"""
    print("=" * 60)
    print("シードデータ投入開始")
    print("=" * 60)
    print(f"データベース: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
    print()

    try:
        seed_users()
        print("\n" + "=" * 60)
        print("シードデータ投入完了")
        print("=" * 60)
    except Exception as e:
        print(f"\nシードデータ投入失敗: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
