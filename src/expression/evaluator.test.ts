import { beforeEach, describe, expect, it } from 'vitest';
import {
  ExpressionEvaluationError,
  ExpressionEvaluator,
  type VariableContext,
} from './evaluator';
import { ExpressionParser } from './parser';
import { BUILTIN_FUNCTIONS, BUILTINS } from './builtins';

describe('ExpressionEvaluator', () => {
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    evaluator = new ExpressionEvaluator(BUILTINS);
  });

  describe('Literal Values', () => {
    it('should evaluate number literals', () => {
      const expr = ExpressionParser.parse('250000');
      const result = evaluator.evaluate(expr);
      expect(result).toBe(250000);
    });

    it('should evaluate decimal literals', () => {
      const expr = ExpressionParser.parse('0.25');
      const result = evaluator.evaluate(expr);
      expect(result).toBe(0.25);
    });

    it('should evaluate boolean literals', () => {
      const trueExpr = ExpressionParser.parse('true');
      const falseExpr = ExpressionParser.parse('false');

      expect(evaluator.evaluate(trueExpr)).toBe(true);
      expect(evaluator.evaluate(falseExpr)).toBe(false);
    });
  });

  describe('Variable Resolution', () => {
    describe('Input Variables', () => {
      it('should resolve input variables from context', () => {
        const expr = ExpressionParser.parse('$gross_income');
        const context: VariableContext = {
          inputs: { gross_income: 100000 },
          constants: {},
          calculated: {},
        };

        const result = evaluator.evaluate(expr, context);
        expect(result).toBe(100000);
      });

      it('should handle boolean input variables', () => {
        const expr = ExpressionParser.parse('$is_freelance');
        const context: VariableContext = {
          inputs: { is_freelance: true },
          constants: {},
          calculated: {},
        };

        const result = evaluator.evaluate(expr, context);
        expect(result).toBe(true);
      });

      it('should throw error for missing input variables', () => {
        const expr = ExpressionParser.parse('$missing_variable');
        const context: VariableContext = {
          inputs: {},
          constants: {},
          calculated: {},
        };

        expect(() => evaluator.evaluate(expr, context)).toThrow(
          expect.objectContaining({
            message: expect.stringContaining(
              "Input variable 'missing_variable' not found"
            ),
          })
        );
      });
    });

    describe('Constants', () => {
      it('should resolve user-defined constants', () => {
        const expr = ExpressionParser.parse('$$tax_rate');
        const context: VariableContext = {
          inputs: {},
          constants: { tax_rate: 0.25 },
          calculated: {},
        };

        const result = evaluator.evaluate(expr, context);
        expect(result).toBe(0.25);
      });

      it('should resolve predefined constants', () => {
        const expr = ExpressionParser.parse('$$MAX_TAXABLE_INCOME');
        const context: VariableContext = {
          inputs: {},
          constants: {},
          calculated: {},
        };

        const result = evaluator.evaluate(expr, context);
        expect(result).toBe(9007199254740991);
      });

      it('should prioritize user constants over predefined ones', () => {
        const expr = ExpressionParser.parse('$$MAX_TAXABLE_INCOME');
        const context: VariableContext = {
          inputs: {},
          constants: { MAX_TAXABLE_INCOME: 1000000 }, // User override
          calculated: {},
        };

        const result = evaluator.evaluate(expr, context);
        expect(result).toBe(1000000);
      });

      it('should throw error for missing constants', () => {
        const expr = ExpressionParser.parse('$$missing_constant');
        const context: VariableContext = {
          inputs: {},
          constants: {},
          calculated: {},
        };

        expect(() => evaluator.evaluate(expr, context)).toThrow(
          expect.objectContaining({
            message: expect.stringContaining(
              "Constant 'missing_constant' not found"
            ),
          })
        );
      });
    });

    describe('Calculated Variables', () => {
      it('should resolve calculated variables from context', () => {
        const expr = ExpressionParser.parse('taxable_income');
        const context: VariableContext = {
          inputs: {},
          constants: {},
          calculated: { taxable_income: 75000 },
        };

        const result = evaluator.evaluate(expr, context);
        expect(result).toBe(75000);
      });

      it('should resolve predefined variables', () => {
        const expr = ExpressionParser.parse('liability');
        const context: VariableContext = {
          inputs: {},
          constants: {},
          calculated: {},
        };

        const result = evaluator.evaluate(expr, context);
        expect(result).toBe(0); // Default liability value
      });

      it('should prioritize calculated values over predefined ones', () => {
        const expr = ExpressionParser.parse('liability');
        const context: VariableContext = {
          inputs: {},
          constants: {},
          calculated: { liability: 5000 },
        };

        const result = evaluator.evaluate(expr, context);
        expect(result).toBe(5000);
      });

      it('should throw error for missing calculated variables', () => {
        const expr = ExpressionParser.parse('missing_calculated');
        const context: VariableContext = {
          inputs: {},
          constants: {},
          calculated: {},
        };

        expect(() => evaluator.evaluate(expr, context)).toThrow(
          expect.objectContaining({
            message: expect.stringContaining(
              "Calculated variable 'missing_calculated' not found"
            ),
          })
        );
      });
    });
  });

  describe('Built-in Functions', () => {
    describe('diff function', () => {
      it('should calculate absolute difference of two numbers', () => {
        const expr = ExpressionParser.parse('diff(100, 60)');
        const result = evaluator.evaluate(expr);
        expect(result).toBe(40);
      });

      it('should handle negative differences', () => {
        const expr = ExpressionParser.parse('diff(60, 100)');
        const result = evaluator.evaluate(expr);
        expect(result).toBe(40);
      });

      it('should reject boolean parameters', () => {
        const expr = ExpressionParser.parse('diff(true, false)');
        expect(() => evaluator.evaluate(expr)).toThrow(
          expect.objectContaining({
            message: expect.stringContaining(
              'parameter 1 must be a number, got boolean'
            ),
          })
        );
      });

      it('should work with variables', () => {
        const expr = ExpressionParser.parse('diff(liability, $gross_income)');
        const context: VariableContext = {
          inputs: { gross_income: 100000 },
          constants: {},
          calculated: { liability: 15000 },
        };

        const result = evaluator.evaluate(expr, context);
        expect(result).toBe(85000);
      });
    });

    describe('sum function', () => {
      it('should sum multiple numbers', () => {
        const expr = ExpressionParser.parse('sum(100, 200, 300)');
        const result = evaluator.evaluate(expr);
        expect(result).toBe(600);
      });

      it('should handle empty parameter list', () => {
        const expr = ExpressionParser.parse('sum()');
        const result = evaluator.evaluate(expr);
        expect(result).toBe(0);
      });

      it('should reject boolean parameters', () => {
        const expr = ExpressionParser.parse('sum(true, false, true)');
        expect(() => evaluator.evaluate(expr)).toThrow(
          expect.objectContaining({
            message: expect.stringContaining(
              'parameter 1 must be a number, got boolean'
            ),
          })
        );
      });

      it('should work with variables', () => {
        const expr = ExpressionParser.parse(
          'sum($income1, $income2, $$deduction)'
        );
        const context: VariableContext = {
          inputs: { income1: 50000, income2: 30000 },
          constants: { deduction: 10000 },
          calculated: {},
        };

        const result = evaluator.evaluate(expr, context);
        expect(result).toBe(90000);
      });
    });

    describe('max function', () => {
      it('should return maximum of multiple values', () => {
        const expr = ExpressionParser.parse('max(100, 300, 200)');
        const result = evaluator.evaluate(expr);
        expect(result).toBe(300);
      });

      it('should handle empty parameter list', () => {
        const expr = ExpressionParser.parse('max()');
        const result = evaluator.evaluate(expr);
        expect(result).toBe(0);
      });

      it('should work with single parameter', () => {
        const expr = ExpressionParser.parse('max(150)');
        const result = evaluator.evaluate(expr);
        expect(result).toBe(150);
      });

      it('should reject boolean parameters', () => {
        const expr = ExpressionParser.parse('max(true, false)');
        expect(() => evaluator.evaluate(expr)).toThrow(
          expect.objectContaining({
            message: expect.stringContaining(
              'parameter 1 must be a number, got boolean'
            ),
          })
        );
      });
    });

    describe('min function', () => {
      it('should return minimum of multiple values', () => {
        const expr = ExpressionParser.parse('min(100, 300, 200)');
        const result = evaluator.evaluate(expr);
        expect(result).toBe(100);
      });

      it('should handle empty parameter list', () => {
        const expr = ExpressionParser.parse('min()');
        const result = evaluator.evaluate(expr);
        expect(result).toBe(0);
      });

      it('should work with single parameter', () => {
        const expr = ExpressionParser.parse('min(150)');
        const result = evaluator.evaluate(expr);
        expect(result).toBe(150);
      });

      it('should reject boolean parameters', () => {
        const expr = ExpressionParser.parse('min(true, false)');
        expect(() => evaluator.evaluate(expr)).toThrow(
          expect.objectContaining({
            message: expect.stringContaining(
              'parameter 1 must be a number, got boolean'
            ),
          })
        );
      });
    });

    describe('round function', () => {
      it('should round to specified decimal places', () => {
        const expr = ExpressionParser.parse('round(3.14159, 2)');
        const result = evaluator.evaluate(expr);
        expect(result).toBe(3.14);
      });

      it('should round to whole numbers by default', () => {
        const expr = ExpressionParser.parse('round(3.7)');
        const result = evaluator.evaluate(expr);
        expect(result).toBe(4);
      });

      it('should reject boolean parameters', () => {
        const expr = ExpressionParser.parse('round(true, false)');
        expect(() => evaluator.evaluate(expr)).toThrow(
          expect.objectContaining({
            message: expect.stringContaining(
              'parameter 1 must be a number, got boolean'
            ),
          })
        );
      });

      it('should work with negative decimals', () => {
        const expr = ExpressionParser.parse('round(12345.67, -2)');
        const result = evaluator.evaluate(expr);
        expect(result).toBe(12300);
      });
    });
  });

  describe('Nested Expressions', () => {
    it('should evaluate nested function calls', () => {
      const expr = ExpressionParser.parse('max(min(100, 50), 75)');
      const result = evaluator.evaluate(expr);
      expect(result).toBe(75);
    });

    it('should evaluate complex nested expressions', () => {
      const expr = ExpressionParser.parse(
        'round(max(sum(10, 20, 30), diff(100, 25)), 1)'
      );
      const result = evaluator.evaluate(expr);
      expect(result).toBe(75);
    });

    it('should handle nested expressions with variables', () => {
      const expr = ExpressionParser.parse(
        'max(sum($income1, $income2), min($$cap, liability))'
      );
      const context: VariableContext = {
        inputs: { income1: 30000, income2: 40000 },
        constants: { cap: 80000 },
        calculated: { liability: 15000 },
      };

      const result = evaluator.evaluate(expr, context);
      expect(result).toBe(70000); // max(70000, 15000)
    });
  });

  describe('Error Handling', () => {
    it('should handle function execution errors gracefully', () => {
      // Create a custom evaluator with a function that throws
      const customEvaluator = new ExpressionEvaluator({
        builtinFunctions: {
          ...BUILTIN_FUNCTIONS,
          error_func: {
            parameters: [],
            callback: () => {
              throw new Error('Test error');
            },
          },
        },
      });

      // Parser no longer validates function names - it accepts any function
      const expr = ExpressionParser.parse('error_func()');

      expect(() => customEvaluator.evaluate(expr)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining('Evaluation failed: Test error'),
        })
      );
    });

    it('should provide context in error messages', () => {
      const expr = ExpressionParser.parse('$missing_input');
      const context: VariableContext = {
        inputs: {},
        constants: {},
        calculated: {},
      };

      try {
        evaluator.evaluate(expr, context);
      } catch (error) {
        expect(error).toBeInstanceOf(ExpressionEvaluationError);
        expect((error as ExpressionEvaluationError).context).toBe(context);
        expect((error as ExpressionEvaluationError).expression).toEqual(expr);
      }
    });

    it('should handle parameter evaluation errors', () => {
      const expr = ExpressionParser.parse('sum($missing_var, 100)');
      const context: VariableContext = {
        inputs: {},
        constants: {},
        calculated: {},
      };

      expect(() => evaluator.evaluate(expr, context)).toThrow(
        expect.objectContaining({
          message: expect.stringContaining(
            "Failed to evaluate parameter in function 'sum'"
          ),
        })
      );
    });
  });

  describe('Configuration', () => {
    it('should accept custom built-in functions', () => {
      const customEvaluator = new ExpressionEvaluator({
        builtinFunctions: {
          double: {
            parameters: [{ name: 'x', type: 'number' }],
            callback: (num: unknown) => {
              return (num as number) * 2;
            },
          },
        },
      });

      const expr = ExpressionParser.parse('double(21)');
      const result = customEvaluator.evaluate(expr);
      expect(result).toBe(42);
    });

    it('should accept custom predefined constants', () => {
      const customEvaluator = new ExpressionEvaluator({
        builtinConstants: {
          CUSTOM_CONSTANT: 999,
        },
      });

      const expr = ExpressionParser.parse('$$CUSTOM_CONSTANT');
      const result = customEvaluator.evaluate(expr);
      expect(result).toBe(999);
    });

    it('should accept custom predefined variables', () => {
      const customEvaluator = new ExpressionEvaluator({
        builtinVariables: {
          custom_var: 123,
        },
      });

      const expr = ExpressionParser.parse('custom_var');
      const result = customEvaluator.evaluate(expr);
      expect(result).toBe(123);
    });
  });

  describe('Integration with Parser', () => {
    it('should work with all parser expression types', () => {
      const expressions = [
        { expr: '42', expected: 42 },
        { expr: 'true', expected: true },
        { expr: 'max(10, 20)', expected: 20 },
        { expr: 'sum(1, 2, 3)', expected: 6 },
      ];

      expressions.forEach(({ expr, expected }) => {
        const parsed = ExpressionParser.parse(expr);
        const result = evaluator.evaluate(parsed);
        expect(result).toBe(expected);
      });
    });

    it('should evaluate specification examples correctly', () => {
      // From the specification examples
      const context: VariableContext = {
        inputs: {
          gross_income: 100000,
          additional_income: 25000,
        },
        constants: { tax_exempt_threshold: 250000 },
        calculated: { liability: 15000 },
      };

      // sum($gross_income, $additional_income)
      const sumExpr = ExpressionParser.parse(
        'sum($gross_income, $additional_income)'
      );
      expect(evaluator.evaluate(sumExpr, context)).toBe(125000);

      // diff(liability, $gross_income)
      const diffExpr = ExpressionParser.parse('diff(liability, $gross_income)');
      expect(evaluator.evaluate(diffExpr, context)).toBe(85000);
    });
  });
});
