import type {
  HostToWebviewMessage,
  WebviewToHostMessage,
} from '../src/messaging/protocol.js';

interface VsCodeApi {
  postMessage(msg: WebviewToHostMessage): void;
  getState<T>(): T | undefined;
  setState<T>(state: T): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();

export function post(msg: WebviewToHostMessage): void {
  vscode.postMessage(msg);
}

export function onHostMessage(
  handler: (msg: HostToWebviewMessage) => void,
): () => void {
  const listener = (event: MessageEvent<HostToWebviewMessage>) => {
    handler(event.data);
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
