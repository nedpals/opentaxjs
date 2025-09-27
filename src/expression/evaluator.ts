import { VariableMap, VariableValue } from '@/types';
import type {
  BooleanLiteral,
  CalculatedVariableExpression,
  CallExpression,
  ConstantVariableExpression,
  InputVariableExpression,
  NumberLiteral,
  ParsedExpression,
  StringLiteral,
} from './parser';
import { ExpressionParser } from './parser';
import {
  BuiltinSymbols,
  FunctionContext,
  type FunctionDefinition,
  SymbolRegistry,
} from '@/symbol';

export interface VariableContext {
  inputs: VariableMap;
  constants: VariableMap;
  calculated: VariableMap;
  tables?: FunctionContext['tables'];
}

export interface ExpressionEvaluatorConfig {
  builtinFunctions?: BuiltinSymbols['functions'];
  builtinConstants?: BuiltinSymbols['constants'];
  builtinVariables?: BuiltinSymbols['variables'];
}

export class ExpressionEvaluationError extends Error {
  constructor(
    message: string,
    public readonly expression?: ParsedExpression,
    public readonly context?: VariableContext
  ) {
    super(message);
    this.name = 'ExpressionEvaluationError';
  }
}

export class ExpressionEvaluator {
  private config: Required<ExpressionEvaluatorConfig>;
  private symbolRegistry: SymbolRegistry;

  constructor(config: ExpressionEvaluatorConfig = {}) {
    this.config = {
      builtinFunctions: config.builtinFunctions || {},
      builtinConstants: config.builtinConstants || {},
      builtinVariables: config.builtinVariables || {},
    };

    this.symbolRegistry = new SymbolRegistry({
      functions: this.config.builtinFunctions,
      constants: this.config.builtinConstants,
      variables: this.config.builtinVariables,
    });
  }

  evaluate(
    expression: string | ParsedExpression,
    context: VariableContext = { inputs: {}, constants: {}, calculated: {} }
  ): VariableValue {
    try {
      // Parse the expression if it's a string
      const parsedExpression =
        typeof expression === 'string'
          ? ExpressionParser.parse(expression)
          : expression;

      // Clear any previous context symbols and build new ones
      this.symbolRegistry.clearDynamicSymbols();
      this.buildDynamicSymbolRegistry(context);
      return this.evaluateExpression(parsedExpression, context);
    } catch (error) {
      if (error instanceof ExpressionEvaluationError) {
        throw error;
      }
      throw new ExpressionEvaluationError(
        `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        typeof expression === 'string' ? undefined : expression,
        context
      );
    }
  }

  private buildDynamicSymbolRegistry(context: VariableContext): void {
    // Add input variables from context
    for (const [inputName, value] of Object.entries(context.inputs)) {
      const valueType = typeof value as 'number' | 'boolean';
      this.symbolRegistry.addSymbol(
        inputName,
        'input_variable',
        'context',
        valueType
      );
    }

    // Add constants from context (may override predefined ones)
    for (const [constantName, value] of Object.entries(context.constants)) {
      const valueType = typeof value as 'number' | 'boolean';
      this.symbolRegistry.addSymbol(
        constantName,
        'constant_variable',
        'context',
        valueType
      );
    }

    // Add calculated variables from context
    for (const [variableName, value] of Object.entries(context.calculated)) {
      const valueType = typeof value as 'number' | 'boolean';
      this.symbolRegistry.addSymbol(
        variableName,
        'calculated_variable',
        'context',
        valueType
      );
    }
  }

  private validateIdentifierUsage(
    name: string,
    expectedUsage: 'function' | 'variable',
    expression?: ParsedExpression,
    context?: VariableContext
  ): void {
    const symbol = this.symbolRegistry.getSymbol(name);
    if (!symbol) {
      // Symbol doesn't exist - let the original evaluation logic handle missing symbols
      return;
    }

    const isFunction = symbol.symbolType === 'function';
    const expectedIsFunction = expectedUsage === 'function';

    if (isFunction !== expectedIsFunction) {
      throw new ExpressionEvaluationError(
        `Incorrect usage: '${name}' is ${isFunction ? 'a function' : 'a variable'} but used as ${expectedIsFunction ? 'a function' : 'a variable'}`,
        expression,
        context
      );
    }
  }

  private evaluateExpression(
    expression: ParsedExpression,
    context: VariableContext
  ): VariableValue {
    switch (expression.type) {
      case 'number_literal':
        return this.evaluateNumberLiteral(expression);

      case 'boolean_literal':
        return this.evaluateBooleanLiteral(expression);

      case 'string_literal':
        return this.evaluateStringLiteral(expression);

      case 'input_variable':
        return this.evaluateInputVariable(expression, context);

      case 'constant_variable':
        return this.evaluateConstantVariable(expression, context);

      case 'calculated_variable':
        return this.evaluateCalculatedVariable(expression, context);

      case 'call':
        return this.evaluateCall(expression, context);

      default: {
        const exhaustiveCheck: never = expression;
        throw new ExpressionEvaluationError(
          `Unknown expression type`,
          exhaustiveCheck,
          context
        );
      }
    }
  }

  private evaluateNumberLiteral(expression: NumberLiteral): number {
    return expression.value;
  }

  private evaluateBooleanLiteral(expression: BooleanLiteral): boolean {
    return expression.value;
  }

  private evaluateStringLiteral(expression: StringLiteral): string {
    return expression.value;
  }

  private evaluateInputVariable(
    expression: InputVariableExpression,
    context: VariableContext
  ): VariableValue {
    const { name } = expression;

    // Validate symbol usage
    this.validateIdentifierUsage(name, 'variable', expression, context);

    if (name in context.inputs) {
      return context.inputs[name];
    }

    throw new ExpressionEvaluationError(
      `Input variable '${name}' not found in context`,
      expression,
      context
    );
  }

  private evaluateConstantVariable(
    expression: ConstantVariableExpression,
    context: VariableContext
  ): VariableValue {
    const { name } = expression;

    // Validate symbol usage
    this.validateIdentifierUsage(name, 'variable', expression, context);

    // Check user-provided constants first (context overrides built-in)
    if (name in context.constants) {
      return context.constants[name];
    }

    // Check built-in constants
    if (name in this.config.builtinConstants) {
      return this.config.builtinConstants[name];
    }

    throw new ExpressionEvaluationError(
      `Constant '${name}' not found in context or built-in constants`,
      expression,
      context
    );
  }

  private evaluateCalculatedVariable(
    expression: CalculatedVariableExpression,
    context: VariableContext
  ): VariableValue {
    const { name } = expression;

    // Validate symbol usage
    this.validateIdentifierUsage(name, 'variable', expression, context);

    // Check context first (context overrides built-in)
    if (name in context.calculated) {
      return context.calculated[name];
    }

    if (name in this.config.builtinVariables) {
      return this.config.builtinVariables[name];
    }

    throw new ExpressionEvaluationError(
      `Calculated variable '${name}' not found in context or built-in variables`,
      expression,
      context
    );
  }

  private evaluateCall(
    expression: CallExpression,
    context: VariableContext
  ): VariableValue {
    const { name, parameters } = expression;

    // Validate symbol usage - must be used as function
    this.validateIdentifierUsage(name, 'function', expression, context);

    if (!(name in this.config.builtinFunctions)) {
      throw new ExpressionEvaluationError(
        `Unknown function '${name}'. Available functions: ${Object.keys(this.config.builtinFunctions).join(', ')}`,
        expression,
        context
      );
    }

    const evaluatedParams: Record<string, VariableValue | VariableValue[]> = {};

    const func = this.config.builtinFunctions[name];
    if (!func) {
      throw new ExpressionEvaluationError(
        `Function '${name}' is not defined. Available functions: ${Object.keys(this.config.builtinFunctions).join(', ')}`,
        expression,
        context
      );
    }

    // Handle variadic parameters (array type)
    const schema = func.parameters;
    const isVariadic =
      schema.length === 1 &&
      schema[0].name?.startsWith('...') &&
      schema[0].type === 'array' &&
      !schema[0].required;

    if (isVariadic) {
      // For variadic functions, collect all parameters into an array
      const paramName = schema[0].name || 'args';
      const paramValues: VariableValue[] = [];

      for (const param of parameters) {
        try {
          paramValues.push(this.evaluateExpression(param, context));
        } catch (error) {
          throw new ExpressionEvaluationError(
            `Failed to evaluate parameter in function '${name}': ${error instanceof Error ? error.message : String(error)}`,
            expression,
            context
          );
        }
      }
      // Strip the '...' prefix when storing in args object for cleaner callback access
      const cleanParamName = paramName.startsWith('...')
        ? paramName.slice(3)
        : paramName;
      evaluatedParams[cleanParamName] = paramValues;
    } else {
      // For regular functions, map parameters by name
      for (let i = 0; i < parameters.length; i++) {
        const paramSchema = schema[i];
        if (!paramSchema) {
          throw new ExpressionEvaluationError(
            `Function '${name}' received too many parameters`,
            expression,
            context
          );
        }

        const paramName = paramSchema.name || `param${i}`;
        try {
          evaluatedParams[paramName] = this.evaluateExpression(
            parameters[i],
            context
          );
        } catch (error) {
          throw new ExpressionEvaluationError(
            `Failed to evaluate parameter '${paramName}' in function '${name}': ${error instanceof Error ? error.message : String(error)}`,
            expression,
            context
          );
        }
      }
    }

    if (typeof func === 'object' && 'parameters' in func) {
      this.validateFunctionParameters(
        name,
        func,
        evaluatedParams,
        expression,
        context
      );
    }

    // Always pass context to the new callback signature
    const result = func.callback(evaluatedParams, { tables: context.tables });

    if (
      typeof result !== 'number' &&
      typeof result !== 'boolean' &&
      typeof result !== 'string'
    ) {
      throw new ExpressionEvaluationError(
        `Function '${name}' must return a number, boolean, or string, got ${typeof result}`,
        expression,
        context
      );
    }

    return result;
  }

  private validateFunctionParameters(
    funcName: string,
    func: FunctionDefinition,
    params: Record<string, VariableValue | VariableValue[]>,
    expression: CallExpression,
    context: VariableContext
  ): void {
    const name = funcName;
    const { parameters: schema } = func;

    const isVariadic =
      schema.length === 1 && schema[0].type === 'array' && !schema[0].required;

    if (isVariadic) {
      // For variadic functions, validate the array parameter
      const paramSchema = schema[0];
      const paramName = paramSchema.name || 'args';
      // Use the stripped parameter name to access the value
      const cleanParamName = paramName.startsWith('...')
        ? paramName.slice(3)
        : paramName;
      const paramValue = params[cleanParamName];

      if (!Array.isArray(paramValue)) {
        throw new ExpressionEvaluationError(
          `Function '${name}' parameter '${paramName}' must be an array`,
          expression,
          context
        );
      }

      const expectedType = paramSchema.items?.type;
      if (!expectedType) {
        throw new ExpressionEvaluationError(
          `Function '${name}' array parameter missing items type definition`,
          expression,
          context
        );
      }

      for (let i = 0; i < paramValue.length; i++) {
        const item = paramValue[i];
        const actualType = typeof item;
        if (actualType !== expectedType) {
          const article =
            expectedType === 'number' || expectedType === 'string' ? 'a ' : '';
          throw new ExpressionEvaluationError(
            `Function '${name}' parameter '${paramName}[${i}]' must be ${article}${expectedType}, got ${actualType}`,
            expression,
            context
          );
        }
      }
    } else {
      // Validate required parameters are present
      const requiredParams = schema.filter((p) => p.required);
      for (const paramSchema of requiredParams) {
        const paramName = paramSchema.name || 'unknown';
        if (!(paramName in params)) {
          throw new ExpressionEvaluationError(
            `Function '${name}' missing required parameter '${paramName}'`,
            expression,
            context
          );
        }
      }

      // Validate parameter types
      for (const paramSchema of schema) {
        const paramName = paramSchema.name || 'unknown';
        if (paramName in params) {
          const paramValue = params[paramName];
          const actualType = typeof paramValue;

          if (actualType !== paramSchema.type) {
            const article =
              paramSchema.type === 'number' || paramSchema.type === 'string'
                ? 'a '
                : '';
            throw new ExpressionEvaluationError(
              `Function '${name}' parameter '${paramName}' must be ${article}${paramSchema.type}, got ${actualType}`,
              expression,
              context
            );
          }
        }
      }

      // Check for unexpected parameters
      const expectedParamNames = new Set(
        schema.map((p) => p.name).filter(Boolean)
      );
      for (const paramName of Object.keys(params)) {
        if (!expectedParamNames.has(paramName)) {
          throw new ExpressionEvaluationError(
            `Function '${name}' received unexpected parameter '${paramName}'`,
            expression,
            context
          );
        }
      }
    }
  }
}
