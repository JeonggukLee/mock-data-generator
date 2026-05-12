import type { Table } from '../ddl/types.js';
import type { RawValue } from '../mock/generator.js';
import type { Rule } from '../mock/rules.js';

export type WebviewToHostMessage =
  | { type: 'ready' }
  | { type: 'ddl-parse'; ddl: string }
  | {
      type: 'generate';
      table: Table;
      rules: Record<string, Rule>;
      rowCount: number;
      seed?: number;
    }
  | {
      type: 'export';
      table: Table;
      rows: RawValue[][];
      multiValues: boolean;
    };

export type HostToWebviewMessage =
  | { type: 'ddl-parsed'; table: Table }
  | { type: 'generated'; rows: RawValue[][] }
  | { type: 'exported'; path: string }
  | { type: 'error'; message: string };
