import { describe, it, expect } from 'vitest';
import { ConditionalEvaluator } from '@/evaluator/conditional';
import { ExpressionEvaluator } from '@/expression';
import type { EvaluationContext, Condition } from '@/types';

describe('ConditionalEvaluator', () => {
  const evaluator = new ConditionalEvaluator(new ExpressionEvaluator());

  const createContext = (
    inputs: Record<string, number | boolean> = {},
    constants: Record<string, number | boolean> = {},
    calculated: Record<string, number | boolean> = {}
  ): EvaluationContext => ({
    inputs,
    constants,
    calculated,
    tables: {}
  });

  describe('basic comparisons', () => {
    it('should evaluate equality conditions', () => {
      const context = createContext({ age: 25, is_senior: false });

      expect(evaluator.evaluate({ age: { eq: 25 } }, context)).toBe(true);
      expect(evaluator.evaluate({ age: { eq: 30 } }, context)).toBe(false);
      expect(evaluator.evaluate({ is_senior: { eq: false } }, context)).toBe(true);
      expect(evaluator.evaluate({ is_senior: { eq: true } }, context)).toBe(false);
    });

    it('should evaluate inequality conditions', () => {
      const context = createContext({ age: 25, is_senior: false });

      expect(evaluator.evaluate({ age: { ne: 30 } }, context)).toBe(true);
      expect(evaluator.evaluate({ age: { ne: 25 } }, context)).toBe(false);
      expect(evaluator.evaluate({ is_senior: { ne: true } }, context)).toBe(true);
    });

    it('should evaluate numeric comparison conditions', () => {
      const context = createContext({ income: 50000, age: 25 });

      expect(evaluator.evaluate({ income: { gt: 40000 } }, context)).toBe(true);
      expect(evaluator.evaluate({ income: { gt: 60000 } }, context)).toBe(false);
      expect(evaluator.evaluate({ income: { gte: 50000 } }, context)).toBe(true);
      expect(evaluator.evaluate({ income: { gte: 50001 } }, context)).toBe(false);

      expect(evaluator.evaluate({ age: { lt: 30 } }, context)).toBe(true);
      expect(evaluator.evaluate({ age: { lt: 20 } }, context)).toBe(false);
      expect(evaluator.evaluate({ age: { lte: 25 } }, context)).toBe(true);
      expect(evaluator.evaluate({ age: { lte: 24 } }, context)).toBe(false);
    });
  });

  describe('variable reference resolution', () => {
    it('should resolve input variables with $ prefix', () => {
      const context = createContext({ income: 50000 });

      expect(evaluator.evaluate({ '$income': { eq: 50000 } }, context)).toBe(true);
    });

    it('should resolve constants with $$ prefix', () => {
      const context = createContext({}, { tax_rate: 0.15 });

      expect(evaluator.evaluate({ '$$tax_rate': { eq: 0.15 } }, context)).toBe(true);
    });

    it('should resolve calculated variables', () => {
      const context = createContext({}, {}, { taxable_income: 45000 });

      expect(evaluator.evaluate({ taxable_income: { gt: 40000 } }, context)).toBe(true);
    });

    it('should resolve variables in comparison values', () => {
      const context = createContext({ income: 50000 }, { threshold: 45000 });

      expect(evaluator.evaluate({ income: { gt: '$$threshold' } }, context)).toBe(true);
    });
  });

  describe('logical operations', () => {
    it('should evaluate AND conditions', () => {
      const context = createContext({ age: 25, income: 50000 });

      const condition: Condition = {
        and: [
          { age: { gte: 18 } },
          { income: { gt: 40000 } }
        ]
      };

      expect(evaluator.evaluate(condition, context)).toBe(true);

      const falseCondition: Condition = {
        and: [
          { age: { gte: 30 } },
          { income: { gt: 40000 } }
        ]
      };

      expect(evaluator.evaluate(falseCondition, context)).toBe(false);
    });

    it('should evaluate OR conditions', () => {
      const context = createContext({ age: 25, income: 30000 });

      const condition: Condition = {
        or: [
          { age: { gte: 65 } },
          { income: { lt: 35000 } }
        ]
      };

      expect(evaluator.evaluate(condition, context)).toBe(true);

      const falseCondition: Condition = {
        or: [
          { age: { gte: 65 } },
          { income: { gt: 35000 } }
        ]
      };

      expect(evaluator.evaluate(falseCondition, context)).toBe(false);
    });

    it('should evaluate NOT conditions', () => {
      const context = createContext({ is_senior: false });

      const condition: Condition = {
        not: { is_senior: { eq: true } }
      };

      expect(evaluator.evaluate(condition, context)).toBe(true);

      const falseCondition: Condition = {
        not: { is_senior: { eq: false } }
      };

      expect(evaluator.evaluate(falseCondition, context)).toBe(false);
    });

    it('should evaluate nested logical conditions', () => {
      const context = createContext({ age: 25, income: 50000, is_student: false });

      const condition: Condition = {
        and: [
          {
            or: [
              { age: { gte: 65 } },
              { is_student: { eq: true } }
            ]
          },
          { income: { lt: 60000 } }
        ]
      };

      expect(evaluator.evaluate(condition, context)).toBe(false);

      const trueCondition: Condition = {
        and: [
          {
            or: [
              { age: { gte: 18 } },
              { is_student: { eq: true } }
            ]
          },
          { income: { lt: 60000 } }
        ]
      };

      expect(evaluator.evaluate(trueCondition, context)).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('should evaluate all conditions with AND logic', () => {
      const context = createContext({ age: 25, income: 50000 });

      const conditions: Condition[] = [
        { age: { gte: 18 } },
        { income: { gt: 40000 } },
        { age: { lt: 30 } }
      ];

      expect(evaluator.evaluateAll(conditions, context)).toBe(true);

      const conditionsWithExtra: Condition[] = [
        ...conditions,
        { income: { gt: 60000 } }
      ];
      expect(evaluator.evaluateAll(conditionsWithExtra, context)).toBe(false);
    });

    it('should evaluate any conditions with OR logic', () => {
      const context = createContext({ age: 25, income: 30000 });

      const conditions: Condition[] = [
        { age: { gte: 65 } },
        { income: { gt: 60000 } },
        { age: { eq: 25 } }
      ];

      expect(evaluator.evaluateAny(conditions, context)).toBe(true);

      const falseConditions: Condition[] = [
        { age: { gte: 65 } },
        { income: { gt: 60000 } }
      ];

      expect(evaluator.evaluateAny(falseConditions, context)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw error for missing input variables', () => {
      const context = createContext({});

      expect(() => {
        evaluator.evaluate({ '$income': { eq: 50000 } }, context);
      }).toThrow("Input variable 'income' not found");
    });

    it('should throw error for missing constants', () => {
      const context = createContext({});

      expect(() => {
        evaluator.evaluate({ '$$tax_rate': { eq: 0.15 } }, context);
      }).toThrow("Constant 'tax_rate' not found");
    });

    it('should throw error for missing variables', () => {
      const context = createContext({});

      expect(() => {
        evaluator.evaluate({ unknown_var: { eq: 100 } }, context);
      }).toThrow("Variable 'unknown_var' not found");
    });

    it('should throw error for invalid numeric comparisons', () => {
      const context = createContext({ income: 50000 }, { is_active: false });

      expect(() => {
        evaluator.evaluate({ income: { gt: '$$is_active' } }, context);
      }).toThrow("Cannot compare number with boolean using 'gt'");
    });
  });

  describe('edge cases', () => {
    it('should handle empty conditions gracefully', () => {
      const context = createContext();

      expect(evaluator.evaluateAll([], context)).toBe(true);
      expect(evaluator.evaluateAny([], context)).toBe(false);
    });

    it('should handle zero and negative numbers', () => {
      const context = createContext({ balance: -100, age: 0 });

      expect(evaluator.evaluate({ balance: { lt: 0 } }, context)).toBe(true);
      expect(evaluator.evaluate({ age: { eq: 0 } }, context)).toBe(true);
      expect(evaluator.evaluate({ age: { gte: 0 } }, context)).toBe(true);
    });

    it('should handle floating point numbers', () => {
      const context = createContext({ rate: 0.15, amount: 1234.56 });

      expect(evaluator.evaluate({ rate: { gt: 0.1 } }, context)).toBe(true);
      expect(evaluator.evaluate({ amount: { eq: 1234.56 } }, context)).toBe(true);
    });
  });
});
