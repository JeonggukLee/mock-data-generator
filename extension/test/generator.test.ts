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
      rules: {
        id: { kind: 'sequence', start: 100, step: 5, zeroPad: false, padWidth: 0 },
      },
      rng: new Mulberry32(42),
    });
    expect(rows.map((r) => r[0])).toEqual([100, 105, 110, 115, 120]);
  });

  it('zero-pads when zeroPad is true', () => {
    const rows = generate([col('id', 'varchar')], 3, {
      rules: {
        id: { kind: 'sequence', start: 1, step: 1, zeroPad: true, padWidth: 4 },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual(['0001', '0002', '0003']);
  });
});

describe('generate - template_sequence rule', () => {
  it('renders template with {N} placeholder and zero pad', () => {
    const rows = generate([col('id', 'varchar')], 3, {
      rules: {
        id: {
          kind: 'template_sequence',
          template: 'USER_{N}',
          start: 1,
          step: 1,
          zeroPad: true,
          padWidth: 3,
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual(['USER_001', 'USER_002', 'USER_003']);
  });

  it('supports suffix-style placement', () => {
    const rows = generate([col('id', 'varchar')], 2, {
      rules: {
        id: {
          kind: 'template_sequence',
          template: 'ID_{N}_END',
          start: 10,
          step: 10,
          zeroPad: false,
          padWidth: 0,
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual(['ID_10_END', 'ID_20_END']);
  });
});

describe('generate - format rule', () => {
  it('respects literal characters and bracketed placeholders', () => {
    const rng = new Mulberry32(123);
    const rows = generate([col('code', 'varchar')], 1, {
      rules: { code: { kind: 'format', pattern: '{AA}-{99}' } },
      rng,
    });
    const value = rows[0]?.[0] as string;
    expect(value).toMatch(/^[A-Z]{2}-[0-9]{2}$/);
  });

  it('is deterministic with seed', () => {
    const rule: Rule = { kind: 'format', pattern: '{AAAA}-{9999}' };
    const a = generate([col('c', 'varchar')], 3, { rules: { c: rule }, rng: new Mulberry32(7) });
    const b = generate([col('c', 'varchar')], 3, { rules: { c: rule }, rng: new Mulberry32(7) });
    expect(a).toEqual(b);
  });

  it('produces hiragana / katakana / symbol characters', () => {
    const rows = generate([col('c', 'varchar')], 1, {
      rules: { c: { kind: 'format', pattern: '{HHKKSS}' } },
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
  it('produces integers within [min,max] (random mode default)', () => {
    const rows = generate([col('n', 'integer')], 50, {
      rules: { n: { kind: 'number_range', min: 10, max: 20, mode: 'random' } },
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
      rules: {
        n: { kind: 'number_range', min: 0, max: 1, decimals: 2, mode: 'random' },
      },
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
  it('produces dates within range (random mode default)', () => {
    const rows = generate([col('d', 'date')], 30, {
      rules: {
        d: { kind: 'date_range', min: '2026-01-01', max: '2026-01-10', mode: 'random' },
      },
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

describe('Issue #1 reproduction: 連番のゼロ埋め ON/OFF', () => {
  it('zeroPad=false: 整数値をそのまま出力（パディングしない）', () => {
    const rows = generate([col('id', 'integer')], 5, {
      rules: {
        id: { kind: 'sequence', start: 1, step: 1, zeroPad: false, padWidth: 4 },
      },
      rng: new Mulberry32(1),
    });
    // zeroPad=false の時、padWidth が指定されていても無視される
    expect(rows.map((r) => r[0])).toEqual([1, 2, 3, 4, 5]);
  });

  it('zeroPad=true: padWidth 桁まで 0 埋め', () => {
    const rows = generate([col('id', 'varchar')], 3, {
      rules: {
        id: { kind: 'sequence', start: 7, step: 1, zeroPad: true, padWidth: 5 },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual(['00007', '00008', '00009']);
  });

  it('zeroPad=true でも値が padWidth 桁を超える場合は切り捨てない', () => {
    const rows = generate([col('id', 'varchar')], 1, {
      rules: {
        id: { kind: 'sequence', start: 12345, step: 1, zeroPad: true, padWidth: 3 },
      },
      rng: new Mulberry32(1),
    });
    expect(rows[0]?.[0]).toBe('12345');
  });
});

describe('Issue #2 reproduction: 定型文＋連番のテンプレート統合', () => {
  it('template に {N} を含めて任意位置に連番を埋め込める', () => {
    const rows = generate([col('id', 'varchar')], 2, {
      rules: {
        id: {
          kind: 'template_sequence',
          template: 'ORDER-{N}-A',
          start: 1,
          step: 1,
          zeroPad: true,
          padWidth: 4,
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual(['ORDER-0001-A', 'ORDER-0002-A']);
  });

  it('{N} が無い場合は連番が末尾に付かない（純粋なリテラル文字列扱い）', () => {
    const rows = generate([col('id', 'varchar')], 2, {
      rules: {
        id: {
          kind: 'template_sequence',
          template: 'STATIC',
          start: 1,
          step: 1,
          zeroPad: false,
          padWidth: 0,
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual(['STATIC', 'STATIC']);
  });

  it('zeroPad=false なら連番はパディング無しで埋め込まれる', () => {
    const rows = generate([col('id', 'varchar')], 3, {
      rules: {
        id: {
          kind: 'template_sequence',
          template: 'V{N}',
          start: 8,
          step: 1,
          zeroPad: false,
          padWidth: 0,
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual(['V8', 'V9', 'V10']);
  });

  it('{N} を複数回置換できる', () => {
    const rows = generate([col('id', 'varchar')], 1, {
      rules: {
        id: {
          kind: 'template_sequence',
          template: '{N}-{N}',
          start: 5,
          step: 1,
          zeroPad: true,
          padWidth: 2,
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows[0]?.[0]).toBe('05-05');
  });
});

describe('Issue #3 reproduction: フォーマット指定の中括弧による識別', () => {
  it('{...} 内のみフォーマット指定、外側はすべて一般リテラル', () => {
    const rows = generate([col('c', 'varchar')], 10, {
      rules: { c: { kind: 'format', pattern: '{AA}-{99}' } },
      rng: new Mulberry32(123),
    });
    for (const r of rows) {
      expect(r[0]).toMatch(/^[A-Z]{2}-[0-9]{2}$/);
    }
  });

  it('リテラル "A" を含むパターン: A の前後に {} が無ければそのまま "A"', () => {
    const rows = generate([col('c', 'varchar')], 5, {
      rules: { c: { kind: 'format', pattern: 'A-{9}' } },
      rng: new Mulberry32(7),
    });
    for (const r of rows) {
      const v = r[0] as string;
      expect(v).toMatch(/^A-[0-9]$/);
      expect(v.slice(0, 2)).toBe('A-');
    }
  });

  it('リテラル "9" を含むパターン: {A}9 は ランダム大文字＋リテラル"9"', () => {
    const rows = generate([col('c', 'varchar')], 5, {
      rules: { c: { kind: 'format', pattern: '{A}9' } },
      rng: new Mulberry32(11),
    });
    for (const r of rows) {
      const v = r[0] as string;
      expect(v).toMatch(/^[A-Z]9$/);
      expect(v.endsWith('9')).toBe(true);
    }
  });

  it('連続する一般リテラルとフォーマットリテラルが識別できる', () => {
    const rows = generate([col('c', 'varchar')], 5, {
      rules: { c: { kind: 'format', pattern: 'PRE{AAA}MID{999}POST' } },
      rng: new Mulberry32(13),
    });
    for (const r of rows) {
      expect(r[0]).toMatch(/^PRE[A-Z]{3}MID[0-9]{3}POST$/);
    }
  });

  it('一般リテラルに挟まれたフォーマット指定', () => {
    const rows = generate([col('c', 'varchar')], 5, {
      rules: { c: { kind: 'format', pattern: 'X{A}Y{9}Z' } },
      rng: new Mulberry32(17),
    });
    for (const r of rows) {
      expect(r[0]).toMatch(/^X[A-Z]Y[0-9]Z$/);
    }
  });

  it('{} の外に書いた A/9 は識別子としてではなくリテラルとして扱われる', () => {
    const rows = generate([col('c', 'varchar')], 5, {
      rules: { c: { kind: 'format', pattern: 'AAAA9999' } },
      rng: new Mulberry32(19),
    });
    for (const r of rows) {
      expect(r[0]).toBe('AAAA9999');
    }
  });

  it('未閉鎖の { は文字列終端までをフォーマット指定として扱う', () => {
    const rows = generate([col('c', 'varchar')], 5, {
      rules: { c: { kind: 'format', pattern: 'X{AA' } },
      rng: new Mulberry32(23),
    });
    for (const r of rows) {
      expect(r[0]).toMatch(/^X[A-Z]{2}$/);
    }
  });
});

describe('Issue #4 reproduction: 数値範囲/日付範囲のmode (random/increment/decrement)', () => {
  describe('number_range', () => {
    it('mode=increment: min から step ずつ加算、max 到達後は min に wrap', () => {
      const rows = generate([col('n', 'integer')], 8, {
        rules: {
          n: { kind: 'number_range', min: 1, max: 3, mode: 'increment', step: 1 },
        },
        rng: new Mulberry32(1),
      });
      expect(rows.map((r) => r[0])).toEqual([1, 2, 3, 1, 2, 3, 1, 2]);
    });

    it('mode=decrement: max から step ずつ減算、min 通過後は max に wrap', () => {
      const rows = generate([col('n', 'integer')], 6, {
        rules: {
          n: { kind: 'number_range', min: 1, max: 3, mode: 'decrement', step: 1 },
        },
        rng: new Mulberry32(1),
      });
      expect(rows.map((r) => r[0])).toEqual([3, 2, 1, 3, 2, 1]);
    });

    it('mode=increment with step=5', () => {
      const rows = generate([col('n', 'integer')], 7, {
        rules: {
          n: { kind: 'number_range', min: 10, max: 30, mode: 'increment', step: 5 },
        },
        rng: new Mulberry32(1),
      });
      expect(rows.map((r) => r[0])).toEqual([10, 15, 20, 25, 30, 10, 15]);
    });

    it('mode=random は seed 固定で決定的', () => {
      const rule: Rule = { kind: 'number_range', min: 0, max: 100, mode: 'random' };
      const a = generate([col('n', 'integer')], 5, {
        rules: { n: rule },
        rng: new Mulberry32(42),
      });
      const b = generate([col('n', 'integer')], 5, {
        rules: { n: rule },
        rng: new Mulberry32(42),
      });
      expect(a).toEqual(b);
    });

    it('mode=increment with decimals', () => {
      const rows = generate([col('n', 'numeric')], 4, {
        rules: {
          n: {
            kind: 'number_range',
            min: 0,
            max: 1,
            decimals: 1,
            mode: 'increment',
            step: 0.25,
          },
        },
        rng: new Mulberry32(1),
      });
      expect(rows.map((r) => r[0])).toEqual([0, 0.3, 0.5, 0.8]);
    });
  });

  describe('date_range', () => {
    it('mode=increment: min から step 日ずつ加算', () => {
      const rows = generate([col('d', 'date')], 5, {
        rules: {
          d: {
            kind: 'date_range',
            min: '2026-01-01',
            max: '2026-01-03',
            mode: 'increment',
            step: 1,
          },
        },
        rng: new Mulberry32(1),
      });
      expect(rows.map((r) => r[0])).toEqual([
        '2026-01-01',
        '2026-01-02',
        '2026-01-03',
        '2026-01-01',
        '2026-01-02',
      ]);
    });

    it('mode=decrement: max から step 日ずつ減算', () => {
      const rows = generate([col('d', 'date')], 4, {
        rules: {
          d: {
            kind: 'date_range',
            min: '2026-01-01',
            max: '2026-01-03',
            mode: 'decrement',
            step: 1,
          },
        },
        rng: new Mulberry32(1),
      });
      expect(rows.map((r) => r[0])).toEqual([
        '2026-01-03',
        '2026-01-02',
        '2026-01-01',
        '2026-01-03',
      ]);
    });

    it('mode=increment with step=2', () => {
      const rows = generate([col('d', 'date')], 4, {
        rules: {
          d: {
            kind: 'date_range',
            min: '2026-01-01',
            max: '2026-01-07',
            mode: 'increment',
            step: 2,
          },
        },
        rng: new Mulberry32(1),
      });
      expect(rows.map((r) => r[0])).toEqual([
        '2026-01-01',
        '2026-01-03',
        '2026-01-05',
        '2026-01-07',
      ]);
    });
  });
});

describe('generate - date_range rule with step units (months / years)', () => {
  it('stepUnit=months: 月単位でインクリメント', () => {
    const rows = generate([col('d', 'date')], 4, {
      rules: {
        d: {
          kind: 'date_range',
          min: '2026-01-15',
          max: '2026-12-15',
          mode: 'increment',
          step: 1,
          stepUnit: 'months',
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
      '2026-04-15',
    ]);
  });

  it('stepUnit=months: 月末は次月の最終日に clamp', () => {
    const rows = generate([col('d', 'date')], 4, {
      rules: {
        d: {
          kind: 'date_range',
          min: '2026-01-31',
          max: '2026-04-30',
          mode: 'increment',
          step: 1,
          stepUnit: 'months',
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('stepUnit=years: 年単位でインクリメント', () => {
    const rows = generate([col('d', 'date')], 4, {
      rules: {
        d: {
          kind: 'date_range',
          min: '2026-06-01',
          max: '2030-06-01',
          mode: 'increment',
          step: 1,
          stepUnit: 'years',
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual([
      '2026-06-01',
      '2027-06-01',
      '2028-06-01',
      '2029-06-01',
    ]);
  });

  it('stepUnit=months で wrap', () => {
    const rows = generate([col('d', 'date')], 5, {
      rules: {
        d: {
          kind: 'date_range',
          min: '2026-01-15',
          max: '2026-03-15',
          mode: 'increment',
          step: 1,
          stepUnit: 'months',
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual([
      '2026-01-15',
      '2026-02-15',
      '2026-03-15',
      '2026-01-15',
      '2026-02-15',
    ]);
  });

  it('stepUnit=months, mode=decrement: 月単位で減算', () => {
    const rows = generate([col('d', 'date')], 4, {
      rules: {
        d: {
          kind: 'date_range',
          min: '2026-01-15',
          max: '2026-04-15',
          mode: 'decrement',
          step: 1,
          stepUnit: 'months',
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual([
      '2026-04-15',
      '2026-03-15',
      '2026-02-15',
      '2026-01-15',
    ]);
  });

  it('stepUnit 未指定の既存ルールは日単位として動作（後方互換）', () => {
    const rows = generate([col('d', 'date')], 3, {
      rules: {
        d: {
          kind: 'date_range',
          min: '2026-01-01',
          max: '2026-01-31',
          mode: 'increment',
          step: 1,
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
    ]);
  });
});

describe('generate - time_range rule', () => {
  it('random mode: 全行が HH:MM:SS で [min,max] 内', () => {
    const rows = generate([col('t', 'time')], 30, {
      rules: {
        t: {
          kind: 'time_range',
          min: '09:00:00',
          max: '17:00:00',
          mode: 'random',
        },
      },
      rng: new Mulberry32(7),
    });
    for (const r of rows) {
      const v = r[0] as string;
      expect(v).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(v >= '09:00:00').toBe(true);
      expect(v <= '17:00:00').toBe(true);
    }
  });

  it('increment stepUnit=seconds', () => {
    const rows = generate([col('t', 'time')], 3, {
      rules: {
        t: {
          kind: 'time_range',
          min: '00:00:00',
          max: '00:00:10',
          mode: 'increment',
          step: 1,
          stepUnit: 'seconds',
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual(['00:00:00', '00:00:01', '00:00:02']);
  });

  it('increment stepUnit=minutes', () => {
    const rows = generate([col('t', 'time')], 4, {
      rules: {
        t: {
          kind: 'time_range',
          min: '12:00:00',
          max: '12:05:00',
          mode: 'increment',
          step: 1,
          stepUnit: 'minutes',
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual([
      '12:00:00',
      '12:01:00',
      '12:02:00',
      '12:03:00',
    ]);
  });

  it('increment stepUnit=hours', () => {
    const rows = generate([col('t', 'time')], 4, {
      rules: {
        t: {
          kind: 'time_range',
          min: '00:00:00',
          max: '06:00:00',
          mode: 'increment',
          step: 1,
          stepUnit: 'hours',
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual([
      '00:00:00',
      '01:00:00',
      '02:00:00',
      '03:00:00',
    ]);
  });

  it('decrement stepUnit=hours', () => {
    const rows = generate([col('t', 'time')], 3, {
      rules: {
        t: {
          kind: 'time_range',
          min: '00:00:00',
          max: '03:00:00',
          mode: 'decrement',
          step: 1,
          stepUnit: 'hours',
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual(['03:00:00', '02:00:00', '01:00:00']);
  });

  it('increment で wrap', () => {
    const rows = generate([col('t', 'time')], 5, {
      rules: {
        t: {
          kind: 'time_range',
          min: '00:00:00',
          max: '00:00:02',
          mode: 'increment',
          step: 1,
          stepUnit: 'seconds',
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual([
      '00:00:00',
      '00:00:01',
      '00:00:02',
      '00:00:00',
      '00:00:01',
    ]);
  });
});

describe('generate - timestamp_range rule', () => {
  it('random mode: 全行が YYYY-MM-DD HH:MM:SS 形式かつ範囲内', () => {
    const rows = generate([col('ts', 'timestamp')], 20, {
      rules: {
        ts: {
          kind: 'timestamp_range',
          min: '2026-01-01T00:00:00',
          max: '2026-01-31T23:59:59',
          mode: 'random',
        },
      },
      rng: new Mulberry32(13),
    });
    for (const r of rows) {
      const v = r[0] as string;
      expect(v).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      expect(v >= '2026-01-01 00:00:00').toBe(true);
      expect(v <= '2026-01-31 23:59:59').toBe(true);
    }
  });

  it('increment stepUnit=hours', () => {
    const rows = generate([col('ts', 'timestamp')], 4, {
      rules: {
        ts: {
          kind: 'timestamp_range',
          min: '2026-01-01T00:00:00',
          max: '2026-01-01T05:00:00',
          mode: 'increment',
          step: 1,
          stepUnit: 'hours',
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual([
      '2026-01-01 00:00:00',
      '2026-01-01 01:00:00',
      '2026-01-01 02:00:00',
      '2026-01-01 03:00:00',
    ]);
  });

  it('increment stepUnit=days', () => {
    const rows = generate([col('ts', 'timestamp')], 3, {
      rules: {
        ts: {
          kind: 'timestamp_range',
          min: '2026-01-01T12:30:00',
          max: '2026-01-05T12:30:00',
          mode: 'increment',
          step: 1,
          stepUnit: 'days',
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual([
      '2026-01-01 12:30:00',
      '2026-01-02 12:30:00',
      '2026-01-03 12:30:00',
    ]);
  });

  it('decrement stepUnit=hours', () => {
    const rows = generate([col('ts', 'timestamp')], 3, {
      rules: {
        ts: {
          kind: 'timestamp_range',
          min: '2026-01-01T00:00:00',
          max: '2026-01-01T02:00:00',
          mode: 'decrement',
          step: 1,
          stepUnit: 'hours',
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual([
      '2026-01-01 02:00:00',
      '2026-01-01 01:00:00',
      '2026-01-01 00:00:00',
    ]);
  });

  it('increment で wrap', () => {
    const rows = generate([col('ts', 'timestamp')], 5, {
      rules: {
        ts: {
          kind: 'timestamp_range',
          min: '2026-01-01T00:00:00',
          max: '2026-01-01T00:00:02',
          mode: 'increment',
          step: 1,
          stepUnit: 'seconds',
        },
      },
      rng: new Mulberry32(1),
    });
    expect(rows.map((r) => r[0])).toEqual([
      '2026-01-01 00:00:00',
      '2026-01-01 00:00:01',
      '2026-01-01 00:00:02',
      '2026-01-01 00:00:00',
      '2026-01-01 00:00:01',
    ]);
  });
});

describe('generate - null rule', () => {
  it('常に null を出力する', () => {
    const rows = generate([col('opt', 'varchar')], 5, {
      rules: { opt: { kind: 'null' } },
      rng: new Mulberry32(1),
    });
    for (const r of rows) {
      expect(r[0]).toBeNull();
    }
  });

  it('複数カラムの中で対象カラムだけ null になる', () => {
    const rows = generate(
      [col('a', 'integer'), col('b', 'varchar'), col('c', 'integer')],
      3,
      {
        rules: { b: { kind: 'null' } },
        rng: new Mulberry32(2),
      },
    );
    for (const r of rows) {
      expect(r[0]).not.toBeNull();
      expect(r[1]).toBeNull();
      expect(r[2]).not.toBeNull();
    }
  });
});

describe('generate - fixed rule', () => {
  it('常に同じ固定文字列を返す', () => {
    const rows = generate([col('s', 'varchar')], 4, {
      rules: { s: { kind: 'fixed', value: 'HELLO' } },
      rng: new Mulberry32(3),
    });
    for (const r of rows) {
      expect(r[0]).toBe('HELLO');
    }
  });

  it('空文字列も許容', () => {
    const rows = generate([col('s', 'varchar')], 2, {
      rules: { s: { kind: 'fixed', value: '' } },
      rng: new Mulberry32(4),
    });
    expect(rows.map((r) => r[0])).toEqual(['', '']);
  });
});

describe('generate - ref rule (equal mode)', () => {
  it('同じ行の別カラム値をそのままコピー', () => {
    const rows = generate(
      [col('src', 'integer'), col('dst', 'integer')],
      5,
      {
        rules: {
          src: { kind: 'sequence', start: 100, step: 1, zeroPad: false, padWidth: 0 },
          dst: { kind: 'ref', column: 'src', mode: 'equal' },
        },
        rng: new Mulberry32(5),
      },
    );
    for (const r of rows) {
      expect(r[1]).toBe(r[0]);
    }
  });

  it('参照先が NULL なら null を返す', () => {
    const rows = generate(
      [col('src', 'varchar'), col('dst', 'varchar')],
      3,
      {
        rules: {
          src: { kind: 'null' },
          dst: { kind: 'ref', column: 'src', mode: 'equal' },
        },
        rng: new Mulberry32(6),
      },
    );
    for (const r of rows) {
      expect(r[0]).toBeNull();
      expect(r[1]).toBeNull();
    }
  });
});

describe('generate - ref rule (greater mode)', () => {
  it('数値: ref + ランダムオフセット (offsetMin〜offsetMax)', () => {
    const rows = generate(
      [col('a', 'integer'), col('b', 'integer')],
      50,
      {
        rules: {
          a: { kind: 'sequence', start: 0, step: 0, zeroPad: false, padWidth: 0 },
          b: {
            kind: 'ref',
            column: 'a',
            mode: 'greater',
            offsetMin: 1,
            offsetMax: 10,
            offsetUnit: 'number',
          },
        },
        rng: new Mulberry32(7),
      },
    );
    for (const r of rows) {
      const diff = (r[1] as number) - (r[0] as number);
      expect(diff).toBeGreaterThanOrEqual(1);
      expect(diff).toBeLessThanOrEqual(10);
    }
  });

  it('date: ref + n 日 (days unit)', () => {
    const rows = generate(
      [col('start', 'date'), col('end', 'date')],
      30,
      {
        rules: {
          start: {
            kind: 'date_range',
            min: '2026-01-01',
            max: '2026-06-30',
            mode: 'random',
          },
          end: {
            kind: 'ref',
            column: 'start',
            mode: 'greater',
            offsetMin: 1,
            offsetMax: 7,
            offsetUnit: 'days',
          },
        },
        rng: new Mulberry32(8),
      },
    );
    for (const r of rows) {
      const startMs = Date.parse(r[0] as string);
      const endMs = Date.parse(r[1] as string);
      const diffDays = (endMs - startMs) / 86_400_000;
      expect(diffDays).toBeGreaterThanOrEqual(1);
      expect(diffDays).toBeLessThanOrEqual(7);
    }
  });

  it('timestamp: ref + n 時間 (hours unit)', () => {
    const rows = generate(
      [col('start_ts', 'timestamp'), col('end_ts', 'timestamp')],
      20,
      {
        rules: {
          start_ts: {
            kind: 'timestamp_range',
            min: '2026-01-01T00:00:00',
            max: '2026-01-01T12:00:00',
            mode: 'random',
          },
          end_ts: {
            kind: 'ref',
            column: 'start_ts',
            mode: 'greater',
            offsetMin: 1,
            offsetMax: 3,
            offsetUnit: 'hours',
          },
        },
        rng: new Mulberry32(9),
      },
    );
    for (const r of rows) {
      expect(r[1]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
      // start < end
      expect((r[1] as string) > (r[0] as string)).toBe(true);
    }
  });

  it('time: ref + n 分 (minutes unit)', () => {
    const rows = generate(
      [col('t_in', 'time'), col('t_out', 'time')],
      10,
      {
        rules: {
          t_in: {
            kind: 'time_range',
            min: '09:00:00',
            max: '17:00:00',
            mode: 'random',
          },
          t_out: {
            kind: 'ref',
            column: 't_in',
            mode: 'greater',
            offsetMin: 30,
            offsetMax: 60,
            offsetUnit: 'minutes',
          },
        },
        rng: new Mulberry32(10),
      },
    );
    for (const r of rows) {
      const inSec =
        Number((r[0] as string).slice(0, 2)) * 3600 +
        Number((r[0] as string).slice(3, 5)) * 60 +
        Number((r[0] as string).slice(6, 8));
      const outSec =
        Number((r[1] as string).slice(0, 2)) * 3600 +
        Number((r[1] as string).slice(3, 5)) * 60 +
        Number((r[1] as string).slice(6, 8));
      const diffMin = (outSec - inSec) / 60;
      expect(diffMin).toBeGreaterThanOrEqual(30);
      expect(diffMin).toBeLessThanOrEqual(60);
    }
  });
});

describe('generate - ref rule (less mode)', () => {
  it('数値: ref - ランダムオフセット', () => {
    const rows = generate(
      [col('a', 'integer'), col('b', 'integer')],
      30,
      {
        rules: {
          a: { kind: 'sequence', start: 1000, step: 0, zeroPad: false, padWidth: 0 },
          b: {
            kind: 'ref',
            column: 'a',
            mode: 'less',
            offsetMin: 5,
            offsetMax: 15,
            offsetUnit: 'number',
          },
        },
        rng: new Mulberry32(11),
      },
    );
    for (const r of rows) {
      const diff = (r[0] as number) - (r[1] as number);
      expect(diff).toBeGreaterThanOrEqual(5);
      expect(diff).toBeLessThanOrEqual(15);
    }
  });
});

describe('generate - ref rule: ordering enforcement', () => {
  it('参照先が後方カラムなら throw', () => {
    expect(() =>
      generate(
        [col('a', 'integer'), col('b', 'integer')],
        1,
        {
          rules: {
            a: { kind: 'ref', column: 'b', mode: 'equal' },
            b: { kind: 'sequence', start: 1, step: 1, zeroPad: false, padWidth: 0 },
          },
          rng: new Mulberry32(12),
        },
      ),
    ).toThrow(/must precede/);
  });
});

describe('generate - format rule with J (Joyo kanji)', () => {
  it('{J} が漢字 1 文字を生成し、その他のリテラルと混在できる', () => {
    const rows = generate([col('s', 'varchar')], 20, {
      rules: { s: { kind: 'format', pattern: '名前: {JJJ}' } },
      rng: new Mulberry32(13),
    });
    for (const r of rows) {
      const v = r[0] as string;
      expect(v.startsWith('名前: ')).toBe(true);
      // CJK 統合漢字レンジ (U+4E00 〜 U+9FFF) のチェック
      const kanjiPart = v.slice('名前: '.length);
      expect(kanjiPart).toMatch(/^[一-鿿]{3}$/);
    }
  });

  it('決定的 (同じ seed なら同じ漢字)', () => {
    const a = generate([col('s', 'varchar')], 5, {
      rules: { s: { kind: 'format', pattern: '{JJ}' } },
      rng: new Mulberry32(99),
    });
    const b = generate([col('s', 'varchar')], 5, {
      rules: { s: { kind: 'format', pattern: '{JJ}' } },
      rng: new Mulberry32(99),
    });
    expect(a).toEqual(b);
  });
});
