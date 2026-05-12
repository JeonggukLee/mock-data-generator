import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parse } from '../src/ddl/parser.js';
import { Mulberry32, generate } from '../src/mock/generator.js';
import type { Rule } from '../src/mock/rules.js';
import { buildInsertSql } from '../src/sql/insertBuilder.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(HERE, '..', '..', 'test', 'ddl');

const fixtures = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith('.sql'));

describe.each(fixtures)('end-to-end round-trip: %s', (fixtureName) => {
  it('parses, generates, and builds INSERT SQL', () => {
    const ddl = readFileSync(join(FIXTURE_DIR, fixtureName), 'utf-8');

    const table = parse(ddl);
    expect(table.name).toBeTruthy();
    expect(table.columns.length).toBeGreaterThan(0);

    const rng = new Mulberry32(2026);
    const rules: Record<string, Rule> = {};
    const firstCol = table.columns[0];
    if (firstCol) {
      rules[firstCol.name] = {
        kind: 'sequence',
        start: 1,
        step: 1,
        zeroPad: true,
        padWidth: 4,
      };
    }

    const rows = generate(table.columns, 10, { rules, rng });
    expect(rows.length).toBe(10);
    expect(rows[0]?.length).toBe(table.columns.length);

    const sql = buildInsertSql(table, rows);
    expect(sql).toMatch(/^INSERT INTO /);
    expect(sql).toContain(table.name);
    expect(sql).toContain(`(${table.columns.map((c) => c.name).join(', ')})`);
    expect(sql.trim().endsWith(';')).toBe(true);

    const valueGroups = sql.match(/\(/g) ?? [];
    expect(valueGroups.length).toBeGreaterThanOrEqual(11);
  });

  it('produces SQL with balanced parentheses and one terminating semicolon per statement', () => {
    const ddl = readFileSync(join(FIXTURE_DIR, fixtureName), 'utf-8');
    const table = parse(ddl);
    const rng = new Mulberry32(7);
    const rows = generate(table.columns, 3, { rng });
    const sql = buildInsertSql(table, rows);

    const opens = (sql.match(/\(/g) ?? []).length;
    const closes = (sql.match(/\)/g) ?? []).length;
    expect(opens).toBe(closes);
  });

  it('single-row INSERT mode emits one statement per row', () => {
    const ddl = readFileSync(join(FIXTURE_DIR, fixtureName), 'utf-8');
    const table = parse(ddl);
    const rng = new Mulberry32(7);
    const rows = generate(table.columns, 4, { rng });
    const sql = buildInsertSql(table, rows, { multiValues: false });

    const stmts = sql.split(';').filter((s) => s.trim().length > 0);
    expect(stmts.length).toBe(4);
    for (const stmt of stmts) {
      expect(stmt.trim()).toMatch(/^INSERT INTO /);
    }
  });
});
