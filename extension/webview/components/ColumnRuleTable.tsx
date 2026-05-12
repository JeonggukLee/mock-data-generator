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
  value_list: '値リスト',
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
        {columns.map((col) => {
          const rule = rules[col.name] ?? { kind: 'default' };
          const warning = detectConflict(col, rule);
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

function detectConflict(col: Column, rule: Rule): string | null {
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
    case 'default':
      return null;
  }
}

function estimateMaxLength(rule: Rule): number {
  switch (rule.kind) {
    case 'sequence':
      return Math.max(String(rule.start).length, rule.pad ?? 0);
    case 'template_sequence':
      return (
        rule.prefix.length +
        (rule.suffix?.length ?? 0) +
        Math.max(String(rule.start).length, rule.pad ?? 0)
      );
    case 'format':
      return rule.pattern.length;
    default:
      return 0;
  }
}
