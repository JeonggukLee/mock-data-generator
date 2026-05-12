import type {
  DateRangeRule,
  FormatRule,
  NumberRangeRule,
  Rule,
  SequenceRule,
  TemplateSequenceRule,
  ValueListRule,
} from '../../src/mock/rules.js';

export type RuleKind = Rule['kind'];

export function defaultRuleForKind(kind: RuleKind): Rule {
  switch (kind) {
    case 'sequence':
      return { kind: 'sequence', start: 1, step: 1, pad: 0 };
    case 'template_sequence':
      return { kind: 'template_sequence', prefix: 'ID_', start: 1, step: 1, pad: 4 };
    case 'format':
      return { kind: 'format', pattern: 'AAA-9999' };
    case 'number_range':
      return { kind: 'number_range', min: 0, max: 100, decimals: 0 };
    case 'date_range':
      return { kind: 'date_range', min: '2026-01-01', max: '2026-12-31' };
    case 'value_list':
      return { kind: 'value_list', values: [] };
    case 'default':
      return { kind: 'default' };
  }
}

type Props = {
  rule: Rule;
  onChange: (rule: Rule) => void;
};

export function RuleEditor({ rule, onChange }: Props) {
  switch (rule.kind) {
    case 'sequence':
      return <SequenceEditor rule={rule} onChange={onChange} />;
    case 'template_sequence':
      return <TemplateSequenceEditor rule={rule} onChange={onChange} />;
    case 'format':
      return <FormatEditor rule={rule} onChange={onChange} />;
    case 'number_range':
      return <NumberRangeEditor rule={rule} onChange={onChange} />;
    case 'date_range':
      return <DateRangeEditor rule={rule} onChange={onChange} />;
    case 'value_list':
      return <ValueListEditor rule={rule} onChange={onChange} />;
    case 'default':
      return <span className="hint">既定値（型に応じた自動生成）</span>;
  }
}

function SequenceEditor({
  rule,
  onChange,
}: {
  rule: SequenceRule;
  onChange: (r: Rule) => void;
}) {
  return (
    <div className="editor-inline">
      <NumberField
        label="開始"
        value={rule.start}
        onChange={(start) => onChange({ ...rule, start })}
      />
      <NumberField
        label="ステップ"
        value={rule.step}
        onChange={(step) => onChange({ ...rule, step })}
      />
      <NumberField
        label="ゼロ埋め桁"
        value={rule.pad ?? 0}
        onChange={(pad) => onChange({ ...rule, pad })}
      />
    </div>
  );
}

function TemplateSequenceEditor({
  rule,
  onChange,
}: {
  rule: TemplateSequenceRule;
  onChange: (r: Rule) => void;
}) {
  return (
    <div className="editor-inline">
      <TextField
        label="プレフィックス"
        value={rule.prefix}
        onChange={(prefix) => onChange({ ...rule, prefix })}
      />
      <TextField
        label="サフィックス"
        value={rule.suffix ?? ''}
        onChange={(suffix) => onChange({ ...rule, suffix })}
      />
      <NumberField
        label="開始"
        value={rule.start}
        onChange={(start) => onChange({ ...rule, start })}
      />
      <NumberField
        label="ステップ"
        value={rule.step}
        onChange={(step) => onChange({ ...rule, step })}
      />
      <NumberField
        label="桁"
        value={rule.pad ?? 0}
        onChange={(pad) => onChange({ ...rule, pad })}
      />
    </div>
  );
}

function FormatEditor({
  rule,
  onChange,
}: {
  rule: FormatRule;
  onChange: (r: Rule) => void;
}) {
  return (
    <div className="editor-inline">
      <TextField
        label="パターン"
        value={rule.pattern}
        onChange={(pattern) => onChange({ ...rule, pattern })}
      />
      <span className="legend">
        A=英大 / a=英小 / 9=数字 / X=英数 / H=ひらがな / K=カタカナ / S=記号
      </span>
    </div>
  );
}

function NumberRangeEditor({
  rule,
  onChange,
}: {
  rule: NumberRangeRule;
  onChange: (r: Rule) => void;
}) {
  return (
    <div className="editor-inline">
      <NumberField
        label="最小"
        value={rule.min}
        onChange={(min) => onChange({ ...rule, min })}
      />
      <NumberField
        label="最大"
        value={rule.max}
        onChange={(max) => onChange({ ...rule, max })}
      />
      <NumberField
        label="小数桁"
        value={rule.decimals ?? 0}
        onChange={(decimals) => onChange({ ...rule, decimals })}
      />
    </div>
  );
}

function DateRangeEditor({
  rule,
  onChange,
}: {
  rule: DateRangeRule;
  onChange: (r: Rule) => void;
}) {
  return (
    <div className="editor-inline">
      <label className="field">
        <span>最小</span>
        <input
          type="date"
          value={rule.min}
          onChange={(e) => onChange({ ...rule, min: e.target.value })}
        />
      </label>
      <label className="field">
        <span>最大</span>
        <input
          type="date"
          value={rule.max}
          onChange={(e) => onChange({ ...rule, max: e.target.value })}
        />
      </label>
    </div>
  );
}

function ValueListEditor({
  rule,
  onChange,
}: {
  rule: ValueListRule;
  onChange: (r: Rule) => void;
}) {
  const text = rule.values.map((v) => (v === null ? '' : String(v))).join(', ');
  return (
    <div className="editor-inline">
      <TextField
        label="値（カンマ区切り）"
        value={text}
        onChange={(next) => {
          const values = next
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          onChange({ ...rule, values });
        }}
        wide
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  wide,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  wide?: boolean;
}) {
  return (
    <label className={wide ? 'field wide' : 'field'}>
      <span>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
