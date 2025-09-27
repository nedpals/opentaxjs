import { describe, it, expect } from 'vitest';
import opentax from '@/api';
import type { Rule } from '@/types';

describe('Validation Rules', () => {
  const testRule: Rule = {
    $version: '1.0.0',
    name: 'Validation Test',
    jurisdiction: 'US',
    taxpayer_type: 'INDIVIDUAL',
    constants: {
      vat_threshold: 3000000,
      min_age: 18
    },
    inputs: {
      income_type: {
        type: 'string',
        enum: ['COMPENSATION', 'BUSINESS'],
        description: ''
      },
      gross_receipts: {
        type: 'number',
        when: {
          '$income_type': { eq: 'BUSINESS' }
        },
        description: ''
      },
      tax_option: {
        type: 'string',
        enum: ['GRADUATED', 'FLAT_8_PERCENT'],
        when: {
          '$income_type': { eq: 'BUSINESS' }
        },
        description: ''
      },
      age: {
        type: 'number',
        description: ''
      }
    },
    outputs: {
      tax_liability: {
        type: 'number',
        description: ''
      }
    },
    validate: [
      {
        when: {
          and: [
            {
              '$tax_option': { eq: 'FLAT_8_PERCENT' }
            },
            {
              '$gross_receipts': { gt: '$$vat_threshold' }
            }
          ]
        },
        error: 'Flat 8% rate not available for receipts above VAT threshold'
      },
      {
        when: {
          '$age': { lt: '$$min_age' }
        },
        error: 'Must be at least 18 years old to file taxes'
      }
    ],
    flow: [
      {
        name: 'Calculate Tax',
        operations: [
          {
            type: 'set',
            target: 'tax_liability',
            value: 1000
          }
        ]
      }
    ]
  };

  it('should trigger validation error when condition is met', () => {
    const instance = opentax({ rule: testRule });

    // Should trigger validation: FLAT_8_PERCENT + receipts > threshold
    expect(() => {
      instance.calculate({
        income_type: 'BUSINESS',
        gross_receipts: 5000000, // Above VAT threshold (3M)
        tax_option: 'FLAT_8_PERCENT',
        age: 25
      });
    }).toThrow(/Flat 8% rate not available for receipts above VAT threshold/);
  });

  it('should NOT trigger validation when condition is not met', () => {
    const instance = opentax({ rule: testRule });

    // Should NOT trigger validation: FLAT_8_PERCENT + receipts < threshold
    expect(() => {
      instance.calculate({
        income_type: 'BUSINESS',
        gross_receipts: 2000000, // Below VAT threshold
        tax_option: 'FLAT_8_PERCENT',
        age: 25
      });
    }).not.toThrow();

    // Should NOT trigger validation: GRADUATED rate (regardless of receipts)
    expect(() => {
      instance.calculate({
        income_type: 'BUSINESS',
        gross_receipts: 5000000, // Above threshold but using graduated
        tax_option: 'GRADUATED',
        age: 25
      });
    }).not.toThrow();
  });

  it('should skip validation when conditional inputs are not provided', () => {
    const instance = opentax({ rule: testRule });

    // Should NOT trigger business validation for COMPENSATION income
    // (tax_option and gross_receipts are not provided/required)
    expect(() => {
      instance.calculate({
        income_type: 'COMPENSATION',
        age: 25
      });
    }).not.toThrow();
  });

  it('should handle multiple validation rules', () => {
    const instance = opentax({ rule: testRule });

    // Should trigger age validation
    expect(() => {
      instance.calculate({
        income_type: 'COMPENSATION',
        age: 16 // Below minimum age
      });
    }).toThrow(/Must be at least 18 years old to file taxes/);

    // Should trigger business validation when applicable
    expect(() => {
      instance.calculate({
        income_type: 'BUSINESS',
        gross_receipts: 5000000,
        tax_option: 'FLAT_8_PERCENT',
        age: 25 // Valid age, but invalid business combo
      });
    }).toThrow(/Flat 8% rate not available for receipts above VAT threshold/);
  });

  it('should work with complex AND/OR conditions in validation', () => {
    const complexRule: Rule = {
      ...testRule,
      inputs: {
        ...testRule.inputs,
        filing_status: {
          type: 'string', enum: ['SINGLE', 'MARRIED'],
          description: ''
        },
        spouse_age: {
          type: 'number',
          when: { '$filing_status': { eq: 'MARRIED' } },
          description: ''
        }
      },
      validate: [
        {
          when: {
            or: [
              { '$age': { lt: '$$min_age' } },
              {
                and: [
                  { '$filing_status': { eq: 'MARRIED' } },
                  { '$spouse_age': { lt: '$$min_age' } }
                ]
              }
            ]
          },
          error: 'Both taxpayer and spouse must be at least 18'
        }
      ]
    };

    const instance = opentax({ rule: complexRule });

    // Should trigger for underage primary taxpayer
    expect(() => {
      instance.calculate({
        income_type: 'COMPENSATION',
        age: 16,
        filing_status: 'SINGLE'
      });
    }).toThrow(/Both taxpayer and spouse must be at least 18/);

    // Should trigger for underage spouse
    expect(() => {
      instance.calculate({
        income_type: 'COMPENSATION',
        age: 25,
        filing_status: 'MARRIED',
        spouse_age: 16
      });
    }).toThrow(/Both taxpayer and spouse must be at least 18/);

    // Should NOT trigger when both are of age
    expect(() => {
      instance.calculate({
        income_type: 'COMPENSATION',
        age: 25,
        filing_status: 'MARRIED',
        spouse_age: 23
      });
    }).not.toThrow();
  });
});