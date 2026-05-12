import { describe, expect, it } from 'vitest';
import type { Column, Table } from '../src/ddl/types.js';
import type { RawValue } from '../src/mock/generator.js';
import { buildInsertSql, formatValue } from '../src/sql/insertBuilder.js';

const col = (name: string, dataType: string): Column => ({
  name,
  dataType,
  size: {},
  notNull: false,
  unique: false,
  primaryKey: false,
});

const TABLE: Table = {
  name: 'users',
  columns: [col('id', 'integer'), col('name', 'varchar'), col('active', 'boolean')],
};

describe('formatValue', () => {
  it('NULL', () => {
    expect(formatValue(null)).toBe('NULL');
  });
  it('boolean', () => {
    expect(formatValue(true)).toBe('TRUE');
    expect(formatValue(false)).toBe('FALSE');
  });
  it('numbers', () => {
    expect(formatValue(42)).toBe('42');
    expect(formatValue(3.14)).toBe('3.14');
    expect(formatValue(-1)).toBe('-1');
  });
  it('non-finite numbers fall back to NULL', () => {
    expect(formatValue(Number.NaN)).toBe('NULL');
    expect(formatValue(Infinity)).toBe('NULL');
  });
  it('strings are quoted', () => {
    expect(formatValue('hello')).toBe("'hello'");
  });
  it('escapes single quotes by doubling', () => {
    expect(formatValue("o'brien")).toBe("'o''brien'");
    expect(formatValue("''")).toBe("''''''");
  });
});

describe('buildInsertSql - multi VALUES (default)', () => {
  it('builds INSERT with one batch', () => {
    const rows: RawValue[][] = [
      [1, 'alice', true],
      [2, 'bob', false],
    ];
    const sql = buildInsertSql(TABLE, rows);
    expect(sql).toBe(
      `INSERT INTO users (id, name, active) VALUES\n  (1, 'alice', TRUE),\n  (2, 'bob', FALSE);`,
    );
  });

  it('returns empty string for zero rows', () => {
    expect(buildInsertSql(TABLE, [])).toBe('');
  });

  it('splits into batches by batchSize', () => {
    const rows: RawValue[][] = Array.from({ length: 5 }, (_, i) => [i, 'x', null]);
    const sql = buildInsertSql(TABLE, rows, { batchSize: 2 });
    const stmts = sql.split(';').filter((s) => s.trim().length > 0);
    expect(stmts.length).toBe(3);
  });
});

describe('buildInsertSql - single-row INSERTs', () => {
  it('emits one INSERT per row', () => {
    const rows: RawValue[][] = [
      [1, 'a', true],
      [2, 'b', false],
    ];
    const sql = buildInsertSql(TABLE, rows, { multiValues: false });
    expect(sql).toBe(
      `INSERT INTO users (id, name, active) VALUES (1, 'a', TRUE);\nINSERT INTO users (id, name, active) VALUES (2, 'b', FALSE);`,
    );
  });
});

describe('buildInsertSql - NULL handling', () => {
  it('emits NULL keyword for null values', () => {
    const rows: RawValue[][] = [[null, null, null]];
    const sql = buildInsertSql(TABLE, rows);
    expect(sql).toContain('(NULL, NULL, NULL)');
  });
});

describe('buildInsertSql - escaping', () => {
  it('escapes single quotes inside string values', () => {
    const rows: RawValue[][] = [[1, "O'Brien", true]];
    const sql = buildInsertSql(TABLE, rows);
    expect(sql).toContain("'O''Brien'");
  });
});
