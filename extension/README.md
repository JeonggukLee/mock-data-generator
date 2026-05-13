# Mock Data Generator (VSCode 拡張)

PostgreSQL の `CREATE TABLE` DDL から、カラム別ルールに基づいたモックデータを生成し、`INSERT` 文として `.sql` ファイルに出力する VSCode 拡張機能。

## 機能

- DDL ファイルや貼付テキストからカラム情報（名前 / 型 / 桁 / NOT NULL / PK / UNIQUE）を解析
- カラム別にルール（連番 / 定型文+連番 / フォーマット指定 / 数値範囲 / 日付範囲 / 値リスト / 既定）を設定
- N 件のモックデータを編集可能スプレッドシートで表示・編集
- マルチ VALUES または 1 行 1 INSERT 形式の SQL ファイルを出力

### ルール詳細

- **連番**: 開始値・ステップ・ゼロ埋め有無（ON 時に桁数指定）
- **定型文+連番**: 定型文に `{N}` を含めると、その位置に連番が埋め込まれる（例: `USER_{N}_END`）。ゼロ埋め有無を指定可能
- **フォーマット指定**: `{...}` 内のみフォーマット指定として解釈、外側は一般リテラル
  - 文字種: `A`=英大 / `a`=英小 / `9`=数字 / `X`=英数 / `H`=ひらがな / `K`=カタカナ / `S`=記号
  - 例: `{AAA}-{9999}` → `ABC-1234`、`PRE{A}-{99}` → `PREB-42`、`A-{9}` → `A-3`（先頭 `A` はリテラル）
- **数値範囲**: 生成モード（ランダム / シーケンス増 / シーケンス減）を選択。シーケンス時はステップ幅を指定し、`[min, max]` を超えると循環する
- **日付範囲**: モード + ステップ + 単位（日 / 月 / 年）。月単位での日末は次月最終日に clamp（例: `2026-01-31` + 1ヶ月 → `2026-02-28`）
- **時刻範囲**: `HH:MM:SS` の min/max。モード + ステップ + 単位（秒 / 分 / 時）
- **タイムスタンプ範囲**: `YYYY-MM-DDTHH:MM:SS` の min/max。モード + ステップ + 単位（秒 / 分 / 時 / 日）。生成値は `YYYY-MM-DD HH:MM:SS`
- **値リスト**: カンマ区切り。値内のコンマは `\,`、リテラル `\` は `\\` でエスケープ

## インストール

### A. `.vsix` ファイルからインストール（推奨）

1. リリース成果物（または社内配布された）`mock-data-generator-extension-<version>.vsix` を入手
2. 以下のいずれかの方法でインストール:

**VSCodeからPATHにコマンドを追加:** (未インストールの場合のみ実施)
  1. VSCodeを起動
  2. Windows: **`Ctrl+Shift+P`** または **`F1`** , MacOS: **`Cmd+Shift+P`**
  3. **`shell command`** と入力
  4. **`Shell Command: Install 'code' command in PATH`** を選択して実行

**コマンドラインから:**
  ```bash
  code --install-extension mock-data-generator-extension-<version>.vsix
  ```

**VSCode UI から:**
  - Extensions パネル（Windows: `Ctrl+Shift+X` , MacOS: `Cmd+Shift+X`）を開く
  - 右上の `...` メニュー → `Install from VSIX...`
  - 受け取った `.vsix` ファイルを選択

1. インストール後、VSCode を再読み込み（`Developer: Reload Window`）

### B. ソースからビルドしてインストール

```bash
git clone https://github.com/JeonggukLee/mock-data-generator.git
cd mock-data-generator/extension
npm install
npm run package        # → dist/mock-data-generator-extension-<version>.vsix を生成
code --install-extension dist/mock-data-generator-extension-*.vsix
```

## .vsix の作成（配布用）

社内・チーム向けに `.vsix` を生成して配布する手順:

```bash
git clone https://github.com/JeonggukLee/mock-data-generator.git
cd mock-data-generator/extension
npm install
npm run package
```

`npm run package` は内部で `npm run build:prod`（minify ビルド）→ `vsce package --no-dependencies` を実行し、以下のファイルを生成します:

```
extension/dist/mock-data-generator-extension-<version>.vsix
```

バージョンは `extension/package.json` の `version` フィールドに依存します。配布時はこのバージョンを更新してから再実行してください。

生成された `.vsix` を「A. `.vsix` ファイルからインストール」の手順で受け取り側に導入できます。

## 使い方

1. コマンドパレット（Windows: `Ctrl+Shift+P` , MacOS: `Cmd+Shift+P`）から **`Mock Data Generator: Open`** を実行 → WebView パネルが開く
2. **DDL を貼付** または **ファイルを選択** → 「DDL を解析」をクリック
3. **カラム別ルール設定**でカラムごとに生成ルールを選択・調整
4. **件数**を入力して「モックデータ生成」
5. プレビュー表で値を確認・必要に応じて編集（セルクリックで編集、行末ボタンで削除、末尾ボタンで行追加）
6. **「SQL ファイル出力」** → マルチ VALUES / 1 行 1 INSERT を選んで保存先を指定

### 動作確認例

```bash
# 出力した SQL を PostgreSQL に投入
psql -d <DB> -f <table_name>.sql
```

## 開発

### 必要環境

- Node.js 18 以上（推奨 22+）
- VSCode 1.85 以上

### セットアップ

```bash
cd extension
npm install
```

### F5 デバッグ

VSCode で `extension/` フォルダを開いて **F5** → Extension Development Host が起動。新ウィンドウでコマンドパレットから `Mock Data Generator: Open` を実行。

### スクリプト

```bash
npm run build       # 開発ビルド（sourcemap 付き）
npm run build:prod  # 本番ビルド（minify、webview ~150kb）
npm run watch       # ファイル変更を監視して再ビルド
npm run package     # build:prod + vsce で .vsix を生成
npm test            # Vitest 単体・統合テスト
npm run typecheck   # 両 tsconfig での型チェック
```

## アーキテクチャ

```
extension/
├── src/                    # 拡張ホスト側（Node, CJS）
│   ├── extension.ts        # activate() + WebViewPanel + メッセージハンドラ
│   ├── ddl/                # DDL 解析
│   ├── mock/               # モックデータ生成（generator / rules / valueList）
│   ├── sql/insertBuilder.ts # INSERT DML 組立
│   ├── fileIo.ts           # showSaveDialog + workspace.fs
│   └── messaging/protocol.ts # WebView ↔ ホスト メッセージ型
├── webview/                # WebView 側（ブラウザ, ESM, React）
│   ├── index.tsx / App.tsx
│   ├── api.ts              # acquireVsCodeApi() ラッパ
│   ├── styles.css          # VSCode テーマ変数のみ使用
│   └── components/         # DdlPicker / ColumnRuleTable / RuleEditor / PreviewGrid
└── test/                   # Vitest テスト
```

### メッセージプロトコル

```
WebView                          Extension Host
  │   { type: 'ready' }           │
  ├──────────────────────────────►│
  │   { type: 'ddl-parse', ddl }  │
  ├──────────────────────────────►│ parse(ddl)
  │   { type: 'ddl-parsed', table }
  │◄──────────────────────────────┤
  │   { type: 'generate', ... }   │
  ├──────────────────────────────►│ generate(...)
  │   { type: 'generated', rows } │
  │◄──────────────────────────────┤
  │   { type: 'export', ... }     │
  ├──────────────────────────────►│ buildInsertSql + saveSqlFile
  │   { type: 'exported', path }  │
  │◄──────────────────────────────┤
```

### CSP

WebView は VSCode の Content Security Policy 下で動作します：

- `script-src 'nonce-...'` のみ（インラインスクリプト不可）
- `style-src` は VSCode テーマ + インラインを許可
- すべて esbuild でバンドルし `dist/` から配信

## 既知の制約

- 表示は先頭 1,000 行まで（10k 行までは内部で保持）
- `uuid` / `json` / `bytea` / `enum` 型は未対応
- 大量行（10k+）の編集パフォーマンスは仮想スクロール導入で改善予定

## ライセンス

MIT
