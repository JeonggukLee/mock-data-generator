import { describe, expect, it } from 'vitest';
import type { Column } from '../src/ddl/types.js';
import { Mulberry32, generate } from '../src/mock/generator.js';
import type { Rule } from '../src/mock/rules.js';

const col = (
  name: string,
  dataType: string,
  overrides: Partial<Column> = {},
): Column => ({
  name,
  dataType,
  size: {},
  notNull: false,
  unique: false,
  primaryKey: false,
  ...overrides,
});

describe('generate - sequence rule', () => {
  it('produces consecutive integers from start with step', () => {
    const rows = generate([col('id', 'integer')], 5, {
      rules: { id: { kind: 'sequence', start: 100, step: 5 } },
      rng: new Mulberry32(42),
    });
    expect(rows.map((r) => r[0])).toEqual([100, 105, 110, 115, 120]);
  });

  it('zero-pads with pad option', () => {
    const rows = generate([col('id', 'varchar')], 3, {
      rules: { id: { kind: 'sequence', start: 1, step: 1, pad: 4 } },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual(['0001', '0002', '0003']);
  });
});

describe('generate - template_sequence rule', () => {
  it('produces "prefix + padded number"', () => {
    const rows = generate([col('id', 'varchar')], 3, {
      rules: {
        id: { kind: 'template_sequence', prefix: 'USER_', start: 1, step: 1, pad: 3 },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual(['USER_001', 'USER_002', 'USER_003']);
  });

  it('supports suffix', () => {
    const rows = generate([col('id', 'varchar')], 2, {
      rules: {
        id: {
          kind: 'template_sequence',
          prefix: 'ID_',
          suffix: '_END',
          start: 10,
          step: 10,
          pad: 0,
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual(['ID_10_END', 'ID_20_END']);
  });
});

describe('generate - format rule', () => {
  it('respects literal characters and placeholders', () => {
    const rng = new Mulberry32(123);
    const rows = generate([col('code', 'varchar')], 1, {
      rules: { code: { kind: 'format', pattern: 'AA-99' } },
      rng,
    });
    const value = rows[0]?.[0] as string;
    expect(value).toMatch(/^[A-Z]{2}-[0-9]{2}$/);
  });

  it('is deterministic with seed', () => {
    const rule: Rule = { kind: 'format', pattern: 'AAAA-9999' };
    const a = generate([col('c', 'varchar')], 3, { rules: { c: rule }, rng: new Mulberry32(7) });
    const b = generate([col('c', 'varchar')], 3, { rules: { c: rule }, rng: new Mulberry32(7) });
    expect(a).toEqual(b);
  });

  it('produces hiragana / katakana / symbol characters', () => {
    const rows = generate([col('c', 'varchar')], 1, {
      rules: { c: { kind: 'format', pattern: 'HHKKSS' } },
      rng: new Mulberry32(3),
    });
    const value = rows[0]?.[0] as string;
    expect(value.length).toBe(6);
    expect(value.slice(0, 2)).toMatch(/^[ぁ-ん]{2}$/);
    expect(value.slice(2, 4)).toMatch(/^[ァ-ン]{2}$/);
    expect(value.slice(4, 6)).toMatch(/^[!#$%&*+\-=?@]{2}$/);
  });
});

describe('generate - number_range rule', () => {
  it('produces integers within [min,max]', () => {
    const rows = generate([col('n', 'integer')], 50, {
      rules: { n: { kind: 'number_range', min: 10, max: 20 } },
      rng: new Mulberry32(99),
    });
    for (const r of rows) {
      const v = r[0] as number;
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(20);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('respects decimals option', () => {
    const rows = generate([col('n', 'numeric')], 20, {
      rules: { n: { kind: 'number_range', min: 0, max: 1, decimals: 2 } },
      rng: new Mulberry32(77),
    });
    for (const r of rows) {
      const v = r[0] as number;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(Math.round(v * 100) / 100).toBe(v);
    }
  });
});

describe('generate - date_range rule', () => {
  it('produces dates within range', () => {
    const rows = generate([col('d', 'date')], 30, {
      rules: { d: { kind: 'date_range', min: '2026-01-01', max: '2026-01-10' } },
      rng: new Mulberry32(55),
    });
    for (const r of rows) {
      const v = r[0] as string;
      expect(v).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(v >= '2026-01-01').toBe(true);
      expect(v <= '2026-01-10').toBe(true);
    }
  });
});

describe('generate - value_list rule', () => {
  it('only picks from list', () => {
    const values = ['A', 'B', 'C'];
    const rows = generate([col('c', 'varchar')], 100, {
      rules: { c: { kind: 'value_list', values } },
      rng: new Mulberry32(11),
    });
    for (const r of rows) {
      expect(values).toContain(r[0]);
    }
  });

  it('returns null for empty list', () => {
    const rows = generate([col('c', 'varchar')], 1, {
      rules: { c: { kind: 'value_list', values: [] } },
      rng: new Mulberry32(1),
    });
    expect(rows[0]?.[0]).toBeNull();
  });
});

describe('generate - default rule (type-based fallback)', () => {
  it('boolean -> boolean', () => {
    const rows = generate([col('b', 'boolean')], 10, { rng: new Mulberry32(1) });
    for (const r of rows) {
      expect(typeof r[0]).toBe('boolean');
    }
  });

  it('varchar respects precision (max length)', () => {
    const rows = generate([col('s', 'varchar', { size: { precision: 6 } })], 50, {
      rng: new Mulberry32(2),
    });
    for (const r of rows) {
      expect((r[0] as string).length).toBeLessThanOrEqual(6);
      expect((r[0] as string).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('numeric(p,s) respects precision and scale', () => {
    const rows = generate(
      [col('n', 'numeric', { size: { precision: 5, scale: 2 } })],
      50,
      { rng: new Mulberry32(3) },
    );
    for (const r of rows) {
      const v = r[0] as string;
      const [intPart, fracPart] = v.split('.');
      expect(intPart!.length).toBeLessThanOrEqual(3);
      expect(fracPart!.length).toBe(2);
    }
  });

  it('timestamp (with TZ modifier) still dispatches by base type', () => {
    const rows = generate([col('t', 'timestamp without time zone')], 5, {
      rng: new Mulberry32(4),
    });
    for (const r of rows) {
      expect(r[0]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    }
  });

  it('date produces YYYY-MM-DD', () => {
    const rows = generate([col('d', 'date')], 5, { rng: new Mulberry32(5) });
    for (const r of rows) {
      expect(r[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe('generate - NULL handling', () => {
  it('does not output null when notNull=true', () => {
    const rows = generate([col('c', 'varchar', { notNull: true })], 100, {
      nullRate: { c: 1.0 },
      rng: new Mulberry32(1),
    });
    for (const r of rows) {
      expect(r[0]).not.toBeNull();
    }
  });

  it('outputs null at given rate when notNull=false', () => {
    const rows = generate([col('c', 'varchar', { notNull: false })], 100, {
      nullRate: { c: 1.0 },
      rng: new Mulberry32(1),
    });
    for (const r of rows) {
      expect(r[0]).toBeNull();
    }
  });
});

describe('generate - determinism', () => {
  it('produces identical rows for the same seed', () => {
    const columns: Column[] = [
      col('id', 'integer'),
      col('name', 'varchar', { size: { precision: 10 } }),
      col('amount', 'numeric', { size: { precision: 5, scale: 2 } }),
    ];
    const a = generate(columns, 5, { rng: new Mulberry32(2026) });
    const b = generate(columns, 5, { rng: new Mulberry32(2026) });
    expect(a).toEqual(b);
  });
});
