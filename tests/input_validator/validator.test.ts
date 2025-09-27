import { describe, it, expect } from 'vitest';
import { validateInputs, InputValidationError } from '@/input_validator';
import { ConditionalEvaluator } from '@/evaluator';
import { ExpressionEvaluator } from '@/expression';
import type { Rule, VariableMap } from '@/types';
import type { ValidationIssue } from '@/validator';

const baseRule: Rule = {
  $version: '1.0.0',
  name: 'Test Rule',
  jurisdiction: 'PH',
  taxpayer_type: 'INDIVIDUAL',
  inputs: {
    required_input: {
      type: 'number',
      description: 'A required input',
    },
    optional_input: {
      type: 'string',
      description: 'An optional input',
      default: 'default_value',
    },
  },
  outputs: {
    result: {
      type: 'number',
      description: 'Result output',
    },
  },
  flow: [
    {
      name: 'Test Step',
      operations: [
        { type: 'set', target: 'result', value: '$required_input' },
      ],
    },
  ],
};

describe('Input Validator', () => {
  describe('validateInputs', () => {
    it('should return no issues for valid inputs', () => {
      const inputs: VariableMap = {
        required_input: 100,
        optional_input: 'test',
      };

      const issues = validateInputs(baseRule, inputs);
      expect(issues).toHaveLength(0);
    });

    it('should return error for missing required input', () => {
      const inputs: VariableMap = {};

      const issues = validateInputs(baseRule, inputs);
      const errors = issues.filter(i => i.severity === 'error');

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe("Required input 'required_input' not provided");
    });

    it('should apply default values for missing optional inputs', () => {
      const inputs: VariableMap = {
        required_input: 100,
      };

      const issues = validateInputs(baseRule, inputs);
      expect(issues).toHaveLength(0);
      expect(inputs.optional_input).toBe('default_value');
    });

    it('should validate input types', () => {
      const inputs: VariableMap = {
        required_input: 'not_a_number',
        optional_input: 'valid_string',
      };

      const issues = validateInputs(baseRule, inputs);
      const errors = issues.filter(i => i.severity === 'error');

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe("Input 'required_input' expected type 'number', got 'string'");
    });

    it('should validate numeric minimum constraints', () => {
      const rule: Rule = {
        ...baseRule,
        inputs: {
          value: {
            type: 'number',
            description: 'Value with minimum',
            minimum: 10,
          },
        },
      };

      const inputs: VariableMap = {
        value: 5,
      };

      const issues = validateInputs(rule, inputs);
      const errors = issues.filter(i => i.severity === 'error');

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe("Input 'value' value 5 is below minimum 10");
    });

    it('should validate numeric maximum constraints', () => {
      const rule: Rule = {
        ...baseRule,
        inputs: {
          value: {
            type: 'number',
            description: 'Value with maximum',
            maximum: 100,
          },
        },
      };

      const inputs: VariableMap = {
        value: 150,
      };

      const issues = validateInputs(rule, inputs);
      const errors = issues.filter(i => i.severity === 'error');

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe("Input 'value' value 150 is above maximum 100");
    });

    it('should validate enum constraints', () => {
      const rule: Rule = {
        ...baseRule,
        inputs: {
          income_type: {
            type: 'string',
            description: 'Type of income',
            enum: ['COMPENSATION', 'BUSINESS', 'MIXED'],
          },
        },
      };

      const inputs: VariableMap = {
        income_type: 'INVALID_TYPE',
      };

      const issues = validateInputs(rule, inputs);
      const errors = issues.filter(i => i.severity === 'error');

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe("Input 'income_type' value 'INVALID_TYPE' is not in allowed enum values: COMPENSATION, BUSINESS, MIXED");
    });

    it('should handle conditional inputs when condition is true', () => {
      const rule: Rule = {
        ...baseRule,
        inputs: {
          income_type: {
            type: 'string',
            description: 'Type of income',
            enum: ['COMPENSATION', 'BUSINESS'],
          },
          business_receipts: {
            type: 'number',
            description: 'Business receipts',
            when: {
              $income_type: { eq: 'BUSINESS' },
            },
          },
        },
      };

      const inputs: VariableMap = {
        income_type: 'BUSINESS',
      };

      const issues = validateInputs(rule, inputs);
      const errors = issues.filter(i => i.severity === 'error');

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe("Required input 'business_receipts' not provided");
    });

    it('should skip conditional inputs when condition is false', () => {
      const rule: Rule = {
        ...baseRule,
        inputs: {
          income_type: {
            type: 'string',
            description: 'Type of income',
            enum: ['COMPENSATION', 'BUSINESS'],
          },
          business_receipts: {
            type: 'number',
            description: 'Business receipts',
            when: {
              $income_type: { eq: 'BUSINESS' },
            },
          },
        },
      };

      const inputs: VariableMap = {
        income_type: 'COMPENSATION',
      };

      const issues = validateInputs(rule, inputs);

      // With the fix, conditional inputs should not be validated when condition is false
      expect(issues).toHaveLength(0);
    });

    it('should handle conditional inputs with defaults', () => {
      const rule: Rule = {
        ...baseRule,
        inputs: {
          income_type: {
            type: 'string',
            description: 'Type of income',
            enum: ['COMPENSATION', 'BUSINESS'],
          },
          business_expenses: {
            type: 'number',
            description: 'Business expenses',
            default: 0,
            when: {
              $income_type: { eq: 'BUSINESS' },
            },
          },
        },
      };

      const inputs: VariableMap = {
        income_type: 'BUSINESS',
      };

      const issues = validateInputs(rule, inputs);
      expect(issues).toHaveLength(0);
      expect(inputs.business_expenses).toBe(0);
    });

    it('should assume required when conditional evaluation fails', () => {
      const rule: Rule = {
        ...baseRule,
        inputs: {
          conditional_input: {
            type: 'number',
            description: 'Conditional input',
            when: {
              $non_existent_variable: { eq: 'value' },
            },
          },
        },
      };

      const inputs: VariableMap = {};

      const issues = validateInputs(rule, inputs);
      const errors = issues.filter(i => i.severity === 'error');

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe("Required input 'conditional_input' not provided");
    });

    it('should use custom conditional evaluator when provided', () => {
      const mockEvaluator = {
        evaluate: () => false,
      } as unknown as ConditionalEvaluator;

      const rule: Rule = {
        ...baseRule,
        inputs: {
          some_variable: {
            type: 'string',
            description: 'Some variable',
          },
          conditional_input: {
            type: 'number',
            description: 'Conditional input',
            when: {
              $some_variable: { eq: 'trigger_value' },
            },
          },
        },
      };

      const inputs: VariableMap = {
        some_variable: 'other_value',
      };

      const issues = validateInputs(rule, inputs, mockEvaluator);
      // With the fix, mock evaluator returning false should mean no validation required
      expect(issues).toHaveLength(0);
    });

    it('should validate multiple inputs with mixed issues', () => {
      const rule: Rule = {
        ...baseRule,
        inputs: {
          missing_required: {
            type: 'number',
            description: 'Missing required input',
          },
          wrong_type: {
            type: 'number',
            description: 'Wrong type input',
          },
          out_of_range: {
            type: 'number',
            description: 'Out of range input',
            minimum: 0,
            maximum: 100,
          },
          invalid_enum: {
            type: 'string',
            description: 'Invalid enum input',
            enum: ['A', 'B', 'C'],
          },
          valid_input: {
            type: 'string',
            description: 'Valid input',
          },
        },
      };

      const inputs: VariableMap = {
        wrong_type: 'not_a_number',
        out_of_range: -10,
        invalid_enum: 'D',
        valid_input: 'valid',
      };

      const issues = validateInputs(rule, inputs);
      const errors = issues.filter(i => i.severity === 'error');

      expect(errors).toHaveLength(4);

      const errorMessages = errors.map(e => e.message);
      expect(errorMessages).toContain("Required input 'missing_required' not provided");
      expect(errorMessages).toContain("Input 'wrong_type' expected type 'number', got 'string'");
      expect(errorMessages).toContain("Input 'out_of_range' value -10 is below minimum 0");
      expect(errorMessages).toContain("Input 'invalid_enum' value 'D' is not in allowed enum values: A, B, C");
    });

    it('should handle empty enum array', () => {
      const rule: Rule = {
        ...baseRule,
        inputs: {
          enum_input: {
            type: 'string',
            description: 'Input with empty enum',
            enum: [],
          },
        },
      };

      const inputs: VariableMap = {
        enum_input: 'any_value',
      };

      const issues = validateInputs(rule, inputs);
      expect(issues).toHaveLength(0);
    });

    it('should validate boolean inputs correctly', () => {
      const rule: Rule = {
        ...baseRule,
        inputs: {
          boolean_input: {
            type: 'boolean',
            description: 'Boolean input',
          },
        },
      };

      const inputs: VariableMap = {
        boolean_input: true,
      };

      const issues = validateInputs(rule, inputs);
      expect(issues).toHaveLength(0);

      inputs.boolean_input = 'not_boolean';
      const issuesWithError = validateInputs(rule, inputs);
      const errors = issuesWithError.filter(i => i.severity === 'error');

      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe("Input 'boolean_input' expected type 'boolean', got 'string'");
    });

    it('should continue validation after encountering errors', () => {
      const rule: Rule = {
        ...baseRule,
        inputs: {
          first_error: {
            type: 'number',
            description: 'First error',
            minimum: 10,
          },
          second_error: {
            type: 'string',
            description: 'Second error',
            enum: ['A', 'B'],
          },
        },
      };

      const inputs: VariableMap = {
        first_error: 5,
        second_error: 'C',
      };

      const issues = validateInputs(rule, inputs);
      const errors = issues.filter(i => i.severity === 'error');

      expect(errors).toHaveLength(2);
    });
  });

  describe('InputValidationError', () => {
    it('should create error with message and issues', () => {
      const issues: ValidationIssue[] = [
        {
          severity: 'error',
          message: 'Test error',
        },
      ];

      const error = new InputValidationError('Custom message', issues);

      expect(error.message).toBe('Custom message');
      expect(error.issues).toEqual(issues);
      expect(error.name).toBe('RuleValidationError');
      expect(error.rule).toBeUndefined();
    });

    it('should create error with rule reference', () => {
      const issues: ValidationIssue[] = [
        {
          severity: 'error',
          message: 'Test error',
        },
      ];

      const error = new InputValidationError('Custom message', issues, baseRule);

      expect(error.rule).toBe(baseRule);
    });

    it('should create error from issues with single error', () => {
      const issues: ValidationIssue[] = [
        {
          severity: 'error',
          message: 'Single error message',
        },
        {
          severity: 'warning',
          message: 'Warning message',
        },
      ];

      const error = InputValidationError.fromIssues(issues);

      expect(error.message).toBe('Single error message');
      expect(error.issues).toEqual(issues);
    });

    it('should create error from issues with multiple errors', () => {
      const issues: ValidationIssue[] = [
        {
          severity: 'error',
          message: 'First error',
        },
        {
          severity: 'warning',
          message: 'Warning message',
        },
        {
          severity: 'error',
          message: 'Second error',
        },
      ];

      const error = InputValidationError.fromIssues(issues);

      expect(error.message).toBe('Input validation failed with 2 error(s)');
      expect(error.issues).toEqual(issues);
    });

    it('should create error from issues with only warnings', () => {
      const issues: ValidationIssue[] = [
        {
          severity: 'warning',
          message: 'Warning 1',
        },
        {
          severity: 'warning',
          message: 'Warning 2',
        },
      ];

      const error = InputValidationError.fromIssues(issues);

      expect(error.message).toBe('Input validation completed with warnings');
      expect(error.issues).toEqual(issues);
    });

    it('should create error from issues with rule', () => {
      const issues: ValidationIssue[] = [
        {
          severity: 'error',
          message: 'Test error',
        },
      ];

      const error = InputValidationError.fromIssues(issues, baseRule);

      expect(error.rule).toBe(baseRule);
    });

    it('should handle empty issues array', () => {
      const issues: ValidationIssue[] = [];

      const error = InputValidationError.fromIssues(issues);

      expect(error.message).toBe('Input validation completed with warnings');
      expect(error.issues).toEqual([]);
    });
  });
});