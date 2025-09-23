import { describe, it, expect } from 'vitest';
import { version } from './index';

describe('OpenTaxJS', () => {
  it('should have correct version', () => {
    expect(version).toBe('0.0.1');
  });
});
