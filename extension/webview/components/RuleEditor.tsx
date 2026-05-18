import { useState } from 'react';
import type { Column } from '../../src/ddl/types.js';
import type {
  DateRangeRule,
  DateStepUnit,
  FixedRule,
  FormatRule,
  NumberRangeRule,
  RangeMode,
  RefMode,
  RefOffsetUnit,
  RefRule,
  Rule,
  SequenceRule,
  TemplateSequenceRule,
  TimeRangeRule,
  TimeStepUnit,
  TimestampRangeRule,
  TimestampStepUnit,
  ValueListRule,
} from '../../src/mock/rules.js';
import { parseValueList, serializeValueList } from '../../src/mock/valueList.js';

export type RuleKind = Rule['kind'];

export function defaultRuleForKind(kind: RuleKind): Rule {
  switch (kind) {
    case 'sequence':
      return { kind: 'sequence', start: 1, step: 1, zeroPad: false, padWidth: 4 };
    case 'template_sequence':
      return {
        kind: 'template_sequence',
        template: 'ID_{N}',
        start: 1,
        step: 1,
        zeroPad: true,
        padWidth: 4,
      };
    case 'format':
      return { kind: 'format', pattern: '{AAA}-{9999}', lists: {} };
    case 'number_range':
      return { kind: 'number_range', min: 0, max: 100, decimals: 0, mode: 'random', step: 1 };
    case 'date_range':
      return {
        kind: 'date_range',
        min: '2026-01-01',
        max: '2026-12-31',
        mode: 'random',
        step: 1,
        stepUnit: 'days',
      };
    case 'time_range':
      return {
        kind: 'time_range',
        min: '00:00:00',
        max: '23:59:59',
        mode: 'random',
        step: 1,
        stepUnit: 'seconds',
      };
    case 'timestamp_range':
      return {
        kind: 'timestamp_range',
        min: '2026-01-01T00:00:00',
        max: '2026-12-31T23:59:59',
        mode: 'random',
        step: 1,
        stepUnit: 'seconds',
      };
    case 'value_list':
      return { kind: 'value_list', values: [] };
    case 'null':
      return { kind: 'null' };
    case 'fixed':
      return { kind: 'fixed', value: '' };
    case 'ref':
      return {
        kind: 'ref',
        column: '',
        mode: 'equal',
        offsetMin: 1,
        offsetMax: 10,
        offsetUnit: 'number',
      };
    case 'default':
      return { kind: 'default' };
  }
}

type Props = {
  rule: Rule;
  onChange: (rule: Rule) => void;
  siblings?: Column[];
};

export function RuleEditor({ rule, onChange, siblings = [] }: Props) {
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
    case 'time_range':
      return <TimeRangeEditor rule={rule} onChange={onChange} />;
    case 'timestamp_range':
      return <TimestampRangeEditor rule={rule} onChange={onChange} />;
    case 'value_list':
      return <ValueListEditor rule={rule} onChange={onChange} />;
    case 'null':
      return <span className="hint">常に NULL を出力</span>;
    case 'fixed':
      return <FixedEditor rule={rule} onChange={onChange} />;
    case 'ref':
      return <RefEditor rule={rule} onChange={onChange} siblings={siblings} />;
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
      <CheckboxField
        label="ゼロ埋め"
        checked={rule.zeroPad}
        onChange={(zeroPad) => onChange({ ...rule, zeroPad })}
      />
      {rule.zeroPad && (
        <NumberField
          label="桁数"
          value={rule.padWidth}
          onChange={(padWidth) => onChange({ ...rule, padWidth })}
        />
      )}
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
        label="定型文（{N}=連番）"
        value={rule.template}
        onChange={(template) => onChange({ ...rule, template })}
        wide
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
      <CheckboxField
        label="ゼロ埋め"
        checked={rule.zeroPad}
        onChange={(zeroPad) => onChange({ ...rule, zeroPad })}
      />
      {rule.zeroPad && (
        <NumberField
          label="桁数"
          value={rule.padWidth}
          onChange={(padWidth) => onChange({ ...rule, padWidth })}
        />
      )}
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
  const lists = rule.lists ?? {};
  const entries = Object.entries(lists);

  const updateLists = (next: Record<string, ReadonlyArray<string>>) => {
    onChange({ ...rule, lists: next });
  };

  const renameKey = (oldName: string, newName: string) => {
    if (newName === oldName) return;
    const next: Record<string, ReadonlyArray<string>> = {};
    for (const [k, v] of entries) {
      next[k === oldName ? newName : k] = v;
    }
    updateLists(next);
  };

  const setValues = (name: string, values: string[]) => {
    updateLists({ ...lists, [name]: values });
  };

  const removeList = (name: string) => {
    const next = { ...lists };
    delete next[name];
    updateLists(next);
  };

  const addList = () => {
    let i = entries.length + 1;
    let name = `L${i}`;
    while (Object.prototype.hasOwnProperty.call(lists, name)) {
      i++;
      name = `L${i}`;
    }
    updateLists({ ...lists, [name]: [] });
  };

  return (
    <div className="editor-stack">
      <div className="editor-inline">
        <TextField
          label="パターン"
          value={rule.pattern}
          onChange={(pattern) => onChange({ ...rule, pattern })}
          wide
        />
        <span className="legend">
          {'{...}内 = フォーマット指定 or 名前付きリスト / 外 = リテラル'}
          <br />
          A=英大 / a=英小 / 9=数字 / X=英数 / H=ひらがな / K=カタカナ / S=記号 / J=漢字（常用）
          <br />
          {'リスト名と完全一致する {Name} はリストから抽選（例: {L1}-{9999}）'}
        </span>
      </div>
      <div className="format-lists">
        <div className="format-lists-header">
          <span>名前付きリスト</span>
          <button type="button" className="secondary" onClick={addList}>
            + リスト追加
          </button>
        </div>
        {entries.length === 0 && (
          <span className="hint">リスト未定義（フォーマット文字のみで生成）</span>
        )}
        {entries.map(([name, values]) => (
          <FormatListRow
            key={name}
            name={name}
            values={values}
            existingNames={Object.keys(lists)}
            onRename={(newName) => renameKey(name, newName)}
            onValuesChange={(next) => setValues(name, next)}
            onRemove={() => removeList(name)}
          />
        ))}
      </div>
    </div>
  );
}

function FormatListRow({
  name,
  values,
  existingNames,
  onRename,
  onValuesChange,
  onRemove,
}: {
  name: string;
  values: ReadonlyArray<string>;
  existingNames: ReadonlyArray<string>;
  onRename: (newName: string) => void;
  onValuesChange: (next: string[]) => void;
  onRemove: () => void;
}) {
  // 名前 / 値テキストを local state に保持し、blur 時に親へ反映。
  // 入力途中で親から再描画されると `\,` 等が崩れるため。
  const [nameText, setNameText] = useState(name);
  const [valuesText, setValuesText] = useState(() => serializeValueList(values));
  const nameValid =
    nameText.trim().length > 0 &&
    !/[{}]/.test(nameText) &&
    (nameText === name || !existingNames.includes(nameText));

  return (
    <div className="format-list-row">
      <label className="field">
        <span>名前</span>
        <input
          type="text"
          value={nameText}
          onChange={(e) => setNameText(e.target.value)}
          onBlur={() => {
            if (nameValid && nameText !== name) onRename(nameText);
            else setNameText(name);
          }}
        />
      </label>
      <label className="field wide">
        <span>値（カンマ区切り）</span>
        <input
          type="text"
          value={valuesText}
          onChange={(e) => {
            setValuesText(e.target.value);
            onValuesChange(parseValueList(e.target.value));
          }}
        />
      </label>
      <button
        type="button"
        className="icon-btn"
        title="リストを削除"
        onClick={onRemove}
      >
        ×
      </button>
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
      <RangeModeField
        mode={rule.mode}
        onChange={(mode) => onChange({ ...rule, mode })}
      />
      {rule.mode !== 'random' && (
        <NumberField
          label="ステップ"
          value={rule.step ?? 1}
          onChange={(step) => onChange({ ...rule, step })}
        />
      )}
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
      <RangeModeField
        mode={rule.mode}
        onChange={(mode) => onChange({ ...rule, mode })}
      />
      {rule.mode !== 'random' && (
        <>
          <NumberField
            label="ステップ"
            value={rule.step ?? 1}
            onChange={(step) => onChange({ ...rule, step })}
          />
          <StepUnitField<DateStepUnit>
            value={rule.stepUnit ?? 'days'}
            options={DATE_STEP_UNIT_OPTIONS}
            onChange={(stepUnit) => onChange({ ...rule, stepUnit })}
          />
        </>
      )}
    </div>
  );
}

function TimeRangeEditor({
  rule,
  onChange,
}: {
  rule: TimeRangeRule;
  onChange: (r: Rule) => void;
}) {
  return (
    <div className="editor-inline">
      <label className="field">
        <span>最小</span>
        <input
          type="time"
          step={1}
          value={rule.min}
          onChange={(e) => onChange({ ...rule, min: e.target.value })}
        />
      </label>
      <label className="field">
        <span>最大</span>
        <input
          type="time"
          step={1}
          value={rule.max}
          onChange={(e) => onChange({ ...rule, max: e.target.value })}
        />
      </label>
      <RangeModeField
        mode={rule.mode}
        onChange={(mode) => onChange({ ...rule, mode })}
      />
      {rule.mode !== 'random' && (
        <>
          <NumberField
            label="ステップ"
            value={rule.step ?? 1}
            onChange={(step) => onChange({ ...rule, step })}
          />
          <StepUnitField<TimeStepUnit>
            value={rule.stepUnit ?? 'seconds'}
            options={TIME_STEP_UNIT_OPTIONS}
            onChange={(stepUnit) => onChange({ ...rule, stepUnit })}
          />
        </>
      )}
    </div>
  );
}

function TimestampRangeEditor({
  rule,
  onChange,
}: {
  rule: TimestampRangeRule;
  onChange: (r: Rule) => void;
}) {
  return (
    <div className="editor-inline">
      <label className="field">
        <span>最小</span>
        <input
          type="datetime-local"
          step={1}
          value={rule.min}
          onChange={(e) => onChange({ ...rule, min: e.target.value })}
        />
      </label>
      <label className="field">
        <span>最大</span>
        <input
          type="datetime-local"
          step={1}
          value={rule.max}
          onChange={(e) => onChange({ ...rule, max: e.target.value })}
        />
      </label>
      <RangeModeField
        mode={rule.mode}
        onChange={(mode) => onChange({ ...rule, mode })}
      />
      {rule.mode !== 'random' && (
        <>
          <NumberField
            label="ステップ"
            value={rule.step ?? 1}
            onChange={(step) => onChange({ ...rule, step })}
          />
          <StepUnitField<TimestampStepUnit>
            value={rule.stepUnit ?? 'seconds'}
            options={TIMESTAMP_STEP_UNIT_OPTIONS}
            onChange={(stepUnit) => onChange({ ...rule, stepUnit })}
          />
        </>
      )}
    </div>
  );
}

function FixedEditor({
  rule,
  onChange,
}: {
  rule: FixedRule;
  onChange: (r: Rule) => void;
}) {
  return (
    <div className="editor-inline">
      <TextField
        label="固定文"
        value={rule.value}
        onChange={(value) => onChange({ ...rule, value })}
        wide
      />
      <span className="legend">
        SQL では文字列として引用符付きで出力されます
      </span>
    </div>
  );
}

function RefEditor({
  rule,
  onChange,
  siblings,
}: {
  rule: RefRule;
  onChange: (r: Rule) => void;
  siblings: Column[];
}) {
  const refCol = siblings.find((c) => c.name === rule.column);
  const baseType = (refCol?.dataType ?? '').split(/\s+/)[0] ?? '';
  const allowedUnits = unitOptionsForRefType(baseType);
  const effectiveUnit: RefOffsetUnit =
    allowedUnits.find((o) => o.value === rule.offsetUnit)?.value
    ?? allowedUnits[0]?.value
    ?? 'number';
  return (
    <div className="editor-inline">
      <label className="field">
        <span>参照カラム</span>
        <select
          value={rule.column}
          onChange={(e) => {
            const newColumn = e.target.value;
            const newRefCol = siblings.find((c) => c.name === newColumn);
            const newBase = (newRefCol?.dataType ?? '').split(/\s+/)[0] ?? '';
            const newAllowed = unitOptionsForRefType(newBase);
            const stillValid = newAllowed.some((o) => o.value === rule.offsetUnit);
            const newUnit = stillValid
              ? rule.offsetUnit
              : (newAllowed[0]?.value ?? 'number');
            onChange({ ...rule, column: newColumn, offsetUnit: newUnit });
          }}
        >
          <option value="">（選択）</option>
          {siblings.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>比較</span>
        <select
          value={rule.mode}
          onChange={(e) => onChange({ ...rule, mode: e.target.value as RefMode })}
        >
          <option value="equal">同値</option>
          <option value="greater">より大きい</option>
          <option value="less">より小さい</option>
        </select>
      </label>
      {rule.mode !== 'equal' && (
        <>
          <NumberField
            label="オフセット最小"
            value={rule.offsetMin ?? 1}
            onChange={(offsetMin) => onChange({ ...rule, offsetMin })}
          />
          <NumberField
            label="オフセット最大"
            value={rule.offsetMax ?? 10}
            onChange={(offsetMax) => onChange({ ...rule, offsetMax })}
          />
          <label className="field">
            <span>単位</span>
            <select
              value={effectiveUnit}
              onChange={(e) =>
                onChange({ ...rule, offsetUnit: e.target.value as RefOffsetUnit })
              }
            >
              {allowedUnits.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}
    </div>
  );
}

function unitOptionsForRefType(
  baseType: string,
): ReadonlyArray<{ value: RefOffsetUnit; label: string }> {
  const numTypes = ['smallint', 'integer', 'bigint', 'numeric', 'decimal', 'real', 'serial', 'double'];
  if (numTypes.includes(baseType)) return [{ value: 'number', label: '数値' }];
  if (baseType === 'date') {
    return [
      { value: 'days', label: '日' },
      { value: 'months', label: '月' },
      { value: 'years', label: '年' },
    ];
  }
  if (baseType === 'time') {
    return [
      { value: 'seconds', label: '秒' },
      { value: 'minutes', label: '分' },
      { value: 'hours', label: '時' },
    ];
  }
  if (baseType === 'timestamp') {
    return [
      { value: 'seconds', label: '秒' },
      { value: 'minutes', label: '分' },
      { value: 'hours', label: '時' },
      { value: 'days', label: '日' },
    ];
  }
  return [{ value: 'number', label: '数値' }];
}

const DATE_STEP_UNIT_OPTIONS: ReadonlyArray<{ value: DateStepUnit; label: string }> = [
  { value: 'days', label: '日' },
  { value: 'months', label: '月' },
  { value: 'years', label: '年' },
];

const TIME_STEP_UNIT_OPTIONS: ReadonlyArray<{ value: TimeStepUnit; label: string }> = [
  { value: 'seconds', label: '秒' },
  { value: 'minutes', label: '分' },
  { value: 'hours', label: '時' },
];

const TIMESTAMP_STEP_UNIT_OPTIONS: ReadonlyArray<{ value: TimestampStepUnit; label: string }> = [
  { value: 'seconds', label: '秒' },
  { value: 'minutes', label: '分' },
  { value: 'hours', label: '時' },
  { value: 'days', label: '日' },
];

function StepUnitField<U extends string>({
  value,
  options,
  onChange,
}: {
  value: U;
  options: ReadonlyArray<{ value: U; label: string }>;
  onChange: (u: U) => void;
}) {
  return (
    <label className="field">
      <span>単位</span>
      <select value={value} onChange={(e) => onChange(e.target.value as U)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ValueListEditor({
  rule,
  onChange,
}: {
  rule: ValueListRule;
  onChange: (r: Rule) => void;
}) {
  // raw text を local state に保持。serialize は初期表示の 1 回のみ。
  // 親への onChange では parse 結果を渡すが、text を serialize で書き戻さないため
  // 入力途中の \ が \\ にすり替わる問題を回避する。
  const [text, setText] = useState(() => serializeValueList(rule.values));
  return (
    <div className="editor-inline">
      <TextField
        label="値（カンマ区切り / \\, でコンマ、\\\\ で \\ をエスケープ）"
        value={text}
        onChange={(next) => {
          setText(next);
          onChange({ ...rule, values: parseValueList(next) });
        }}
        wide
      />
    </div>
  );
}

function RangeModeField({
  mode,
  onChange,
}: {
  mode: RangeMode;
  onChange: (m: RangeMode) => void;
}) {
  return (
    <label className="field">
      <span>生成モード</span>
      <select value={mode} onChange={(e) => onChange(e.target.value as RangeMode)}>
        <option value="random">ランダム</option>
        <option value="increment">シーケンス(増)</option>
        <option value="decrement">シーケンス(減)</option>
      </select>
    </label>
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

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <label className="field checkbox-inline">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
