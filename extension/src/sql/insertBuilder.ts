import type { Table } from '../ddl/types.js';
import type { RawValue } from '../mock/generator.js';

export type BuildOptions = {
  multiValues?: boolean;
  batchSize?: number;
};

export function buildInsertSql(
  table: Table,
  rows: RawValue[][],
  options: BuildOptions = {},
): string {
  if (rows.length === 0) return '';

  const multiValues = options.multiValues ?? true;
  const batchSize = options.batchSize ?? 100;

  const columnList = table.columns.map((c) => c.name).join(', ');
  const header = `INSERT INTO ${table.name} (${columnList}) VALUES`;

  if (!multiValues) {
    return rows.map((row) => `${header} (${formatRow(row)});`).join('\n');
  }

  const batches: string[] = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const valuesList = batch.map((row) => `  (${formatRow(row)})`).join(',\n');
    batches.push(`${header}\n${valuesList};`);
  }
  return batches.join('\n');
}

function formatRow(row: RawValue[]): string {
  return row.map(formatValue).join(', ');
}

export function formatValue(v: RawValue): string {
  if (v === null) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return 'NULL';
    return String(v);
  }
  return `'${v.replace(/'/g, "''")}'`;
}
