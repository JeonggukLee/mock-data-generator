# Mock Data Generator (VSCode 拡張)

PostgreSQL の `CREATE TABLE` DDL から、カラム別ルールに基づくモックデータを生成し、`INSERT` 文として `.sql` ファイルに出力する VSCode 拡張機能。

---

## 目次

- [概要](#概要)
- [インストール](#インストール)
- [使い方](#使い方)
- [ルール一覧](#ルール一覧)
- [配布用 `.vsix` の作成](#配布用-vsix-の作成)
- [開発](#開発)
- [アーキテクチャ](#アーキテクチャ)
- [既知の制約](#既知の制約)
- [ライセンス](#ライセンス)

---

## 概要

| 項目 | 内容 |
| --- | --- |
| 入力 | `CREATE TABLE` DDL（テキスト貼付または `.sql` ファイル） |
| 出力 | INSERT DML（`.sql` ファイル） |
| 対応 DB | PostgreSQL |
| 行数上限 | 内部 10,000 / 表示 1,000（先頭） |
| 起動コマンド | `Mock Data Generator: Open` |

### 主な機能

- **DDL 解析** — カラム名 / 型 / 桁 / `NOT NULL` / `PRIMARY KEY` / `UNIQUE` を抽出
- **カラム別ルール** — 12 種のルールから選んで列ごとに生成方法を制御
- **スプレッドシート編集** — 生成結果を表で確認・手修正
- **2 つの SQL 形式** — マルチ VALUES（高速 INSERT）／ 1 行 1 INSERT

---

## インストール

### A. `.vsix` ファイルからインストール（推奨）

1. リリース成果物（または社内配布された）`mock-data-generator-extension-<version>.vsix` を入手
2. 以下のいずれかの方法でインストール

**コマンドラインから:**

```bash
code --install-extension mock-data-generator-extension-<version>.vsix
```

`code` コマンド未インストールの場合（VSCode から PATH に追加）:

1. VSCode 起動
2. コマンドパレット（Windows: `Ctrl+Shift+P` / macOS: `Cmd+Shift+P`）
3. `shell command` と入力
4. `Shell Command: Install 'code' command in PATH` を実行

**VSCode UI から:**

- Extensions パネル（Windows: `Ctrl+Shift+X` / macOS: `Cmd+Shift+X`）を開く
- 右上の `…` メニュー → `Install from VSIX...`
- 受け取った `.vsix` ファイルを選択

インストール後、VSCode を再読み込み（`Developer: Reload Window`）。

### B. ソースからビルドしてインストール

```bash
git clone https://github.com/JeonggukLee/mock-data-generator.git
cd mock-data-generator/extension
npm install
npm run package        # → dist/mock-data-generator-extension-<version>.vsix
code --install-extension dist/mock-data-generator-extension-*.vsix
```

---

## 使い方

1. コマンドパレット（`Ctrl+Shift+P` / `Cmd+Shift+P`）から **`Mock Data Generator: Open`** を実行 → WebView パネルが開く
2. **DDL を貼付** → 「DDL を解析」をクリック
3. **カラム別ルール設定**で列ごとに生成ルールを選択・調整
4. **件数**を入力（最大 10,000） → 「モックデータ生成」
5. プレビュー表で値を確認・必要に応じて編集
   - セルクリックで編集 / 行末ボタンで行削除 / 上部ボタンで行追加
6. **「SQL ファイル出力」** → マルチ VALUES / 1 行 1 INSERT を選んで保存先を指定

### 出力した SQL の投入例

```bash
psql -d <DB> -f <table_name>.sql
```

---

## ルール一覧

| ルール | 用途・指定項目 |
| --- | --- |
| **既定** | 型に応じた自動生成（fallback） |
| **連番** | 開始値 / ステップ / ゼロ埋め有無（ON 時に桁数指定） |
| **定型文+連番** | 定型文に `{N}` を含めるとその位置に連番を埋め込む（例: `USER_{N}_END`）。ゼロ埋め可 |
| **フォーマット指定** | `{...}` 内をフォーマット指定として解釈、外側はリテラル |
| **数値範囲** | min / max / 小数桁 / 生成モード（ランダム・シーケンス増/減）/ ステップ |
| **日付範囲** | min / max / モード / ステップ / 単位（日・月・年）<br>※月単位の日末は次月最終日に clamp（`2026-01-31` + 1ヶ月 → `2026-02-28`） |
| **時刻範囲** | `HH:MM:SS` の min / max / モード / ステップ / 単位（秒・分・時） |
| **タイムスタンプ範囲** | `YYYY-MM-DDTHH:MM:SS` の min / max / モード / ステップ / 単位（秒・分・時・日）。出力は `YYYY-MM-DD HH:MM:SS` |
| **値リスト** | カンマ区切り。`\,` で値内コンマ、`\\` でリテラル `\` をエスケープ |
| **生成しない (NULL)** | 常に NULL を出力（INSERT には列を含む）。NOT NULL カラムでは警告 |
| **固定文** | 全行同じ固定文字列を出力（SQL では文字列リテラル） |
| **別カラム値参照** | 同一行の別カラム値を流用。`同値` / `より大きい` / `より小さい` を選択。大きい/小さい時は `オフセット最小`〜`オフセット最大` で範囲を指定（参照先型に応じた単位: 数値 / 日 / 月 / 年 / 秒 / 分 / 時）。参照先カラムは本カラムより前に定義されている必要がある |

### フォーマット指定の文字種

| 文字 | 生成内容 | 例 |
| --- | --- | --- |
| `A` | 英大文字 | `{AAA}` → `XYZ` |
| `a` | 英小文字 | `{aaa}` → `xyz` |
| `9` | 数字 | `{9999}` → `1234` |
| `X` | 英数字 | `{XXX}` → `a3Z` |
| `H` | ひらがな | `{HH}` → `あい` |
| `K` | カタカナ | `{KK}` → `アイ` |
| `S` | 記号 (`!#$%&*+-=?@`) | `{S}` → `#` |
| `J` | 常用漢字 | `{JJ}` → `日本` |

**例:**

- `{AAA}-{9999}` → `ABC-1234`
- `PRE{A}-{99}` → `PREB-42`
- `A-{9}` → `A-3`（先頭 `A` はリテラル）

### サポート型

`char` / `varchar` / `text` / `smallint` / `integer` / `bigint` / `serial` / `real` / `double precision` / `numeric` / `decimal` / `boolean` / `date` / `time` / `timestamp`（`with/without time zone` 含む）。

---

## 配布用 `.vsix` の作成

社内・チーム向けに `.vsix` を生成して配布する手順:

```bash
cd extension
npm install
npm run package
```

`npm run package` は内部で次を実行します:

1. `npm run build:prod`（minify ビルド）
2. `vsce package --no-dependencies` で `.vsix` 生成

出力先:

```
extension/dist/mock-data-generator-extension-<version>.vsix
```

バージョンは `extension/package.json` の `version` フィールドに依存します。配布時はこのバージョンを更新してから再実行してください。
生成された `.vsix` は「[A. `.vsix` ファイルからインストール](#a-vsix-ファイルからインストール推奨)」の手順で受け取り側に導入できます。

---

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

VSCode で `extension/` フォルダを開いて **F5** → Extension Development Host が起動。新ウィンドウのコマンドパレットから `Mock Data Generator: Open` を実行。

`.vscode/launch.json` の `preLaunchTask` で `npm: build` が走るため、手動 build は不要です。

### npm scripts

| コマンド | 内容 |
| --- | --- |
| `npm run build` | 開発ビルド（sourcemap 付き） |
| `npm run build:prod` | 本番ビルド（minify、webview ~150kb） |
| `npm run watch` | ファイル変更を監視して再ビルド |
| `npm run package` | `build:prod` + `vsce` で `.vsix` を生成 |
| `npm test` | Vitest による単体・統合テスト |
| `npm run test:watch` | Vitest watch モード |
| `npm run typecheck` | host / webview 両 `tsconfig` で型チェック |

### 単一テストの実行

```bash
npx vitest run test/generator.test.ts
npx vitest run -t 'Issue #3'   # テスト名でフィルタ
```

---

## アーキテクチャ

### ディレクトリ構成

```
extension/
├── src/                        # 拡張ホスト側（Node, CJS）
│   ├── extension.ts            # activate() + WebViewPanel + メッセージハンドラ
│   ├── ddl/                    # DDL 解析
│   ├── mock/                   # モックデータ生成（generator / rules / valueList）
│   ├── sql/insertBuilder.ts    # INSERT DML 組立
│   ├── fileIo.ts               # showSaveDialog + workspace.fs
│   └── messaging/protocol.ts   # WebView ↔ ホスト メッセージ型
├── webview/                    # WebView 側（ブラウザ, IIFE, React）
│   ├── index.tsx / App.tsx
│   ├── api.ts                  # acquireVsCodeApi() ラッパ
│   ├── styles.css              # VSCode テーマ変数のみ使用
│   └── components/             # DdlPicker / ColumnRuleTable / RuleEditor / PreviewGrid
└── test/                       # Vitest テスト
```

### 二バンドル構成

WebView と Extension Host は別プロセスで動作し、`postMessage` で通信します。

| バンドル | 出力 | 環境 | 役割 |
| --- | --- | --- | --- |
| Extension Host | `dist/extension.cjs` | Node / CJS | DDL parse, generate, SQL 組立, ファイル IO |
| WebView | `dist/webview.js` + `.css` | Browser / IIFE | React UI（`useReducer` で状態管理） |

バンドル境界は **2 つの tsconfig** で物理的に分離されています:

- `tsconfig.json` — host（Node + `vscode` 型）
- `tsconfig.webview.json` — webview（DOM / JSX）

webview から共有可能な `src/` モジュールは `tsconfig.webview.json` の include で明示します（`src/messaging/**`, `src/mock/rules.ts`, `src/mock/valueList.ts`, `src/ddl/types.ts`）。

### メッセージプロトコル

```
WebView                          Extension Host
  │   { type: 'ready' }           │
  ├──────────────────────────────►│
  │   { type: 'ddl-parse', ddl }  │
  ├──────────────────────────────►│ parse(ddl)
  │   { type: 'ddl-parsed', table }
  │◄──────────────────────────────┤
  │   { type: 'generate', table, rules, rowCount, seed? }
  ├──────────────────────────────►│ Mulberry32(seed) + generate(...)
  │   { type: 'generated', rows } │
  │◄──────────────────────────────┤
  │   { type: 'export', table, rows, multiValues }
  ├──────────────────────────────►│ buildInsertSql + saveSqlFile
  │   { type: 'exported', path }  │
  │◄──────────────────────────────┤
  │   { type: 'error', message }  │（共通エラー）
  │◄──────────────────────────────┤
```

新規操作を追加するときは、**まず `src/messaging/protocol.ts` に型を足す → 両端で実装** の順。

### データパイプライン

```
DDL text
  ─► src/ddl/parser.ts        → Table { name, columns[] }
  ─► (UI) ColumnRuleTable      → Record<colName, Rule>
  ─► src/mock/generator.ts    → RawValue[][]
  ─► src/sql/insertBuilder.ts → "INSERT INTO ..."
  ─► src/fileIo.ts            → saved .sql
```

### 決定論的 RNG

すべての乱数は `Rng` インターフェース経由で取得します。`Mulberry32` 実装は seed 可能で、同 seed なら再現可能な出力になります。テストは `new Mulberry32(seed)` で deterministic にしています。

### CSP

WebView は VSCode の Content Security Policy 下で動作します:

```
default-src 'none';
style-src ${webview.cspSource} 'unsafe-inline';
script-src 'nonce-${nonce}';
img-src ${webview.cspSource} data:;
font-src ${webview.cspSource};
```

インラインスクリプト不可（必ず `dist/webview.js` 経由）。nonce はパネル生成ごとに 32 文字ランダム。

---

## 既知の制約

- 表示は先頭 1,000 行まで（内部保持は 10,000 行）
- `uuid` / `json` / `bytea` / `enum` 型は未対応
- 大量行（10k+）の編集パフォーマンスは仮想スクロール導入で改善予定

---

## ライセンス

MIT
