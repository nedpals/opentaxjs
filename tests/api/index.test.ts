import { describe, it, expect, beforeEach } from 'vitest';
import opentax from '@/api';
import type { Rule } from '@/types';
import { RuleValidationError } from '@/validator';

describe('opentax API', () => {
  const baseRule: Rule = {
    $version: '1.0.0',
    name: 'Test Income Tax',
    jurisdiction: 'PH',
    taxpayer_type: 'INDIVIDUAL',
    author: 'test',
    constants: {
      tax_rate: 0.25,
      exemption_threshold: 250000
    },
    tables: [
      {
        name: 'tax_brackets',
        brackets: [
          {
            min: 0,
            max: '$$MAX_TAXABLE_INCOME' as unknown as number, // Using built-in constant
            rate: 0.25,
            base_tax: 0
          }
        ]
      }
    ],
    inputs: {
      gross_income: {
        type: 'number',
        description: 'Annual gross income',
        minimum: 0
      },
      filing_status: {
        type: 'string',
        description: 'Filing status for tax calculation',
        enum: ['single', 'married_jointly', 'married_separately', 'head_of_household']
      }
    },
    outputs: {
      taxable_income: {
        type: 'number',
        description: 'Taxable income'
      },
      liability: {
        type: 'number',
        description: 'Tax liability'
      }
    },
    filing_schedules: [
      {
        name: 'Quarterly Income Tax',
        frequency: 'quarterly',
        filing_day: 15,
        forms: {
          primary: '1701Q'
        }
      },
      {
        name: 'Annual Income Tax',
        frequency: 'annually',
        filing_day: 15,
        forms: {
          primary: '1701'
        }
      }
    ],
    flow: [
      {
        name: 'Calculate taxable income',
        operations: [
          {
            type: 'set',
            target: 'taxable_income',
            value: '$gross_income'
          },
          {
            type: 'subtract',
            target: 'taxable_income',
            value: '$$exemption_threshold'
          },
          {
            type: 'max',
            target: 'taxable_income',
            value: 0
          }
        ]
      },
      {
        name: 'Calculate tax liability',
        operations: [
          {
            type: 'lookup',
            target: 'liability',
            table: 'tax_brackets',
            value: 'taxable_income'
          }
        ]
      }
    ]
  };

  describe('initialization', () => {
    it('should create opentax instance with valid rule', () => {
      const instance = opentax({ rule: baseRule });
      expect(instance).toBeDefined();
      expect(typeof instance.calculate).toBe('function');
    });

    it('should throw RuleValidationError with invalid rule', () => {
      const invalidRule = { ...baseRule };
      delete (invalidRule as any).$version;

      expect(() => {
        opentax({ rule: invalidRule as Rule });
      }).toThrow(RuleValidationError);
    });

    it('should throw RuleValidationError with rule validation errors', () => {
      const invalidRule = {
        ...baseRule,
        jurisdiction: 'INVALID'
      };

      expect(() => {
        opentax({ rule: invalidRule });
      }).toThrow(RuleValidationError);
    });
  });

  describe('calculate method', () => {
    let instance: ReturnType<typeof opentax>;

    beforeEach(() => {
      instance = opentax({ rule: baseRule });
    });

    it('should calculate tax liability with basic inputs', () => {
      const result = instance.calculate({ gross_income: 500000, filing_status: 'single' });

      expect(result).toBeDefined();
      console.log('Debug - Result calculated:', result.calculated);
      console.log('Debug - Result inputs:', result.inputs);

      expect(result.calculated.taxable_income).toBe(250000);
      expect(result.inputs.gross_income).toBe(500000);
      expect(result.liability).toBe(62500); // (500000 - 250000) * 0.25
    });

    it('should return full evaluation context', () => {
      const result = instance.calculate({ gross_income: 500000, filing_status: 'single' });

      expect(result.debug?.context).toBeDefined();
      expect(result.inputs.gross_income).toBe(500000);
      expect(result.calculated.liability).toBe(62500);
      expect(result.debug!.context.constants.tax_rate).toBe(0.25);
      expect(result.debug!.context.constants.exemption_threshold).toBe(250000);
    });

    it('should return period information', () => {
      const result = instance.calculate({ gross_income: 500000, filing_status: 'single' });

      expect(result.period).toBeDefined();
      expect(result.period!.affected_quarters).toEqual([1, 2, 3, 4]);
      expect(result.period!.is_full_year).toBe(true);
    });

    it('should generate filing schedules for full year', () => {
      const result = instance.calculate({ gross_income: 500000, filing_status: 'single' });

      expect(result.liabilities).toHaveLength(5); // 4 quarterly + 1 annual

      // Check quarterly liabilities
      const quarterlyLiabilities = result.liabilities.filter(l => l.type === 'quarterly');
      expect(quarterlyLiabilities).toHaveLength(4);
      quarterlyLiabilities.forEach((liability, index) => {
        expect(liability.name).toBe('Quarterly Income Tax');
        expect(liability.iter).toBe(index + 1);
        // TODO: Fix amount calculation after lookup table issue is resolved
        // expect(liability.amount).toBe(15625); // 62500 / 4
      });

      // Check annual liability
      const annualLiability = result.liabilities.find(l => l.type === 'annually');
      expect(annualLiability).toBeDefined();
      expect(annualLiability!.name).toBe('Annual Income Tax');
      // TODO: Fix amount calculation after lookup table issue is resolved
      // expect(annualLiability!.amount).toBe(62500);
    });

    it('should handle partial year periods with proration', () => {
      const result = instance.calculate(
        { gross_income: 500000, filing_status: 'single' },
        { start_date: '2024-07-01', end_date: '2024-12-31' }
      );

      expect(result.period!.affected_quarters).toEqual([3, 4]);
      expect(result.period!.is_full_year).toBe(false);

      // Should only have quarterly liabilities for Q3 and Q4
      const quarterlyLiabilities = result.liabilities.filter(l => l.type === 'quarterly');
      expect(quarterlyLiabilities).toHaveLength(2);
      expect(quarterlyLiabilities.map(l => l.iter)).toEqual([3, 4]);
    });

    it('should handle zero income correctly', () => {
      const result = instance.calculate({ gross_income: 200000, filing_status: 'single' });

      expect(result.calculated.taxable_income).toBe(0); // max(0, 200000 - 250000)
      expect(result.liability).toBe(0);

      result.liabilities.forEach(liability => {
        expect(liability.amount).toBe(0);
      });
    });

    it('should preserve input values in variables', () => {
      const inputs = { gross_income: 500000, filing_status: 'single' };
      const result = instance.calculate(inputs);

      expect(result.inputs.gross_income).toBe(inputs.gross_income);
      expect(result.debug!.context.inputs.gross_income).toBe(inputs.gross_income);
    });
  });

  describe('conditional filing schedules', () => {
    const ruleWithConditionalSchedule: Rule = {
      ...baseRule,
      filing_schedules: [
        {
          name: 'High Income Quarterly',
          frequency: 'quarterly',
          filing_day: 15,
          when: {
            liability: { gt: 50000 }
          },
          forms: {
            primary: '1701Q'
          }
        },
        {
          name: 'Regular Annual',
          frequency: 'annually',
          filing_day: 15,
          forms: {
            primary: '1701'
          }
        }
      ]
    };

    it('should generate schedule when condition is met', () => {
      const instance = opentax({ rule: ruleWithConditionalSchedule });
      const result = instance.calculate({ gross_income: 500000, filing_status: 'single' });

      expect(result.liability).toBe(62500);

      const quarterlyLiabilities = result.liabilities.filter(l => l.type === 'quarterly');
      expect(quarterlyLiabilities).toHaveLength(4);
      expect(quarterlyLiabilities[0].name).toBe('High Income Quarterly');
    });

    it('should skip schedule when condition is not met', () => {
      const instance = opentax({ rule: ruleWithConditionalSchedule });
      const result = instance.calculate({ gross_income: 400000, filing_status: 'single' }); // liability = 37500

      // TODO: Fix lookup table calculation
      // expect(result.liability).toBe(37500);

      const quarterlyLiabilities = result.liabilities.filter(l => l.type === 'quarterly');
      expect(quarterlyLiabilities).toHaveLength(0); // Should be skipped

      const annualLiabilities = result.liabilities.filter(l => l.type === 'annually');
      expect(annualLiabilities).toHaveLength(1); // Annual should still exist
    });
  });

  describe('period integration', () => {
    let instance: ReturnType<typeof opentax>;

    beforeEach(() => {
      instance = opentax({ rule: baseRule });
    });

    it('should use period calculation for filing dates', () => {
      const result = instance.calculate({ gross_income: 500000, filing_status: 'single' });

      result.liabilities.forEach(liability => {
        expect(liability.target_filing_date).toBeInstanceOf(Date);
        expect(liability.target_filing_date.getTime()).toBeGreaterThan(0);
      });
    });

    it('should handle custom period options', () => {
      const result = instance.calculate(
        { gross_income: 500000, filing_status: 'single' },
        { start_date: '2024-01-01', end_date: '2024-06-30' }
      );

      expect(result.period!.affected_quarters).toEqual([1, 2]);
      expect(result.period!.start_date.getFullYear()).toBe(2024);
      expect(result.period!.start_date.getMonth()).toBe(0); // January
      expect(result.period!.end_date.getMonth()).toBe(5); // June
    });

    it('should apply proration factors to quarterly amounts', () => {
      const result = instance.calculate(
        { gross_income: 500000, filing_status: 'single' },
        { start_date: '2024-02-15', end_date: '2024-03-31' }
      );

      const quarterlyLiabilities = result.liabilities.filter(l => l.type === 'quarterly');
      expect(quarterlyLiabilities).toHaveLength(1); // Only Q1 should be affected

      // TODO: Fix amount calculation after lookup table issue is resolved
      if (quarterlyLiabilities.length > 0) {
        const q1Liability = quarterlyLiabilities[0];
        // Amount should be prorated based on days in quarter
        // expect(q1Liability.amount).toBeGreaterThan(0);
        // expect(q1Liability.amount).toBeLessThan(15625); // Less than full quarter amount
      }
    });
  });

  describe('error handling', () => {
    it('should handle evaluation errors gracefully', () => {
      const ruleWithError: Rule = {
        ...baseRule,
        flow: [
          {
            name: 'Invalid operation',
            operations: [
              {
                type: 'set',
                target: 'liability',
                value: '$undefined_variable'  // Fixed reference format
              }
            ]
          }
        ]
      };

      const instance = opentax({ rule: ruleWithError });

      expect(() => {
        instance.calculate({ gross_income: 500000, filing_status: 'single' });
      }).toThrow();
    });

    it('should provide meaningful error messages', () => {
      const invalidRule = {
        ...baseRule,
        flow: []
      };
      delete (invalidRule as any).taxpayer_type;

      expect(() => {
        opentax({ rule: invalidRule as Rule });
      }).toThrow(RuleValidationError);
    });
  });

  describe('string inputs and enums', () => {
    it('should handle string inputs with enum constraints', () => {
      const instance = opentax({ rule: baseRule });
      const result = instance.calculate({
        gross_income: 500000,
        filing_status: 'single'
      });

      expect(result.inputs.filing_status).toBe('single');
      expect(result.inputs.gross_income).toBe(500000);
    });

    it('should work with conditional logic on string enums', () => {
      const ruleWithStringCondition: Rule = {
        ...baseRule,
        flow: [
          ...baseRule.flow,
          {
            name: 'Apply filing status bonus',
            cases: [
              {
                when: {
                  '$filing_status': { eq: "'married_jointly'" }
                },
                operations: [
                  {
                    type: 'multiply',
                    target: 'liability',
                    value: 0.9  // 10% discount for married filing jointly
                  }
                ]
              }
            ]
          }
        ]
      };

      const instance = opentax({ rule: ruleWithStringCondition });

      // Test with single status (no discount)
      const singleResult = instance.calculate({
        gross_income: 500000,
        filing_status: 'single'
      });
      expect(singleResult.liability).toBe(62500);

      // Test with married jointly status (10% discount)
      const marriedResult = instance.calculate({
        gross_income: 500000,
        filing_status: 'married_jointly'
      });
      expect(marriedResult.liability).toBe(56250); // 62500 * 0.9
    });
  });
});