import type { FunctionDefinition } from '@/symbol';

export const BUILTIN_FUNCTIONS: Record<string, FunctionDefinition> = {
  diff: {
    parameters: [
      { type: 'number', required: true },
      { type: 'number', required: true },
    ],
    callback: (a: unknown, b: unknown): unknown => {
      return Math.abs((a as number) - (b as number));
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
    callback: (...args: unknown[]): unknown => {
      return (args as number[]).reduce((acc: number, val) => acc + val, 0);
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
    callback: (...args: unknown[]): unknown => {
      if (args.length === 0) return 0;
      return Math.max(...(args as number[]));
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
    callback: (...args: unknown[]): unknown => {
      if (args.length === 0) return 0;
      return Math.min(...(args as number[]));
    },
  },

  round: {
    parameters: [
      { type: 'number', required: true },
      { type: 'number', required: false }, // decimals parameter is optional
    ],
    callback: (value: unknown, decimals: unknown = 0): unknown => {
      const numValue = value as number;
      const numDecimals = decimals as number;
      const factor = 10 ** numDecimals;
      return Math.round(numValue * factor) / factor;
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
