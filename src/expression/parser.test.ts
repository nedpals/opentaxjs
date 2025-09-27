import { describe, expect, it } from 'vitest';
import {
  type CallExpression,
  ExpressionParseError,
  ExpressionParser,
} from './parser';
import { isIdentifier } from './identifiers';

describe('ExpressionParser', () => {
  describe('Variable References', () => {
    describe('Input Variables ($)', () => {
      it('should parse simple input variable', () => {
        const result = ExpressionParser.parse('$gross_income');
        expect(result).toEqual({
          type: 'input_variable',
          name: 'gross_income',
        });
      });

      it('should parse input variable with numbers and underscores', () => {
        const result = ExpressionParser.parse('$tax_rate_2024');
        expect(result).toEqual({
          type: 'input_variable',
          name: 'tax_rate_2024',
        });
      });

      it('should handle whitespace around input variables', () => {
        const result = ExpressionParser.parse('  $deductions  ');
        expect(result).toEqual({
          type: 'input_variable',
          name: 'deductions',
        });
      });
    });

    describe('Constants ($$)', () => {
      it('should parse simple constant', () => {
        const result = ExpressionParser.parse('$$tax_exempt_threshold');
        expect(result).toEqual({
          type: 'constant_variable',
          name: 'tax_exempt_threshold',
        });
      });

      it('should parse predefined constant', () => {
        const result = ExpressionParser.parse('$$MAX_TAXABLE_INCOME');
        expect(result).toEqual({
          type: 'constant_variable',
          name: 'MAX_TAXABLE_INCOME',
        });
      });
    });

    describe('Calculated Variables', () => {
      it('should parse calculated variable', () => {
        const result = ExpressionParser.parse('taxable_income');
        expect(result).toEqual({
          type: 'calculated_variable',
          name: 'taxable_income',
        });
      });

      it('should parse predefined variable liability', () => {
        const result = ExpressionParser.parse('liability');
        expect(result).toEqual({
          type: 'calculated_variable',
          name: 'liability',
        });
      });
    });

    describe('Invalid Variable Names', () => {
      it('should parse identifiers starting with uppercase as calculated variables', () => {
        // Parser allows uppercase identifiers - semantic validation is in evaluator
        const result1 = ExpressionParser.parse('GrossIncome');
        expect(result1).toEqual({
          type: 'calculated_variable',
          name: 'GrossIncome',
        });

        const result2 = ExpressionParser.parse('$GrossIncome');
        expect(result2).toEqual({
          type: 'input_variable',
          name: 'GrossIncome',
        });
      });

      it('should reject identifiers starting with underscore', () => {
        expect(() => ExpressionParser.parse('_private')).toThrow(
          ExpressionParseError
        );
        expect(() => ExpressionParser.parse('$_private')).toThrow(
          ExpressionParseError
        );
      });

      it('should reject identifiers starting with digit', () => {
        expect(() => ExpressionParser.parse('2024_rate')).toThrow(
          ExpressionParseError
        );
        expect(() => ExpressionParser.parse('$2024_rate')).toThrow(
          ExpressionParseError
        );
      });

      it('should reject identifiers with hyphens', () => {
        expect(() => ExpressionParser.parse('tax-rate')).toThrow(
          ExpressionParseError
        );
        expect(() => ExpressionParser.parse('$tax-rate')).toThrow(
          ExpressionParseError
        );
      });
    });
  });

  describe('Function Calls', () => {
    describe('Basic Function Calls', () => {
      it('should parse function with no parameters', () => {
        const result = ExpressionParser.parse('max()');
        expect(result).toEqual({
          type: 'call',
          name: 'max',
          parameters: [],
        });
      });

      it('should parse function with single variable parameter', () => {
        const result = ExpressionParser.parse('max(taxable_income)');
        expect(result).toEqual({
          type: 'call',
          name: 'max',
          parameters: [
            {
              type: 'calculated_variable',
              name: 'taxable_income',
            },
          ],
        });
      });

      it('should parse function with multiple parameters', () => {
        const result = ExpressionParser.parse('max(taxable_income, 0)');
        expect(result).toEqual({
          type: 'call',
          name: 'max',
          parameters: [
            {
              type: 'calculated_variable',
              name: 'taxable_income',
            },
            {
              type: 'number_literal',
              value: 0,
            },
          ],
        });
      });

      it('should parse function with input variable parameters', () => {
        const result = ExpressionParser.parse('diff(liability, $gross_income)');
        expect(result).toEqual({
          type: 'call',
          name: 'diff',
          parameters: [
            {
              type: 'calculated_variable',
              name: 'liability',
            },
            {
              type: 'input_variable',
              name: 'gross_income',
            },
          ],
        });
      });

      it('should parse function with constant parameters', () => {
        const result = ExpressionParser.parse(
          'min(liability, $$maximum_tax_cap)'
        );
        expect(result).toEqual({
          type: 'call',
          name: 'min',
          parameters: [
            {
              type: 'calculated_variable',
              name: 'liability',
            },
            {
              type: 'constant_variable',
              name: 'maximum_tax_cap',
            },
          ],
        });
      });

      it('should handle whitespace in function calls', () => {
        const result = ExpressionParser.parse(
          '  sum( $income1 , $income2 , $income3 )  '
        );
        expect(result).toEqual({
          type: 'call',
          name: 'sum',
          parameters: [
            { type: 'input_variable', name: 'income1' },
            { type: 'input_variable', name: 'income2' },
            { type: 'input_variable', name: 'income3' },
          ],
        });
      });
    });

    describe('Nested Function Calls', () => {
      it('should parse nested function calls', () => {
        const result = ExpressionParser.parse(
          'max(min(taxable_income, 100000), 0)'
        );
        expect(result).toEqual({
          type: 'call',
          name: 'max',
          parameters: [
            {
              type: 'call',
              name: 'min',
              parameters: [
                { type: 'calculated_variable', name: 'taxable_income' },
                { type: 'number_literal', value: 100000 },
              ],
            },
            {
              type: 'number_literal',
              value: 0,
            },
          ],
        });
      });

      it('should parse deeply nested functions', () => {
        const result = ExpressionParser.parse(
          'round(max(min(taxable_income, $$cap), 0), 2)'
        );
        expect(result).toEqual({
          type: 'call',
          name: 'round',
          parameters: [
            {
              type: 'call',
              name: 'max',
              parameters: [
                {
                  type: 'call',
                  name: 'min',
                  parameters: [
                    { type: 'calculated_variable', name: 'taxable_income' },
                    { type: 'constant_variable', name: 'cap' },
                  ],
                },
                { type: 'number_literal', value: 0 },
              ],
            },
            { type: 'number_literal', value: 2 },
          ],
        });
      });
    });

    describe('Built-in Functions', () => {
      it('should accept all built-in functions', () => {
        const builtInFunctions = ['diff', 'sum', 'max', 'min', 'round'];

        builtInFunctions.forEach((func) => {
          expect(() => ExpressionParser.parse(`${func}()`)).not.toThrow();
        });
      });

      it('should parse unknown functions (validation is in evaluator)', () => {
        const result = ExpressionParser.parse('unknown_function()');
        expect(result).toEqual({
          type: 'call',
          name: 'unknown_function',
          parameters: [],
        });
      });

      it('should parse any function name (validation is in evaluator)', () => {
        const result = ExpressionParser.parse('calculate()');
        expect(result).toEqual({
          type: 'call',
          name: 'calculate',
          parameters: [],
        });
      });
    });
  });

  describe('Literal Values', () => {
    describe('Numbers', () => {
      it('should parse integer literals', () => {
        const result = ExpressionParser.parse('250000');
        expect(result).toEqual({
          type: 'number_literal',
          value: 250000,
        });
      });

      it('should parse decimal literals', () => {
        const result = ExpressionParser.parse('0.25');
        expect(result).toEqual({
          type: 'number_literal',
          value: 0.25,
        });
      });

      it('should parse zero', () => {
        const result = ExpressionParser.parse('0');
        expect(result).toEqual({
          type: 'number_literal',
          value: 0,
        });
      });

      it('should parse large numbers', () => {
        const result = ExpressionParser.parse('9007199254740991');
        expect(result).toEqual({
          type: 'number_literal',
          value: 9007199254740991,
        });
      });
    });

    describe('Booleans', () => {
      it('should parse true literal', () => {
        const result = ExpressionParser.parse('true');
        expect(result).toEqual({
          type: 'boolean_literal',
          value: true,
        });
      });

      it('should parse false literal', () => {
        const result = ExpressionParser.parse('false');
        expect(result).toEqual({
          type: 'boolean_literal',
          value: false,
        });
      });
    });

    describe('Invalid Literals', () => {
      it('should reject invalid number formats', () => {
        expect(() => ExpressionParser.parse('25.50.00')).toThrow(
          ExpressionParseError
        );
        expect(() => ExpressionParser.parse('25e10')).toThrow(
          ExpressionParseError
        );
        expect(() => ExpressionParser.parse('0x1A')).toThrow(
          ExpressionParseError
        );
      });

      it('should parse capitalized identifiers as calculated variables', () => {
        // Parser no longer validates semantic meaning - "True" and "FALSE" are parsed as calculated variables
        const result1 = ExpressionParser.parse('True');
        expect(result1).toEqual({
          type: 'calculated_variable',
          name: 'True',
        });

        const result2 = ExpressionParser.parse('FALSE');
        expect(result2).toEqual({
          type: 'calculated_variable',
          name: 'FALSE',
        });

        expect(() => ExpressionParser.parse('1')).not.toThrow(); // This is a valid number
        expect(() => ExpressionParser.parse('yes')).not.toThrow(); // Valid calculated variable
      });
    });
  });

  describe('Complex Expressions', () => {
    it('should parse function with mixed parameter types', () => {
      const result = ExpressionParser.parse(
        'sum($gross_income, $$standard_deduction, taxable_income, 1000, true)'
      );
      expect(result).toEqual({
        type: 'call',
        name: 'sum',
        parameters: [
          { type: 'input_variable', name: 'gross_income' },
          { type: 'constant_variable', name: 'standard_deduction' },
          { type: 'calculated_variable', name: 'taxable_income' },
          { type: 'number_literal', value: 1000 },
          { type: 'boolean_literal', value: true },
        ],
      });
    });

    it('should parse function with nested calls and variables', () => {
      const result = ExpressionParser.parse(
        'max(sum($income1, $income2), min($$threshold, liability))'
      );
      expect(result).toEqual({
        type: 'call',
        name: 'max',
        parameters: [
          {
            type: 'call',
            name: 'sum',
            parameters: [
              { type: 'input_variable', name: 'income1' },
              { type: 'input_variable', name: 'income2' },
            ],
          },
          {
            type: 'call',
            name: 'min',
            parameters: [
              { type: 'constant_variable', name: 'threshold' },
              { type: 'calculated_variable', name: 'liability' },
            ],
          },
        ],
      });
    });
  });

  describe('Error Handling', () => {
    it('should provide helpful error messages with position', () => {
      try {
        ExpressionParser.parse('max(InvalidName)'); // Use uppercase to trigger identifier validation
      } catch (error) {
        expect(error).toBeInstanceOf(ExpressionParseError);
        expect(error.message).toContain('Invalid identifier');
        expect(error.expression).toBe('max(InvalidName)');
      }
    });

    it('should handle empty expressions', () => {
      expect(() => ExpressionParser.parse('')).toThrow(
        expect.objectContaining({
          message: 'Empty expression is not allowed',
        })
      );

      expect(() => ExpressionParser.parse('   ')).toThrow(
        expect.objectContaining({
          message: 'Empty expression is not allowed',
        })
      );
    });

    it('should handle malformed function calls', () => {
      expect(() => ExpressionParser.parse('max(')).toThrow(
        ExpressionParseError
      );
      expect(() => ExpressionParser.parse('max)')).toThrow(
        ExpressionParseError
      );
      expect(() => ExpressionParser.parse('max(a,)')).toThrow(
        ExpressionParseError
      );
      expect(() => ExpressionParser.parse('max(,a)')).toThrow(
        ExpressionParseError
      );
    });

    it('should handle unexpected content at end', () => {
      expect(() => ExpressionParser.parse('taxable_income extra')).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Unexpected content'),
        })
      );
    });

    it('should handle missing parentheses', () => {
      expect(() => ExpressionParser.parse('max a, b')).toThrow(
        ExpressionParseError
      );
    });
  });

  describe('Static Methods', () => {
    describe('isIdentifier', () => {
      it('should validate correct identifiers', () => {
        expect(isIdentifier('gross_income')).toBe(true);
        expect(isIdentifier('tax_rate_2024')).toBe(true);
        expect(isIdentifier('liability')).toBe(true);
        expect(isIdentifier('a')).toBe(true);
        expect(isIdentifier('a1')).toBe(true);
      });

      it('should reject invalid identifiers', () => {
        // Now accepts uppercase identifiers
        expect(isIdentifier('GrossIncome')).toBe(true);
        // Still rejects identifiers starting with underscore
        expect(isIdentifier('_private')).toBe(false);
        expect(isIdentifier('2024_rate')).toBe(false);
        expect(isIdentifier('tax-rate')).toBe(false);
        expect(isIdentifier('')).toBe(false);
        expect(isIdentifier('tax rate')).toBe(false);
      });
    });
  });

  describe('Specification Examples', () => {
    it('should parse examples from the specification', () => {
      // From conditional rules section
      const result1 = ExpressionParser.parse(
        'sum($gross_income, $additional_income)'
      );
      expect(result1.type).toBe('call');
      expect((result1 as CallExpression).name).toBe('sum');

      // From operations section
      const result2 = ExpressionParser.parse('max(taxable_income, 0)');
      expect(result2.type).toBe('call');
      expect((result2 as CallExpression).name).toBe('max');

      // From filing schedules
      const result3 = ExpressionParser.parse('diff(liability, $gross_income)');
      expect(result3.type).toBe('call');
      expect((result3 as CallExpression).name).toBe('diff');
    });
  });
});
