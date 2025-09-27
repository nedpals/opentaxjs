// Shared types used across multiple modules

export const VALID_TAXPAYER_TYPES = [
  'INDIVIDUAL',
  'CORPORATION',
  'PARTNERSHIP',
  'SOLE_PROPRIETORSHIP',
] as const;

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

export interface VariableDeclaration {
  type: 'number' | 'boolean';
  description: string;
  minimum?: number;
  maximum?: number;
}

export interface TableBracket {
  min: number;
  max: number | null;
  rate: number;
  base_tax: number;
}

export interface Table {
  name: string;
  brackets: TableBracket[];
}

export interface Form {
  primary: string;
  attachments?: string[];
}

export interface FilingSchedule {
  name: string;
  frequency: 'monthly' | 'quarterly' | 'annually';
  filing_day: number;
  when?: Condition;
  forms: Form;
}

export interface BaseOperation {
  type: string;
  target: string;
}

export interface SetOperation extends BaseOperation {
  type: 'set';
  value: string | number | boolean;
}

export interface ArithmeticOperation extends BaseOperation {
  type: 'add' | 'subtract' | 'deduct' | 'multiply' | 'divide';
  value: string | number | boolean;
}

export interface MinMaxOperation extends BaseOperation {
  type: 'min' | 'max';
  value: string | number | boolean;
}

export interface LookupOperation extends BaseOperation {
  type: 'lookup';
  table: string;
  value: string | number | boolean;
}

export type Operation =
  | SetOperation
  | ArithmeticOperation
  | MinMaxOperation
  | LookupOperation;

export interface ComparisonCondition {
  lt?: string | number | boolean;
  lte?: string | number | boolean;
  gt?: string | number | boolean;
  gte?: string | number | boolean;
  eq?: string | number | boolean;
  ne?: string | number | boolean;
}

export interface LogicalCondition {
  and?: Condition[];
  or?: Condition[];
  not?: Condition;
}

export type Condition =
  | { [variable: string]: ComparisonCondition }
  | LogicalCondition;

export interface Case {
  when: Condition;
  operations: Operation[];
}

export interface FlowStep {
  name: string;
  operations?: Operation[];
  cases?: Case[];
}

export interface Rule {
  $version: string;
  name: string;
  references?: string[];
  effective_from?: string;
  jurisdiction: string;
  taxpayer_type: string;
  author: string;
  constants: Record<string, number | boolean>;
  tables: Table[];
  inputs: Record<string, VariableDeclaration>;
  outputs: Record<string, VariableDeclaration>;
  filing_schedules: FilingSchedule[];
  flow: FlowStep[];
}

export interface EvaluationContext {
  inputs: Record<string, number | boolean>;
  constants: Record<string, number | boolean>;
  calculated: Record<string, number | boolean>;
  tables: Record<string, Table>;
}
