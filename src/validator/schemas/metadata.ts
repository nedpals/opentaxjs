import type { Rule, ValidatorConfig } from '../types';
import { VALID_TAXPAYER_TYPES } from '../types';
import type { ValidationIssue } from '../errors';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;
const VERSION_REGEX = /^\d+\.\d+\.\d+$/;

export function validateMetadata(
  rule: Rule,
  config: ValidatorConfig
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!VERSION_REGEX.test(rule.$version)) {
    issues.push({
      severity: 'error',
      message: `Invalid version format: ${rule.$version}`,
      path: '/$version',
      suggestion: 'Use semantic versioning format (e.g., "1.0.0")',
    });
  }

  if (typeof rule.name !== 'string' || rule.name.trim() === '') {
    issues.push({
      severity: 'error',
      message: 'Name must be a non-empty string',
      path: '/name',
    });
  }

  if (!ISO_COUNTRY_CODE_REGEX.test(rule.jurisdiction)) {
    issues.push({
      severity: 'error',
      message: `Invalid jurisdiction code: ${rule.jurisdiction}`,
      path: '/jurisdiction',
      suggestion: 'Use ISO 3166 two-letter country codes (e.g., "PH", "US")',
    });
  }

  if (
    !VALID_TAXPAYER_TYPES.includes(
      rule.taxpayer_type as (typeof VALID_TAXPAYER_TYPES)[number]
    ) &&
    !config.allowUnknownTaxpayerTypes
  ) {
    if (typeof rule.taxpayer_type === 'string') {
      issues.push({
        severity: 'warning',
        message: `Unknown taxpayer type: ${rule.taxpayer_type}`,
        path: '/taxpayer_type',
        suggestion: `Consider using one of: ${VALID_TAXPAYER_TYPES.join(', ')}`,
      });
    } else {
      issues.push({
        severity: 'error',
        message: 'Taxpayer type must be a string',
        path: '/taxpayer_type',
      });
    }
  }

  if (rule.effective_from && !ISO_DATE_REGEX.test(rule.effective_from)) {
    issues.push({
      severity: 'error',
      message: `Invalid effective_from date format: ${rule.effective_from}`,
      path: '/effective_from',
      suggestion: 'Use ISO date format (YYYY-MM-DD)',
    });
  }

  if (rule.effective_to && !ISO_DATE_REGEX.test(rule.effective_to)) {
    issues.push({
      severity: 'error',
      message: `Invalid effective_to date format: ${rule.effective_to}`,
      path: '/effective_to',
      suggestion: 'Use ISO date format (YYYY-MM-DD)',
    });
  }

  if (
    rule.effective_from &&
    rule.effective_to &&
    rule.effective_from >= rule.effective_to
  ) {
    issues.push({
      severity: 'error',
      message: 'effective_from must be before effective_to',
      path: '/effective_from',
    });
  }

  if (rule.references && !Array.isArray(rule.references)) {
    issues.push({
      severity: 'error',
      message: 'References must be an array of strings',
      path: '/references',
    });
  } else if (rule.references) {
    rule.references.forEach((ref, index) => {
      if (typeof ref !== 'string') {
        issues.push({
          severity: 'error',
          message: `Reference at index ${index} must be a string`,
          path: `/references/${index}`,
        });
      }
    });
  }

  if (rule.author !== undefined && typeof rule.author !== 'string') {
    issues.push({
      severity: 'error',
      message: 'Author must be a string',
      path: '/author',
    });
  }

  if (rule.category !== undefined && typeof rule.category !== 'string') {
    issues.push({
      severity: 'error',
      message: 'Category must be a string',
      path: '/category',
    });
  }

  return issues;
}
