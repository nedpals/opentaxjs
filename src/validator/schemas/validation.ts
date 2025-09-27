import type { RawRule } from '../types';
import type { ValidationIssue } from '../errors';

export function validateValidationRules(rule: RawRule): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!rule.validate) {
    return issues;
  }

  if (!Array.isArray(rule.validate)) {
    issues.push({
      severity: 'error',
      message: 'Validate section must be an array',
      path: '/validate',
    });
    return issues;
  }

  rule.validate.forEach((validationRule, index) => {
    const basePath = `/validate/${index}`;

    if (!validationRule.when) {
      issues.push({
        severity: 'error',
        message: 'Validation rule must have a when condition',
        path: `${basePath}/when`,
      });
    }

    if (
      typeof validationRule.error !== 'string' ||
      validationRule.error.trim() === ''
    ) {
      issues.push({
        severity: 'error',
        message: 'Validation rule must have a non-empty error message',
        path: `${basePath}/error`,
      });
    }
  });

  return issues;
}
