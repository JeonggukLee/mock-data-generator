import type { Column } from '../ddl/types.js';
import type {
  DateRangeRule,
  Rule,
  TimeRangeRule,
  TimestampRangeRule,
} from './rules.js';
import { TEMPLATE_PLACEHOLDER } from './rules.js';

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
      return formatSeq(rule.start + rule.step * rowIdx, rule.zeroPad, rule.padWidth);
    case 'template_sequence': {
      const num = formatSeq(
        rule.start + rule.step * rowIdx,
        rule.zeroPad,
        rule.padWidth,
      );
      return rule.template.split(TEMPLATE_PLACEHOLDER).join(String(num));
    }
    case 'format':
      return renderFormat(rule.pattern, rng);
    case 'number_range':
      return numberFromRange(rule, rowIdx, rng);
    case 'date_range':
      return dateFromRange(rule, rowIdx, rng);
    case 'time_range':
      return timeFromRange(rule, rowIdx, rng);
    case 'timestamp_range':
      return timestampFromRange(rule, rowIdx, rng);
    case 'value_list': {
      if (rule.values.length === 0) return null;
      return rule.values[rng.nextInt(rule.values.length)] ?? null;
    }
    case 'default':
      return defaultForColumn(col, rng);
  }
}

function formatSeq(n: number, zeroPad: boolean, padWidth: number): string | number {
  if (!zeroPad || padWidth <= 0) return n;
  const sign = n < 0 ? '-' : '';
  const body = Math.abs(n).toString().padStart(padWidth, '0');
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

function pickFormatChar(ch: string, rng: Rng): string {
  switch (ch) {
    case 'A':
      return pickFromPool(POOLS.upper, rng);
    case 'a':
      return pickFromPool(POOLS.lower, rng);
    case '9':
      return pickFromPool(POOLS.digit, rng);
    case 'X':
      return pickFromPool(POOLS.upper + POOLS.lower + POOLS.digit, rng);
    case 'H':
      return pickHiragana(rng);
    case 'K':
      return pickKatakana(rng);
    case 'S':
      return pickFromPool(POOLS.symbol, rng);
    default:
      return ch;
  }
}

function renderFormat(pattern: string, rng: Rng): string {
  let out = '';
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === '{') {
      const close = pattern.indexOf('}', i + 1);
      const end = close === -1 ? pattern.length : close;
      const body = pattern.slice(i + 1, end);
      for (const fc of body) {
        out += pickFormatChar(fc, rng);
      }
      i = end + 1;
      continue;
    }
    out += ch ?? '';
    i++;
  }
  return out;
}

function numberFromRange(
  rule: { min: number; max: number; decimals?: number; mode: 'random' | 'increment' | 'decrement'; step?: number },
  rowIdx: number,
  rng: Rng,
): number {
  let { min, max } = rule;
  if (max < min) [min, max] = [max, min];
  const decimals = rule.decimals ?? 0;
  if (rule.mode === 'random') {
    const value = min + rng.nextFloat() * (max - min);
    if (decimals <= 0) return Math.floor(value + rng.nextFloat());
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }
  const step = rule.step ?? 1;
  const span = max - min;
  if (step <= 0 || span <= 0) {
    return rule.mode === 'decrement' ? max : min;
  }
  const slots = Math.floor(span / step) + 1;
  const idx = rowIdx % slots;
  const offset = idx * step;
  const raw = rule.mode === 'increment' ? min + offset : max - offset;
  if (decimals <= 0) return Math.round(raw);
  const factor = 10 ** decimals;
  return Math.round(raw * factor) / factor;
}

function dateFromRange(rule: DateRangeRule, rowIdx: number, rng: Rng): string {
  const MS_PER_DAY = 86_400_000;
  const minMs = Date.parse(rule.min);
  const maxMs = Date.parse(rule.max);
  const [loMs, hiMs] = minMs <= maxMs ? [minMs, maxMs] : [maxMs, minMs];
  if (rule.mode === 'random') {
    const span = hiMs - loMs;
    const pickMs = loMs + Math.floor(rng.nextFloat() * (span + 1));
    return toIsoDate(pickMs);
  }
  const step = Math.max(1, Math.floor(rule.step ?? 1));
  const unit = rule.stepUnit ?? 'days';
  const lo = new Date(loMs);
  const hi = new Date(hiMs);
  if (unit === 'days') {
    const spanDays = Math.floor((hiMs - loMs) / MS_PER_DAY);
    const slots = Math.floor(spanDays / step) + 1;
    const idx = rowIdx % slots;
    const target = rule.mode === 'increment' ? addDays(lo, idx * step) : addDays(hi, -idx * step);
    return toIsoDate(target.getTime());
  }
  if (unit === 'months') {
    const loYM = lo.getUTCFullYear() * 12 + lo.getUTCMonth();
    const hiYM = hi.getUTCFullYear() * 12 + hi.getUTCMonth();
    const slots = Math.floor((hiYM - loYM) / step) + 1;
    const idx = rowIdx % slots;
    const target = rule.mode === 'increment' ? addMonths(lo, idx * step) : addMonths(hi, -idx * step);
    return toIsoDate(target.getTime());
  }
  // years
  const slots = Math.floor((hi.getUTCFullYear() - lo.getUTCFullYear()) / step) + 1;
  const idx = rowIdx % slots;
  const target = rule.mode === 'increment' ? addYears(lo, idx * step) : addYears(hi, -idx * step);
  return toIsoDate(target.getTime());
}

function timeFromRange(rule: TimeRangeRule, rowIdx: number, rng: Rng): string {
  const minSec = hmsToSeconds(rule.min);
  const maxSec = hmsToSeconds(rule.max);
  const [lo, hi] = minSec <= maxSec ? [minSec, maxSec] : [maxSec, minSec];
  if (rule.mode === 'random') {
    const pick = lo + Math.floor(rng.nextFloat() * (hi - lo + 1));
    return secondsToHms(pick);
  }
  const unitSec = TIME_UNIT_SECONDS[rule.stepUnit ?? 'seconds'];
  const stepSec = Math.max(1, Math.floor(rule.step ?? 1) * unitSec);
  const slots = Math.floor((hi - lo) / stepSec) + 1;
  const idx = rowIdx % slots;
  const offset = idx * stepSec;
  const sec = rule.mode === 'increment' ? lo + offset : hi - offset;
  return secondsToHms(sec);
}

function timestampFromRange(
  rule: TimestampRangeRule,
  rowIdx: number,
  rng: Rng,
): string {
  const minMs = parseDatetimeLocal(rule.min);
  const maxMs = parseDatetimeLocal(rule.max);
  const [lo, hi] = minMs <= maxMs ? [minMs, maxMs] : [maxMs, minMs];
  if (rule.mode === 'random') {
    const pick = lo + Math.floor(rng.nextFloat() * (hi - lo + 1));
    return formatTimestamp(pick);
  }
  const unitMs = TIMESTAMP_UNIT_MS[rule.stepUnit ?? 'seconds'];
  const stepMs = Math.max(1, Math.floor(rule.step ?? 1) * unitMs);
  const slots = Math.floor((hi - lo) / stepMs) + 1;
  const idx = rowIdx % slots;
  const offset = idx * stepMs;
  const ms = rule.mode === 'increment' ? lo + offset : hi - offset;
  return formatTimestamp(ms);
}

const TIME_UNIT_SECONDS = { seconds: 1, minutes: 60, hours: 3600 } as const;
const TIMESTAMP_UNIT_MS = {
  seconds: 1000,
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
} as const;

function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function formatTimestamp(ms: number): string {
  const iso = new Date(ms).toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)}`;
}

// `YYYY-MM-DDTHH:MM:SS` または `YYYY-MM-DD HH:MM:SS` を UTC ms として解釈。
// HTML <input type="datetime-local"> の値はタイムゾーン情報を持たないため、
// Date.parse は実行環境のローカル TZ で解釈してしまう。ここでは wall-clock を
// そのまま保持するため UTC として扱う。
function parseDatetimeLocal(s: string): number {
  const [datePart = '', timePart = '00:00:00'] = s.split(/[T ]/);
  const [y, mo, d] = datePart.split('-').map((p) => Number(p));
  const [h, mi, se] = timePart.split(':').map((p) => Number(p));
  return Date.UTC(y ?? 1970, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0, se ?? 0);
}

function hmsToSeconds(hms: string): number {
  const [h, m, s] = hms.split(':').map((p) => Number(p));
  return (h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0);
}

function secondsToHms(totalSeconds: number): string {
  const s = ((totalSeconds % 86400) + 86400) % 86400;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d.getTime());
  copy.setUTCDate(d.getUTCDate() + n);
  return copy;
}

function addMonths(d: Date, n: number): Date {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + n;
  const day = d.getUTCDate();
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  // clamp day to last day of target month
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const finalDay = Math.min(day, lastDay);
  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      finalDay,
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds(),
    ),
  );
}

function addYears(d: Date, n: number): Date {
  return addMonths(d, n * 12);
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
