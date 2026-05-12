# Mock Data Generator

PostgreSQL の `CREATE TABLE` DDL から、カラム別ルールに基づくモックデータ（INSERT DML）を生成する VSCode 拡張機能。

旧 Go + Fyne 版を VSCode 拡張に移行しました。実装は [`extension/`](./extension/) 配下にあります。

## 概要

- DDL ファイルを取り込んでカラム情報（型 / 桁 / NOT NULL / PK / UNIQUE）を自動解析
- カラム別にルール（連番 / 定型文+連番 / フォーマット指定 / 数値範囲 / 日付範囲 / 値リスト）を設定
- 指定件数分のモックデータを編集可能スプレッドシートで確認・編集
- マルチ VALUES 形式または 1 行 1 INSERT 形式の `.sql` ファイルとして出力

## 使い方

詳細は [`extension/README.md`](./extension/README.md) を参照してください。

```bash
cd extension
npm install
npm run build:prod
```

VSCode で `extension/` を開いて **F5** → Extension Development Host が起動 → コマンドパレットから `Mock Data Generator: Open` を実行。

## ディレクトリ

```
mock-data-generator/
├── extension/          # VSCode 拡張本体（TypeScript / React）
├── prompts/            # 要件定義
└── test/ddl/           # DDL サンプル（拡張のテスト・E2E でも使用）
```
