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
      context: FunctionContext
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
      context: FunctionContext
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
      context: FunctionContext
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
      context: FunctionContext
    ): unknown => {
      const numbers = args.numbers as number[];
      if (numbers.length === 0) return 0;
      return Math.min(...numbers);
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
