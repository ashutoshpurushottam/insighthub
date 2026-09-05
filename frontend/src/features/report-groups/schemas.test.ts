import { describe, it, expect } from 'vitest';

import { reportGroupSchema } from './schemas';

describe('report-groups schemas', () => {
  it('accepts a valid group', () => {
    expect(
      reportGroupSchema.safeParse({ name: 'Finance', description: 'F' }).success,
    ).toBe(true);
  });

  it('rejects empty names', () => {
    expect(reportGroupSchema.safeParse({ name: '' }).success).toBe(false);
  });
});
