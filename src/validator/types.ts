export const VALID_TAXPAYER_TYPES = [
  'INDIVIDUAL',
  'CORPORATION',
  'PARTNERSHIP',
  'SOLE_PROPRIETORSHIP',
] as const;

// TODO: should be removed later when
// operation evaluation is implemented.
export const VALID_OPERATION_TYPES = [
  'set',
  'add',
  'subtract',
  'deduct',
  'multiply',
  'divide',
  'min',
  'max',
  'lookup',
] as const;

export const COMPARISON_OPERATORS = [
  'eq',
  'ne',
  'gt',
  'lt',
  'gte',
  'lte',
] as const;
export const LOGICAL_OPERATORS = ['and', 'or', 'not'] as const;
export const VALID_FREQUENCIES = ['quarterly', 'annual'] as const;

export type TaxpayerType = (typeof VALID_TAXPAYER_TYPES)[number];
export type OperationType = (typeof VALID_OPERATION_TYPES)[number];
export type ComparisonOperatorType = (typeof COMPARISON_OPERATORS)[number];
export type LogicalOperatorType = (typeof LOGICAL_OPERATORS)[number];
export type FilingFrequency = (typeof VALID_FREQUENCIES)[number];

export interface Rule {
  $version: string;
  name: string;
  references?: string[];
  effective_from?: string;
  effective_to?: string;
  jurisdiction: string;
  taxpayer_type: TaxpayerType | string;
  category?: string;
  author?: string;
  constants?: Record<string, number | boolean>;
  tables?: Table[];
  inputs?: Record<string, VariableSchema>;
  outputs?: Record<string, VariableSchema>;
  filing_schedules?: FilingSchedule[];
  flow: FlowStep[];
}

export interface VariableSchema {
  type: 'number' | 'string' | 'boolean' | 'array' | 'object';
  description?: string;
  minimum?: number;
  maximum?: number;
  enum?: unknown[];
  pattern?: string;
  items?: {
    type: 'number' | 'boolean';
  };
}

export interface Table {
  name: string;
  brackets: TableBracket[];
}

export interface TableBracket {
  min: number | string;
  max: number | string;
  rate: number;
  base_tax: number;
}

export interface FilingSchedule {
  name: string;
  frequency: FilingFrequency;
  filing_day: number | string;
  when?: ConditionalExpression;
  forms: {
    primary: string;
    attachments?: string[];
  };
}

export interface FlowStep {
  name: string;
  operations?: Operation[];
  cases?: ConditionalCase[];
}

export interface Operation {
  type: OperationType;
  target: string;
  value?: string | number | boolean;
  table?: string;
}

export interface ConditionalCase {
  when?: ConditionalExpression;
  operations: Operation[];
}

export type ConditionalExpression =
  | Record<string, ComparisonOperator>
  | LogicalExpression;

export interface ComparisonOperator {
  eq?: unknown;
  ne?: unknown;
  gt?: number;
  lt?: number;
  gte?: number;
  lte?: number;
}

export interface LogicalExpression {
  and?: ConditionalExpression[];
  or?: ConditionalExpression[];
  not?: ConditionalExpression;
}

export interface ValidatorConfig {
  mode?: 'strict' | 'warning' | 'quick';
  allowUnknownTaxpayerTypes?: boolean;
  allowNullInMetadata?: boolean;
}
