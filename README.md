# Mock Data Generator

PostgreSQL の `CREATE TABLE` DDL から、カラム別ルールに基づくモックデータ（INSERT DML）を生成する VSCode 拡張機能。

旧 Go + Fyne 版を VSCode 拡張に移行しました。実装は [`extension/`](./extension/) 配下にあります。

## 概要

- DDL ファイルを取り込んでカラム情報（型 / 桁 / NOT NULL / PK / UNIQUE）を自動解析
- カラム別にルール（連番 / 定型文+連番 / フォーマット指定 / 数値範囲 / 日付範囲 / 値リスト）を設定
- 指定件数分のモックデータを編集可能スプレッドシートで確認・編集
- マルチ VALUES 形式または 1 行 1 INSERT 形式の `.sql` ファイルとして出力

## インストール

### A. `.vsix` ファイルから（推奨）

```bash
code --install-extension mock-data-generator-extension-<version>.vsix
```

または VSCode の Extensions パネル → `...` メニュー → `Install from VSIX...` から選択。

### B. ソースからビルドして `.vsix` を作成

```bash
git clone https://github.com/JeonggukLee/mock-data-generator.git
cd mock-data-generator/extension
npm install
npm run package
# → extension/dist/mock-data-generator-extension-<version>.vsix
code --install-extension dist/mock-data-generator-extension-*.vsix
```

## 使い方

1. コマンドパレット（`Cmd+Shift+P`）→ **`Mock Data Generator: Open`**
2. DDL を貼付または読込 → 「DDL を解析」
3. カラム別ルールを設定 → 件数を入力 → 「モックデータ生成」
4. プレビューで編集 → 「SQL ファイル出力」

詳細は [`extension/README.md`](./extension/README.md) を参照。

## ディレクトリ

```
mock-data-generator/
├── extension/          # VSCode 拡張本体（TypeScript / React）
├── prompts/            # 要件定義
└── test/ddl/           # DDL サンプル（拡張のテスト・E2E で使用）
```

## ライセンス

MIT
