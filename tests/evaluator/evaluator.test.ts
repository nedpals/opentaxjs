import { describe, it, expect } from 'vitest';
import { RuleEvaluator } from '@/evaluator';
import type { Rule } from '@/types';

describe('RuleEvaluator', () => {
  const evaluator = new RuleEvaluator();

  describe('basic operations', () => {
    it('should process a simple set operation', () => {
      const rule: Rule = {
        $version: '1.0',
        name: 'Simple Set Test',
        jurisdiction: 'test',
        taxpayer_type: 'individual',
        author: 'test',
        constants: {},
        tables: [],
        inputs: {
          income: {
            type: 'number',
            description: 'Annual income'
          }
        },
        outputs: {
          liability: {
            type: 'number',
            description: 'Tax liability'
          }
        },
        filing_schedules: [],
        flow: [
          {
            name: 'Calculate liability',
            operations: [
              {
                type: 'set',
                target: 'liability',
                value: '$income'
              }
            ]
          }
        ]
      };

      const result = evaluator.evaluate(rule, { income: 50000 });
      expect(result.liability).toBe(50000);
    });

    it('should process arithmetic operations', () => {
      const rule: Rule = {
        $version: '1.0',
        name: 'Arithmetic Test',
        jurisdiction: 'test',
        taxpayer_type: 'individual',
        author: 'test',
        constants: {
          tax_rate: 0.15
        },
        tables: [],
        inputs: {
          income: {
            type: 'number',
            description: 'Annual income'
          },
          deductions: {
            type: 'number',
            description: 'Total deductions'
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
        filing_schedules: [],
        flow: [
          {
            name: 'Calculate taxable income',
            operations: [
              {
                type: 'set',
                target: 'taxable_income',
                value: '$income'
              },
              {
                type: 'subtract',
                target: 'taxable_income',
                value: '$deductions'
              },
              {
                type: 'max',
                target: 'taxable_income',
                value: 0
              }
            ]
          },
          {
            name: 'Calculate liability',
            operations: [
              {
                type: 'set',
                target: 'liability',
                value: 'taxable_income'
              },
              {
                type: 'multiply',
                target: 'liability',
                value: '$$tax_rate'
              }
            ]
          }
        ]
      };

      const result = evaluator.evaluate(rule, {
        income: 60000,
        deductions: 10000
      });

      expect(result.taxable_income).toBe(50000);
      expect(result.liability).toBe(7500); // 50000 * 0.15
    });

    it('should handle conditional cases', () => {
      const rule: Rule = {
        $version: '1.0',
        name: 'Conditional Test',
        jurisdiction: 'test',
        taxpayer_type: 'individual',
        author: 'test',
        constants: {},
        tables: [],
        inputs: {
          income: {
            type: 'number',
            description: 'Annual income'
          },
          is_senior: {
            type: 'boolean',
            description: 'Is senior citizen'
          }
        },
        outputs: {
          exemption: {
            type: 'number',
            description: 'Tax exemption'
          }
        },
        filing_schedules: [],
        flow: [
          {
            name: 'Apply exemption',
            cases: [
              {
                when: {
                  is_senior: { eq: true }
                },
                operations: [
                  {
                    type: 'set',
                    target: 'exemption',
                    value: 20000
                  }
                ]
              },
              {
                when: {
                  is_senior: { eq: false }
                },
                operations: [
                  {
                    type: 'set',
                    target: 'exemption',
                    value: 10000
                  }
                ]
              }
            ]
          }
        ]
      };

      const seniorResult = evaluator.evaluate(rule, {
        income: 50000,
        is_senior: true
      });
      expect(seniorResult.exemption).toBe(20000);

      const regularResult = evaluator.evaluate(rule, {
        income: 50000,
        is_senior: false
      });
      expect(regularResult.exemption).toBe(10000);
    });

    it('should handle lookup operations with tax brackets', () => {
      const rule: Rule = {
        $version: '1.0',
        name: 'Tax Bracket Test',
        jurisdiction: 'test',
        taxpayer_type: 'individual',
        author: 'test',
        constants: {},
        tables: [
          {
            name: 'tax_brackets',
            brackets: [
              { min: 0, max: 10000, rate: 0.1, base_tax: 0 },
              { min: 10000, max: 50000, rate: 0.2, base_tax: 1000 },
              { min: 50000, max: null, rate: 0.3, base_tax: 9000 }
            ]
          }
        ],
        inputs: {
          taxable_income: {
            type: 'number',
            description: 'Taxable income'
          }
        },
        outputs: {
          liability: {
            type: 'number',
            description: 'Tax liability'
          }
        },
        filing_schedules: [],
        flow: [
          {
            name: 'Calculate tax',
            operations: [
              {
                type: 'lookup',
                target: 'liability',
                table: 'tax_brackets',
                value: '$taxable_income'
              }
            ]
          }
        ]
      };

      // Test first bracket (0-10000)
      const lowIncomeResult = evaluator.evaluate(rule, { taxable_income: 5000 });
      expect(lowIncomeResult.liability).toBe(500); // 5000 * 0.1 + 0

      // Test second bracket (10000-50000)
      const midIncomeResult = evaluator.evaluate(rule, { taxable_income: 30000 });
      expect(midIncomeResult.liability).toBe(5000); // (30000-10000) * 0.2 + 1000 = 20000 * 0.2 + 1000 = 4000 + 1000

      // Test third bracket (50000+)
      const highIncomeResult = evaluator.evaluate(rule, { taxable_income: 100000 });
      expect(highIncomeResult.liability).toBe(24000); // (100000-50000) * 0.3 + 9000 = 50000 * 0.3 + 9000
    });
  });
});
