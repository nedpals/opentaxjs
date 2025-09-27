import type { RawRule, RawTableBracket } from '../types';
import type { ValidationIssue } from '../errors';
import { isRuleOnlyIdentifier } from '../../expression';

const MAX_TAXABLE_INCOME_REFERENCE = '$$MAX_TAXABLE_INCOME';

function validateTableBracket(
  bracket: RawTableBracket,
  index: number,
  tableName: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const basePath = `/tables/${tableName}/brackets/${index}`;

  if (
    typeof bracket.min !== 'number' &&
    bracket.min !== MAX_TAXABLE_INCOME_REFERENCE
  ) {
    issues.push({
      severity: 'error',
      message: `Invalid bracket min value: ${bracket.min}`,
      path: `${basePath}/min`,
      suggestion: 'Must be a number or $$MAX_TAXABLE_INCOME',
    });
  }

  if (
    typeof bracket.max !== 'number' &&
    bracket.max !== MAX_TAXABLE_INCOME_REFERENCE
  ) {
    issues.push({
      severity: 'error',
      message: `Invalid bracket max value: ${bracket.max}`,
      path: `${basePath}/max`,
      suggestion: 'Must be a number or $$MAX_TAXABLE_INCOME',
    });
  }

  if (typeof bracket.rate !== 'number') {
    issues.push({
      severity: 'error',
      message: `Invalid bracket rate: ${bracket.rate}`,
      path: `${basePath}/rate`,
      suggestion: 'Rate must be a number',
    });
  } else {
    if (bracket.rate < 0) {
      issues.push({
        severity: 'warning',
        message: `Negative tax rate: ${bracket.rate}`,
        path: `${basePath}/rate`,
        suggestion: 'Tax rates are typically non-negative',
      });
    }

    if (bracket.rate > 1) {
      issues.push({
        severity: 'warning',
        message: `Tax rate greater than 100%: ${bracket.rate}`,
        path: `${basePath}/rate`,
        suggestion:
          'Consider if this rate should be expressed as a decimal (e.g., 0.25 for 25%)',
      });
    }
  }

  if (typeof bracket.base_tax !== 'number') {
    issues.push({
      severity: 'error',
      message: `Invalid bracket base_tax: ${bracket.base_tax}`,
      path: `${basePath}/base_tax`,
      suggestion: 'Base tax must be a number',
    });
  } else if (bracket.base_tax < 0) {
    issues.push({
      severity: 'warning',
      message: `Negative base tax: ${bracket.base_tax}`,
      path: `${basePath}/base_tax`,
      suggestion: 'Base tax is typically non-negative',
    });
  }

  const minValue =
    typeof bracket.min === 'number' ? bracket.min : Number.POSITIVE_INFINITY;
  const maxValue =
    typeof bracket.max === 'number' ? bracket.max : Number.POSITIVE_INFINITY;

  if (minValue >= maxValue && maxValue !== Number.POSITIVE_INFINITY) {
    issues.push({
      severity: 'error',
      message: `Bracket min (${bracket.min}) must be less than max (${bracket.max})`,
      path: `${basePath}/min`,
    });
  }

  [bracket.min, bracket.max, bracket.rate, bracket.base_tax].forEach(
    (value, fieldIndex) => {
      if (value === null) {
        const fieldNames = ['min', 'max', 'rate', 'base_tax'];
        issues.push({
          severity: 'error',
          message: `Bracket ${fieldNames[fieldIndex]} cannot be null`,
          path: `${basePath}/${fieldNames[fieldIndex]}`,
          suggestion: 'Use explicit values instead of null in calculations',
        });
      }
    }
  );

  return issues;
}

export function validateTables(rule: RawRule): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!rule.tables || rule.tables.length === 0) {
    return issues;
  }

  const tableNames = new Set<string>();

  for (const table of rule.tables) {
    if (!isRuleOnlyIdentifier(table.name)) {
      issues.push({
        severity: 'error',
        message: `Invalid table identifier: ${table.name}`,
        path: `/tables/${table.name}`,
        suggestion: 'Table names must match pattern: [a-z][a-z0-9_]*',
      });
    }

    if (tableNames.has(table.name)) {
      issues.push({
        severity: 'error',
        message: `Duplicate table name: ${table.name}`,
        path: `/tables/${table.name}`,
      });
    }

    tableNames.add(table.name);

    if (!Array.isArray(table.brackets) || table.brackets.length === 0) {
      issues.push({
        severity: 'error',
        message: `Table ${table.name} must have at least one bracket`,
        path: `/tables/${table.name}/brackets`,
      });
      continue;
    }

    table.brackets.forEach((bracket, index) => {
      const bracketIssues = validateTableBracket(bracket, index, table.name);
      issues.push(...bracketIssues);
    });

    const validBrackets = table.brackets.filter(
      (b) =>
        (typeof b.min === 'number' || b.min === MAX_TAXABLE_INCOME_REFERENCE) &&
        (typeof b.max === 'number' || b.max === MAX_TAXABLE_INCOME_REFERENCE)
    );

    if (validBrackets.length > 1) {
      for (let i = 0; i < validBrackets.length - 1; i++) {
        const current = validBrackets[i];
        const next = validBrackets[i + 1];

        const currentMax =
          current.max === MAX_TAXABLE_INCOME_REFERENCE
            ? Number.POSITIVE_INFINITY
            : Number(current.max);
        const nextMin =
          next.min === MAX_TAXABLE_INCOME_REFERENCE
            ? Number.POSITIVE_INFINITY
            : Number(next.min);

        if (currentMax !== nextMin) {
          issues.push({
            severity: 'warning',
            message: `Gap or overlap between brackets: ${current.max} to ${next.min}`,
            path: `/tables/${table.name}/brackets`,
            suggestion:
              'Tax brackets should be contiguous (no gaps or overlaps)',
          });
        }
      }
    }

    const firstBracket = validBrackets[0];
    if (firstBracket && Number(firstBracket.min) !== 0) {
      issues.push({
        severity: 'warning',
        message: `First bracket should start at 0, found: ${firstBracket.min}`,
        path: `/tables/${table.name}/brackets/0/min`,
        suggestion: 'Tax brackets typically start from zero income',
      });
    }
  }

  return issues;
}
