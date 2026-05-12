import type { Column } from '../ddl/types.js';
import type { Rule } from './rules.js';

export type RawValue = string | number | boolean | null;

export interface Rng {
  nextFloat(): number;
  nextInt(maxExclusive: number): number;
}

export class Mulberry32 implements Rng {
  private state: number;

  constructor(seed: number) {
    this.state = (seed | 0) >>> 0;
    if (this.state === 0) this.state = 1;
  }

  nextFloat(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(maxExclusive: number): number {
    if (maxExclusive <= 0) return 0;
    return Math.floor(this.nextFloat() * maxExclusive);
  }
}

export type GenerateOptions = {
  rules?: Record<string, Rule>;
  nullRate?: Record<string, number>;
  rng?: Rng;
};

export function generate(
  columns: Column[],
  rowCount: number,
  options: GenerateOptions = {},
): RawValue[][] {
  const rng = options.rng ?? new Mulberry32(Date.now() >>> 0);
  const rules = options.rules ?? {};
  const nullRates = options.nullRate ?? {};

  const rows: RawValue[][] = [];
  for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
    const row: RawValue[] = [];
    for (const col of columns) {
      const rate = nullRates[col.name] ?? 0;
      if (!col.notNull && rate > 0 && rng.nextFloat() < rate) {
        row.push(null);
        continue;
      }
      const rule: Rule = rules[col.name] ?? { kind: 'default' };
      row.push(valueFor(col, rule, rowIdx, rng));
    }
    rows.push(row);
  }
  return rows;
}

function valueFor(col: Column, rule: Rule, rowIdx: number, rng: Rng): RawValue {
  switch (rule.kind) {
    case 'sequence':
      return formatSeq(rule.start + rule.step * rowIdx, rule.pad);
    case 'template_sequence': {
      const num = formatSeq(rule.start + rule.step * rowIdx, rule.pad);
      return rule.prefix + num + (rule.suffix ?? '');
    }
    case 'format':
      return renderFormat(rule.pattern, rng);
    case 'number_range':
      return numberInRange(rule.min, rule.max, rule.decimals ?? 0, rng);
    case 'date_range':
      return dateInRange(rule.min, rule.max, rng);
    case 'value_list': {
      if (rule.values.length === 0) return null;
      return rule.values[rng.nextInt(rule.values.length)] ?? null;
    }
    case 'default':
      return defaultForColumn(col, rng);
  }
}

function formatSeq(n: number, pad?: number): string | number {
  if (!pad || pad <= 0) return n;
  const sign = n < 0 ? '-' : '';
  const body = Math.abs(n).toString().padStart(pad, '0');
  return sign + body;
}

const POOLS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digit: '0123456789',
  symbol: '!#$%&*+-=?@',
} as const;

function pickFromPool(pool: string, rng: Rng): string {
  return pool[rng.nextInt(pool.length)] ?? '';
}

function pickHiragana(rng: Rng): string {
  const start = 0x3041;
  const end = 0x3093;
  return String.fromCodePoint(start + rng.nextInt(end - start + 1));
}

function pickKatakana(rng: Rng): string {
  const start = 0x30a1;
  const end = 0x30f3;
  return String.fromCodePoint(start + rng.nextInt(end - start + 1));
}

function renderFormat(pattern: string, rng: Rng): string {
  let out = '';
  for (const ch of pattern) {
    switch (ch) {
      case 'A':
        out += pickFromPool(POOLS.upper, rng);
        break;
      case 'a':
        out += pickFromPool(POOLS.lower, rng);
        break;
      case '9':
        out += pickFromPool(POOLS.digit, rng);
        break;
      case 'X':
        out += pickFromPool(POOLS.upper + POOLS.lower + POOLS.digit, rng);
        break;
      case 'H':
        out += pickHiragana(rng);
        break;
      case 'K':
        out += pickKatakana(rng);
        break;
      case 'S':
        out += pickFromPool(POOLS.symbol, rng);
        break;
      default:
        out += ch;
    }
  }
  return out;
}

function numberInRange(min: number, max: number, decimals: number, rng: Rng): number {
  if (max < min) [min, max] = [max, min];
  const value = min + rng.nextFloat() * (max - min);
  if (decimals <= 0) return Math.floor(value + rng.nextFloat());
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function dateInRange(minIso: string, maxIso: string, rng: Rng): string {
  const minMs = Date.parse(minIso);
  const maxMs = Date.parse(maxIso);
  const [lo, hi] = minMs <= maxMs ? [minMs, maxMs] : [maxMs, minMs];
  const span = hi - lo;
  const pickMs = lo + Math.floor(rng.nextFloat() * (span + 1));
  return new Date(pickMs).toISOString().slice(0, 10);
}

function defaultForColumn(col: Column, rng: Rng): RawValue {
  const base = col.dataType.split(/\s+/)[0] ?? '';
  switch (base) {
    case 'boolean':
      return rng.nextInt(2) === 1;
    case 'serial':
      return rng.nextInt(2_147_483_647) + 1;
    case 'char':
    case 'varchar':
    case 'text':
      return randomString(col.size.precision ?? 50, rng);
    case 'smallint':
      return rng.nextInt(65_536) - 32_768;
    case 'integer':
      return digitNumber(col.size.precision ?? 9, rng);
    case 'bigint':
    case 'real':
      return digitNumber(col.size.precision ?? 18, rng);
    case 'decimal':
    case 'numeric':
      return decimalWithSize(col.size.precision ?? 10, col.size.scale ?? 0, rng);
    case 'double':
      return Math.round(rng.nextFloat() * 1_000_000) / 100;
    case 'time':
      return randomTime(rng);
    case 'timestamp':
      return randomTimestamp(rng);
    case 'date':
      return randomDate(rng);
    default:
      return 'UNKNOWN';
  }
}

function randomString(maxLength: number, rng: Rng): string {
  const pool = POOLS.upper + POOLS.lower + POOLS.digit;
  const length = Math.max(1, rng.nextInt(maxLength) + 1);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += pickFromPool(pool, rng);
  }
  return out;
}

function digitNumber(maxDigits: number, rng: Rng): number {
  if (maxDigits <= 0) return 0;
  const numDigits = rng.nextInt(maxDigits) + 1;
  const min = numDigits === 1 ? 0 : 10 ** (numDigits - 1);
  const max = 10 ** numDigits - 1;
  return min + rng.nextInt(max - min + 1);
}

function decimalWithSize(precision: number, scale: number, rng: Rng): string {
  if (precision < scale) {
    throw new Error('precision must be >= scale');
  }
  const intDigits = precision - scale;
  const intPart = digitNumber(intDigits, rng).toString();
  if (scale > 0) {
    const fracPart = digitNumber(scale, rng).toString().padStart(scale, '0');
    return `${intPart}.${fracPart}`;
  }
  return intPart;
}

function randomDate(rng: Rng): string {
  const year = new Date().getUTCFullYear();
  const month = rng.nextInt(12) + 1;
  const day = rng.nextInt(28) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function randomTime(rng: Rng): string {
  const h = rng.nextInt(24);
  const m = rng.nextInt(60);
  const s = rng.nextInt(60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function randomTimestamp(rng: Rng): string {
  return `${randomDate(rng)} ${randomTime(rng)}`;
}
