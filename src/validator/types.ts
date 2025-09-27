import type { TaxpayerType, OperationType, FilingFrequency } from '@/types';

export interface RawRule {
  $version: string;
  name: string;
  references?: string[];
  effective_from?: string;
  effective_to?: string;
  jurisdiction: string;
  taxpayer_type: TaxpayerType | string;
  category?: string;
  author?: string;
  constants?: Record<string, number | boolean | string>;
  tables?: RawTable[];
  inputs?: Record<string, RawVariableSchema>;
  outputs?: Record<string, RawVariableSchema>;
  filing_schedules?: RawFilingSchedule[];
  flow: RawFlowStep[];
}

export interface RawVariableSchema {
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

export interface RawTable {
  name: string;
  brackets: RawTableBracket[];
}

export interface RawTableBracket {
  min: number | string;
  max: number | string;
  rate: number;
  base_tax: number;
}

export interface RawFilingSchedule {
  name: string;
  frequency: FilingFrequency;
  filing_day: number | string;
  when?: ConditionalExpression;
  forms: {
    primary: string;
    attachments?: string[];
  };
}

export interface RawFlowStep {
  name: string;
  operations?: RawOperation[];
  cases?: RawConditionalCase[];
}

export interface RawOperation {
  type: OperationType;
  target: string;
  value?: string | number | boolean;
  table?: string;
}

export interface RawConditionalCase {
  when?: ConditionalExpression;
  operations: RawOperation[];
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
