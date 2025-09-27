import { describe, it, expect } from 'vitest';
import opentax from '@/api';
import type { Rule } from '@/types';

describe('Conditional Inputs', () => {
  const baseRule: Rule = {
    $version: '1.0.0',
    name: 'Conditional Inputs Test',
    jurisdiction: 'US',
    taxpayer_type: 'INDIVIDUAL',
    inputs: {
      filing_status: {
        type: 'string',
        description: 'Filing status',
        enum: ['single', 'married']
      },
      spouse_income: {
        type: 'number',
        description: 'Spouse income (only required if married)',
        when: {
          '$filing_status': {
            eq: 'married'
          }
        }
      },
      income_type: {
        type: 'string',
        description: 'Type of income',
        enum: ['COMPENSATION', 'BUSINESS']
      },
      business_receipts: {
        type: 'number',
        description: 'Business receipts (only for business income)',
        when: {
          '$income_type': {
            eq: 'BUSINESS'
          }
        }
      }
    },
    outputs: {
      total_income: {
        type: 'number',
        description: 'Total calculated income'
      }
    },
    flow: [
      {
        name: 'Calculate Total',
        operations: [
          {
            type: 'set',
            target: 'total_income',
            value: 50000
          }
        ]
      }
    ]
  };

  it('should not require conditional input when condition is false', () => {
    const instance = opentax({ rule: baseRule });

    // Should NOT require spouse_income for single filer
    expect(() => {
      instance.calculate({
        filing_status: 'single',
        income_type: 'COMPENSATION'
      });
    }).not.toThrow();
  });

  it('should require conditional input when condition is true', () => {
    const instance = opentax({ rule: baseRule });

    // Should require spouse_income for married filer
    expect(() => {
      instance.calculate({
        filing_status: 'married',
        income_type: 'COMPENSATION'
        // Missing spouse_income
      });
    }).toThrow(/Required input 'spouse_income' not provided/);
  });

  it('should accept conditional input when provided and condition is true', () => {
    const instance = opentax({ rule: baseRule });

    // Should accept spouse_income for married filer
    expect(() => {
      const result = instance.calculate({
        filing_status: 'married',
        spouse_income: 25000,
        income_type: 'COMPENSATION'
      });
      expect(result.inputs.spouse_income).toBe(25000);
    }).not.toThrow();
  });

  it('should handle multiple conditional inputs correctly', () => {
    const instance = opentax({ rule: baseRule });

    // Test BUSINESS income type - should require business_receipts
    expect(() => {
      instance.calculate({
        filing_status: 'single',
        income_type: 'BUSINESS'
        // Missing business_receipts
      });
    }).toThrow(/Required input 'business_receipts' not provided/);

    // Test COMPENSATION income type - should NOT require business_receipts
    expect(() => {
      instance.calculate({
        filing_status: 'single',
        income_type: 'COMPENSATION'
      });
    }).not.toThrow();
  });

  it('should handle complex conditional combinations', () => {
    const instance = opentax({ rule: baseRule });

    // Married + Business should require both spouse_income and business_receipts
    expect(() => {
      instance.calculate({
        filing_status: 'married',
        income_type: 'BUSINESS'
        // Missing both spouse_income and business_receipts
      });
    }).toThrow(); // Should throw for missing required inputs

    // Should succeed when all required inputs are provided
    expect(() => {
      instance.calculate({
        filing_status: 'married',
        spouse_income: 30000,
        income_type: 'BUSINESS',
        business_receipts: 100000
      });
    }).not.toThrow();
  });
});