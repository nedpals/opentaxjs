import type { RawRule } from '../types';
import type { ValidationIssue } from '../errors';
import { VALID_FREQUENCIES } from '../../types';

export function validateFilingSchedules(rule: RawRule): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!rule.filing_schedules || rule.filing_schedules.length === 0) {
    return issues;
  }

  rule.filing_schedules.forEach((schedule, index) => {
    const basePath = `/filing_schedules/${index}`;

    if (typeof schedule.name !== 'string' || schedule.name.trim() === '') {
      issues.push({
        severity: 'error',
        message: 'Filing schedule must have a non-empty name',
        path: `${basePath}/name`,
      });
    }

    if (
      !VALID_FREQUENCIES.includes(
        schedule.frequency as (typeof VALID_FREQUENCIES)[number]
      )
    ) {
      issues.push({
        severity: 'error',
        message: `Invalid frequency: ${schedule.frequency}`,
        path: `${basePath}/frequency`,
        suggestion: `Must be one of: ${VALID_FREQUENCIES.join(', ')}`,
      });
    }

    if (typeof schedule.filing_day === 'number') {
      if (schedule.filing_day < 1 || schedule.filing_day > 31) {
        issues.push({
          severity: 'error',
          message: `Invalid filing day: ${schedule.filing_day}`,
          path: `${basePath}/filing_day`,
          suggestion: 'Filing day must be between 1 and 31',
        });
      }
    } else if (typeof schedule.filing_day === 'string') {
      if (!schedule.filing_day.startsWith('$$')) {
        issues.push({
          severity: 'error',
          message: `Invalid filing day reference: ${schedule.filing_day}`,
          path: `${basePath}/filing_day`,
          suggestion:
            'String values must be constant references (e.g., $$quarterly_filing_day)',
        });
      } else {
        const constantName = schedule.filing_day.slice(2);
        const constants = new Set(Object.keys(rule.constants || {}));
        if (!constants.has(constantName)) {
          issues.push({
            severity: 'error',
            message: `Undefined constant: ${schedule.filing_day}`,
            path: `${basePath}/filing_day`,
            suggestion: `Define ${constantName} in the constants section`,
          });
        }
      }
    } else {
      issues.push({
        severity: 'error',
        message: 'Filing day must be a number or constant reference',
        path: `${basePath}/filing_day`,
      });
    }

    if (!schedule.forms) {
      issues.push({
        severity: 'error',
        message: 'Filing schedule must specify forms',
        path: `${basePath}/forms`,
      });
    } else {
      if (
        typeof schedule.forms.primary !== 'string' ||
        schedule.forms.primary.trim() === ''
      ) {
        issues.push({
          severity: 'error',
          message: 'Filing schedule must have a primary form',
          path: `${basePath}/forms/primary`,
        });
      }

      if (schedule.forms.attachments !== undefined) {
        if (!Array.isArray(schedule.forms.attachments)) {
          issues.push({
            severity: 'error',
            message: 'Attachments must be an array',
            path: `${basePath}/forms/attachments`,
          });
        } else {
          schedule.forms.attachments.forEach((attachment, attachmentIndex) => {
            if (typeof attachment !== 'string') {
              issues.push({
                severity: 'error',
                message: `Attachment at index ${attachmentIndex} must be a string`,
                path: `${basePath}/forms/attachments/${attachmentIndex}`,
              });
            }
          });
        }
      }
    }

    if (schedule.filing_day === null) {
      issues.push({
        severity: 'error',
        message: 'Filing day cannot be null',
        path: `${basePath}/filing_day`,
        suggestion: 'Use explicit values instead of null',
      });
    }
  });

  return issues;
}
