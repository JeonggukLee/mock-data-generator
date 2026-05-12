import type { Column, DataSize, Table } from './types.js';

const DATA_TYPES = [
  'double precision',
  'timestamp',
  'smallint',
  'integer',
  'boolean',
  'numeric',
  'decimal',
  'varchar',
  'bigint',
  'serial',
  'real',
  'time',
  'char',
  'text',
  'date',
] as const;

export class DdlParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DdlParseError';
  }
}

export function parse(ddl: string): Table {
  const cleaned = preprocess(ddl);
  const found = findCreateTableStatement(cleaned);
  if (!found) {
    throw new DdlParseError('CREATE TABLE statement not found in DDL');
  }

  const tableName = camelToSnake(found.tableName);
  if (!tableName) {
    throw new DdlParseError('Table name not found in DDL');
  }

  const pkColumnNames = new Set<string>();
  const columns: Column[] = [];

  for (const rawDef of splitIgnoringParentheses(found.columnsStr)) {
    const def = rawDef.trim();
    if (!def) continue;

    if (isPrimaryKeyClause(def)) {
      for (const pk of extractPrimaryKeyColumns(def)) {
        pkColumnNames.add(pk.toLowerCase());
      }
      continue;
    }
    if (isOtherTableConstraint(def)) {
      continue;
    }

    const col = parseColumnDef(def);
    if (col) columns.push(col);
  }

  if (columns.length === 0) {
    throw new DdlParseError('No columns found in DDL');
  }

  for (const c of columns) {
    if (pkColumnNames.has(c.name.toLowerCase())) {
      c.primaryKey = true;
      c.notNull = true;
    }
  }

  return { name: tableName, columns };
}

function preprocess(ddl: string): string {
  let s = removeBlockComments(ddl);
  s = removeLineComments(s);
  return s.replace(/[\r\n\t]+/g, ' ');
}

function removeBlockComments(s: string): string {
  let out = s;
  while (true) {
    const start = out.indexOf('/*');
    if (start === -1) break;
    const end = out.indexOf('*/', start + 2);
    if (end === -1) break;
    out = out.slice(0, start) + out.slice(end + 2);
  }
  return out;
}

function removeLineComments(s: string): string {
  return s
    .split('\n')
    .map((line) => {
      const dashIdx = line.indexOf('--');
      let trimmed = dashIdx !== -1 ? line.slice(0, dashIdx) : line;
      const slashIdx = trimmed.indexOf('//');
      if (slashIdx !== -1) trimmed = trimmed.slice(0, slashIdx);
      return trimmed;
    })
    .join('\n');
}

function findCreateTableStatement(
  cleaned: string,
): { tableName: string; columnsStr: string } | null {
  const pattern = /create\s+table\s+(?:if\s+not\s+exists\s+)?(\w+)\s*\(/i;
  const m = cleaned.match(pattern);
  if (!m) return null;

  const openIdx = (m.index ?? 0) + m[0].length - 1;
  const close = findMatchingParen(cleaned, openIdx);
  if (close === -1) return null;

  return {
    tableName: m[1] ?? '',
    columnsStr: cleaned.slice(openIdx + 1, close),
  };
}

function findMatchingParen(s: string, openIdx: number): number {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function camelToSnake(name: string): string {
  let out = '';
  for (let i = 0; i < name.length; i++) {
    const ch = name[i]!;
    if (i > 0 && /[A-Z]/.test(ch)) out += '_';
    out += ch.toLowerCase();
  }
  return out;
}

function splitIgnoringParentheses(input: string): string[] {
  const result: string[] = [];
  let current = '';
  let depth = 0;
  for (const ch of input) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.length > 0) result.push(current);
  return result;
}

function isPrimaryKeyClause(def: string): boolean {
  return /^primary\s+key\s*\(/i.test(def);
}

function isOtherTableConstraint(def: string): boolean {
  return /^(unique|foreign\s+key|check|constraint)\b/i.test(def);
}

function extractPrimaryKeyColumns(def: string): string[] {
  const m = def.match(/primary\s+key\s*\(([^)]*)\)/i);
  if (!m || !m[1]) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const TYPE_PATTERN = new RegExp(
  '^(' + DATA_TYPES.map((t) => t.replace(/\s+/g, '\\s+')).join('|') + ')',
  'i',
);

const SIZE_PATTERN = /^\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/;
const TZ_SUFFIX_PATTERN = /^(without|with)\s+time\s+zone\b/i;

function parseColumnDef(def: string): Column | null {
  const nameMatch = def.match(/^(\w+)/);
  if (!nameMatch) return null;
  const name = nameMatch[1]!;

  const afterName = def.slice(name.length).trim();
  const typeMatch = afterName.match(TYPE_PATTERN);
  if (!typeMatch) return null;
  let dataType = typeMatch[1]!.toLowerCase().replace(/\s+/g, ' ');

  let rest = afterName.slice(typeMatch[0].length).trim();

  const size: DataSize = {};
  const sizeMatch = rest.match(SIZE_PATTERN);
  if (sizeMatch) {
    size.precision = parseInt(sizeMatch[1]!, 10);
    if (sizeMatch[2]) size.scale = parseInt(sizeMatch[2], 10);
    rest = rest.slice(sizeMatch[0].length).trim();
  }

  const tzMatch = rest.match(TZ_SUFFIX_PATTERN);
  if (tzMatch) {
    dataType += ' ' + tzMatch[0].toLowerCase().replace(/\s+/g, ' ');
    rest = rest.slice(tzMatch[0].length).trim();
  }

  const upper = rest.toUpperCase();
  const notNull = /\bNOT\s+NULL\b/.test(upper);
  const unique = /\bUNIQUE\b/.test(upper);
  const inlinePk = /\bPRIMARY\s+KEY\b/.test(upper);

  return {
    name,
    dataType,
    size,
    notNull: notNull || inlinePk,
    unique,
    primaryKey: inlinePk,
  };
}
