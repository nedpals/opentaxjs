import type { Operation, Rule, EvaluationContext } from '@/types';

export class RuleEvaluationError extends Error {
  constructor(
    message: string,
    public readonly rule?: Rule,
    public readonly context?: EvaluationContext
  ) {
    super(message);
    this.name = 'RuleEvaluationError';
  }
}

export class OperationError extends Error {
  constructor(
    message: string,
    public readonly operation?: Operation,
    public readonly context?: EvaluationContext
  ) {
    super(message);
    this.name = 'OperationError';
  }
}

export class VariableError extends Error {
  constructor(
    message: string,
    public readonly variableName?: string,
    public readonly context?: EvaluationContext
  ) {
    super(message);
    this.name = 'VariableError';
  }
}

export class TableError extends Error {
  constructor(
    message: string,
    public readonly tableName?: string,
    public readonly context?: EvaluationContext
  ) {
    super(message);
    this.name = 'TableError';
  }
}
