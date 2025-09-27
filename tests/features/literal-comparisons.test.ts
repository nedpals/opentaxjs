import { describe, it, expect } from 'vitest';
import opentax from '@/api';
import type { Rule } from '@/types';

describe('Literal-First Comparison Values', () => {
  const testRule: Rule = {
    $version: '1.0.0',
    name: 'Literal Comparison Test',
    jurisdiction: 'US',
    taxpayer_type: 'INDIVIDUAL',
    inputs: {
      status: {
        type: 'string',
        enum: ['SINGLE', 'MARRIED', 'HEAD_OF_HOUSEHOLD'],
        description: ''
      },
      income: {
        type: 'number',
        description: ''
      },
      other_income: {
        type: 'number',
        when: {
          '$status': {
            eq: 'MARRIED' // This should be treated as literal "MARRIED", not a variable
          }
        },
        description: ''
      }
    },
    outputs: {
      liability: {
        type: 'number',
        description: 'Tax liability'
      }
    },
    validate: [
      {
        when: {
          and: [
            {
              '$status': {
                eq: 'SINGLE'  // Literal string comparison
              }
            },
            {
              '$income': {
                gt: 100000  // Literal number comparison
              }
            }
          ]
        },
        error: 'Single filers with income > 100000 must use special form'
      }
    ],
    flow: [
      {
        name: 'Calculate Tax',
        cases: [
          {
            when: {
              '$status': {
                eq: 'SINGLE'  // Literal comparison in flow
              }
            },
            operations: [
              {
                type: 'set',
                target: 'liability',
                value: 1000
              }
            ]
          },
          {
            when: {
              '$status': {
                eq: 'MARRIED'  // Another literal comparison
              }
            },
            operations: [
              {
                type: 'set',
                target: 'liability',
                value: 800
              }
            ]
          },
          {
            operations: [
              {
                type: 'set',
                target: 'liability',
                value: 1200
              }
            ]
          }
        ]
      }
    ]
  };

  it('should treat comparison values as literals by default', () => {
    const instance = opentax({ rule: testRule });

    // Test SINGLE status - should match literal "SINGLE"
    const singleResult = instance.calculate({
      status: 'SINGLE',
      income: 50000
    });
    expect(singleResult.liability).toBe(1000);

    // Test MARRIED status - should match literal "MARRIED"
    const marriedResult = instance.calculate({
      status: 'MARRIED',
      income: 50000,
      other_income: 10000  // Required for married
    });
    expect(marriedResult.liability).toBe(800);
  });

  it('should handle literal comparisons in conditional inputs', () => {
    const instance = opentax({ rule: testRule });

    // MARRIED status should require other_income
    expect(() => {
      instance.calculate({
        status: 'MARRIED',
        income: 50000
        // Missing other_income which should be required for MARRIED
      });
    }).toThrow(/Required input 'other_income' not provided/);

    // SINGLE status should NOT require other_income
    expect(() => {
      instance.calculate({
        status: 'SINGLE',
        income: 50000
      });
    }).not.toThrow();
  });

  it('should handle literal comparisons in validation rules', () => {
    const instance = opentax({ rule: testRule });

    // Should trigger validation error for SINGLE with high income
    expect(() => {
      instance.calculate({
        status: 'SINGLE',
        income: 150000
      });
    }).toThrow(/Single filers with income > 100000 must use special form/);

    // Should NOT trigger validation for MARRIED with high income
    expect(() => {
      instance.calculate({
        status: 'MARRIED',
        income: 150000,
        other_income: 10000
      });
    }).not.toThrow();

    // Should NOT trigger validation for SINGLE with low income
    expect(() => {
      instance.calculate({
        status: 'SINGLE',
        income: 80000
      });
    }).not.toThrow();
  });

  it('should handle numbers as literal comparisons', () => {
    const ruleWithNumericComparison: Rule = {
      ...testRule,
      inputs: {
        ...testRule.inputs,
        age: {
          type: 'number',
          description: ''
        }
      },
      validate: [
        {
          when: {
            '$age': {
              lt: 18  // Literal number 18, not a variable
            }
          },
          error: 'Must be at least 18 years old'
        }
      ]
    };

    const instance = opentax({ rule: ruleWithNumericComparison });

    // Should trigger validation for age < 18
    expect(() => {
      instance.calculate({
        status: 'SINGLE',
        income: 50000,
        age: 16  // Below 18
      });
    }).toThrow(/Must be at least 18 years old/);

    // Should NOT trigger for age >= 18
    expect(() => {
      instance.calculate({
        status: 'SINGLE',
        income: 50000,
        age: 21  // Above 18
      });
    }).not.toThrow();
  });

  it('should still evaluate expressions when prefixed with $ or =', () => {
    const ruleWithExpressions: Rule = {
      $version: '1.0.0',
      name: 'Expression Test',
      jurisdiction: 'US',
      taxpayer_type: 'INDIVIDUAL',
      constants: {
        threshold: 100000
      },
      inputs: {
        status: {
          type: 'string', enum: ['SINGLE', 'MARRIED'],
          description: ''
        },
        income: {
          type: 'number',
          description: ''
        },
        spouse_income: {
          type: 'number',
          when: {
            '$income': {
              gt: '$$threshold' // This should evaluate $$threshold as expression
            }
          },
          description: ''
        }
      },
      outputs: { liability: {
        type: 'number',
        description: ''
      } },
      flow: [
        {
          name: 'Calculate',
          operations: [{ type: 'set', target: 'liability', value: 1000 }]
        }
      ]
    };

    const instance = opentax({ rule: ruleWithExpressions });

    // Should require spouse_income when income > threshold (100000)
    expect(() => {
      instance.calculate({
        status: 'SINGLE',
        income: 150000  // Above threshold
        // Missing spouse_income
      });
    }).toThrow(/Required input 'spouse_income' not provided/);

    // Should NOT require spouse_income when income <= threshold
    expect(() => {
      instance.calculate({
        status: 'SINGLE',
        income: 80000  // Below threshold
      });
    }).not.toThrow();
  });
});