import { useCallback, useEffect, useReducer } from 'react';
import type { Table } from '../src/ddl/types.js';
import type { RawValue } from '../src/mock/generator.js';
import type { Rule } from '../src/mock/rules.js';
import { onHostMessage, post } from './api.js';
import { ColumnRuleTable } from './components/ColumnRuleTable.js';
import { DdlPicker } from './components/DdlPicker.js';
import { PreviewGrid } from './components/PreviewGrid.js';

type AppState = {
  ddlText: string;
  table: Table | null;
  rules: Record<string, Rule>;
  rowCount: number;
  rows: RawValue[][] | null;
  multiValues: boolean;
  lastExportPath: string | null;
  error: string | null;
  parsing: boolean;
  generating: boolean;
};

type Action =
  | { type: 'set-ddl'; ddl: string }
  | { type: 'parse-start' }
  | { type: 'parse-success'; table: Table }
  | { type: 'parse-error'; message: string }
  | { type: 'set-rule'; columnName: string; rule: Rule }
  | { type: 'set-row-count'; count: number }
  | { type: 'generate-start' }
  | { type: 'generate-success'; rows: RawValue[][] }
  | { type: 'update-cell'; row: number; col: number; value: RawValue }
  | { type: 'add-row' }
  | { type: 'delete-row'; row: number }
  | { type: 'set-multi-values'; on: boolean }
  | { type: 'exported'; path: string };

const initialState: AppState = {
  ddlText: '',
  table: null,
  rules: {},
  rowCount: 10,
  rows: null,
  multiValues: true,
  lastExportPath: null,
  error: null,
  parsing: false,
  generating: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'set-ddl':
      return { ...state, ddlText: action.ddl };
    case 'parse-start':
      return { ...state, parsing: true, error: null, rows: null };
    case 'parse-success': {
      const rules: Record<string, Rule> = {};
      for (const col of action.table.columns) {
        rules[col.name] = { kind: 'default' };
      }
      return {
        ...state,
        table: action.table,
        rules,
        parsing: false,
        error: null,
        rows: null,
      };
    }
    case 'parse-error':
      return { ...state, parsing: false, generating: false, error: action.message };
    case 'set-rule':
      return {
        ...state,
        rules: { ...state.rules, [action.columnName]: action.rule },
      };
    case 'set-row-count':
      return { ...state, rowCount: action.count };
    case 'generate-start':
      return { ...state, generating: true, error: null };
    case 'generate-success':
      return { ...state, generating: false, rows: action.rows };
    case 'update-cell': {
      if (!state.rows) return state;
      const next = state.rows.map((r) => r.slice());
      const row = next[action.row];
      if (row) row[action.col] = action.value;
      return { ...state, rows: next };
    }
    case 'add-row': {
      if (!state.rows || !state.table) return state;
      const empty: RawValue[] = state.table.columns.map((c) =>
        c.notNull ? defaultEmptyValue(c.dataType) : null,
      );
      return { ...state, rows: [...state.rows, empty] };
    }
    case 'delete-row': {
      if (!state.rows) return state;
      return {
        ...state,
        rows: state.rows.filter((_, i) => i !== action.row),
      };
    }
    case 'set-multi-values':
      return { ...state, multiValues: action.on };
    case 'exported':
      return { ...state, lastExportPath: action.path };
  }
}

function defaultEmptyValue(dataType: string): RawValue {
  const base = dataType.split(/\s+/)[0] ?? '';
  if (base === 'boolean') return false;
  if (
    ['smallint', 'integer', 'bigint', 'numeric', 'decimal', 'real', 'serial', 'double'].includes(
      base,
    )
  )
    return 0;
  return '';
}

export function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const unsubscribe = onHostMessage((msg) => {
      switch (msg.type) {
        case 'ddl-parsed':
          dispatch({ type: 'parse-success', table: msg.table });
          return;
        case 'generated':
          dispatch({ type: 'generate-success', rows: msg.rows });
          return;
        case 'exported':
          dispatch({ type: 'exported', path: msg.path });
          return;
        case 'error':
          dispatch({ type: 'parse-error', message: msg.message });
          return;
      }
    });
    post({ type: 'ready' });
    return unsubscribe;
  }, []);

  const onParse = useCallback((ddl: string) => {
    dispatch({ type: 'set-ddl', ddl });
    dispatch({ type: 'parse-start' });
    post({ type: 'ddl-parse', ddl });
  }, []);

  const onRuleChange = useCallback((columnName: string, rule: Rule) => {
    dispatch({ type: 'set-rule', columnName, rule });
  }, []);

  const onGenerate = useCallback(() => {
    if (!state.table) return;
    dispatch({ type: 'generate-start' });
    post({
      type: 'generate',
      table: state.table,
      rules: state.rules,
      rowCount: state.rowCount,
    });
  }, [state.table, state.rules, state.rowCount]);

  const onExport = useCallback(() => {
    if (!state.table || !state.rows) return;
    post({
      type: 'export',
      table: state.table,
      rows: state.rows,
      multiValues: state.multiValues,
    });
  }, [state.table, state.rows, state.multiValues]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Mock Data Generator</h1>
        {state.table && (
          <span className="table-name">テーブル: {state.table.name}</span>
        )}
      </header>

      <section className="panel">
        <DdlPicker
          value={state.ddlText}
          onParse={onParse}
          parsing={state.parsing}
        />
        {state.error && <div className="error">⚠ {state.error}</div>}
      </section>

      {state.table && (
        <section className="panel">
          <h2>カラム別ルール設定</h2>
          <ColumnRuleTable
            columns={state.table.columns}
            rules={state.rules}
            onChange={onRuleChange}
          />
        </section>
      )}

      {state.table && (
        <section className="panel">
          <h2>生成</h2>
          <div className="generate-controls">
            <label className="field">
              <span>件数</span>
              <input
                type="number"
                min={1}
                max={10000}
                value={state.rowCount}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (Number.isFinite(n) && n >= 1) {
                    dispatch({ type: 'set-row-count', count: Math.min(n, 10000) });
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="primary"
              onClick={onGenerate}
              disabled={state.generating}
            >
              {state.generating ? '生成中...' : 'モックデータ生成'}
            </button>
          </div>
        </section>
      )}

      {state.table && state.rows && (
        <section className="panel">
          <h2>プレビュー（編集可能）</h2>
          <PreviewGrid
            columns={state.table.columns}
            rows={state.rows}
            onCellChange={(row, col, value) =>
              dispatch({ type: 'update-cell', row, col, value })
            }
            onAddRow={() => dispatch({ type: 'add-row' })}
            onDeleteRow={(row) => dispatch({ type: 'delete-row', row })}
          />
        </section>
      )}

      {state.table && state.rows && state.rows.length > 0 && (
        <section className="panel">
          <h2>SQL 出力</h2>
          <div className="export-controls">
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={state.multiValues}
                onChange={(e) =>
                  dispatch({ type: 'set-multi-values', on: e.target.checked })
                }
              />
              <span>マルチ VALUES 形式（1 INSERT で複数行）</span>
            </label>
            <button type="button" className="primary" onClick={onExport}>
              SQL ファイル出力
            </button>
            {state.lastExportPath && (
              <span className="hint">最終保存: {state.lastExportPath}</span>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
