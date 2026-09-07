import { describe, it, expect } from 'vitest';

import { ruleSchema, ruleValueSchema } from './schemas';

describe('rules schemas', () => {
  it('accepts a valid rule', () => {
    expect(ruleSchema.safeParse({ name: 'Region filter' }).success).toBe(true);
  });

  it('rejects empty rule names', () => {
    expect(ruleSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('validates rule values', () => {
    expect(
      ruleValueSchema.safeParse({ userId: 1, ruleValue: 'WEST' }).success,
    ).toBe(true);
    expect(
      ruleValueSchema.safeParse({ userId: 0, ruleValue: '' }).success,
    ).toBe(false);
  });
});
