export interface SymbolInfo {
  name: string;
  symbolType:
    | 'function'
    | 'input_variable'
    | 'constant_variable'
    | 'calculated_variable';
  source: 'builtin' | 'context';
  valueType?: 'number' | 'boolean' | 'unknown';
}

export interface BuiltinSymbols {
  functions?: Record<string, FunctionDefinition>;
  constants?: Record<string, number | boolean>;
  variables?: Record<string, number | boolean>;
}

export interface FunctionDefinition {
  parameters: ParameterSchema[];
  callback: (...args: unknown[]) => unknown;
}

export interface ParameterSchema {
  name?: string;
  type: 'number' | 'boolean' | 'string' | 'array';
  items?: {
    type: 'number' | 'boolean' | 'string';
  };
  required?: boolean;
}

export class VariableResolutionError extends Error {
  constructor(
    message: string,
    public readonly variableName?: string
  ) {
    super(message);
    this.name = 'VariableResolutionError';
  }
}

export interface VariableContext {
  inputs: Record<string, number | boolean>;
  constants: Record<string, number | boolean>;
  calculated: Record<string, number | boolean>;
}

export class SymbolRegistry {
  private symbols: Map<string, SymbolInfo> = new Map();

  constructor(builtins?: BuiltinSymbols) {
    if (builtins?.functions) {
      for (const name of Object.keys(builtins.functions)) {
        this.addSymbol(name, 'function', 'builtin');
      }
    }

    if (builtins?.constants) {
      for (const [name, value] of Object.entries(builtins.constants)) {
        const valueType = typeof value as 'number' | 'boolean';
        this.addSymbol(name, 'constant_variable', 'builtin', valueType);
      }
    }

    if (builtins?.variables) {
      for (const [name, value] of Object.entries(builtins.variables)) {
        const valueType = typeof value as 'number' | 'boolean';
        this.addSymbol(name, 'calculated_variable', 'builtin', valueType);
      }
    }
  }

  addSymbol(
    name: string,
    symbolType:
      | 'function'
      | 'input_variable'
      | 'constant_variable'
      | 'calculated_variable',
    source: 'builtin' | 'context',
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

      // Functions cannot be redefined, but variables can be overridden by context
      if (existing.source === 'builtin' && existing.symbolType === 'function') {
        throw new Error(`Cannot redefine built-in function '${name}'`);
      }

      // Built-in variables and constants can be overridden by context values
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
    // Remove all symbols from context, keep builtin
    for (const [name, symbol] of this.symbols.entries()) {
      if (symbol.source === 'context') {
        this.symbols.delete(name);
      }
    }
  }

  /**
   * Resolves a variable reference to its actual value
   * @param reference Variable reference (e.g., '$income', '$$tax_rate', 'taxable_income')
   * @param context Variable context containing values
   * @returns The resolved value
   */
  resolveValue(
    reference: string | number | boolean,
    context: VariableContext
  ): number | boolean {
    // Return primitives as-is
    if (typeof reference === 'number' || typeof reference === 'boolean') {
      return reference;
    }

    const varName = reference as string;
    return this.resolveVariable(varName, context);
  }

  /**
   * Resolves a variable by name with prefix handling and symbol validation
   */
  private resolveVariable(
    varName: string,
    context: VariableContext
  ): number | boolean {
    // Input variable ($prefix)
    if (varName.startsWith('$') && !varName.startsWith('$$')) {
      const inputName = varName.slice(1);
      this.validateSymbolUsage(inputName, 'input_variable');
      return this.getInputValue(inputName, context);
    }

    // Constant variable ($$prefix)
    if (varName.startsWith('$$')) {
      const constName = varName.slice(2);
      this.validateSymbolUsage(constName, 'constant_variable');
      return this.getConstantValue(constName, context);
    }

    // No prefix - try calculated, then inputs, then constants
    return this.resolveUnprefixedVariable(varName, context);
  }

  /**
   * Validates that a symbol is being used correctly (as function vs variable)
   */
  private validateSymbolUsage(
    name: string,
    expectedType:
      | 'function'
      | 'input_variable'
      | 'constant_variable'
      | 'calculated_variable'
  ): void {
    const symbol = this.getSymbol(name);
    if (symbol && symbol.symbolType !== expectedType) {
      const actualIsFunction = symbol.symbolType === 'function';
      const expectedIsFunction = expectedType === 'function';

      throw new VariableResolutionError(
        `Incorrect usage: '${name}' is ${actualIsFunction ? 'a function' : 'a variable'} but used as ${expectedIsFunction ? 'a function' : 'a variable'}`,
        name
      );
    }
  }

  /**
   * Resolves variables without prefixes (calculated, inputs, constants in that priority)
   */
  private resolveUnprefixedVariable(
    varName: string,
    context: VariableContext
  ): number | boolean {
    // Priority: calculated > inputs > constants
    if (varName in context.calculated) {
      return context.calculated[varName];
    }
    if (varName in context.inputs) {
      return context.inputs[varName];
    }
    if (varName in context.constants) {
      return context.constants[varName];
    }

    throw new VariableResolutionError(
      `Variable '${varName}' not found`,
      varName
    );
  }

  /**
   * Gets input variable value with validation
   */
  private getInputValue(
    inputName: string,
    context: VariableContext
  ): number | boolean {
    if (inputName in context.inputs) {
      return context.inputs[inputName];
    }
    throw new VariableResolutionError(
      `Input variable '${inputName}' not found`,
      inputName
    );
  }

  /**
   * Gets constant variable value with validation
   */
  private getConstantValue(
    constName: string,
    context: VariableContext
  ): number | boolean {
    if (constName in context.constants) {
      return context.constants[constName];
    }
    throw new VariableResolutionError(
      `Constant '${constName}' not found`,
      constName
    );
  }

  /**
   * Batch resolves multiple values efficiently
   */
  resolveBatch(
    references: (string | number | boolean)[],
    context: VariableContext
  ): (number | boolean)[] {
    return references.map((ref) => this.resolveValue(ref, context));
  }

  /**
   * Checks if a variable reference can be resolved without throwing
   */
  canResolve(
    reference: string | number | boolean,
    context: VariableContext
  ): boolean {
    try {
      this.resolveValue(reference, context);
      return true;
    } catch {
      return false;
    }
  }
}
