// Shared types used across multiple modules
export type VariableValue = number | boolean | string;

export type VariableMap = Record<string, VariableValue>;

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
export const VALID_FREQUENCIES = ['quarterly', 'monthly', 'annually'] as const;
export const EFFECT_TYPES = [
  'replaces',
  'excludes',
  'requires',
  'affects',
] as const;

export type TaxpayerType = (typeof VALID_TAXPAYER_TYPES)[number];
export type OperationType = (typeof VALID_OPERATION_TYPES)[number];
export type ComparisonOperatorType = (typeof COMPARISON_OPERATORS)[number];
export type LogicalOperatorType = (typeof LOGICAL_OPERATORS)[number];
export type FilingFrequency = (typeof VALID_FREQUENCIES)[number];
export type EffectType = (typeof EFFECT_TYPES)[number];

export interface VariableDeclaration {
  type: 'number' | 'boolean' | 'string';
  description: string;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  pattern?: string;
  when?: Condition;
  default?: VariableValue;
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

export interface FormObject {
  when?: Condition;
  form: string;
  attachments?: string[];
}

export interface FilingSchedule {
  name: string;
  frequency: FilingFrequency;
  filing_day: number;
  when?: Condition;
  forms: FormObject[];
}

export interface ValidationRule {
  when: Condition;
  error: string;
}

export interface Effect {
  type: EffectType;
  target: string;
  jurisdiction?: string;
  description?: string;
  reference?: string;
  conditions?: Condition;
  duration?: string;
}

export interface BaseOperation {
  type: string;
  target: string;
}

export interface SetOperation extends BaseOperation {
  type: 'set';
  value: VariableValue;
}

export interface ArithmeticOperation extends BaseOperation {
  type: 'add' | 'subtract' | 'deduct' | 'multiply' | 'divide';
  value: VariableValue;
}

export interface MinMaxOperation extends BaseOperation {
  type: 'min' | 'max';
  value: VariableValue;
}

export interface LookupOperation extends BaseOperation {
  type: 'lookup';
  table: string;
  value: VariableValue;
}

export type Operation =
  | SetOperation
  | ArithmeticOperation
  | MinMaxOperation
  | LookupOperation;

export interface ComparisonCondition {
  lt?: VariableValue;
  lte?: VariableValue;
  gt?: VariableValue;
  gte?: VariableValue;
  eq?: VariableValue;
  ne?: VariableValue;
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
  when?: Condition;
  operations: Operation[];
  effects?: Effect[];
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
  effective_to?: string;
  jurisdiction: string;
  taxpayer_type: string;
  category?: string;
  author?: string;
  constants?: VariableMap;
  tables?: Table[];
  inputs: Record<string, VariableDeclaration>;
  outputs: Record<string, VariableDeclaration>;
  validate?: ValidationRule[];
  filing_schedules?: FilingSchedule[];
  flow: FlowStep[];
}

export interface EvaluationContext {
  inputs: VariableMap;
  constants: VariableMap;
  calculated: VariableMap;
  tables: Record<string, Table>;
}
