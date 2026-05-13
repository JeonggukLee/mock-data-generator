export type SequenceRule = {
  kind: 'sequence';
  start: number;
  step: number;
  zeroPad: boolean;
  padWidth: number;
};

export type TemplateSequenceRule = {
  kind: 'template_sequence';
  template: string;
  start: number;
  step: number;
  zeroPad: boolean;
  padWidth: number;
};

export type FormatRule = {
  kind: 'format';
  pattern: string;
};

export type RangeMode = 'random' | 'increment' | 'decrement';

export type NumberRangeRule = {
  kind: 'number_range';
  min: number;
  max: number;
  decimals?: number;
  mode: RangeMode;
  step?: number;
};

export type DateStepUnit = 'days' | 'months' | 'years';

export type DateRangeRule = {
  kind: 'date_range';
  min: string;
  max: string;
  mode: RangeMode;
  step?: number;
  stepUnit?: DateStepUnit;
};

export type TimeStepUnit = 'seconds' | 'minutes' | 'hours';

export type TimeRangeRule = {
  kind: 'time_range';
  min: string;
  max: string;
  mode: RangeMode;
  step?: number;
  stepUnit?: TimeStepUnit;
};

export type TimestampStepUnit = 'seconds' | 'minutes' | 'hours' | 'days';

export type TimestampRangeRule = {
  kind: 'timestamp_range';
  min: string;
  max: string;
  mode: RangeMode;
  step?: number;
  stepUnit?: TimestampStepUnit;
};

export type ValueListRule = {
  kind: 'value_list';
  values: ReadonlyArray<string | number | boolean | null>;
};

export type NullRule = {
  kind: 'null';
};

export type FixedRule = {
  kind: 'fixed';
  value: string;
};

export type RefMode = 'equal' | 'greater' | 'less';

export type RefOffsetUnit =
  | 'number'   // 数値オフセット
  | 'days'
  | 'months'
  | 'years'
  | 'seconds'
  | 'minutes'
  | 'hours';

export type RefRule = {
  kind: 'ref';
  column: string;             // 参照先カラム名
  mode: RefMode;
  offsetMin?: number;         // mode !== 'equal' のとき必須（既定 1）
  offsetMax?: number;         // mode !== 'equal' のとき必須（既定 10）
  offsetUnit?: RefOffsetUnit; // 参照先型に応じた単位
};

export type DefaultRule = {
  kind: 'default';
};

export type Rule =
  | SequenceRule
  | TemplateSequenceRule
  | FormatRule
  | NumberRangeRule
  | DateRangeRule
  | TimeRangeRule
  | TimestampRangeRule
  | ValueListRule
  | NullRule
  | FixedRule
  | RefRule
  | DefaultRule;

export const TEMPLATE_PLACEHOLDER = '{N}';
