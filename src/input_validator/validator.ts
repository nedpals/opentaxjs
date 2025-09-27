import { ConditionalEvaluator } from '@/evaluator';
import { ExpressionEvaluator } from '@/expression';
import { EvaluationContext, Rule, VariableMap } from '@/types';
import { ValidationIssue } from '@/validator';

export class InputValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: ValidationIssue[] = [],
    public readonly rule?: Rule
  ) {
    super(message);
    this.name = 'RuleValidationError';
  }

  static fromIssues(
    issues: ValidationIssue[],
    rule?: Rule
  ): InputValidationError {
    const errors = issues.filter((i) => i.severity === 'error');
    let message: string;

    if (errors.length === 1) {
      // Use the specific error message for single errors to maintain backward compatibility
      message = errors[0].message;
    } else if (errors.length > 1) {
      message = `Input validation failed with ${errors.length} error(s)`;
    } else {
      message = 'Input validation completed with warnings';
    }

    return new InputValidationError(message, issues, rule);
  }
}

export function validateInputs(
  rule: Rule,
  inputs: VariableMap,
  condEvaluator_?: ConditionalEvaluator
): ValidationIssue[] {
  const conditionalEvaluator =
    condEvaluator_ || new ConditionalEvaluator(new ExpressionEvaluator());
  const tempContext: EvaluationContext = {
    inputs: inputs,
    constants: rule.constants || {},
    calculated: {},
    tables: {},
  };

  const issues: ValidationIssue[] = [];

  for (const [inputName, inputDecl] of Object.entries(rule.inputs)) {
    let isRequired = true;
    const hasDefault = inputDecl.default !== undefined;

    if (inputDecl.when) {
      try {
        isRequired = conditionalEvaluator.evaluate(inputDecl.when, tempContext);
      } catch {
        // If we can't evaluate the condition, assume it's required for safety
        isRequired = true;
      }
    }

    if (!(inputName in inputs)) {
      if (isRequired && !hasDefault) {
        issues.push({
          severity: 'error',
          message: `Required input '${inputName}' not provided`,
        });

        continue;
      }

      if (hasDefault) {
        // Apply default value if input is missing
        tempContext.inputs[inputName] = inputDecl.default!;
        inputs[inputName] = inputDecl.default!;
      }
    }

    if (!isRequired && !(inputName in inputs) && !hasDefault) {
      continue;
    }

    const value = tempContext.inputs[inputName];
    const expectedType = inputDecl.type;
    const actualType = typeof value;

    if (actualType !== expectedType) {
      issues.push({
        severity: 'error',
        message: `Input '${inputName}' expected type '${expectedType}', got '${actualType}'`,
      });
      continue;
    }

    if (typeof value === 'number') {
      if (inputDecl.minimum !== undefined && value < inputDecl.minimum) {
        issues.push({
          severity: 'error',
          message: `Input '${inputName}' value ${value} is below minimum ${inputDecl.minimum}`,
        });
        continue;
      }

      if (inputDecl.maximum !== undefined && value > inputDecl.maximum) {
        issues.push({
          severity: 'error',
          message: `Input '${inputName}' value ${value} is above maximum ${inputDecl.maximum}`,
        });
        continue;
      }
    }

    if (inputDecl.enum !== undefined && inputDecl.enum.length > 0) {
      if (!inputDecl.enum.includes(value as string)) {
        issues.push({
          severity: 'error',
          message: `Input '${inputName}' value '${value}' is not in allowed enum values: ${inputDecl.enum.join(', ')}`,
        });
        continue;
      }
    }
  }

  return issues;
}
