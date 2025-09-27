import type { FunctionDefinition, FunctionContext } from '@/symbol';
import type { Table } from '@/types';

export const BUILTIN_FUNCTIONS: Record<string, FunctionDefinition> = {
  diff: {
    parameters: [
      { name: 'a', type: 'number', required: true },
      { name: 'b', type: 'number', required: true },
    ],
    callback: (
      args: Record<string, unknown>,
      _context: FunctionContext
    ): unknown => {
      const { a, b } = args as { a: number; b: number };
      return Math.abs(a - b);
    },
  },

  sum: {
    parameters: [
      {
        name: '...numbers',
        type: 'array',
        items: { type: 'number' },
        required: false,
      },
    ],
    callback: (
      args: Record<string, unknown>,
      _context: FunctionContext
    ): unknown => {
      const numbers = args.numbers as number[];
      return numbers.reduce((acc: number, val) => acc + val, 0);
    },
  },

  max: {
    parameters: [
      {
        name: '...numbers',
        type: 'array',
        items: { type: 'number' },
        required: false,
      },
    ],
    callback: (
      args: Record<string, unknown>,
      _context: FunctionContext
    ): unknown => {
      const numbers = args.numbers as number[];
      if (numbers.length === 0) return 0;
      return Math.max(...numbers);
    },
  },

  min: {
    parameters: [
      {
        name: '...numbers',
        type: 'array',
        items: { type: 'number' },
        required: false,
      },
    ],
    callback: (
      args: Record<string, unknown>,
      _context: FunctionContext
    ): unknown => {
      const numbers = args.numbers as number[];
      if (numbers.length === 0) return 0;
      return Math.min(...numbers);
    },
  },

  round: {
    parameters: [
      { name: 'value', type: 'number', required: true },
      { name: 'decimals', type: 'number', required: false }, // decimals parameter is optional
    ],
    callback: (
      args: Record<string, unknown>,
      _context: FunctionContext
    ): unknown => {
      const { value, decimals = 0 } = args as {
        value: number;
        decimals?: number;
      };
      const factor = 10 ** decimals;
      return Math.round(value * factor) / factor;
    },
  },

  lookup: {
    parameters: [
      { name: 'tableName', type: 'string', required: true }, // table name
      { name: 'value', type: 'number', required: true }, // value to lookup
    ],
    callback: (
      args: Record<string, unknown>,
      context: FunctionContext
    ): unknown => {
      const { tableName, value } = args as { tableName: string; value: number };

      if (!context.tables) {
        throw new Error('Tables context not available for lookup function');
      }

      const table = context.tables[tableName] as Table;
      if (!table) {
        throw new Error(`Table '${tableName}' not found`);
      }

      // Find the bracket where value falls between min and max
      for (const bracket of table.brackets) {
        const min = bracket.min;
        const max =
          bracket.max === null ? Number.MAX_SAFE_INTEGER : bracket.max;

        if (value >= min && value <= max) {
          // Calculate tax for the amount within this bracket
          const taxableInBracket = value - min;
          const taxInBracket = taxableInBracket * bracket.rate;
          return bracket.base_tax + taxInBracket;
        }
      }

      // If no bracket found, return 0
      return 0;
    },
  },
};

export const BUILTIN_CONSTANTS: Record<string, number | boolean> = {
  MAX_TAXABLE_INCOME: 9007199254740991, // IEEE 754 maximum safe integer
};

export const BUILTIN_OUTPUT_VARIABLES: Record<string, number | boolean> = {
  liability: 0,
};

export const BUILTINS = {
  builtinFunctions: BUILTIN_FUNCTIONS,
  builtinConstants: BUILTIN_CONSTANTS,
  builtinVariables: BUILTIN_OUTPUT_VARIABLES,
};
