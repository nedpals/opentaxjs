import type {
  BooleanLiteral,
  CalculatedVariableExpression,
  CallExpression,
  ConstantVariableExpression,
  InputVariableExpression,
  NumberLiteral,
  ParsedExpression,
} from './parser';

export interface VariableContext {
  inputs: Record<string, number | boolean>;
  constants: Record<string, number | boolean>;
  calculated: Record<string, number | boolean>;
}

export interface ExpressionEvaluatorConfig {
  builtinFunctions?: Record<string, FunctionDefinition>;
  builtinConstants?: Record<string, number | boolean>;
  builtinVariables?: Record<string, number | boolean>;
}

export interface ParameterSchema {
  name?: string;
  type: 'number' | 'boolean' | 'array';
  items?: {
    type: 'number' | 'boolean';
  };
  required?: boolean;
}

export interface SymbolInfo {
  name: string;
  symbolType:
    | 'function'
    | 'input_variable'
    | 'constant_variable'
    | 'calculated_variable';
  source: 'builtin' | 'predefined' | 'context';
  valueType?: 'number' | 'boolean' | 'unknown';
}

export interface FunctionDefinition {
  parameters: ParameterSchema[];
  callback: (...args: unknown[]) => unknown;
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

class SymbolRegistry {
  private symbols: Map<string, SymbolInfo> = new Map();

  addSymbol(
    name: string,
    symbolType:
      | 'function'
      | 'input_variable'
      | 'constant_variable'
      | 'calculated_variable',
    source: 'builtin' | 'predefined' | 'context',
    valueType?: 'number' | 'boolean'
  ): void {
    // Check for conflicts
    const existing = this.symbols.get(name);
    if (existing) {
      const existingIsFunction = existing.symbolType === 'function';
      const newIsFunction = symbolType === 'function';

      if (existingIsFunction !== newIsFunction) {
        throw new Error(
          `Symbol conflict: '${name}' is already defined as ${existingIsFunction ? 'a function' : 'a variable'}, cannot redefine as ${newIsFunction ? 'a function' : 'a variable'}`
        );
      }

      // Allow redefinition of same type (context overrides predefined, but not built-ins)
      if (existing.source === 'builtin') {
        throw new Error(
          `Cannot redefine built-in ${existing.symbolType} '${name}'`
        );
      }
    }

    this.symbols.set(name, {
      name,
      symbolType,
      source,
      valueType: symbolType === 'function' ? undefined : valueType || 'unknown',
    });
  }

  getSymbol(name: string): SymbolInfo | undefined {
    return this.symbols.get(name);
  }

  getAllSymbols(): SymbolInfo[] {
    return Array.from(this.symbols.values());
  }

  clear(): void {
    this.symbols.clear();
  }

  clearDynamicSymbols(): void {
    // Remove all symbols from context, keep builtin and predefined
    for (const [name, symbol] of this.symbols.entries()) {
      if (symbol.source === 'context') {
        this.symbols.delete(name);
      }
    }
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

    this.symbolRegistry = new SymbolRegistry();
    this.buildStaticSymbolRegistry();
  }

  private buildStaticSymbolRegistry(): void {
    for (const functionName of Object.keys(this.config.builtinFunctions)) {
      this.symbolRegistry.addSymbol(functionName, 'function', 'builtin');
    }

    for (const [constantName, value] of Object.entries(
      this.config.builtinConstants
    )) {
      const valueType = typeof value as 'number' | 'boolean';
      this.symbolRegistry.addSymbol(
        constantName,
        'constant_variable',
        'predefined',
        valueType
      );
    }

    for (const [variableName, value] of Object.entries(
      this.config.builtinVariables
    )) {
      const valueType = typeof value as 'number' | 'boolean';
      this.symbolRegistry.addSymbol(
        variableName,
        'calculated_variable',
        'predefined',
        valueType
      );
    }
  }

  evaluate(
    expression: ParsedExpression,
    context: VariableContext = { inputs: {}, constants: {}, calculated: {} }
  ): number | boolean {
    try {
      // Clear any previous context symbols and build new ones
      this.symbolRegistry.clearDynamicSymbols();
      this.buildDynamicSymbolRegistry(context);
      return this.evaluateExpression(expression, context);
    } catch (error) {
      if (error instanceof ExpressionEvaluationError) {
        throw error;
      }
      throw new ExpressionEvaluationError(
        `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        expression,
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
  ): number | boolean {
    switch (expression.type) {
      case 'number_literal':
        return this.evaluateNumberLiteral(expression);

      case 'boolean_literal':
        return this.evaluateBooleanLiteral(expression);

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

  private evaluateInputVariable(
    expression: InputVariableExpression,
    context: VariableContext
  ): number | boolean {
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
  ): number | boolean {
    const { name } = expression;

    // Validate symbol usage
    this.validateIdentifierUsage(name, 'variable', expression, context);

    // Check user-provided constants first
    if (name in context.constants) {
      return context.constants[name];
    }

    // Check predefined constants
    if (name in this.config.builtinConstants) {
      return this.config.builtinConstants[name];
    }

    throw new ExpressionEvaluationError(
      `Constant '${name}' not found in context or predefined constants`,
      expression,
      context
    );
  }

  private evaluateCalculatedVariable(
    expression: CalculatedVariableExpression,
    context: VariableContext
  ): number | boolean {
    const { name } = expression;

    // Validate symbol usage
    this.validateIdentifierUsage(name, 'variable', expression, context);

    if (name in context.calculated) {
      return context.calculated[name];
    }

    if (name in this.config.builtinVariables) {
      return this.config.builtinVariables[name];
    }

    throw new ExpressionEvaluationError(
      `Calculated variable '${name}' not found in context or predefined variables`,
      expression,
      context
    );
  }

  private evaluateCall(
    expression: CallExpression,
    context: VariableContext
  ): number | boolean {
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

    const evaluatedParams: (number | boolean)[] = [];
    for (const param of parameters) {
      try {
        evaluatedParams.push(this.evaluateExpression(param, context));
      } catch (error) {
        throw new ExpressionEvaluationError(
          `Failed to evaluate parameter in function '${name}': ${error instanceof Error ? error.message : String(error)}`,
          expression,
          context
        );
      }
    }

    const func = this.config.builtinFunctions[name];
    if (!func) {
      throw new ExpressionEvaluationError(
        `Function '${name}' is not defined. Available functions: ${Object.keys(this.config.builtinFunctions).join(', ')}`,
        expression,
        context
      );
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

    const result = func.callback(...(evaluatedParams as unknown[]));
    if (typeof result !== 'number' && typeof result !== 'boolean') {
      throw new ExpressionEvaluationError(
        `Function '${name}' must return a number or boolean, got ${typeof result}`,
        expression,
        context
      );
    }

    return result;
  }

  private validateFunctionParameters(
    funcName: string,
    func: FunctionDefinition,
    params: (number | boolean)[],
    expression: CallExpression,
    context: VariableContext
  ): void {
    const name = funcName;
    const { parameters: schema } = func;

    const isVariadic =
      schema.length === 1 && schema[0].type === 'array' && !schema[0].required;

    if (isVariadic) {
      // For variadic functions, all parameters must match the array items type
      const expectedType = schema[0].items?.type;
      if (!expectedType) {
        throw new ExpressionEvaluationError(
          `Function '${name}' array parameter missing items type definition`,
          expression,
          context
        );
      }

      for (let i = 0; i < params.length; i++) {
        const param = params[i];
        const actualType = typeof param;
        if (actualType !== expectedType) {
          const article = expectedType === 'number' ? 'a ' : '';
          throw new ExpressionEvaluationError(
            `Function '${name}' parameter ${i + 1} must be ${article}${expectedType}, got ${actualType}`,
            expression,
            context
          );
        }
      }
    } else {
      const requiredParamCount = schema.filter((p) => p.required).length;

      if (params.length < requiredParamCount) {
        throw new ExpressionEvaluationError(
          `Function '${name}' requires at least ${requiredParamCount} parameters, got ${params.length}`,
          expression,
          context
        );
      }

      if (params.length > schema.length) {
        throw new ExpressionEvaluationError(
          `Function '${name}' accepts at most ${schema.length} parameters, got ${params.length}`,
          expression,
          context
        );
      }

      // Validate each parameter type
      for (let i = 0; i < params.length; i++) {
        const param = params[i];
        const paramSchema = schema[i];
        const actualType = typeof param;

        if (actualType !== paramSchema.type) {
          const article = paramSchema.type === 'number' ? 'a ' : '';
          throw new ExpressionEvaluationError(
            `Function '${name}' parameter ${i + 1} must be ${article}${paramSchema.type}, got ${actualType}`,
            expression,
            context
          );
        }
      }
    }
  }

  createContext(
    inputs: Record<string, number | boolean> = {},
    constants: Record<string, number | boolean> = {},
    calculated: Record<string, number | boolean> = {}
  ): VariableContext {
    return {
      inputs,
      constants: { ...this.config.builtinConstants, ...constants },
      calculated: { ...this.config.builtinVariables, ...calculated },
    };
  }
}
