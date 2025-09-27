import { describe, it, expect } from 'vitest';
import { validateRule } from '@/validator/validator';
import { RuleValidationError } from '@/validator/errors';
import type { RawRule } from '@/validator/types';

const validRule: RawRule = {
  $version: '1.0.0',
  name: 'Test Income Tax',
  jurisdiction: 'PH',
  taxpayer_type: 'INDIVIDUAL',
  constants: {
    tax_rate: 0.25,
    exemption_threshold: 250000,
  },
  inputs: {
    gross_income: {
      type: 'number',
      description: 'Total gross income',
      minimum: 0,
    },
  },
  outputs: {
    taxable_income: {
      type: 'number',
      description: 'Income subject to tax',
    },
  },
  tables: [
    {
      name: 'tax_brackets',
      brackets: [
        {
          min: 0,
          max: 250000,
          rate: 0,
          base_tax: 0,
        },
        {
          min: 250000,
          max: '$$MAX_TAXABLE_INCOME',
          rate: 0.25,
          base_tax: 0,
        },
      ],
    },
  ],
  flow: [
    {
      name: 'Calculate taxable income',
      operations: [
        {
          type: 'set',
          target: 'taxable_income',
          value: '$gross_income',
        },
        {
          type: 'subtract',
          target: 'taxable_income',
          value: '$$exemption_threshold',
        },
        {
          type: 'max',
          target: 'taxable_income',
          value: 0,
        },
      ],
    },
    {
      name: 'Calculate tax liability',
      operations: [
        {
          type: 'lookup',
          target: 'liability',
          table: 'tax_brackets',
          value: 'taxable_income',
        },
      ],
    },
  ],
};

describe('RuleValidator', () => {
  describe('validateRule', () => {
    it('should validate a correct rule without errors', () => {
      const issues = validateRule(validRule);
      const errors = issues.filter((i) => i.severity === 'error');
      if (errors.length > 0) {
        console.log('Validation errors:', errors);
      }
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid rule structure', () => {
      const issues = validateRule('not an object');
      expect(issues).toHaveLength(1);
      expect(issues[0].severity).toBe('error');
      expect(issues[0].message).toContain('valid JSON object');
    });

    it('should require mandatory fields', () => {
      const incompleteRule = {
        name: 'Test Rule',
      };
      const issues = validateRule(incompleteRule);
      const errors = issues.filter((i) => i.severity === 'error');
      expect(errors.length).toBeGreaterThan(0);

      const missingFields = errors.map((e) => e.path?.split('/')[1]);
      expect(missingFields).toContain('$version');
      expect(missingFields).toContain('jurisdiction');
      expect(missingFields).toContain('taxpayer_type');
      expect(missingFields).toContain('flow');
    });

    it('should validate version format', () => {
      const invalidVersionRule = { ...validRule, $version: '1.0' };
      const issues = validateRule(invalidVersionRule);
      const versionError = issues.find((i) => i.path === '/$version');
      expect(versionError?.severity).toBe('error');
      expect(versionError?.message).toContain('Invalid version format');
    });

    it('should validate jurisdiction format', () => {
      const invalidJurisdictionRule = { ...validRule, jurisdiction: 'INVALID' };
      const issues = validateRule(invalidJurisdictionRule);
      const jurisdictionError = issues.find((i) => i.path === '/jurisdiction');
      expect(jurisdictionError?.severity).toBe('error');
      expect(jurisdictionError?.message).toContain('Invalid jurisdiction code');
    });

    it('should validate taxpayer types', () => {
      const unknownTypeRule = { ...validRule, taxpayer_type: 'UNKNOWN_TYPE' };
      const issues = validateRule(unknownTypeRule);
      const typeError = issues.find((i) => i.path === '/taxpayer_type');
      expect(typeError?.severity).toBe('warning');
      expect(typeError?.message).toContain('Unknown taxpayer type');
    });

    it('should validate variable identifiers', () => {
      const invalidIdentifierRule = {
        ...validRule,
        inputs: {
          'Invalid-Name': {
            type: 'number',
            description: 'Invalid identifier',
          },
        },
      };
      const issues = validateRule(invalidIdentifierRule);
      const identifierError = issues.find((i) =>
        i.message.includes('Invalid input identifier')
      );
      expect(identifierError?.severity).toBe('error');
    });

    it('should validate constant identifiers', () => {
      const invalidConstantRule = {
        ...validRule,
        constants: {
          'Invalid-Name': 999999,
        },
      };
      const issues = validateRule(invalidConstantRule);
      const identifierError = issues.find((i) =>
        i.message.includes('Invalid constant identifier')
      );
      expect(identifierError?.severity).toBe('error');
    });

    it('should validate table structures', () => {
      const invalidTableRule = {
        ...validRule,
        tables: [
          {
            name: 'invalid_table',
            brackets: [
              {
                min: 100,
                max: 50,
                rate: 0.25,
                base_tax: 0,
              },
            ],
          },
        ],
      };
      const issues = validateRule(invalidTableRule);
      const tableError = issues.find(
        (i) => i.message.includes('min') && i.message.includes('max')
      );
      expect(tableError?.severity).toBe('error');
    });

    it('should validate operations', () => {
      const invalidOperationRule = {
        ...validRule,
        flow: [
          {
            name: 'Invalid operation',
            operations: [
              {
                type: 'invalid_type',
                target: 'some_variable',
                value: 100,
              },
            ],
          },
        ],
      };
      const issues = validateRule(invalidOperationRule);
      const operationError = issues.find((i) =>
        i.message.includes('Invalid operation type')
      );
      expect(operationError?.severity).toBe('error');
    });

    it('should validate conditional structure', () => {
      const conditionalRule = {
        ...validRule,
        outputs: {
          ...validRule.outputs,
          result: {
            type: 'number',
            description: 'Calculation result',
          },
        },
        flow: [
          {
            name: 'Conditional step',
            cases: [
              {
                when: {
                  $gross_income: {
                    gt: 1000,
                  },
                },
                operations: [
                  {
                    type: 'set',
                    target: 'result',
                    value: 1,
                  },
                ],
              },
            ],
          },
        ],
      };
      const issues = validateRule(conditionalRule);
      const errors = issues.filter((i) => i.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('should validate filing schedules', () => {
      const scheduleRule = {
        ...validRule,
        filing_schedules: [
          {
            name: 'Invalid Schedule',
            frequency: 'invalid_frequency',
            filing_day: 50,
            forms: [
              { form: 'Form123' }
            ],
          },
        ],
      };
      const issues = validateRule(scheduleRule);
      const frequencyError = issues.find((i) =>
        i.message.includes('Invalid frequency')
      );
      const dayError = issues.find((i) =>
        i.message.includes('Invalid filing day')
      );
      expect(frequencyError?.severity).toBe('error');
      expect(dayError?.severity).toBe('error');
    });

    it('should handle null values in calculations', () => {
      const nullValueRule = {
        ...validRule,
        constants: {
          null_constant: null,
        },
      };
      const issues = validateRule(nullValueRule);
      const nullError = issues.find((i) =>
        i.message.includes('cannot be null')
      );
      expect(nullError?.severity).toBe('error');
    });

    it('should validate in quick mode', () => {
      const issues = validateRule(validRule, { mode: 'quick' });
      expect(issues).toHaveLength(0);
    });

    it('should validate with custom builtins', () => {
      const customRule = {
        ...validRule,
        constants: {
          MAX_TAXABLE_INCOME: 999999,
        },
      };
      const issues = validateRule(customRule);
      const predefinedError = issues.find((i) =>
        i.message.includes('Cannot redefine predefined constant')
      );
      expect(predefinedError).toBeUndefined();
    });

    it('should validate identifier patterns', () => {
      const invalidIdentifierRule = {
        ...validRule,
        inputs: {
          ...validRule.inputs,
          // Invalid identifier: starts with uppercase
          GrossIncome: {
            type: 'number',
            description: 'Invalid identifier',
          },
          // Invalid identifier: starts with underscore
          _private: {
            type: 'number',
            description: 'Invalid identifier',
          },
        },
      };

      const issues = validateRule(invalidIdentifierRule);
      const identifierErrors = issues.filter((i) =>
        i.message.includes('Invalid input identifier')
      );

      // Should detect identifier pattern violations
      expect(identifierErrors.length).toBeGreaterThan(0);

      // Should find specific identifier errors
      const uppercaseError = identifierErrors.find((i) =>
        i.path?.includes('GrossIncome')
      );
      expect(uppercaseError?.message).toContain('Invalid input identifier');

      const underscoreError = identifierErrors.find((i) =>
        i.path?.includes('_private')
      );
      expect(underscoreError?.message).toContain('Invalid input identifier');
    });

    it('should warn when case has empty operations', () => {
      const emptyOperationsRule = {
        ...validRule,
        flow: [
          {
            name: 'Test conditional step',
            cases: [
              {
                when: {
                  $gross_income: {
                    gt: 1000,
                  },
                },
                operations: [], // Empty operations array
              },
            ],
          },
        ],
      };

      const issues = validateRule(emptyOperationsRule);
      const emptyOpsWarning = issues.find((i) =>
        i.message.includes('Case has no operations') && i.severity === 'warning'
      );

      expect(emptyOpsWarning).toBeDefined();
      expect(emptyOpsWarning?.path).toBe('/flow/0/cases/0/operations');
      expect(emptyOpsWarning?.message).toContain('calculations may be skipped');
      expect(emptyOpsWarning?.suggestion).toContain('Consider adding operations');
    });
  });

  describe('RuleValidationError', () => {
    it('should create error from issues', () => {
      const issues = [
        {
          severity: 'error' as const,
          message: 'Test error',
          path: '/test',
        },
      ];
      const error = RuleValidationError.fromIssues(issues);
      expect(error.issues).toEqual(issues);
      expect(error.message).toContain('1 error');
    });

    it('should handle warnings only', () => {
      const issues = [
        {
          severity: 'warning' as const,
          message: 'Test warning',
          path: '/test',
        },
      ];
      const error = RuleValidationError.fromIssues(issues);
      expect(error.message).toContain('warnings');
    });
  });
});
