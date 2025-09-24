export type {
  ExpressionEvaluatorConfig,
  FunctionDefinition,
  VariableContext,
} from './evaluator';

export { ExpressionEvaluationError, ExpressionEvaluator } from './evaluator';

export type {
  CallExpression,
  LiteralExpression,
  ParsedExpression,
  VariableExpression,
} from './parser';

export { ExpressionParseError, ExpressionParser } from './parser';

export * from './builtins';

import {
  ExpressionEvaluator,
  type ExpressionEvaluatorConfig,
  type VariableContext,
} from './evaluator';
import { ExpressionParser } from './parser';

export function evaluateExpression(
  expression: string,
  context: VariableContext = { inputs: {}, constants: {}, calculated: {} },
  evaluatorConfig?: ExpressionEvaluatorConfig
): number | boolean {
  const evaluator = new ExpressionEvaluator(evaluatorConfig);
  const parsed = ExpressionParser.parse(expression);
  return evaluator.evaluate(
    parsed,
    evaluator.createContext(
      context.inputs,
      context.constants,
      context.calculated
    )
  );
}
