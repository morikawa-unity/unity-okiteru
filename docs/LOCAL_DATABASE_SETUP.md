# ローカルデータベース環境構築ガイド

このドキュメントでは、`okiteru` プロジェクトのローカル開発環境で PostgreSQL データベースをセットアップし、マイグレーションを実行する手順について説明します。

---

## 📋 目次

- [前提条件](#前提条件)
- [構築手順](#構築手順)
  - [ステップ1: PostgreSQLコンテナの起動](#ステップ1-postgresqlコンテナの起動)
  - [ステップ2: Python環境のセットアップ](#ステップ2-python環境のセットアップ)
  - [ステップ3: データベースマイグレーションの実行](#ステップ3-データベースマイグレーションの実行)
  - [ステップ4: 初期データの投入（任意）](#ステップ4-初期データの投入任意)
- [マイグレーションの履歴](#マイグレーションの履歴)
- [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

- [Docker](https://www.docker.com/products/docker-desktop/) がインストールされていること。
- [Python 3.11](https://www.python.org/downloads/) 以上がインストールされていること。
- プロジェクトのソースコードがクローンされていること。

---

## 構築手順

すべてのコマンドは、プロジェクトの `backend` ディレクトリ (`unity-okiteru/backend`) から実行することを想定しています。

### ステップ1: PostgreSQLコンテナの起動

`docker-compose.yml` を使用して、PostgreSQL データベースをコンテナとして起動します。

```bash
docker-compose up -d postgres
```

このコマンドにより、`okiteru-postgres` という名前のコンテナがバックグラウンドで起動します。データベースサーバーは `localhost:5432` で利用可能になります。

### ステップ2: Python環境のセットアップ

バックエンドアプリケーション用の仮想環境を作成し、必要なライブラリをインストールします。

```bash
# 仮想環境を作成
python3 -m venv venv

# 開発用の依存ライブラリをインストール
./venv/bin/pip install -r requirements-dev.txt
```

**注意**: `.env.example` をコピーして `.env` ファイルを作成し、`DATABASE_URL` がローカルのDockerコンテナ（`postgresql://user:password@localhost:5432/okiteru`）を指していることを確認してください。

### ステップ3: データベースマイグレーションの実行

`Alembic` を使用して、データベーススキーマを最新の状態に更新します。`Alembic` は、`alembic/versions` ディレクトリにあるマイグレーションスクリプトを順番に適用します。

```bash
# 仮想環境のAlembicを使ってマイグレーションを実行
./venv/bin/alembic upgrade head
```

`head` は、利用可能なすべてのマイグレーションを適用し、データベースを最新バージョンにすることを意味します。

### ステップ4: 初期データの投入（任意）

開発やテストに便利な初期データを投入することができます。

```bash
# 仮想環境のPythonを使ってシードスクリプトを実行
./venv/bin/python scripts/seed_data.py
```

これにより、テスト用のユーザーなどがデータベースに登録されます。

---

## マイグレーションの履歴

今までに適用されたマイグレーションの履歴は、`alembic` コマンドで確認できます。

```bash
# 適用済みのマイグレーションと最新のマイグレーションを表示
./venv/bin/alembic history --verbose

# 現在のデータベースのバージョンを表示
./venv/bin/alembic current
```

---

## トラブルシューティング

### データベース接続エラー

`alembic` やアプリケーションがデータベースに接続できない場合、以下の点を確認してください。
- Dockerコンテナ `okiteru-postgres` が正常に起動しているか (`docker ps` コマンドで確認）。
- `.env` ファイルの `DATABASE_URL` の設定が正しいか。

### マイグレーションエラー

マイグレーションが失敗した場合は、以下のコマンドで1つ前のバージョンに戻すことができます。

```bash
./venv/bin/alembic downgrade -1
```

エラーメッセージを確認し、問題を修正してから再度 `alembic upgrade head` を試してください。
