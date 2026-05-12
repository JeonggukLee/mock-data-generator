# Mock Data Generator (VSCode 拡張)

PostgreSQL の `CREATE TABLE` DDL から、カラム別ルールに基づいたモックデータを生成し、`INSERT` 文として `.sql` ファイルに出力する VSCode 拡張機能。

リポジトリ root の `prompts/generator_dumy_data.md` が要件、`/Users/lee.jeongguk/.claude/plans/prompts-generator-dumy-data-md-staged-blossom.md` が実装計画です。

## 機能

- DDL ファイルや貼付テキストからカラム情報（名前 / 型 / 桁 / NOT NULL / PK / UNIQUE）を解析
- カラム別にルール（連番 / 定型文+連番 / フォーマット指定 / 数値範囲 / 日付範囲 / 値リスト / 既定）を設定
- N 件のモックデータを編集可能スプレッドシートで表示・編集
- マルチ VALUES または 1 行 1 INSERT 形式の SQL ファイルを出力
- フォーマット指定の文字種: `A`=英大 / `a`=英小 / `9`=数字 / `X`=英数 / `H`=ひらがな / `K`=カタカナ / `S`=記号

## 開発

### 必要環境

- Node.js 18 以上（推奨 22+）
- VSCode 1.85 以上

### セットアップ

```bash
cd extension
npm install
```

### 起動（デバッグ）

VSCode で `extension/` フォルダを開いて **F5** を押すと、Extension Development Host が起動します。

新しいウィンドウでコマンドパレット (`Cmd+Shift+P`) から `Mock Data Generator: Open` を実行すると、WebView パネルが開きます。

### ビルド

```bash
npm run build       # 開発ビルド（sourcemap 付き）
npm run build:prod  # 本番ビルド（minify、webview ~150kb）
npm run watch       # ファイル変更を監視して再ビルド
```

### テスト

```bash
npm test            # Vitest 単体・統合テスト
npm run typecheck   # 両 tsconfig での型チェック
```

## アーキテクチャ

```
extension/
├── src/                    # 拡張ホスト側（Node, CJS）
│   ├── extension.ts        # activate() + WebViewPanel + メッセージハンドラ
│   ├── ddl/                # DDL 解析
│   │   ├── parser.ts       # CREATE TABLE → Table オブジェクト
│   │   └── types.ts        # Table / Column / DataSize
│   ├── mock/               # モックデータ生成
│   │   ├── generator.ts    # generate() + Mulberry32 RNG
│   │   └── rules.ts        # 7 種のルール型
│   ├── sql/
│   │   └── insertBuilder.ts # INSERT DML 組立
│   ├── fileIo.ts           # showSaveDialog + workspace.fs
│   └── messaging/
│       └── protocol.ts     # WebView ↔ ホスト メッセージ型
├── webview/                # WebView 側（ブラウザ, ESM, React）
│   ├── index.tsx           # React mount
│   ├── App.tsx             # useReducer ステート + messaging effect
│   ├── api.ts              # acquireVsCodeApi() ラッパ
│   ├── styles.css          # VSCode テーマ変数のみ使用
│   └── components/
│       ├── DdlPicker.tsx
│       ├── ColumnRuleTable.tsx
│       ├── RuleEditor.tsx
│       └── PreviewGrid.tsx
└── test/                   # Vitest テスト
    ├── ddl.test.ts
    ├── generator.test.ts
    ├── insertBuilder.test.ts
    └── smoke.test.ts       # 4 DDL × 3 シナリオの結合テスト
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

## E2E 確認手順

1. F5 で Extension Development Host を起動
2. コマンドパレット → `Mock Data Generator: Open`
3. リポジトリ root の `test/ddl/sample_multi_line.sql` の内容を貼付 → 「DDL を解析」
4. ルールを設定（例: `id` を「定型文+連番」 `prefix=ID_`, `pad=4`）
5. 件数を入力して「モックデータ生成」
6. プレビューグリッドで値を確認・編集
7. 「SQL ファイル出力」 → 保存先を選択
8. 保存した SQL を PostgreSQL に投入し動作確認:
   ```bash
   psql -d <DB> -f account_doc_header.sql
   ```

## 既知の制約

- 表示は先頭 1,000 行まで（10k 行までは内部で保持）
- `uuid` / `json` / `bytea` / `enum` 型は未対応（将来追加予定）
- 大量行（10k+）の編集パフォーマンスは仮想スクロール導入で改善予定

## 開発計画

詳細は `/Users/lee.jeongguk/.claude/plans/prompts-generator-dumy-data-md-staged-blossom.md` 参照。
