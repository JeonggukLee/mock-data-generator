export type SequenceRule = {
  kind: 'sequence';
  start: number;
  step: number;
  pad?: number;
};

export type TemplateSequenceRule = {
  kind: 'template_sequence';
  prefix: string;
  suffix?: string;
  start: number;
  step: number;
  pad?: number;
};

export type FormatRule = {
  kind: 'format';
  pattern: string;
};

export type NumberRangeRule = {
  kind: 'number_range';
  min: number;
  max: number;
  decimals?: number;
};

export type DateRangeRule = {
  kind: 'date_range';
  min: string;
  max: string;
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
