import type { Column } from '../../src/ddl/types.js';
import type { Rule } from '../../src/mock/rules.js';
import { RuleEditor, defaultRuleForKind, type RuleKind } from './RuleEditor.js';

type Props = {
  columns: Column[];
  rules: Record<string, Rule>;
  onChange: (columnName: string, rule: Rule) => void;
};

const RULE_KIND_LABELS: Record<RuleKind, string> = {
  default: '既定（型別fallback）',
  sequence: '連番',
  template_sequence: '定型文+連番',
  format: 'フォーマット指定',
  number_range: '数値範囲',
  date_range: '日付範囲',
  time_range: '時刻範囲',
  timestamp_range: 'タイムスタンプ範囲',
  value_list: '値リスト',
  null: '生成しない (NULL)',
  fixed: '固定文',
  ref: '別カラム値参照',
};

export function ColumnRuleTable({ columns, rules, onChange }: Props) {
  return (
    <table className="column-rule-table">
      <thead>
        <tr>
          <th>カラム名</th>
          <th>型</th>
          <th>制約</th>
          <th>ルール</th>
          <th>詳細</th>
        </tr>
      </thead>
      <tbody>
        {columns.map((col, colIdx) => {
          const rule = rules[col.name] ?? { kind: 'default' };
          const warning = detectConflict(col, rule, columns, colIdx);
          return (
            <tr key={col.name}>
              <td className="col-name">{col.name}</td>
              <td className="col-type">{renderType(col)}</td>
              <td className="col-constraints">{renderConstraints(col)}</td>
              <td>
                <select
                  value={rule.kind}
                  onChange={(e) =>
                    onChange(
                      col.name,
                      defaultRuleForKind(e.target.value as RuleKind),
                    )
                  }
                >
                  {(Object.entries(RULE_KIND_LABELS) as [RuleKind, string][]).map(
                    ([kind, label]) => (
                      <option key={kind} value={kind}>
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </td>
              <td className="col-detail">
                <RuleEditor
                  rule={rule}
                  onChange={(next) => onChange(col.name, next)}
                  siblings={columns.filter((c) => c.name !== col.name)}
                />
                {warning && <div className="warning">⚠ {warning}</div>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function renderType(col: Column): string {
  const sizePart =
    col.size.precision !== undefined
      ? col.size.scale !== undefined
        ? `(${col.size.precision},${col.size.scale})`
        : `(${col.size.precision})`
      : '';
  return col.dataType + sizePart;
}

function renderConstraints(col: Column): string {
  const parts: string[] = [];
  if (col.primaryKey) parts.push('PK');
  if (col.notNull) parts.push('NOT NULL');
  if (col.unique) parts.push('UNIQUE');
  return parts.join(' / ') || '-';
}

function detectConflict(
  col: Column,
  rule: Rule,
  allColumns: Column[],
  colIdx: number,
): string | null {
  const baseType = col.dataType.split(/\s+/)[0] ?? '';
  const stringTypes = ['char', 'varchar', 'text'];
  const numberTypes = ['smallint', 'integer', 'bigint', 'numeric', 'decimal', 'real', 'serial', 'double'];
  const dateTypes = ['date', 'timestamp', 'time'];

  switch (rule.kind) {
    case 'number_range':
      if (!numberTypes.includes(baseType)) {
        return `数値範囲は数値型に推奨（現在の型: ${col.dataType}）`;
      }
      return null;
    case 'date_range':
      if (!dateTypes.includes(baseType)) {
        return `日付範囲は日付型に推奨（現在の型: ${col.dataType}）`;
      }
      return null;
    case 'time_range':
      if (!['time', 'timestamp'].includes(baseType)) {
        return `時刻範囲は time / timestamp 型に推奨（現在の型: ${col.dataType}）`;
      }
      return null;
    case 'timestamp_range':
      if (baseType !== 'timestamp') {
        return `タイムスタンプ範囲は timestamp 型に推奨（現在の型: ${col.dataType}）`;
      }
      return null;
    case 'format':
    case 'sequence':
    case 'template_sequence': {
      const precision = col.size.precision;
      if (
        stringTypes.includes(baseType) &&
        precision !== undefined &&
        estimateMaxLength(rule) > precision
      ) {
        return `生成値が ${precision} 文字を超える可能性があります`;
      }
      return null;
    }
    case 'value_list': {
      const precision = col.size.precision;
      if (stringTypes.includes(baseType) && precision !== undefined) {
        for (const v of rule.values) {
          if (typeof v === 'string' && v.length > precision) {
            return `値 "${v}" が ${precision} 文字を超えています`;
          }
        }
      }
      return null;
    }
    case 'fixed': {
      const precision = col.size.precision;
      if (
        stringTypes.includes(baseType) &&
        precision !== undefined &&
        rule.value.length > precision
      ) {
        return `固定文 "${rule.value}" が ${precision} 文字を超えています`;
      }
      return null;
    }
    case 'ref': {
      if (!rule.column) return '参照カラムが未選択です';
      const refIdx = allColumns.findIndex((c) => c.name === rule.column);
      if (refIdx === -1) {
        return `参照カラム "${rule.column}" が存在しません`;
      }
      if (refIdx >= colIdx) {
        return `参照カラム "${rule.column}" は本カラムより前に定義されている必要があります`;
      }
      return null;
    }
    case 'null':
      if (col.notNull) {
        return 'NOT NULL カラムに NULL を出力しようとしています';
      }
      return null;
    case 'default':
      return null;
  }
}

function estimateMaxLength(rule: Rule): number {
  switch (rule.kind) {
    case 'sequence':
      return Math.max(
        String(rule.start).length,
        rule.zeroPad ? rule.padWidth : 0,
      );
    case 'template_sequence': {
      const numWidth = Math.max(
        String(rule.start).length,
        rule.zeroPad ? rule.padWidth : 0,
      );
      const placeholderCount = countOccurrences(rule.template, '{N}');
      const literalLength = rule.template.length - placeholderCount * '{N}'.length;
      return literalLength + placeholderCount * numWidth;
    }
    case 'format':
      return estimateFormatLength(rule.pattern);
    default:
      return 0;
  }
}

function countOccurrences(s: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = s.indexOf(needle, pos)) !== -1) {
    count++;
    pos += needle.length;
  }
  return count;
}

function estimateFormatLength(pattern: string): number {
  let length = 0;
  let i = 0;
  while (i < pattern.length) {
    if (pattern[i] === '{') {
      const close = pattern.indexOf('}', i + 1);
      const end = close === -1 ? pattern.length : close;
      length += end - (i + 1);
      i = end + 1;
    } else {
      length++;
      i++;
    }
  }
  return length;
}
