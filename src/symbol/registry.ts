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
  type: 'number' | 'boolean' | 'array';
  items?: {
    type: 'number' | 'boolean';
  };
  required?: boolean;
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
}
