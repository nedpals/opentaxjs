import type {
  Operation,
  EvaluationContext,
  SetOperation,
  ArithmeticOperation,
  MinMaxOperation,
  LookupOperation,
} from '@/types';
import { OperationError, TableError } from './errors';
import { ExpressionEvaluator, ExpressionEvaluationError } from '@/expression';

export type OperationFunction = (
  operation: Operation,
  context: EvaluationContext,
  expressionEvaluator: ExpressionEvaluator
) => EvaluationContext;

function resolveValue(
  value: string | number | boolean,
  expressionEvaluator: ExpressionEvaluator,
  context: EvaluationContext
): number | boolean {
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  try {
    return expressionEvaluator.evaluate(value as string, {
      inputs: context.inputs,
      constants: context.constants,
      calculated: context.calculated,
    });

    if (typeof result === 'string') {
      throw new Error(
        `String values are not allowed in operations: '${result}'`
      );
    }

    return result;
  } catch (error) {
    if (error instanceof ExpressionEvaluationError) {
      throw new Error(error.message);
    }
    throw error;
  }
}

export const setOperation: OperationFunction = (
  operation: Operation,
  context: EvaluationContext,
  expressionEvaluator: ExpressionEvaluator
) => {
  const setOp = operation as SetOperation;
  const value = resolveValue(setOp.value, expressionEvaluator, context);

  return {
    ...context,
    calculated: {
      ...context.calculated,
      [setOp.target]: value,
    },
  };
};

const addOperation: OperationFunction = (
  operation: Operation,
  context: EvaluationContext,
  expressionEvaluator: ExpressionEvaluator
) => {
  const addOp = operation as ArithmeticOperation;
  const currentValue = context.calculated[addOp.target];
  const addValue = resolveValue(addOp.value, expressionEvaluator, context);

  if (typeof currentValue !== 'number' || typeof addValue !== 'number') {
    throw new OperationError(
      `Add operation requires numeric values. Target: ${typeof currentValue}, Value: ${typeof addValue}`,
      operation,
      context
    );
  }

  return {
    ...context,
    calculated: {
      ...context.calculated,
      [addOp.target]: currentValue + addValue,
    },
  };
};

const subtractOp: OperationFunction = (
  operation: Operation,
  context: EvaluationContext,
  expressionEvaluator: ExpressionEvaluator
) => {
  const subOp = operation as ArithmeticOperation;
  const currentValue = context.calculated[subOp.target];
  const subValue = resolveValue(subOp.value, expressionEvaluator, context);

  if (typeof currentValue !== 'number' || typeof subValue !== 'number') {
    throw new OperationError(
      `Subtract operation requires numeric values. Target: ${typeof currentValue}, Value: ${typeof subValue}`,
      operation,
      context
    );
  }

  return {
    ...context,
    calculated: {
      ...context.calculated,
      [subOp.target]: currentValue - subValue,
    },
  };
};

const multiplyOp: OperationFunction = (
  operation: Operation,
  context: EvaluationContext,
  expressionEvaluator: ExpressionEvaluator
) => {
  const mulOp = operation as ArithmeticOperation;
  const currentValue = context.calculated[mulOp.target];
  const mulValue = resolveValue(mulOp.value, expressionEvaluator, context);

  if (typeof currentValue !== 'number' || typeof mulValue !== 'number') {
    throw new OperationError(
      `Multiply operation requires numeric values. Target: ${typeof currentValue}, Value: ${typeof mulValue}`,
      operation,
      context
    );
  }

  return {
    ...context,
    calculated: {
      ...context.calculated,
      [mulOp.target]: currentValue * mulValue,
    },
  };
};

const divideOp: OperationFunction = (
  operation: Operation,
  context: EvaluationContext,
  expressionEvaluator: ExpressionEvaluator
) => {
  const divOp = operation as ArithmeticOperation;
  const currentValue = context.calculated[divOp.target];
  const divValue = resolveValue(divOp.value, expressionEvaluator, context);

  if (typeof currentValue !== 'number' || typeof divValue !== 'number') {
    throw new OperationError(
      `Divide operation requires numeric values. Target: ${typeof currentValue}, Value: ${typeof divValue}`,
      operation,

      context
    );
  }

  if (divValue === 0) {
    throw new OperationError('Division by zero', operation, context);
  }

  return {
    ...context,
    calculated: {
      ...context.calculated,
      [divOp.target]: currentValue / divValue,
    },
  };
};

const minOp: OperationFunction = (
  operation: Operation,
  context: EvaluationContext,
  expressionEvaluator: ExpressionEvaluator
) => {
  const minOp = operation as MinMaxOperation;
  const currentValue = context.calculated[minOp.target];
  const minValue = resolveValue(minOp.value, expressionEvaluator, context);

  if (typeof currentValue !== 'number' || typeof minValue !== 'number') {
    throw new OperationError(
      `Min operation requires numeric values. Target: ${typeof currentValue}, Value: ${typeof minValue}`,
      operation,
      context
    );
  }

  return {
    ...context,
    calculated: {
      ...context.calculated,
      [minOp.target]: Math.min(currentValue, minValue),
    },
  };
};

const maxOp: OperationFunction = (
  operation: Operation,
  context: EvaluationContext,
  expressionEvaluator: ExpressionEvaluator
) => {
  const maxOp = operation as MinMaxOperation;
  const currentValue = context.calculated[maxOp.target];
  const maxValue = resolveValue(maxOp.value, expressionEvaluator, context);

  if (typeof currentValue !== 'number' || typeof maxValue !== 'number') {
    throw new OperationError(
      `Max operation requires numeric values. Target: ${typeof currentValue}, Value: ${typeof maxValue}`,
      operation,
      context
    );
  }

  return {
    ...context,
    calculated: {
      ...context.calculated,
      [maxOp.target]: Math.max(currentValue, maxValue),
    },
  };
};

const lookupOp: OperationFunction = (
  operation: Operation,
  context: EvaluationContext,
  expressionEvaluator: ExpressionEvaluator
) => {
  const lookupOp = operation as LookupOperation;
  const lookupValue = resolveValue(
    lookupOp.value,
    expressionEvaluator,
    context
  );

  if (typeof lookupValue !== 'number') {
    throw new OperationError(
      `Lookup operation requires numeric lookup value, got ${typeof lookupValue}`,
      operation,
      context
    );
  }

  const table = context.tables[lookupOp.table];
  if (!table) {
    throw new TableError(
      `Table '${lookupOp.table}' not found`,
      lookupOp.table,
      context
    );
  }

  // Find the appropriate bracket
  let bracket = null;
  for (const b of table.brackets) {
    if (lookupValue >= b.min && (b.max === null || lookupValue <= b.max)) {
      bracket = b;
      break;
    }
  }

  if (!bracket) {
    throw new TableError(
      `No bracket found for value ${lookupValue} in table '${lookupOp.table}'`,
      lookupOp.table,
      context
    );
  }

  // Calculate progressive tax
  // For the amount that falls within this bracket
  const taxableInBracket =
    bracket.max === null
      ? lookupValue - bracket.min
      : Math.min(lookupValue, bracket.max) - bracket.min;

  const taxInBracket = taxableInBracket * bracket.rate;
  const totalTax = bracket.base_tax + taxInBracket;

  return {
    ...context,
    calculated: {
      ...context.calculated,
      [lookupOp.target]: totalTax,
    },
  };
};

export const OPERATION_REGISTRY: Record<string, OperationFunction> = {
  set: setOperation,
  add: addOperation,
  subtract: subtractOp,
  deduct: subtractOp, // Alias for subtract
  multiply: multiplyOp,
  divide: divideOp,
  min: minOp,
  max: maxOp,
  lookup: lookupOp,
};
