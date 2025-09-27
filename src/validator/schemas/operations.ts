import type { Rule, FlowStep, Operation, ConditionalCase } from '../types';
import { VALID_OPERATION_TYPES } from '../types';
import type { ValidationIssue } from '../errors';
import { isRuleOnlyIdentifier } from '../../expression/identifiers';

function validateValueReference(
  value: string | number | boolean,
  path: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (typeof value === 'number' || typeof value === 'boolean') {
    return issues; // Literals are valid
  }

  if (typeof value !== 'string') {
    issues.push({
      severity: 'error',
      message: `Value must be a string, number, or boolean, got ${typeof value}`,
      path,
    });
    return issues;
  }

  // Simple validation for variable references based on RULES_SPEC
  // Input variables start with $, constants with $$, calculated variables have no prefix
  if (value.startsWith('$$')) {
    const name = value.slice(2);
    if (!isRuleOnlyIdentifier(name)) {
      issues.push({
        severity: 'error',
        message: `Invalid constant reference: ${value}`,
        path,
        suggestion: 'Constant references must be $$[a-z][a-z0-9_]*',
      });
    }
  } else if (value.startsWith('$')) {
    const name = value.slice(1);
    if (!isRuleOnlyIdentifier(name)) {
      issues.push({
        severity: 'error',
        message: `Invalid input variable reference: ${value}`,
        path,
        suggestion: 'Input variable references must be $[a-z][a-z0-9_]*',
      });
    }
  } else {
    // Calculated variable or function call
    if (!isRuleOnlyIdentifier(value)) {
      // Could be a function call or invalid identifier
      if (!value.includes('(') || !value.includes(')')) {
        issues.push({
          severity: 'error',
          message: `Invalid calculated variable reference: ${value}`,
          path,
          suggestion: 'Calculated variable references must be [a-z][a-z0-9_]*',
        });
      }
      // TODO: Delegate to expression evaluation component for:
      // - Full expression parsing and validation
      // - Function signature validation (parameter count, types)
      // - Symbol existence checking (variables, constants, functions)
      // - Complex expressions: sum($a, $b), max($$threshold, multiply($rate, $base))
      // For now, we just allow function calls with basic parentheses detection
    }
  }

  return issues;
}

function validateOperation(
  rule: Rule,
  operation: Operation,
  stepIndex: number,
  operationIndex: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const basePath = `/flow/${stepIndex}/operations/${operationIndex}`;

  if (
    !VALID_OPERATION_TYPES.includes(
      operation.type as (typeof VALID_OPERATION_TYPES)[number]
    )
  ) {
    issues.push({
      severity: 'error',
      message: `Invalid operation type: ${operation.type}`,
      path: `${basePath}/type`,
      suggestion: `Must be one of: ${VALID_OPERATION_TYPES.join(', ')}`,
    });
  }

  // Validate target is a valid identifier (only calculated variables can be assigned to)
  if (!isRuleOnlyIdentifier(operation.target)) {
    issues.push({
      severity: 'error',
      message: `Invalid operation target: ${operation.target}`,
      path: `${basePath}/target`,
      suggestion:
        'Operation targets must be valid identifiers: [a-z][a-z0-9_]*',
    });
  }

  if (operation.type === 'lookup') {
    if (!operation.table) {
      issues.push({
        severity: 'error',
        message: 'Lookup operation requires a table',
        path: `${basePath}/table`,
      });
    } else {
      const tables = new Set((rule.tables || []).map((t) => t.name));
      if (!tables.has(operation.table)) {
        issues.push({
          severity: 'error',
          message: `Undefined table: ${operation.table}`,
          path: `${basePath}/table`,
          suggestion: 'Define the table in the tables section',
        });
      }
    }

    if (!operation.value) {
      issues.push({
        severity: 'error',
        message: 'Lookup operation requires a value',
        path: `${basePath}/value`,
      });
    }
  }

  if (operation.value !== undefined) {
    if (operation.value === null) {
      issues.push({
        severity: 'error',
        message: 'Operation value cannot be null',
        path: `${basePath}/value`,
        suggestion: 'Use explicit values instead of null in calculations',
      });
    } else {
      const valueIssues = validateValueReference(
        operation.value,
        `${basePath}/value`
      );
      issues.push(...valueIssues);
    }
  } else if (operation.type !== 'lookup') {
    issues.push({
      severity: 'error',
      message: `Operation ${operation.type} requires a value`,
      path: `${basePath}/value`,
    });
  }

  return issues;
}

function validateFlowStep(
  rule: Rule,
  step: FlowStep,
  index: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const basePath = `/flow/${index}`;

  if (typeof step.name !== 'string' || step.name.trim() === '') {
    issues.push({
      severity: 'error',
      message: 'Flow step must have a non-empty name',
      path: `${basePath}/name`,
    });
  }

  const hasOperations = step.operations && step.operations.length > 0;
  const hasCases = step.cases && step.cases.length > 0;

  if (!hasOperations && !hasCases) {
    issues.push({
      severity: 'error',
      message: 'Flow step must have either operations or cases',
      path: basePath,
    });
  }

  if (hasOperations && hasCases) {
    issues.push({
      severity: 'error',
      message: 'Flow step cannot have both operations and cases',
      path: basePath,
      suggestion:
        'Use either operations for direct calculations or cases for conditional logic',
    });
  }

  if (step.operations) {
    step.operations.forEach((operation, operationIndex) => {
      const operationIssues = validateOperation(
        rule,
        operation,
        index,
        operationIndex
      );
      issues.push(...operationIssues);
    });
  }

  if (step.cases) {
    step.cases.forEach((caseItem, caseIndex) => {
      const caseIssues = validateConditionalCase(
        rule,
        caseItem,
        index,
        caseIndex
      );
      issues.push(...caseIssues);
    });

    const defaultCases = step.cases.filter((c) => !c.when);
    if (defaultCases.length > 1) {
      issues.push({
        severity: 'error',
        message: 'Only one default case (without when) allowed per step',
        path: `${basePath}/cases`,
      });
    }

    if (defaultCases.length === 1) {
      const defaultIndex = step.cases.findIndex((c) => !c.when);
      const isLast = defaultIndex === step.cases.length - 1;
      if (!isLast) {
        issues.push({
          severity: 'error',
          message: 'Default case must be the last case in the array',
          path: `${basePath}/cases/${defaultIndex}`,
        });
      }
    }
  }

  return issues;
}

function validateConditionalCase(
  rule: Rule,
  caseItem: ConditionalCase,
  stepIndex: number,
  caseIndex: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const basePath = `/flow/${stepIndex}/cases/${caseIndex}`;

  if (!Array.isArray(caseItem.operations) || caseItem.operations.length === 0) {
    issues.push({
      severity: 'error',
      message: 'Case must have at least one operation',
      path: `${basePath}/operations`,
    });
  } else {
    caseItem.operations.forEach((operation, operationIndex) => {
      const operationIssues = validateOperation(
        rule,
        operation,
        stepIndex,
        operationIndex
      );
      issues.push(
        ...operationIssues.map((issue) => ({
          ...issue,
          path: issue.path?.replace(
            `/operations/${operationIndex}`,
            `/cases/${caseIndex}/operations/${operationIndex}`
          ),
        }))
      );
    });
  }

  return issues;
}

export function validateOperationsAndFlow(rule: Rule): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!Array.isArray(rule.flow) || rule.flow.length === 0) {
    issues.push({
      severity: 'error',
      message: 'Rule must have at least one flow step',
      path: '/flow',
    });
    return issues;
  }

  rule.flow.forEach((step, index) => {
    const stepIssues = validateFlowStep(rule, step, index);
    issues.push(...stepIssues);
  });

  return issues;
}
