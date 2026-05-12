# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace layout

All implementation lives under `extension/`. The repo root holds only `README.md`, requirements (`prompts/`), and shared DDL fixtures (`test/ddl/`) that the extension's smoke tests load via a relative path (`../test/ddl` from `extension/test/`).

All commands below are run from `extension/`.

## Commands

```bash
npm install
npm run build          # dev bundle (sourcemap)
npm run build:prod     # minified
npm run watch          # esbuild --watch on all three bundles
npm test               # vitest run
npm run test:watch
npm run typecheck      # tsc -p tsconfig.json && tsc -p tsconfig.webview.json

# single test
npx vitest run test/generator.test.ts
npx vitest run -t 'Issue #3'   # filter by test name
```

VSCode `F5` runs the `Run Extension` launch config which has `npm: build` as `preLaunchTask`, so a manual build isn't needed before debugging.

## Architecture

The extension is built as **two separate bundles** that communicate via `postMessage`:

- `dist/extension.cjs` — Node/CJS, runs in the VSCode extension host. Entry: `src/extension.ts`. Owns DDL parsing, generation, INSERT building, and file IO. Has access to `vscode` and `node:fs`.
- `dist/webview.js` + `dist/webview.css` — IIFE/browser, runs inside a `WebviewPanel`. Entry: `webview/index.tsx`. Owns UI state via React + `useReducer`. No Node APIs.

The bundle boundary is enforced by **two tsconfigs**: `tsconfig.json` (host: Node/vscode types, includes `src/**` + tests) and `tsconfig.webview.json` (browser/DOM/JSX, includes `webview/**` plus a narrow allow-list of `src/` modules that are safe to share: `src/messaging/**`, `src/mock/rules.ts`, `src/mock/valueList.ts`, `src/ddl/types.ts`). **Anything imported by webview code must be listed in `tsconfig.webview.json`** or the webview typecheck breaks.

Messages between the two sides are typed in `src/messaging/protocol.ts` (`WebviewToHostMessage` / `HostToWebviewMessage`). Add new operations there first, then implement both sides.

### Data pipeline

```
DDL text
  → src/ddl/parser.ts        → Table { name, columns: Column[] }
  → user picks per-column Rule in webview (src/mock/rules.ts shapes)
  → src/mock/generator.ts    → RawValue[][]
  → src/sql/insertBuilder.ts → INSERT SQL string
  → src/fileIo.ts            → saved .sql
```

The generator dispatches per-`Rule.kind`. All randomness flows through the `Rng` interface (`Mulberry32` impl is seeded), so tests pass `new Mulberry32(seed)` to get deterministic output — preserve this when adding rules. The row index (`rowIdx`) is also threaded into rule handlers, which is what enables sequence/increment/decrement modes for number/date ranges.

### Rule semantics (non-obvious)

- **`format` pattern**: characters inside `{...}` are format placeholders (`A` a `9` `X` `H` `K` `S`); characters outside are literal. `{A}9` → random uppercase + literal `9`. An unclosed `{` is treated as a group running to end of string. See `renderFormat` in `src/mock/generator.ts`.
- **`template_sequence.template`**: the literal substring `{N}` is the sequence placeholder; all other characters are literal. `{N}` can appear multiple times or zero times.
- **`sequence` / `template_sequence`**: zero-padding is gated by `zeroPad: boolean`; `padWidth` is ignored when `zeroPad` is false. Values longer than `padWidth` are not truncated.
- **`number_range` / `date_range`**: `mode: 'random' | 'increment' | 'decrement'`. Sequence modes use `step` (date uses days) and **wrap** within `[min, max]` via `rowIdx % slots`.
- **`value_list` input parsing** (`src/mock/valueList.ts`): comma-separated with backslash escapes — `\,` → literal `,`, `\\` → literal `\`. Parser/serializer must round-trip; the editor uses both.

### Tests

`test/smoke.test.ts` is parameterized over DDL fixtures in **`<repo-root>/test/ddl/*.sql`** (note: outside `extension/`). When adding fixtures, drop them there.

Each per-rule issue has a labeled `describe('Issue #N reproduction: …')` block in `test/generator.test.ts`. Follow this pattern: write a reproduction test for any reported bug before fixing.

## CSP

The webview HTML in `src/extension.ts` sets `script-src 'nonce-...'` only — no inline scripts. All JS must come from the bundled `dist/webview.js`.
