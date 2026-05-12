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

export type DateRangeRule = {
  kind: 'date_range';
  min: string;
  max: string;
  mode: RangeMode;
  step?: number;
};

export type ValueListRule = {
  kind: 'value_list';
  values: ReadonlyArray<string | number | boolean | null>;
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
  | ValueListRule
  | DefaultRule;

export const TEMPLATE_PLACEHOLDER = '{N}';
