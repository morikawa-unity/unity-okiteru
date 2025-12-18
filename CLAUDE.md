# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## プロジェクト概要

**Okiteru（おきてる）** - 通信事業部向けスタッフ勤怠・日報管理システム

### 技術スタック
- **フロントエンド**: React 18 + Next.js 14 (Pages Router) + TypeScript + Tailwind CSS
- **バックエンド**: Python 3.11 + FastAPI + SQLAlchemy 2.0 + PostgreSQL
- **インフラ**: AWS (RDS PostgreSQL, Lambda, API Gateway, S3, Cognito, CloudFront)
- **認証**: AWS Cognito + JWT
- **状態管理**: React Context (クライアント側) + TanStack Query (サーバー側)
- **バリデーション**: Zod (フロント) + Pydantic (バックエンド)

---

## 開発コマンド

### フロントエンド（frontend/）

```bash
# 環境セットアップ
cd frontend
npm install
cp .env.example .env.local
# .env.localを編集

# 開発サーバー起動
npm run dev  # http://localhost:3000

# ビルド
npm run build

# Lint & Format
npm run lint
npm run format

# テスト
npm run test
npm run test:e2e
```

### バックエンド（backend/）

```bash
# 環境セットアップ
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env
# .envを編集

# 開発サーバー起動
uvicorn app.main:app --reload  # http://localhost:8000

# マイグレーション
alembic revision -m "description"
alembic upgrade head
alembic downgrade -1

# Lint & Format
black app/ tests/
ruff check app/ tests/

# テスト
pytest
pytest --cov=app --cov-report=html

# 初期データ投入
python scripts/seed_data.py
```

---

## プロジェクト構造

```
unity-okiteru/
├── frontend/                     # Next.js アプリケーション
│   ├── src/
│   │   ├── pages/                # Pages Router（ファイルベースルーティング）
│   │   ├── components/           # 再利用可能コンポーネント
│   │   ├── contexts/             # React Context（AuthContext等）
│   │   ├── hooks/                # カスタムフック
│   │   ├── lib/                  # ライブラリ（API クライアント、TanStack Query設定）
│   │   ├── types/                # TypeScript型定義
│   │   ├── schemas/              # Zodスキーマ
│   │   └── utils/                # ユーティリティ関数
│   └── package.json
│
└── backend/                      # FastAPI アプリケーション
    ├── app/
    │   ├── main.py               # FastAPIアプリケーション定義
    │   ├── config.py             # 環境変数・設定管理
    │   ├── dependencies.py       # DI（get_db, get_current_user等）
    │   ├── database.py           # SQLAlchemy エンジン・セッション管理
    │   ├── models/               # SQLAlchemyモデル
    │   ├── schemas/              # Pydanticスキーマ
    │   ├── routers/              # APIルーター
    │   ├── services/             # ビジネスロジック
    │   ├── repositories/         # データアクセス層
    │   └── utils/                # ユーティリティ（S3, Cognito等）
    ├── alembic/                  # DBマイグレーション
    ├── tests/                    # テストコード
    ├── requirements.txt
    └── lambda_handler.py         # AWS Lambda エントリーポイント
```

---

## アーキテクチャパターン

### バックエンド: レイヤードアーキテクチャ

```
Router Layer (routers/)
  ↓ HTTPリクエスト処理、認証、バリデーション
Service Layer (services/)
  ↓ ビジネスロジック、複数リポジトリの調整
Repository Layer (repositories/)
  ↓ データアクセス、CRUD操作
Model Layer (models/)
  ↓ SQLAlchemyモデル定義
```

**重要な原則**:
- **Router**: HTTPリクエスト/レスポンス処理のみ、ビジネスロジックは含めない
- **Service**: 複雑なビジネスロジック、複数テーブルにまたがる処理
- **Repository**: データベースCRUD操作、クエリ構築
- **Model**: テーブル定義、リレーション定義

### フロントエンド: 状態管理

#### クライアント状態（React Context）
ログイン状態、テーマ設定など、サーバーに依存しないUI状態を管理。

```typescript
// contexts/AuthContext.tsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### サーバー状態（TanStack Query）
API経由で取得するデータのキャッシュ、リフェッチ、楽観的更新を管理。

```typescript
// hooks/useAttendance.ts
export const useAttendance = (date: string) => {
  return useQuery({
    queryKey: ['attendance', date],
    queryFn: () => fetchAttendance(date),
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  });
};
```

---

## データベース設計

### 主要テーブル

| テーブル名 | 説明 |
|-----------|------|
| `users` | ユーザー情報（スタッフ・マネージャー） |
| `attendance_records` | 勤怠記録（起床・出発・到着） |
| `daily_reports` | 日報 |
| `previous_day_reports` | 前日報告 |
| `staff_availability` | 出社可能日 |
| `worksites` | 現場マスタ |
| `access_logs` | アクセスログ |

### SQLAlchemyモデル例

```python
# models/attendance.py
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
import uuid

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    staff_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    date: Mapped[datetime.date] = mapped_column(nullable=False)
    wake_up_time: Mapped[datetime.datetime] = mapped_column(nullable=True)
    departure_time: Mapped[datetime.datetime] = mapped_column(nullable=True)
    arrival_time: Mapped[datetime.datetime] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")

    # リレーション
    staff: Mapped["User"] = relationship(back_populates="attendance_records")
```

詳細は [DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) を参照。

---

## 認証フロー

### AWS Cognito + JWT

```
1. ユーザーがログイン情報を入力
   ↓
2. フロントエンド → Cognito (InitiateAuth)
   ↓
3. Cognito → フロントエンド (IDToken, AccessToken)
   ↓
4. フロントエンド → API Gateway (Authorization: Bearer {IDToken})
   ↓
5. Lambda → Cognito (トークン検証)
   ↓
6. Lambda → ビジネスロジック実行
```

### バックエンド認証実装

```python
# dependencies.py
from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
from app.config import settings

async def get_current_user(authorization: str = Header(...)):
    """JWTトークンから現在のユーザーを取得"""
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(
            token,
            settings.COGNITO_PUBLIC_KEY,
            algorithms=["RS256"],
            audience=settings.COGNITO_CLIENT_ID
        )
        user_id = payload.get("sub")
        role = payload.get("cognito:groups", ["staff"])[0]
        return CurrentUser(id=user_id, role=role)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### フロントエンド認証実装

```typescript
// hooks/useAuth.ts
import { CognitoUserPool, CognitoUser, AuthenticationDetails } from 'amazon-cognito-identity-js';

export const useAuth = () => {
  const login = async (email: string, password: string) => {
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });

    return new Promise((resolve, reject) => {
      cognitoUser.authenticateUser(authDetails, {
        onSuccess: (result) => {
          const idToken = result.getIdToken().getJwtToken();
          localStorage.setItem('idToken', idToken);
          resolve(result);
        },
        onFailure: reject,
      });
    });
  };

  return { login, logout };
};
```

---

## コーディング規約

### TypeScript/JavaScript

| 項目 | 規約 |
|------|------|
| **変数・関数** | camelCase（`userName`, `fetchAttendance`） |
| **コンポーネント** | PascalCase（`AttendanceForm`, `Button`） |
| **定数** | UPPER_SNAKE_CASE（`API_URL`, `MAX_FILE_SIZE`） |
| **ファイル名（コンポーネント）** | PascalCase（`Button.tsx`, `AttendanceForm.tsx`） |
| **ファイル名（その他）** | camelCase（`useAuth.ts`, `validators.ts`） |

### Python

| 項目 | 規約 |
|------|------|
| **変数・関数** | snake_case（`user_name`, `fetch_attendance`） |
| **クラス** | PascalCase（`AttendanceService`, `UserRepository`） |
| **定数** | UPPER_SNAKE_CASE（`DATABASE_URL`, `JWT_SECRET`） |
| **ファイル名** | snake_case（`user_repository.py`, `auth_service.py`） |

### データベース

| 項目 | 規約 |
|------|------|
| **テーブル名** | snake_case 複数形（`users`, `attendance_records`） |
| **カラム名** | snake_case（`user_id`, `created_at`） |

---

## 環境変数管理

### フロントエンド (.env.local)

```bash
# API エンドポイント
NEXT_PUBLIC_API_URL=https://api.okiteru.example.com

# Cognito
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-northeast-1_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_COGNITO_REGION=ap-northeast-1

# S3（写真表示用）
NEXT_PUBLIC_S3_BUCKET_URL=https://okiteru-photos.s3.ap-northeast-1.amazonaws.com
```

### バックエンド (.env)

```bash
# アプリケーション
APP_NAME=okiteru-api
ENVIRONMENT=production

# データベース
DATABASE_URL=postgresql://user:password@okiteru-db.xxxxx.ap-northeast-1.rds.amazonaws.com:5432/okiteru

# AWS Cognito
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxx
COGNITO_REGION=ap-northeast-1
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx

# AWS S3（写真保存用）
S3_BUCKET_NAME=okiteru-photos
S3_REGION=ap-northeast-1
```

---

## API実装パターン

### FastAPIルーター例

```python
# routers/attendance.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.schemas.attendance import AttendanceCreate, AttendanceResponse
from app.services.attendance_service import AttendanceService

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

@router.post("/wakeup", response_model=AttendanceResponse)
async def report_wakeup(
    data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """起床報告"""
    service = AttendanceService(db)
    attendance = service.report_wakeup(current_user.id, data)
    return attendance
```

### サービス層例

```python
# services/attendance_service.py
from sqlalchemy.orm import Session
from app.repositories.attendance_repository import AttendanceRepository
from app.schemas.attendance import AttendanceCreate

class AttendanceService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = AttendanceRepository(db)

    def report_wakeup(self, staff_id: str, data: AttendanceCreate):
        """起床報告処理"""
        # ビジネスロジック
        attendance = self.repository.get_or_create_today(staff_id)
        attendance.wake_up_time = data.wake_up_time
        attendance.wake_up_location = data.location
        attendance.status = "partial"

        self.db.commit()
        self.db.refresh(attendance)
        return attendance
```

### リポジトリ層例

```python
# repositories/attendance_repository.py
from sqlalchemy.orm import Session
from app.models.attendance import AttendanceRecord
from datetime import date

class AttendanceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_or_create_today(self, staff_id: str) -> AttendanceRecord:
        """当日の勤怠記録を取得または作成"""
        today = date.today()
        attendance = self.db.query(AttendanceRecord).filter(
            AttendanceRecord.staff_id == staff_id,
            AttendanceRecord.date == today
        ).first()

        if not attendance:
            attendance = AttendanceRecord(staff_id=staff_id, date=today)
            self.db.add(attendance)
            self.db.flush()

        return attendance
```

---

## テスト戦略

### フロントエンド（Jest + React Testing Library）

```typescript
// components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### バックエンド（pytest）

```python
# tests/test_routers/test_attendance.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_report_wakeup_success(test_db, auth_headers):
    """起床報告が成功することを確認"""
    data = {
        "wake_up_time": "2025-12-18T06:00:00",
        "location": "自宅",
        "notes": "良好"
    }
    response = client.post(
        "/api/attendance/wakeup",
        json=data,
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["status"] == "partial"
```

---

## デプロイ

### Lambda デプロイ

```bash
cd backend
pip install -r requirements.txt -t package/
cp -r app package/
cd package
zip -r ../lambda.zip .
aws lambda update-function-code \
  --function-name okiteru-api \
  --zip-file fileb://../lambda.zip
```

### フロントエンド デプロイ

```bash
cd frontend
npm run build
aws s3 sync out/ s3://okiteru-frontend --delete
aws cloudfront create-invalidation --distribution-id EXXX --paths "/*"
```

---

## ドキュメント

作業開始時に必ず以下のドキュメントを確認してください：

- **README.md** - プロジェクト概要、セットアップ手順、開発コマンド
- **CLAUDE.md** - Claude Code向け開発ガイド（本ファイル）
- **docs/ARCHITECTURE.md** - アーキテクチャ設計、技術スタック
- **docs/DATABASE_DESIGN.md** - DB設計、テーブル定義、ER図
- **docs/PROJECT_STRUCTURE.md** - ディレクトリ構成、ファイル役割
- **docs/REQUIREMENTS.md** - 機能要件、非機能要件、API仕様

---

## トラブルシューティング

### フロントエンド

**問題**: `npm run dev`でエラーが発生
```bash
# node_modules削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

**問題**: API接続エラー
```bash
# .env.localを確認
cat .env.local
# NEXT_PUBLIC_API_URLが正しいか確認
```

### バックエンド

**問題**: マイグレーションエラー
```bash
# マイグレーション履歴を確認
alembic history

# ロールバック
alembic downgrade -1

# 再実行
alembic upgrade head
```

**問題**: データベース接続エラー
```bash
# DATABASE_URLを確認
echo $DATABASE_URL

# PostgreSQL接続テスト
psql $DATABASE_URL -c "SELECT 1;"
```

---

**作成日**: 2025-12-18
**バージョン**: 1.0
