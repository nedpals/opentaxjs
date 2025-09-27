import type { Rule, ValidatorConfig } from './types';
import type { ValidationIssue, ValidationSeverity } from './errors';
import { RuleValidationError } from './errors';
import { validateMetadata } from './schemas/metadata';
import { validateVariables } from './schemas/variables';
import { validateTables } from './schemas/tables';
import { validateOperationsAndFlow } from './schemas/operations';
import { validateConditionalLogic } from './schemas/conditions';
import { validateFilingSchedules } from './schemas/schedules';

export class RuleValidator {
  private config: ValidatorConfig;
  private issues: ValidationIssue[] = [];

  constructor(config?: Partial<ValidatorConfig>) {
    this.config = {
      mode: 'warning',
      allowUnknownTaxpayerTypes: false,
      allowNullInMetadata: true,
      ...config,
    } as ValidatorConfig;
  }

  validate(rule: unknown): ValidationIssue[] {
    this.issues = [];

    if (!this.isObject(rule)) {
      this.addError('Rule must be a valid JSON object', '/');
      return this.issues;
    }

    const ruleObj = rule as Record<string, unknown>;

    if (this.config.mode === 'quick') {
      return this.validateQuick(ruleObj);
    }

    this.validateStructure(ruleObj);

    if (this.hasErrors()) {
      return this.issues;
    }

    const typedRule = ruleObj as unknown as Rule;

    this.runValidation(
      () => validateMetadata(typedRule, this.config),
      'metadata'
    );
    this.runValidation(() => validateVariables(typedRule), 'variables');
    this.runValidation(() => validateTables(typedRule), 'tables');
    this.runValidation(
      () => validateOperationsAndFlow(typedRule),
      'operations'
    );
    this.runValidation(() => validateConditionalLogic(typedRule), 'conditions');
    this.runValidation(() => validateFilingSchedules(typedRule), 'schedules');

    return this.issues;
  }

  validateAndThrow(rule: unknown): void {
    const issues = this.validate(rule);
    const errors = issues.filter((i) => i.severity === 'error');

    if (
      errors.length > 0 ||
      (this.config.mode === 'strict' && issues.length > 0)
    ) {
      throw RuleValidationError.fromIssues(issues, rule);
    }
  }

  private validateQuick(rule: Record<string, unknown>): ValidationIssue[] {
    this.validateStructure(rule);
    return this.issues;
  }

  private validateStructure(rule: Record<string, unknown>): void {
    const required = [
      '$version',
      'name',
      'jurisdiction',
      'taxpayer_type',
      'flow',
    ];

    for (const field of required) {
      if (!(field in rule)) {
        this.addError(`Missing required field: ${field}`, `/${field}`);
      }
    }

    if ('flow' in rule && !Array.isArray(rule.flow)) {
      this.addError('Flow must be an array', '/flow');
    }

    if ('constants' in rule && !this.isObject(rule.constants)) {
      this.addError('Constants must be an object', '/constants');
    }

    if ('inputs' in rule && !this.isObject(rule.inputs)) {
      this.addError('Inputs must be an object', '/inputs');
    }

    if ('outputs' in rule && !this.isObject(rule.outputs)) {
      this.addError('Outputs must be an object', '/outputs');
    }

    if ('tables' in rule && !Array.isArray(rule.tables)) {
      this.addError('Tables must be an array', '/tables');
    }
  }

  private runValidation(
    validator: () => ValidationIssue[],
    context: string
  ): void {
    try {
      const contextIssues = validator();
      this.issues.push(...contextIssues);
    } catch (error) {
      this.addError(
        `Validation failed in ${context}: ${error instanceof Error ? error.message : String(error)}`,
        `/${context}`
      );
    }
  }

  private addError(message: string, path?: string, suggestion?: string): void {
    this.addIssue('error', message, path, suggestion);
  }

  private addWarning(
    message: string,
    path?: string,
    suggestion?: string
  ): void {
    this.addIssue('warning', message, path, suggestion);
  }

  private addIssue(
    severity: ValidationSeverity,
    message: string,
    path?: string,
    suggestion?: string
  ): void {
    this.issues.push({
      severity,
      message,
      path,
      suggestion,
    });
  }

  private hasErrors(): boolean {
    return this.issues.some((i) => i.severity === 'error');
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}

export function validateRule(
  rule: unknown,
  config?: Partial<ValidatorConfig>
): ValidationIssue[] {
  const validator = new RuleValidator(config);
  return validator.validate(rule);
}

export function validateRuleAndThrow(
  rule: unknown,
  config?: Partial<ValidatorConfig>
): void {
  const validator = new RuleValidator(config);
  validator.validateAndThrow(rule);
}
