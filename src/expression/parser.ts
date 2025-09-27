import { isIdentifier } from './identifiers';

export interface InputVariableExpression {
  type: 'input_variable';
  name: string;
}

export interface ConstantVariableExpression {
  type: 'constant_variable';
  name: string;
}

export interface CalculatedVariableExpression {
  type: 'calculated_variable';
  name: string;
}

export interface CallExpression {
  type: 'call';
  name: string;
  parameters: ParsedExpression[];
}

export interface NumberLiteral {
  type: 'number_literal';
  value: number;
}

export interface BooleanLiteral {
  type: 'boolean_literal';
  value: boolean;
}

// Union type for variables
export type VariableExpression =
  | InputVariableExpression
  | ConstantVariableExpression
  | CalculatedVariableExpression;

export type LiteralExpression = NumberLiteral | BooleanLiteral;

export type ParsedExpression =
  | VariableExpression
  | LiteralExpression
  | CallExpression;

export class ExpressionParseError extends Error {
  constructor(
    message: string,
    public readonly expression: string,
    public readonly position?: number
  ) {
    super(message);
    this.name = 'ExpressionParseError';
  }
}

export class ExpressionParser {
  private static readonly NUMBER_REGEX = /^-?[0-9]+(\.[0-9]+)?$/;
  private static readonly BOOLEAN_VALUES = new Set(['true', 'false']);

  private expression: string;
  private position: number;

  constructor(expression: string) {
    this.expression = expression.trim();
    this.position = 0;
  }

  static parse(expression: string): ParsedExpression {
    const parser = new ExpressionParser(expression);
    return parser.parseExpression();
  }

  private parseExpression(): ParsedExpression {
    this.skipWhitespace();

    if (this.position >= this.expression.length) {
      throw new ExpressionParseError(
        'Empty expression is not allowed',
        this.expression
      );
    }

    if (this.peek() === '$') {
      return this.parseVariableReference();
    }

    const remaining = this.expression.slice(this.position).trim();
    if (ExpressionParser.BOOLEAN_VALUES.has(remaining)) {
      return this.parseLiteral();
    }

    const identifierMatch = this.peekIdentifier();
    if (identifierMatch && this.peekAt(identifierMatch.length) === '(') {
      return this.parseFunctionCall();
    }

    if (identifierMatch) {
      return this.parseCalculatedVariable();
    }

    return this.parseLiteral();
  }

  private parseVariableReference():
    | InputVariableExpression
    | ConstantVariableExpression {
    if (this.peek(2) === '$$') {
      this.advance(2);
      const identifier = this.parseIdentifier();
      this.expectEnd();

      return {
        type: 'constant_variable',
        name: identifier,
      };
    } else if (this.peek() === '$') {
      this.advance(1);
      const identifier = this.parseIdentifier();
      this.expectEnd();

      return {
        type: 'input_variable',
        name: identifier,
      };
    } else {
      throw new ExpressionParseError(
        'Expected variable prefix $ or $$',
        this.expression,
        this.position
      );
    }
  }

  private parseCalculatedVariable(): CalculatedVariableExpression {
    const identifier = this.parseIdentifier();
    this.expectEnd();

    return {
      type: 'calculated_variable',
      name: identifier,
    };
  }

  private parseFunctionCall(): CallExpression {
    const functionName = this.parseIdentifier();

    this.expectChar('(');
    this.skipWhitespace();

    const parameters: ParsedExpression[] = [];

    // Handle empty parameter list
    if (this.peek() === ')') {
      this.advance(1);
      this.expectEnd();
      return {
        type: 'call',
        name: functionName,
        parameters,
      };
    }

    while (true) {
      this.skipWhitespace();
      parameters.push(this.parseParameter());
      this.skipWhitespace();

      if (this.peek() === ')') {
        this.advance(1);
        break;
      } else if (this.peek() === ',') {
        this.advance(1);
      } else {
        throw new ExpressionParseError(
          `Expected ',' or ')' in function parameter list`,
          this.expression,
          this.position
        );
      }
    }

    this.expectEnd();

    return {
      type: 'call',
      name: functionName,
      parameters,
    };
  }

  private parseParameter(): ParsedExpression {
    this.skipWhitespace();

    if (this.peek() === '$') {
      return this.parseParameterVariable();
    }

    const end = this.findParameterEnd();
    const paramText = this.expression.slice(this.position, end).trim();
    if (ExpressionParser.BOOLEAN_VALUES.has(paramText)) {
      return this.parseParameterLiteral();
    }

    const identifierMatch = this.peekIdentifier();
    if (identifierMatch && this.peekAt(identifierMatch.length) === '(') {
      return this.parseParameterFunction();
    }

    const currentPos = this.position;
    if (identifierMatch || this.looksLikeIdentifier()) {
      try {
        return {
          type: 'calculated_variable',
          name: this.parseIdentifier(),
        } as CalculatedVariableExpression;
      } catch (error) {
        // Reset position and rethrow identifier validation error
        this.position = currentPos;
        throw error;
      }
    }

    return this.parseParameterLiteral();
  }

  private looksLikeIdentifier(): boolean {
    this.skipWhitespace();
    const end = this.findParameterEnd();
    const text = this.expression.slice(this.position, end).trim();

    // Check if it starts with a letter and contains only letters, numbers, underscores, or hyphens
    return (
      /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(text) &&
      !ExpressionParser.NUMBER_REGEX.test(text) &&
      !ExpressionParser.BOOLEAN_VALUES.has(text)
    );
  }

  private findParameterEnd(): number {
    let end = this.position;
    let parenCount = 0;

    while (end < this.expression.length) {
      const char = this.expression[end];
      if (char === '(') {
        parenCount++;
      } else if (char === ')') {
        if (parenCount === 0) {
          break;
        }
        parenCount--;
      } else if (char === ',' && parenCount === 0) {
        break;
      }
      end++;
    }

    return end;
  }

  private parseParameterVariable():
    | InputVariableExpression
    | ConstantVariableExpression {
    if (this.peek(2) === '$$') {
      this.advance(2);
      const identifier = this.parseIdentifier();

      return {
        type: 'constant_variable',
        name: identifier,
      };
    } else if (this.peek() === '$') {
      this.advance(1);
      const identifier = this.parseIdentifier();

      return {
        type: 'input_variable',
        name: identifier,
      };
    } else {
      throw new ExpressionParseError(
        'Expected variable prefix $ or $$',
        this.expression,
        this.position
      );
    }
  }

  private parseParameterFunction(): CallExpression {
    const functionName = this.parseIdentifier();

    this.expectChar('(');
    this.skipWhitespace();

    const parameters: ParsedExpression[] = [];

    if (this.peek() === ')') {
      this.advance(1);
      return {
        type: 'call',
        name: functionName,
        parameters,
      };
    }

    while (true) {
      this.skipWhitespace();
      parameters.push(this.parseParameter());
      this.skipWhitespace();

      if (this.peek() === ')') {
        this.advance(1);
        break;
      } else if (this.peek() === ',') {
        this.advance(1);
      } else {
        throw new ExpressionParseError(
          `Expected ',' or ')' in function parameter list`,
          this.expression,
          this.position
        );
      }
    }

    return {
      type: 'call',
      name: functionName,
      parameters,
    };
  }

  private parseLiteral(): NumberLiteral | BooleanLiteral {
    this.skipWhitespace();

    const remaining = this.expression.slice(this.position);

    if (ExpressionParser.NUMBER_REGEX.test(remaining)) {
      const value = parseFloat(remaining);
      this.position = this.expression.length;
      return {
        type: 'number_literal',
        value,
      };
    }

    if (ExpressionParser.BOOLEAN_VALUES.has(remaining)) {
      const value = remaining === 'true';
      this.position = this.expression.length;
      return {
        type: 'boolean_literal',
        value,
      };
    }

    throw new ExpressionParseError(
      `Invalid literal value '${remaining}'. Expected a number or boolean (true/false)`,
      this.expression,
      this.position
    );
  }

  private parseParameterLiteral(): NumberLiteral | BooleanLiteral {
    this.skipWhitespace();

    let end = this.position;
    while (end < this.expression.length) {
      const char = this.expression[end];
      if (char === ',' || char === ')') {
        break;
      }
      end++;
    }

    const literalText = this.expression.slice(this.position, end).trim();
    if (ExpressionParser.NUMBER_REGEX.test(literalText)) {
      const value = parseFloat(literalText);
      this.position = end;
      return {
        type: 'number_literal',
        value,
      };
    }

    if (ExpressionParser.BOOLEAN_VALUES.has(literalText)) {
      const value = literalText === 'true';
      this.position = end;
      return {
        type: 'boolean_literal',
        value,
      };
    }

    throw new ExpressionParseError(
      `Invalid literal value '${literalText}'. Expected a number or boolean (true/false)`,
      this.expression,
      this.position
    );
  }

  private parseIdentifier(): string {
    this.skipWhitespace();

    let end = this.position;
    while (end < this.expression.length) {
      const char = this.expression[end];
      if (!/[a-zA-Z0-9_]/.test(char)) {
        break;
      }
      end++;
    }

    const identifier = this.expression.slice(this.position, end);

    if (!isIdentifier(identifier)) {
      throw new ExpressionParseError(
        `Invalid identifier '${identifier}'. Identifiers must start with a letter and contain only letters, digits, and underscores`,
        this.expression,
        this.position
      );
    }

    this.position = end;
    return identifier;
  }

  private peekIdentifier(): string | null {
    this.skipWhitespace();

    let end = this.position;
    while (end < this.expression.length) {
      const char = this.expression[end];
      if (!/[a-zA-Z0-9_]/.test(char)) {
        break;
      }
      end++;
    }

    const identifier = this.expression.slice(this.position, end);

    if (isIdentifier(identifier)) {
      return identifier;
    }

    return null;
  }

  private peek(length = 1): string {
    return this.expression.slice(this.position, this.position + length);
  }

  private peekAt(offset: number): string {
    return this.expression[this.position + offset] || '';
  }

  private advance(count = 1): void {
    this.position = Math.min(this.position + count, this.expression.length);
  }

  private skipWhitespace(): void {
    while (
      this.position < this.expression.length &&
      /\s/.test(this.expression[this.position])
    ) {
      this.position++;
    }
  }

  private expectChar(expected: string): void {
    this.skipWhitespace();
    const actual = this.peek();
    if (actual !== expected) {
      throw new ExpressionParseError(
        `Expected '${expected}' but found '${actual}'`,
        this.expression,
        this.position
      );
    }
    this.advance();
  }

  private expectEnd(): void {
    this.skipWhitespace();
    if (this.position < this.expression.length) {
      throw new ExpressionParseError(
        `Unexpected content '${this.expression.slice(this.position)}' at end of expression`,
        this.expression,
        this.position
      );
    }
  }
}
