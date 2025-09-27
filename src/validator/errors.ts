export type ValidationSeverity = 'error' | 'warning';
export type ValidationMode = 'strict' | 'warning' | 'quick';

export interface ValidationIssue {
  severity: ValidationSeverity;
  message: string;
  path?: string;
  context?: Record<string, unknown>;
  suggestion?: string;
}

export class RuleValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: ValidationIssue[] = [],
    public readonly rule?: unknown
  ) {
    super(message);
    this.name = 'RuleValidationError';
  }

  static fromIssues(
    issues: ValidationIssue[],
    rule?: unknown
  ): RuleValidationError {
    const errors = issues.filter((i) => i.severity === 'error');
    const message =
      errors.length > 0
        ? `Rule validation failed with ${errors.length} error(s)`
        : 'Rule validation completed with warnings';

    return new RuleValidationError(message, issues, rule);
  }
}
