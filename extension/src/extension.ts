import * as vscode from 'vscode';
import { DdlParseError, parse } from './ddl/parser.js';
import { saveSqlFile } from './fileIo.js';
import { Mulberry32, generate } from './mock/generator.js';
import type {
  HostToWebviewMessage,
  WebviewToHostMessage,
} from './messaging/protocol.js';
import { buildInsertSql } from './sql/insertBuilder.js';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('mockGen.open', () => {
      const panel = vscode.window.createWebviewPanel(
        'mockDataGenerator',
        'Mock Data Generator',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')],
        },
      );

      panel.webview.html = renderHtml(panel.webview, context.extensionUri);

      panel.webview.onDidReceiveMessage((msg: WebviewToHostMessage) => {
        handleMessage(panel, msg);
      });
    }),
  );
}

export function deactivate(): void {
  // no-op
}

function handleMessage(panel: vscode.WebviewPanel, msg: WebviewToHostMessage): void {
  switch (msg.type) {
    case 'ddl-parse':
      try {
        const table = parse(msg.ddl);
        post(panel, { type: 'ddl-parsed', table });
      } catch (err) {
        const message =
          err instanceof DdlParseError ? err.message : `Parse failed: ${String(err)}`;
        post(panel, { type: 'error', message });
      }
      return;
    case 'generate':
      try {
        const rng = new Mulberry32(msg.seed ?? (Date.now() & 0xffffffff));
        const rows = generate(msg.table.columns, msg.rowCount, {
          rules: msg.rules,
          rng,
        });
        post(panel, { type: 'generated', rows });
      } catch (err) {
        post(panel, { type: 'error', message: `Generate failed: ${String(err)}` });
      }
      return;
    case 'export': {
      const sql = buildInsertSql(msg.table, msg.rows, { multiValues: msg.multiValues });
      void saveSqlFile(sql, `${msg.table.name}.sql`).then(
        (uri) => {
          if (!uri) return;
          post(panel, { type: 'exported', path: uri.fsPath });
          void vscode.window.showInformationMessage(`SQL を保存しました: ${uri.fsPath}`);
        },
        (err: unknown) => {
          post(panel, { type: 'error', message: `Export failed: ${String(err)}` });
        },
      );
      return;
    }
    case 'ready':
      return;
  }
}

function post(panel: vscode.WebviewPanel, msg: HostToWebviewMessage): void {
  panel.webview.postMessage(msg);
}

function renderHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js'),
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview.css'),
  );
  const nonce = generateNonce();
  const csp = [
    `default-src 'none'`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`,
    `img-src ${webview.cspSource} data:`,
    `font-src ${webview.cspSource}`,
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link href="${styleUri}" rel="stylesheet" />
<title>Mock Data Generator</title>
</head>
<body>
<div id="root"></div>
<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function generateNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 32; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
