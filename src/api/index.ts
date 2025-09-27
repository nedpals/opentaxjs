import type {
  Rule,
  EvaluationContext,
  FilingFrequency,
  Operation,
} from '@/types';
import { validateRule, RuleValidationError } from '@/validator';
import { RuleEvaluator } from '@/evaluator';
import { ConditionalEvaluator } from '@/evaluator/conditional';
import { ExpressionEvaluator } from '@/expression';
import { BUILTINS } from '@/expression/builtins';
import {
  calculatePeriod,
  type PeriodCalculationOptions,
  type PeriodInfo,
} from '@/period';

export interface TaxLiability {
  name: string;
  type: FilingFrequency;
  iter: number;
  amount: number;
  target_filing_date: Date;
}

// TODO: add breakdown of calculation steps
export interface ExecutionStep {
  step: string;
  operation?: Operation;
  result?: string | number | boolean;
}

export interface CalculationResult {
  liability: number;
  liabilities: TaxLiability[];
  calculated: Record<string, number | boolean | string>;
  inputs: Record<string, number | boolean | string>;
  period?: PeriodInfo;
  debug?: {
    context: EvaluationContext;
    executionTrace?: ExecutionStep[];
  };
}

export interface OpenTaxConfig {
  rule: Rule;
}

export interface OpenTaxInstance {
  calculate(
    inputs: Record<string, number | boolean | string>,
    options?: PeriodCalculationOptions
  ): CalculationResult;
}

function generateFilingSchedules(
  rule: Rule,
  context: EvaluationContext,
  periodInfo: PeriodInfo
): TaxLiability[] {
  const liabilities: TaxLiability[] = [];
  // Built-ins are already included in the eval context
  const expressionEvaluator = new ExpressionEvaluator();
  const conditionalEvaluator = new ConditionalEvaluator(expressionEvaluator);

  for (const schedule of rule.filing_schedules) {
    // Check if schedule applies (evaluate when condition if present)
    if (schedule.when) {
      const conditionResult = conditionalEvaluator.evaluate(
        schedule.when,
        context
      );
      if (!conditionResult) {
        continue; // Skip this schedule if condition is not met
      }
    }

    if (schedule.frequency === 'quarterly') {
      // Only generate liabilities for affected quarters
      for (const quarter of periodInfo.affected_quarters) {
        const prorationFactor =
          periodInfo.proration_factors[`Q${quarter}`] || 0;
        const quarterlyAmount =
          ((context.calculated.liability as number) / 4 || 0) * prorationFactor;
        const targetDate = periodInfo.filing_dates[`Q${quarter}`] || new Date();

        liabilities.push({
          name: schedule.name,
          type: 'quarterly',
          iter: quarter,
          amount: quarterlyAmount,
          target_filing_date: targetDate,
        });
      }
    } else if (schedule.frequency === 'annually') {
      const annualAmount = (context.calculated.liability as number) || 0;
      const targetDate = periodInfo.filing_dates.annual || new Date();

      liabilities.push({
        name: schedule.name,
        type: 'annually',
        iter: 1,
        amount: annualAmount,
        target_filing_date: targetDate,
      });
    }
  }

  return liabilities;
}

export default function opentax(config: OpenTaxConfig): OpenTaxInstance {
  const validationIssues = validateRule(config.rule);
  const errors = validationIssues.filter((issue) => issue.severity === 'error');
  if (errors.length > 0) {
    throw RuleValidationError.fromIssues(validationIssues, config.rule);
  }

  const rule = config.rule;
  const evaluator = new RuleEvaluator(BUILTINS);
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const evaluate = (inputs: Record<string, number | boolean | string>) =>
    evaluator.evaluate(rule, inputs);

  return {
    calculate(
      inputs: Record<string, number | boolean | string>,
      options?: PeriodCalculationOptions
    ): CalculationResult {
      const context = evaluate(inputs);
      const periodInfo = calculatePeriod(options);
      const liabilities = generateFilingSchedules(rule, context, periodInfo);

      return {
        liability: (context.calculated.liability as number) || 0,
        liabilities,
        calculated: context.calculated,
        inputs: context.inputs,
        period: periodInfo,
        debug: {
          context,
        },
      };
    },
  };
}
