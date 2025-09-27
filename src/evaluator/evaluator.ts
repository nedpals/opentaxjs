import type {
  Rule,
  EvaluationContext,
  Operation,
  FlowStep,
  Table,
  VariableMap,
  ValidationRule,
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

  evaluate(rule: Rule, inputs: VariableMap = {}): EvaluationContext {
    try {
      const context = this.createContext(rule, inputs);

      // Run validation before processing the flow
      if (rule.validate) {
        this.runValidation(rule.validate, context);
      }

      const finalContext = this.processFlow(rule.flow, context);

      for (const outputName of Object.keys(rule.outputs)) {
        if (!(outputName in finalContext.calculated)) {
          const outputType = rule.outputs[outputName].type;
          finalContext.calculated[outputName] =
            outputType === 'boolean' ? false : 0;
        }
      }

      return finalContext;
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

  private createContext(rule: Rule, inputs: VariableMap): EvaluationContext {
    const tempContext: EvaluationContext = {
      inputs: inputs,
      constants: rule.constants || {},
      calculated: {},
      tables: {},
    };

    // Validate inputs, considering conditional requirements and default values
    for (const [inputName, inputDecl] of Object.entries(rule.inputs)) {
      let isRequired = true;
      const hasDefault = inputDecl.default !== undefined;

      if (inputDecl.when) {
        try {
          isRequired = this.conditionalEvaluator.evaluate(
            inputDecl.when,
            tempContext
          );
        } catch {
          // If we can't evaluate the condition, assume it's required for safety
          isRequired = true;
        }
      }

      // Apply default values for missing inputs when they are required or conditional
      if (!(inputName in inputs) && hasDefault && isRequired) {
        tempContext.inputs[inputName] = inputDecl.default!;
      }

      // Only validate if the input is required by its condition AND has no default value
      if (isRequired && !hasDefault) {
        if (!(inputName in inputs)) {
          throw new RuleEvaluationError(
            `Required input '${inputName}' not provided`,
            rule
          );
        }
      }

      // Validate provided inputs (either explicitly provided or from defaults)
      if (inputName in tempContext.inputs) {
        const value = tempContext.inputs[inputName];
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

        // Validate enum constraints
        if (inputDecl.enum !== undefined && inputDecl.enum.length > 0) {
          if (!inputDecl.enum.includes(value as string)) {
            throw new RuleEvaluationError(
              `Input '${inputName}' value '${value}' is not in allowed enum values: ${inputDecl.enum.join(', ')}`,
              rule
            );
          }
        }
      }
    }

    // Create tables lookup and resolve bracket constants
    const tablesMap: Record<string, Table> = {};
    for (const table of rule.tables || []) {
      tablesMap[table.name] = {
        name: table.name,
        brackets: table.brackets.map((bracket) => ({
          ...bracket,
          min:
            typeof bracket.min === 'string'
              ? (this.expressionEvaluator.evaluate(bracket.min, {
                  inputs,
                  constants: rule.constants || {},
                  calculated: {},
                  tables: {}, // Empty during table processing
                }) as number)
              : bracket.min,
          max:
            typeof bracket.max === 'string'
              ? (this.expressionEvaluator.evaluate(bracket.max, {
                  inputs,
                  constants: rule.constants || {},
                  calculated: {},
                  tables: {}, // Empty during table processing
                }) as number)
              : bracket.max,
        })),
      };
    }

    return {
      inputs,
      constants: rule.constants || {},
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
        if (
          !case_.when ||
          (case_.operations &&
            Array.isArray(case_.operations) &&
            this.conditionalEvaluator.evaluate(case_.when, currentContext))
        ) {
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

  private runValidation(
    validationRules: ValidationRule[],
    context: EvaluationContext
  ): void {
    for (const validationRule of validationRules) {
      try {
        const conditionResult = this.conditionalEvaluator.evaluate(
          validationRule.when,
          context
        );
        if (conditionResult) {
          throw new RuleEvaluationError(
            `Validation failed: ${validationRule.error}`,
            undefined
          );
        }
      } catch (error) {
        // Re-throw validation errors - these should propagate
        if (
          error instanceof RuleEvaluationError &&
          error.message.startsWith('Validation failed:')
        ) {
          throw error;
        }
        // If validation condition cannot be evaluated (e.g., due to missing conditional inputs),
        // skip this validation rule. This allows validation rules to reference conditional
        // inputs that may not be provided.
        continue;
      }
    }
  }
}
