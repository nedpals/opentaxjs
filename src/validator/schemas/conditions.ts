import type {
  RawRule,
  ConditionalExpression,
  ComparisonOperator,
  LogicalExpression,
} from '../types';
import type { ValidationIssue } from '../errors';
import { COMPARISON_OPERATORS, LOGICAL_OPERATORS } from '../../types';

function validateComparisonOperator(
  operator: ComparisonOperator,
  path: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const operatorKeys = Object.keys(operator);
  if (operatorKeys.length !== 1) {
    issues.push({
      severity: 'error',
      message: 'Comparison operator must have exactly one operator key',
      path,
      suggestion: `Use one of: ${COMPARISON_OPERATORS.join(', ')}`,
    });
    return issues;
  }

  const operatorType = operatorKeys[0];
  if (
    !COMPARISON_OPERATORS.includes(
      operatorType as (typeof COMPARISON_OPERATORS)[number]
    )
  ) {
    issues.push({
      severity: 'error',
      message: `Invalid comparison operator: ${operatorType}`,
      path: `${path}/${operatorType}`,
      suggestion: `Must be one of: ${COMPARISON_OPERATORS.join(', ')}`,
    });
  }

  const value = operator[operatorType as keyof ComparisonOperator];

  if (value === null) {
    issues.push({
      severity: 'error',
      message: 'Comparison value cannot be null',
      path: `${path}/${operatorType}`,
      suggestion: 'Use explicit values instead of null in conditions',
    });
  }

  if (['gt', 'lt', 'gte', 'lte'].includes(operatorType)) {
    if (typeof value !== 'number' && typeof value !== 'string') {
      issues.push({
        severity: 'error',
        message: `Numeric comparison operator ${operatorType} requires a number or variable reference`,
        path: `${path}/${operatorType}`,
      });
    }
  }

  return issues;
}

function validateLogicalExpression(
  expression: LogicalExpression,
  rule: RawRule,
  path: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const operatorKeys = Object.keys(expression);
  if (operatorKeys.length !== 1) {
    issues.push({
      severity: 'error',
      message: 'Logical expression must have exactly one operator key',
      path,
      suggestion: `Use one of: ${LOGICAL_OPERATORS.join(', ')}`,
    });
    return issues;
  }

  const operatorType = operatorKeys[0];
  if (
    !LOGICAL_OPERATORS.includes(
      operatorType as (typeof LOGICAL_OPERATORS)[number]
    )
  ) {
    issues.push({
      severity: 'error',
      message: `Invalid logical operator: ${operatorType}`,
      path: `${path}/${operatorType}`,
      suggestion: `Must be one of: ${LOGICAL_OPERATORS.join(', ')}`,
    });
  }

  if (operatorType === 'and' || operatorType === 'or') {
    const conditions = expression[operatorType];
    if (!Array.isArray(conditions) || conditions.length === 0) {
      issues.push({
        severity: 'error',
        message: `${operatorType.toUpperCase()} operator requires an array of conditions`,
        path: `${path}/${operatorType}`,
      });
    } else {
      conditions.forEach((condition, index) => {
        const conditionIssues = validateConditionalExpression(
          condition,
          rule,
          `${path}/${operatorType}/${index}`
        );
        issues.push(...conditionIssues);
      });
    }
  } else if (operatorType === 'not') {
    const condition = expression.not;
    if (!condition) {
      issues.push({
        severity: 'error',
        message: 'NOT operator requires a condition',
        path: `${path}/not`,
      });
    } else {
      const conditionIssues = validateConditionalExpression(
        condition,
        rule,
        `${path}/not`
      );
      issues.push(...conditionIssues);
    }
  }

  return issues;
}

function validateConditionalExpression(
  expression: ConditionalExpression,
  rule: RawRule,
  path: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!expression || typeof expression !== 'object') {
    issues.push({
      severity: 'error',
      message: 'Conditional expression must be an object',
      path,
    });
    return issues;
  }

  const keys = Object.keys(expression);

  if (
    keys.some((key) =>
      LOGICAL_OPERATORS.includes(key as (typeof LOGICAL_OPERATORS)[number])
    )
  ) {
    return validateLogicalExpression(
      expression as LogicalExpression,
      rule,
      path
    );
  }

  for (const variableName of keys) {
    const operator = (expression as Record<string, ComparisonOperator>)[
      variableName
    ];

    if (!operator || typeof operator !== 'object') {
      issues.push({
        severity: 'error',
        message: `Invalid operator for variable ${variableName}`,
        path: `${path}/${variableName}`,
      });
      continue;
    }

    const operatorIssues = validateComparisonOperator(
      operator,
      `${path}/${variableName}`
    );
    issues.push(...operatorIssues);
  }

  return issues;
}

export function validateConditionalLogic(rule: RawRule): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  rule.flow.forEach((step, stepIndex) => {
    if (step.cases) {
      step.cases.forEach((caseItem, caseIndex) => {
        if (caseItem.when) {
          const conditionIssues = validateConditionalExpression(
            caseItem.when,
            rule,
            `/flow/${stepIndex}/cases/${caseIndex}/when`
          );
          issues.push(...conditionIssues);
        }
      });
    }
  });

  if (rule.filing_schedules) {
    rule.filing_schedules.forEach((schedule, scheduleIndex) => {
      if (schedule.when) {
        const conditionIssues = validateConditionalExpression(
          schedule.when,
          rule,
          `/filing_schedules/${scheduleIndex}/when`
        );
        issues.push(...conditionIssues);
      }
    });
  }

  return issues;
}
