import { describe, it, expect } from 'vitest';

import { reportSchema } from './schemas';

describe('reports schemas', () => {
  it('accepts a valid report payload', () => {
    const result = reportSchema.safeParse({
      name: 'Sales',
      active: true,
      reportGroupId: '3',
      datasourceId: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reportGroupId).toBe(3);
    }
  });

  it('requires a name', () => {
    expect(reportSchema.safeParse({ name: '', active: true }).success).toBe(false);
  });
});
