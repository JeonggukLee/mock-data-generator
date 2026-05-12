import { useCallback } from 'react';
import type { Column } from '../../src/ddl/types.js';
import type { RawValue } from '../../src/mock/generator.js';

type Props = {
  columns: Column[];
  rows: RawValue[][];
  onCellChange: (rowIdx: number, colIdx: number, value: RawValue) => void;
  onAddRow: () => void;
  onDeleteRow: (rowIdx: number) => void;
};

const MAX_DISPLAY_ROWS = 1000;

export function PreviewGrid({
  columns,
  rows,
  onCellChange,
  onAddRow,
  onDeleteRow,
}: Props) {
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableElement>) => {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement;
      if (target.tagName !== 'INPUT') return;
      e.preventDefault();
      const cell = (target.closest('td') as HTMLTableCellElement) ?? null;
      if (!cell) return;
      const row = cell.parentElement as HTMLTableRowElement | null;
      const colIdx = Array.from(row?.children ?? []).indexOf(cell);
      const nextRow = row?.nextElementSibling as HTMLTableRowElement | null;
      const nextInput = nextRow?.children[colIdx]?.querySelector('input');
      if (nextInput instanceof HTMLInputElement) nextInput.focus();
    },
    [],
  );

  const displayRows = rows.slice(0, MAX_DISPLAY_ROWS);
  const truncated = rows.length > MAX_DISPLAY_ROWS;

  return (
    <div className="preview-grid">
      <div className="grid-toolbar">
        <span className="row-count">
          {rows.length.toLocaleString()} 行
          {truncated && (
            <span className="hint">
              （表示は先頭 {MAX_DISPLAY_ROWS.toLocaleString()} 行）
            </span>
          )}
        </span>
        <button type="button" className="secondary" onClick={onAddRow}>
          + 行追加
        </button>
      </div>
      <div className="grid-scroll">
        <table className="grid" onKeyDown={onKeyDown}>
          <thead>
            <tr>
              <th className="row-num">#</th>
              {columns.map((c) => (
                <th key={c.name} title={`${c.dataType}${formatSize(c)}`}>
                  <div className="cell-head">
                    <span>{c.name}</span>
                    <span className="head-type">
                      {c.dataType}
                      {formatSize(c)}
                      {c.notNull && <span className="badge">NN</span>}
                    </span>
                  </div>
                </th>
              ))}
              <th className="actions-head">&nbsp;</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rIdx) => (
              <tr key={rIdx}>
                <td className="row-num">{rIdx + 1}</td>
                {columns.map((col, cIdx) => (
                  <td key={col.name}>
                    <CellEditor
                      column={col}
                      value={row[cIdx] ?? null}
                      onChange={(next) => onCellChange(rIdx, cIdx, next)}
                    />
                  </td>
                ))}
                <td className="actions-cell">
                  <button
                    type="button"
                    className="icon-btn"
                    title="行を削除"
                    onClick={() => onDeleteRow(rIdx)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatSize(col: Column): string {
  if (col.size.precision === undefined) return '';
  if (col.size.scale !== undefined) return `(${col.size.precision},${col.size.scale})`;
  return `(${col.size.precision})`;
}

type CellProps = {
  column: Column;
  value: RawValue;
  onChange: (next: RawValue) => void;
};

function CellEditor({ column, value, onChange }: CellProps) {
  const baseType = column.dataType.split(/\s+/)[0] ?? '';

  if (baseType === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={value === true}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }

  if (baseType === 'date') {
    return (
      <input
        type="date"
        value={value === null ? '' : String(value)}
        onChange={(e) =>
          onChange(e.target.value === '' && !column.notNull ? null : e.target.value)
        }
      />
    );
  }

  if (isNumberType(baseType)) {
    return (
      <input
        type="number"
        value={value === null ? '' : String(value)}
        onChange={(e) => {
          if (e.target.value === '') {
            onChange(column.notNull ? 0 : null);
            return;
          }
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    );
  }

  const displayValue = value === null ? '' : String(value);
  const isNull = value === null;

  return (
    <input
      type="text"
      className={isNull ? 'null-cell' : ''}
      placeholder={isNull ? '(NULL)' : ''}
      value={displayValue}
      maxLength={column.size.precision}
      onChange={(e) =>
        onChange(e.target.value === '' && !column.notNull ? null : e.target.value)
      }
    />
  );
}

function isNumberType(base: string): boolean {
  return [
    'smallint',
    'integer',
    'bigint',
    'numeric',
    'decimal',
    'real',
    'serial',
    'double',
  ].includes(base);
}
