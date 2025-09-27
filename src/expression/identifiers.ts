export const IDENTIFIER_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export const RULE_ONLY_IDENTIFIER_REGEX = /^[a-z][a-z0-9_]*$/;

export function isIdentifier(identifier: string): boolean {
  return IDENTIFIER_REGEX.test(identifier);
}

export function isRuleOnlyIdentifier(identifier: string): boolean {
  return RULE_ONLY_IDENTIFIER_REGEX.test(identifier);
}
