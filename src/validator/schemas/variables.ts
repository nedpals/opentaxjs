import type { RawRule, RawVariableSchema } from '../types';
import type { ValidationIssue } from '../errors';
import { isRuleOnlyIdentifier } from '../../expression/identifiers';

const VALID_SCHEMA_TYPES = ['number', 'string', 'boolean', 'array', 'object'];

function validateVariableSchema(
  schema: RawVariableSchema,
  path: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!VALID_SCHEMA_TYPES.includes(schema.type)) {
    issues.push({
      severity: 'error',
      message: `Invalid type: ${schema.type}`,
      path: `${path}/type`,
      suggestion: `Must be one of: ${VALID_SCHEMA_TYPES.join(', ')}`,
    });
  }

  if (schema.minimum !== undefined && typeof schema.minimum !== 'number') {
    issues.push({
      severity: 'error',
      message: 'Minimum must be a number',
      path: `${path}/minimum`,
    });
  }

  if (schema.maximum !== undefined && typeof schema.maximum !== 'number') {
    issues.push({
      severity: 'error',
      message: 'Maximum must be a number',
      path: `${path}/maximum`,
    });
  }

  if (
    schema.minimum !== undefined &&
    schema.maximum !== undefined &&
    schema.minimum >= schema.maximum
  ) {
    issues.push({
      severity: 'error',
      message: 'Minimum must be less than maximum',
      path: `${path}/minimum`,
    });
  }

  if (schema.pattern !== undefined && typeof schema.pattern !== 'string') {
    issues.push({
      severity: 'error',
      message: 'Pattern must be a string',
      path: `${path}/pattern`,
    });
  }

  if (schema.pattern !== undefined) {
    try {
      new RegExp(schema.pattern);
    } catch {
      issues.push({
        severity: 'error',
        message: `Invalid regular expression pattern: ${schema.pattern}`,
        path: `${path}/pattern`,
      });
    }
  }

  if (schema.type === 'array' && schema.items) {
    if (!['number', 'boolean'].includes(schema.items.type)) {
      issues.push({
        severity: 'error',
        message: `Invalid items type: ${schema.items.type}`,
        path: `${path}/items/type`,
        suggestion: 'Array items must be "number" or "boolean"',
      });
    }
  }

  return issues;
}

export function validateVariables(rule: RawRule): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allNames = new Set<string>();

  if (rule.constants) {
    for (const [name, value] of Object.entries(rule.constants)) {
      const constantIssues = validateConstant(name, value, allNames);
      issues.push(...constantIssues);
      allNames.add(name);
    }
  }

  if (rule.inputs) {
    for (const [name, schema] of Object.entries(rule.inputs)) {
      const inputIssues = validateInput(name, schema, allNames);
      issues.push(...inputIssues);
      allNames.add(name);
    }
  }

  if (rule.outputs) {
    for (const [name, schema] of Object.entries(rule.outputs)) {
      const outputIssues = validateOutput(name, schema, allNames);
      issues.push(...outputIssues);
      allNames.add(name);
    }
  }

  return issues;
}

function validateConstant(
  name: string,
  value: unknown,
  existingNames: Set<string>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const path = `/constants/${name}`;

  // Check identifier pattern
  if (!isRuleOnlyIdentifier(name)) {
    issues.push({
      severity: 'error',
      message: `Invalid constant identifier: ${name}`,
      path,
      suggestion: 'Identifiers must match pattern: [a-z][a-z0-9_]*',
    });
  }

  // Check for name conflicts
  if (existingNames.has(name)) {
    issues.push({
      severity: 'error',
      message: `Constant '${name}' is already defined`,
      path,
      suggestion: 'Each variable, constant, and output must have a unique name',
    });
  }

  // Validate value type
  if (typeof value !== 'number' && typeof value !== 'boolean') {
    issues.push({
      severity: 'error',
      message: `Constant ${name} must be a number or boolean`,
      path,
    });
  }

  // Check for null values
  if (value === null) {
    issues.push({
      severity: 'error',
      message: `Constant ${name} cannot be null`,
      path,
      suggestion: 'Use explicit values instead of null in calculations',
    });
  }

  return issues;
}

function validateInput(
  name: string,
  schema: RawVariableSchema,
  existingNames: Set<string>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const path = `/inputs/${name}`;

  // Check identifier pattern
  if (!isRuleOnlyIdentifier(name)) {
    issues.push({
      severity: 'error',
      message: `Invalid input identifier: ${name}`,
      path,
      suggestion: 'Identifiers must match pattern: [a-z][a-z0-9_]*',
    });
  }

  // Check for name conflicts
  if (existingNames.has(name)) {
    issues.push({
      severity: 'error',
      message: `Input '${name}' is already defined`,
      path,
      suggestion: 'Each variable, constant, and output must have a unique name',
    });
  }

  // Validate schema
  const schemaIssues = validateVariableSchema(schema, path);
  issues.push(...schemaIssues);

  return issues;
}

function validateOutput(
  name: string,
  schema: RawVariableSchema,
  existingNames: Set<string>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const path = `/outputs/${name}`;

  // Check identifier pattern
  if (!isRuleOnlyIdentifier(name)) {
    issues.push({
      severity: 'error',
      message: `Invalid output identifier: ${name}`,
      path,
      suggestion: 'Identifiers must match pattern: [a-z][a-z0-9_]*',
    });
  }

  // Check for name conflicts
  if (existingNames.has(name)) {
    issues.push({
      severity: 'error',
      message: `Output '${name}' is already defined`,
      path,
      suggestion: 'Each variable, constant, and output must have a unique name',
    });
  }

  // Validate schema
  const schemaIssues = validateVariableSchema(schema, path);
  issues.push(...schemaIssues);

  return issues;
}
