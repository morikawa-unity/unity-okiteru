# データベース設計書

## 1. 概要

**データベース**: PostgreSQL (AWS RDS)
**文字セット**: UTF-8
**タイムゾーン**: Asia/Tokyo (JST)

---

## 2. テーブル一覧

| # | テーブル名 | 説明 | 主要機能 |
|---|-----------|------|---------|
| 1 | `users` | ユーザー情報 | スタッフ・管理者の基本情報 |
| 2 | `attendance_records` | 勤怠記録 | 起床・出発・到着の記録 |
| 3 | `daily_reports` | 日報 | 当日の作業報告 |
| 4 | `previous_day_reports` | 前日報告 | 翌日の予定報告 |
| 5 | `staff_availability` | 出社可能日 | スタッフの出勤予定 |
| 6 | `worksites` | 現場マスタ | 勤務先現場情報 |
| 7 | `access_logs` | アクセスログ | ログイン・ログアウト記録 |

**合計**: 7 テーブル

---

## 3. テーブル詳細設計

### 3.1 users（ユーザー情報）

**概要**: スタッフと管理者のユーザー情報を管理

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| `id` | UUID | NO | gen_random_uuid() | プライマリキー |
| `cognito_user_id` | VARCHAR(255) | NO | - | AWS Cognito ユーザーID（sub） |
| `email` | VARCHAR(255) | NO | - | メールアドレス（ユニーク） |
| `role` | VARCHAR(20) | NO | 'staff' | ユーザーロール（staff/manager） |
| `name` | VARCHAR(100) | NO | - | ユーザー名 |
| `phone` | VARCHAR(20) | YES | - | 電話番号 |
| `active` | BOOLEAN | NO | true | アクティブ状態 |
| `created_at` | TIMESTAMPTZ | NO | now() | 作成日時 |
| `updated_at` | TIMESTAMPTZ | NO | now() | 更新日時 |

**制約**:
- PRIMARY KEY: `id`
- UNIQUE: `cognito_user_id`, `email`
- INDEX: `idx_users_active` ON `active`
- INDEX: `idx_users_role` ON `role`
- CHECK: `role IN ('staff', 'manager')`

**RLS (Row Level Security)**:
- **SELECT**: マネージャーは全て閲覧可、スタッフは自分のみ
- **UPDATE**: マネージャーは全て更新可、スタッフは自分のみ
- **DELETE**: マネージャーのみ

---

### 3.2 attendance_records（勤怠記録）

**概要**: 日々の勤怠記録（起床・出発・到着）

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| `id` | UUID | NO | gen_random_uuid() | プライマリキー |
| `staff_id` | UUID | NO | - | スタッフID（FK → users.id） |
| `date` | DATE | NO | - | 勤怠日付 |
| `wake_up_time` | TIMESTAMPTZ | YES | - | 起床時刻 |
| `wake_up_location` | VARCHAR(255) | YES | - | 起床場所 |
| `wake_up_notes` | TEXT | YES | - | 起床時の備考 |
| `departure_time` | TIMESTAMPTZ | YES | - | 出発時刻 |
| `departure_location` | VARCHAR(255) | YES | - | 出発場所 |
| `departure_notes` | TEXT | YES | - | 出発時の備考 |
| `destination` | VARCHAR(255) | YES | - | 目的地 |
| `arrival_time` | TIMESTAMPTZ | YES | - | 到着時刻 |
| `arrival_location` | VARCHAR(255) | YES | - | 到着場所（手動入力） |
| `arrival_gps_location` | VARCHAR(255) | YES | - | 到着GPS座標 |
| `arrival_notes` | TEXT | YES | - | 到着時の備考 |
| `route_photo_url` | VARCHAR(500) | YES | - | 経路写真URL（S3） |
| `appearance_photo_url` | VARCHAR(500) | YES | - | 身だしなみ写真URL（S3） |
| `status` | VARCHAR(20) | NO | 'pending' | ステータス |
| `notes` | TEXT | YES | - | 一般備考 |
| `created_at` | TIMESTAMPTZ | NO | now() | 作成日時 |
| `updated_at` | TIMESTAMPTZ | NO | now() | 更新日時 |

**制約**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `staff_id` REFERENCES `users(id)` ON DELETE CASCADE
- INDEX: `idx_attendance_staff_date` ON `staff_id, date`
- INDEX: `idx_attendance_date` ON `date`
- INDEX: `idx_attendance_status` ON `status`
- CHECK: `status IN ('pending', 'partial', 'complete', 'active', 'reset', 'reopened', 'archived')`

**ステータス遷移**:
```
pending → partial → complete → archived
          ↓
        reset → partial (新しい日の開始)

complete → reopened → partial (再開)
```

**RLS**:
- **SELECT**: マネージャーは全て閲覧可、スタッフは自分のみ
- **INSERT/UPDATE**: マネージャーは全て可、スタッフは自分のみ
- **DELETE**: マネージャーのみ

---

### 3.3 daily_reports（日報）

**概要**: スタッフの日報

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| `id` | UUID | NO | gen_random_uuid() | プライマリキー |
| `staff_id` | UUID | NO | - | スタッフID（FK → users.id） |
| `date` | DATE | NO | - | 日報の日付 |
| `content` | TEXT | NO | - | 日報の内容 |
| `attendance_record_id` | UUID | YES | - | 勤怠記録ID（FK → attendance_records.id） |
| `status` | VARCHAR(20) | NO | 'submitted' | ステータス |
| `submitted_at` | TIMESTAMPTZ | NO | now() | 提出日時 |
| `created_at` | TIMESTAMPTZ | NO | now() | 作成日時 |
| `updated_at` | TIMESTAMPTZ | NO | now() | 更新日時 |

**制約**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `staff_id` REFERENCES `users(id)` ON DELETE CASCADE
- FOREIGN KEY: `attendance_record_id` REFERENCES `attendance_records(id)` ON DELETE SET NULL
- INDEX: `idx_reports_staff_date` ON `staff_id, date`
- INDEX: `idx_reports_date` ON `date`
- INDEX: `idx_reports_status` ON `status`
- CHECK: `status IN ('draft', 'submitted', 'archived', 'superseded')`

**RLS**:
- **SELECT**: マネージャーは全て閲覧可、スタッフは自分のみ
- **INSERT/UPDATE**: マネージャーは全て可、スタッフは自分のみ
- **DELETE**: マネージャーのみ

---

### 3.4 previous_day_reports（前日報告）

**概要**: 翌日の予定を前日に報告

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| `id` | UUID | NO | gen_random_uuid() | プライマリキー |
| `user_id` | UUID | NO | - | ユーザーID（FK → users.id） |
| `report_date` | DATE | NO | - | 報告日（前日報告を行った日） |
| `next_wake_up_time` | TIME | NO | - | 翌日の予定起床時刻 |
| `next_departure_time` | TIME | NO | - | 翌日の予定出発時刻 |
| `next_arrival_time` | TIME | NO | - | 翌日の予定到着時刻 |
| `appearance_photo_url` | VARCHAR(500) | NO | - | 身だしなみ写真URL |
| `route_photo_url` | VARCHAR(500) | NO | - | 経路スクリーンショットURL |
| `notes` | TEXT | YES | - | 備考 |
| `actual_attendance_record_id` | UUID | YES | - | 実際の出勤記録ID（FK → attendance_records.id） |
| `created_at` | TIMESTAMPTZ | NO | now() | 作成日時 |
| `updated_at` | TIMESTAMPTZ | NO | now() | 更新日時 |

**制約**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` REFERENCES `users(id)` ON DELETE CASCADE
- FOREIGN KEY: `actual_attendance_record_id` REFERENCES `attendance_records(id)` ON DELETE SET NULL
- INDEX: `idx_prev_reports_user_date` ON `user_id, report_date`
- INDEX: `idx_prev_reports_date` ON `report_date`

**RLS**:
- **SELECT**: マネージャーは全て閲覧可、スタッフは自分のみ
- **INSERT/UPDATE**: マネージャーは全て可、スタッフは自分のみ
- **DELETE**: マネージャーは全て可、スタッフは自分のみ

---

### 3.5 staff_availability（出社可能日）

**概要**: スタッフの出勤予定・可能日

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| `id` | UUID | NO | gen_random_uuid() | プライマリキー |
| `staff_id` | UUID | NO | - | スタッフID（FK → users.id） |
| `date` | DATE | NO | - | 出社可能日 |
| `worksite_id` | UUID | YES | - | 勤務予定の現場ID（FK → worksites.id） |
| `notes` | TEXT | YES | - | 備考・メモ |
| `created_at` | TIMESTAMPTZ | NO | now() | 作成日時 |
| `updated_at` | TIMESTAMPTZ | NO | now() | 更新日時 |

**制約**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `staff_id` REFERENCES `users(id)` ON DELETE CASCADE
- FOREIGN KEY: `worksite_id` REFERENCES `worksites(id)` ON DELETE SET NULL
- UNIQUE: `staff_id, date` (同じスタッフが同じ日に複数登録不可)
- INDEX: `idx_availability_staff_date` ON `staff_id, date`
- INDEX: `idx_availability_date` ON `date`
- INDEX: `idx_availability_worksite` ON `worksite_id`

**RLS**:
- **SELECT**: マネージャーは全て閲覧可、スタッフは自分のみ
- **INSERT/UPDATE/DELETE**: マネージャーは全て可、スタッフは自分のみ

---

### 3.6 worksites（現場マスタ）

**概要**: 勤務先現場情報のマスタデータ

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| `id` | UUID | NO | gen_random_uuid() | プライマリキー |
| `name` | VARCHAR(255) | NO | - | 現場名（ユニーク） |
| `address` | VARCHAR(500) | YES | - | 住所 |
| `description` | TEXT | YES | - | 説明・備考 |
| `is_active` | BOOLEAN | NO | true | 有効/無効フラグ |
| `created_at` | TIMESTAMPTZ | NO | now() | 作成日時 |
| `updated_at` | TIMESTAMPTZ | NO | now() | 更新日時 |

**制約**:
- PRIMARY KEY: `id`
- UNIQUE: `name`
- INDEX: `idx_worksites_active` ON `is_active`
- INDEX: `idx_worksites_name` ON `name`

**RLS**:
- **SELECT**: 全ユーザー（active=trueのみ）
- **INSERT/UPDATE/DELETE**: マネージャーのみ

---

### 3.7 access_logs（アクセスログ）

**概要**: ログイン・ログアウトの監査ログ

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|---------|------|-----------|------|
| `id` | UUID | NO | gen_random_uuid() | プライマリキー |
| `user_id` | UUID | NO | - | ユーザーID（FK → users.id） |
| `login_time` | TIMESTAMPTZ | NO | now() | ログイン時刻 |
| `logout_time` | TIMESTAMPTZ | YES | - | ログアウト時刻 |
| `ip_address` | INET | YES | - | IPアドレス |
| `user_agent` | TEXT | YES | - | ユーザーエージェント |
| `created_at` | TIMESTAMPTZ | NO | now() | 作成日時 |

**制約**:
- PRIMARY KEY: `id`
- FOREIGN KEY: `user_id` REFERENCES `users(id)` ON DELETE CASCADE
- INDEX: `idx_access_logs_user_login` ON `user_id, login_time`
- INDEX: `idx_access_logs_login_time` ON `login_time`

**RLS**:
- **SELECT**: マネージャーは全て閲覧可、スタッフは自分のみ
- **INSERT**: 全ユーザー
- **UPDATE**: マネージャーのみ（logout_time更新）
- **DELETE**: マネージャーのみ

---

## 4. ER図（エンティティ関連図）

```
┌─────────────────┐
│     users       │
│  (ユーザー)      │
│  - id (PK)      │
│  - cognito_id   │
│  - email        │
│  - role         │
│  - name         │
└────────┬────────┘
         │
         ├──────────────┬──────────────┬──────────────┐
         │              │              │              │
         ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────────────┐ ┌─────────────────────┐ ┌──────────────┐
│ access_logs  │ │ attendance_records   │ │ previous_day_reports│ │ staff_       │
│(アクセスログ) │ │   (勤怠記録)          │ │  (前日報告)          │ │ availability │
│- id (PK)     │ │ - id (PK)            │ │ - id (PK)           │ │(出社可能日)   │
│- user_id (FK)│ │ - staff_id (FK)      │ │ - user_id (FK)      │ │- id (PK)     │
│- login_time  │ │ - date               │ │ - report_date       │ │- staff_id(FK)│
└──────────────┘ │ - wake_up_time       │ │ - next_wake_up_time │ │- date        │
                 │ - departure_time     │ │ - next_departure    │ │- worksite_id │
                 │ - arrival_time       │ │ - next_arrival      │ └──────┬───────┘
                 │ - status             │ │ - actual_attend... │        │
                 └──────────┬───────────┘ └─────────────────────┘        │
                            │                                            │
                            ▼                                            ▼
                 ┌──────────────────┐                         ┌─────────────┐
                 │  daily_reports   │                         │  worksites  │
                 │   (日報)          │                         │  (現場)      │
                 │ - id (PK)        │                         │ - id (PK)   │
                 │ - staff_id (FK)  │                         │ - name      │
                 │ - date           │                         │ - address   │
                 │ - content        │                         │ - is_active │
                 │ - attend... (FK) │                         └─────────────┘
                 └──────────────────┘
```

---

## 5. インデックス戦略

### 5.1 パフォーマンス最適化

| テーブル | インデックス | 用途 |
|---------|-------------|------|
| `users` | `idx_users_active` ON `active` | アクティブユーザー検索 |
| `users` | `idx_users_role` ON `role` | ロール別検索 |
| `attendance_records` | `idx_attendance_staff_date` ON `staff_id, date` | スタッフ別日付検索 |
| `attendance_records` | `idx_attendance_date` ON `date` | 日付検索 |
| `daily_reports` | `idx_reports_staff_date` ON `staff_id, date` | スタッフ別日付検索 |
| `staff_availability` | `idx_availability_staff_date` ON `staff_id, date` | スケジュール検索 |
| `access_logs` | `idx_access_logs_user_login` ON `user_id, login_time` | ログ履歴検索 |

---

## 6. トリガー

### 6.1 updated_at 自動更新

全テーブルに`updated_at`自動更新トリガーを設定:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 他のテーブルも同様
```

---

## 7. Row Level Security (RLS) ポリシー

### 7.1 users テーブル

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- SELECT: マネージャーは全て、スタッフは自分のみ
CREATE POLICY users_select_policy ON users
FOR SELECT
USING (
    auth.jwt() ->> 'role' = 'manager'
    OR id = (auth.jwt() ->> 'sub')::uuid
);

-- UPDATE: マネージャーは全て、スタッフは自分のみ
CREATE POLICY users_update_policy ON users
FOR UPDATE
USING (
    auth.jwt() ->> 'role' = 'manager'
    OR id = (auth.jwt() ->> 'sub')::uuid
);

-- DELETE: マネージャーのみ
CREATE POLICY users_delete_policy ON users
FOR DELETE
USING (auth.jwt() ->> 'role' = 'manager');
```

### 7.2 attendance_records テーブル

```sql
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- SELECT: マネージャーは全て、スタッフは自分のみ
CREATE POLICY attendance_select_policy ON attendance_records
FOR SELECT
USING (
    auth.jwt() ->> 'role' = 'manager'
    OR staff_id = (auth.jwt() ->> 'sub')::uuid
);

-- INSERT/UPDATE: マネージャーは全て、スタッフは自分のみ
CREATE POLICY attendance_insert_policy ON attendance_records
FOR INSERT
WITH CHECK (
    auth.jwt() ->> 'role' = 'manager'
    OR staff_id = (auth.jwt() ->> 'sub')::uuid
);

CREATE POLICY attendance_update_policy ON attendance_records
FOR UPDATE
USING (
    auth.jwt() ->> 'role' = 'manager'
    OR staff_id = (auth.jwt() ->> 'sub')::uuid
);

-- DELETE: マネージャーのみ
CREATE POLICY attendance_delete_policy ON attendance_records
FOR DELETE
USING (auth.jwt() ->> 'role' = 'manager');
```

---

## 8. データ整合性

### 8.1 外部キー制約

| 参照元テーブル | 参照元カラム | 参照先テーブル | 参照先カラム | 削除時の動作 |
|--------------|------------|--------------|------------|------------|
| `attendance_records` | `staff_id` | `users` | `id` | CASCADE |
| `daily_reports` | `staff_id` | `users` | `id` | CASCADE |
| `daily_reports` | `attendance_record_id` | `attendance_records` | `id` | SET NULL |
| `previous_day_reports` | `user_id` | `users` | `id` | CASCADE |
| `previous_day_reports` | `actual_attendance_record_id` | `attendance_records` | `id` | SET NULL |
| `staff_availability` | `staff_id` | `users` | `id` | CASCADE |
| `staff_availability` | `worksite_id` | `worksites` | `id` | SET NULL |
| `access_logs` | `user_id` | `users` | `id` | CASCADE |

### 8.2 CHECK 制約

```sql
-- users.role
ALTER TABLE users
ADD CONSTRAINT chk_users_role
CHECK (role IN ('staff', 'manager'));

-- attendance_records.status
ALTER TABLE attendance_records
ADD CONSTRAINT chk_attendance_status
CHECK (status IN ('pending', 'partial', 'complete', 'active', 'reset', 'reopened', 'archived'));

-- daily_reports.status
ALTER TABLE daily_reports
ADD CONSTRAINT chk_reports_status
CHECK (status IN ('draft', 'submitted', 'archived', 'superseded'));
```

---

## 9. サンプルデータ（初期データ）

### 9.1 管理者ユーザー

```sql
INSERT INTO users (id, cognito_user_id, email, role, name, active)
VALUES
(gen_random_uuid(), 'admin-cognito-sub-id', 'admin@example.com', 'manager', '管理者', true);
```

### 9.2 現場マスタ

```sql
INSERT INTO worksites (id, name, address, is_active)
VALUES
(gen_random_uuid(), '渋谷現場', '東京都渋谷区渋谷1-1-1', true),
(gen_random_uuid(), '新宿現場', '東京都新宿区新宿2-2-2', true);
```

---

## 10. マイグレーション戦略

### 10.1 Alembic によるバージョン管理

```
alembic/
├── versions/
│   ├── 001_create_users_table.py
│   ├── 002_create_attendance_records.py
│   ├── 003_create_daily_reports.py
│   ├── 004_create_previous_day_reports.py
│   ├── 005_create_staff_availability.py
│   ├── 006_create_worksites.py
│   └── 007_create_access_logs.py
```

### 10.2 マイグレーションコマンド

```bash
# 新しいマイグレーション作成
alembic revision -m "description"

# マイグレーション適用
alembic upgrade head

# ロールバック
alembic downgrade -1
```

---

## 11. バックアップ・リストア

### 11.1 RDS 自動バックアップ

- **頻度**: 毎日
- **保持期間**: 7日間
- **バックアップウィンドウ**: 03:00-04:00 JST（深夜帯）

### 11.2 手動スナップショット

重要な変更前に手動スナップショットを作成:

```bash
aws rds create-db-snapshot \
  --db-instance-identifier okiteru-db \
  --db-snapshot-identifier okiteru-snapshot-YYYYMMDD
```

---

## 12. パフォーマンスチューニング

### 12.1 クエリ最適化

- N+1 問題回避: `SELECT ... JOIN` で事前ロード
- ページネーション: `LIMIT` / `OFFSET`
- 日付範囲検索: インデックススキャン

### 12.2 接続プール設定

```python
# SQLAlchemy エンジン設定
engine = create_engine(
    DATABASE_URL,
    pool_size=5,        # 基本接続数
    max_overflow=10,    # 最大接続数
    pool_recycle=3600,  # 接続リサイクル（1時間）
)
```

---

**作成日**: 2025-12-18
**バージョン**: 1.0
