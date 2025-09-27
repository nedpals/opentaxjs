import type {
  Rule,
  EvaluationContext,
  Operation,
  FlowStep,
  Table,
} from '@/types';
import { RuleEvaluationError, OperationError } from './errors';
import { OPERATION_REGISTRY } from './operations';
import { ConditionalEvaluator } from './conditional';
import { ExpressionEvaluator, ExpressionEvaluatorConfig } from '@/expression';

export class RuleEvaluator {
  private conditionalEvaluator: ConditionalEvaluator;
  private expressionEvaluator: ExpressionEvaluator;

  constructor(exprEvalConfig?: ExpressionEvaluatorConfig) {
    this.expressionEvaluator = new ExpressionEvaluator(exprEvalConfig);
    this.conditionalEvaluator = new ConditionalEvaluator(
      this.expressionEvaluator
    );
  }

  evaluate(
    rule: Rule,
    inputs: Record<string, number | boolean> = {}
  ): Record<string, number | boolean> {
    try {
      const context = this.createContext(rule, inputs);
      const finalContext = this.processFlow(rule.flow, context);
      const results: Record<string, number | boolean> = {};

      for (const outputName of Object.keys(rule.outputs)) {
        if (outputName in finalContext.calculated) {
          results[outputName] = finalContext.calculated[outputName];
        } else {
          const outputType = rule.outputs[outputName].type;
          results[outputName] = outputType === 'boolean' ? false : 0;
        }
      }

      return results;
    } catch (error) {
      if (
        error instanceof RuleEvaluationError ||
        error instanceof OperationError
      ) {
        throw error;
      }
      throw new RuleEvaluationError(
        `Rule evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        rule
      );
    }
  }

  private createContext(
    rule: Rule,
    inputs: Record<string, number | boolean>
  ): EvaluationContext {
    // Validate required inputs
    for (const [inputName, inputDecl] of Object.entries(rule.inputs)) {
      if (!(inputName in inputs)) {
        throw new RuleEvaluationError(
          `Required input '${inputName}' not provided`,
          rule
        );
      }

      const value = inputs[inputName];
      const expectedType = inputDecl.type;
      const actualType = typeof value;

      if (actualType !== expectedType) {
        throw new RuleEvaluationError(
          `Input '${inputName}' has wrong type. Expected ${expectedType}, got ${actualType}`,
          rule
        );
      }

      // Validate numeric ranges
      if (expectedType === 'number' && typeof value === 'number') {
        if (inputDecl.minimum !== undefined && value < inputDecl.minimum) {
          throw new RuleEvaluationError(
            `Input '${inputName}' value ${value} is below minimum ${inputDecl.minimum}`,
            rule
          );
        }
        if (inputDecl.maximum !== undefined && value > inputDecl.maximum) {
          throw new RuleEvaluationError(
            `Input '${inputName}' value ${value} is above maximum ${inputDecl.maximum}`,
            rule
          );
        }
      }
    }

    // Create tables lookup
    const tablesMap: Record<string, Table> = {};
    for (const table of rule.tables) {
      tablesMap[table.name] = table;
    }

    return {
      inputs,
      constants: rule.constants,
      calculated: {},
      tables: tablesMap,
    };
  }

  private processFlow(
    flowSteps: FlowStep[],
    context: EvaluationContext
  ): EvaluationContext {
    let currentContext = context;

    for (const step of flowSteps) {
      currentContext = this.processFlowStep(step, currentContext);
    }

    return currentContext;
  }

  private processFlowStep(
    step: FlowStep,
    context: EvaluationContext
  ): EvaluationContext {
    let currentContext = context;

    // Process direct operations
    if (step.operations) {
      for (const operation of step.operations) {
        currentContext = this.executeOperation(operation, currentContext);
      }
    }

    // Process conditional cases
    if (step.cases) {
      for (const case_ of step.cases) {
        if (this.conditionalEvaluator.evaluate(case_.when, currentContext)) {
          // Execute this case's operations
          for (const operation of case_.operations) {
            currentContext = this.executeOperation(operation, currentContext);
          }
          break; // Only execute the first matching case
        }
      }
    }

    return currentContext;
  }

  private executeOperation(
    operation: Operation,
    context: EvaluationContext
  ): EvaluationContext {
    const operationFunction = OPERATION_REGISTRY[operation.type];
    if (!operationFunction) {
      throw new OperationError(
        `Unknown operation type: ${operation.type}`,
        operation,
        context
      );
    }

    return operationFunction(operation, context, this.expressionEvaluator);
  }
}
