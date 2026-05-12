import * as vscode from 'vscode';

export async function saveSqlFile(
  content: string,
  defaultFileName: string,
): Promise<vscode.Uri | undefined> {
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
  const defaultUri = folder
    ? vscode.Uri.joinPath(folder, defaultFileName)
    : vscode.Uri.file(defaultFileName);

  const uri = await vscode.window.showSaveDialog({
    defaultUri,
    filters: { SQL: ['sql'] },
    saveLabel: 'モックデータ SQL を保存',
  });
  if (!uri) return undefined;

  await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
  return uri;
}
