import type {
  Condition,
  ComparisonCondition,
  LogicalCondition,
  EvaluationContext,
} from '../types';
import { RuleEvaluationError } from './errors';
import {
  ExpressionEvaluator,
  ExpressionEvaluationError,
  ExpressionParser,
} from '../expression';

export class ConditionalEvaluator {
  private expressionEvaluator: ExpressionEvaluator;

  constructor(expressionEvaluator: ExpressionEvaluator) {
    this.expressionEvaluator = expressionEvaluator;
  }
  evaluate(condition: Condition, context: EvaluationContext): boolean {
    try {
      return this.evaluateCondition(condition, context);
    } catch (error) {
      throw new RuleEvaluationError(
        `Conditional evaluation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  evaluateAll(conditions: Condition[], context: EvaluationContext): boolean {
    return conditions.every((condition) => this.evaluate(condition, context));
  }

  evaluateAny(conditions: Condition[], context: EvaluationContext): boolean {
    return conditions.some((condition) => this.evaluate(condition, context));
  }

  private evaluateCondition(
    condition: Condition,
    context: EvaluationContext
  ): boolean {
    // Check if it's a logical condition (and, or, not)
    if (this.isLogicalCondition(condition)) {
      return this.evaluateLogicalCondition(
        condition as LogicalCondition,
        context
      );
    }

    // Otherwise it's a variable comparison condition
    const varCondition = condition as {
      [variable: string]: ComparisonCondition;
    };
    for (const [varName, comparison] of Object.entries(varCondition)) {
      const varValue = this.resolveVariableValue(varName, context);
      return this.evaluateComparison(varValue, comparison, context);
    }

    return false;
  }

  private isLogicalCondition(condition: Condition): boolean {
    return 'and' in condition || 'or' in condition || 'not' in condition;
  }

  private evaluateLogicalCondition(
    condition: LogicalCondition,
    context: EvaluationContext
  ): boolean {
    if ('and' in condition && condition.and) {
      return condition.and.every((c) => this.evaluateCondition(c, context));
    }

    if ('or' in condition && condition.or) {
      return condition.or.some((c) => this.evaluateCondition(c, context));
    }

    if ('not' in condition && condition.not) {
      return !this.evaluateCondition(condition.not, context);
    }

    return false;
  }

  private evaluateComparison(
    value: number | boolean,
    comparison: ComparisonCondition,
    context: EvaluationContext
  ): boolean {
    // Handle equality comparisons (work for both numbers and booleans)
    if (comparison.eq !== undefined) {
      const compareValue = this.resolveComparisonValue(comparison.eq, context);
      return value === compareValue;
    }

    if (comparison.ne !== undefined) {
      const compareValue = this.resolveComparisonValue(comparison.ne, context);
      return value !== compareValue;
    }

    // Handle numeric comparisons (only for numbers)
    if (typeof value === 'number') {
      if (comparison.lt !== undefined) {
        const compareValue = this.resolveComparisonValue(
          comparison.lt,
          context
        );
        if (typeof compareValue !== 'number') {
          throw new RuleEvaluationError(
            `Cannot compare number with ${typeof compareValue} using 'lt'`
          );
        }
        return value < compareValue;
      }

      if (comparison.lte !== undefined) {
        const compareValue = this.resolveComparisonValue(
          comparison.lte,
          context
        );
        if (typeof compareValue !== 'number') {
          throw new RuleEvaluationError(
            `Cannot compare number with ${typeof compareValue} using 'lte'`
          );
        }
        return value <= compareValue;
      }

      if (comparison.gt !== undefined) {
        const compareValue = this.resolveComparisonValue(
          comparison.gt,
          context
        );
        if (typeof compareValue !== 'number') {
          throw new RuleEvaluationError(
            `Cannot compare number with ${typeof compareValue} using 'gt'`
          );
        }
        return value > compareValue;
      }

      if (comparison.gte !== undefined) {
        const compareValue = this.resolveComparisonValue(
          comparison.gte,
          context
        );
        if (typeof compareValue !== 'number') {
          throw new RuleEvaluationError(
            `Cannot compare number with ${typeof compareValue} using 'gte'`
          );
        }
        return value >= compareValue;
      }
    }

    return false;
  }

  private resolveComparisonValue(
    value: string | number | boolean,
    context: EvaluationContext
  ): number | boolean {
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    try {
      const variableContext = {
        inputs: context.inputs,
        constants: context.constants,
        calculated: context.calculated,
      };

      const result = this.expressionEvaluator.evaluate(
        value as string,
        variableContext
      );

      if (typeof result === 'string') {
        throw new RuleEvaluationError(
          `String values are not allowed in conditional expressions: '${result}'`
        );
      }

      return result;
    } catch (error) {
      if (error instanceof ExpressionEvaluationError) {
        throw new RuleEvaluationError(error.message);
      }
      throw error;
    }
  }

  private resolveVariableValue(
    varName: string,
    context: EvaluationContext
  ): number | boolean {
    // First check if variable exists directly in calculated
    if (varName in context.calculated) {
      return context.calculated[varName];
    }

    // Then check if it exists in inputs
    if (varName in context.inputs) {
      return context.inputs[varName];
    }

    // Then check if it exists in constants
    if (varName in context.constants) {
      return context.constants[varName];
    }

    // If not found directly, try to evaluate as expression with prefixes
    try {
      const variableContext = {
        inputs: context.inputs,
        constants: context.constants,
        calculated: context.calculated,
      };

      const result = this.expressionEvaluator.evaluate(varName, variableContext);
      
      if (typeof result === 'string') {
        throw new RuleEvaluationError(
          `String values are not allowed in conditional expressions: '${result}'`
        );
      }
      
      return result;
    } catch (error) {
      if (error instanceof ExpressionEvaluationError) {
        // Provide a based on variable prefix
        if (varName.startsWith('$$')) {
          throw new RuleEvaluationError(
            `Constant '${varName.slice(2)}' not found`
          );
        } else if (varName.startsWith('$')) {
          throw new RuleEvaluationError(
            `Input variable '${varName.slice(1)}' not found`
          );
        } else {
          throw new RuleEvaluationError(`Variable '${varName}' not found`);
        }
      }
      throw error;
    }
  }
}

// Export a default instance for convenience
// Create a default conditional evaluator instance
export const conditionalEvaluator = new ConditionalEvaluator(
  new ExpressionEvaluator()
);
