# Okiteru Backend API

FastAPI + SQLAlchemy + PostgreSQLによるバックエンドAPI

## 環境構築

### 1. PostgreSQLコンテナ起動

```bash
# backendディレクトリで実行
cd backend
docker-compose up -d

# 起動確認
docker-compose ps
```

### 2. 依存パッケージインストール

```bash
cd backend
pip install -r requirements-dev.txt
```

### 3. 環境変数設定

`.env`ファイルは既に作成済み（`.env.example`からコピー済み）

### 4. データベースマイグレーション実行

```bash
# マイグレーション実行
alembic upgrade head

# 確認（現在のリビジョン確認）
alembic current

# 履歴確認
alembic history
```

### 5. 開発サーバー起動

```bash
uvicorn app.main:app --reload
```

http://localhost:8000 でAPIサーバーが起動します。

## APIドキュメント

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## データベース操作

### マイグレーション作成

```bash
# 新しいマイグレーションファイル作成
alembic revision -m "説明"

# 自動生成（モデルとの差分を検出）
alembic revision --autogenerate -m "説明"
```

### マイグレーション適用

```bash
# 最新まで適用
alembic upgrade head

# 1つ進める
alembic upgrade +1

# 特定のリビジョンまで適用
alembic upgrade 002
```

### ロールバック

```bash
# 1つ戻る
alembic downgrade -1

# 特定のリビジョンまで戻る
alembic downgrade 001

# 全て戻す
alembic downgrade base
```

### PostgreSQL接続

```bash
# コンテナに接続
docker exec -it okiteru-postgres psql -U okiteru_user -d okiteru

# テーブル一覧
\dt

# テーブル構造確認
\d users
\d previous_day_reports

# 終了
\q
```

## API実行例

### 前日報告を登録

```bash
curl -X POST "http://localhost:8000/api/previous-day-reports" \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 123e4567-e89b-12d3-a456-426614174001" \
  -d '{
    "report_date": "2025-12-18",
    "next_wake_up_time": "06:00:00",
    "next_departure_time": "07:30:00",
    "next_arrival_time": "09:00:00",
    "appearance_photo_url": "https://example.com/photo.jpg",
    "route_photo_url": "https://example.com/route.jpg",
    "notes": "特になし"
  }'
```

## テスト

```bash
# 全テスト実行
pytest

# カバレッジ付き
pytest --cov=app --cov-report=html

# 特定のテストファイル
pytest tests/test_previous_day_reports.py
```

## コード品質

```bash
# フォーマット
black app/ tests/

# リント
ruff check app/ tests/
```

## トラブルシューティング

### PostgreSQLコンテナが起動しない

```bash
# コンテナログ確認
docker-compose logs postgres

# コンテナ再起動
docker-compose restart postgres
```

### マイグレーションエラー

```bash
# 現在の状態確認
alembic current

# ロールバックしてやり直し
alembic downgrade -1
alembic upgrade head
```

### データベースをリセット

```bash
# コンテナ停止・削除
docker-compose down -v

# 再起動
docker-compose up -d

# マイグレーション再実行
alembic upgrade head
```

## プロジェクト構成

```
backend/
├── alembic/                  # Alembicマイグレーション
│   ├── versions/             # マイグレーションファイル
│   ├── env.py                # Alembic環境設定
│   └── script.py.mako        # テンプレート
├── app/
│   ├── main.py               # FastAPIアプリケーション
│   ├── config.py             # 環境設定
│   ├── database.py           # SQLAlchemyセットアップ
│   ├── dependencies.py       # 依存性注入
│   ├── models/               # SQLAlchemyモデル
│   ├── schemas/              # Pydanticスキーマ
│   ├── repositories/         # データアクセス層
│   ├── services/             # ビジネスロジック
│   └── routers/              # APIエンドポイント
├── tests/                    # テストコード
├── alembic.ini               # Alembic設定
├── requirements.txt          # 依存パッケージ
└── .env                      # 環境変数
```
