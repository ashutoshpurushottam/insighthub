import { describe, it, expect } from 'vitest';

import { queryKeys } from './query-keys';

describe('query-keys', () => {
  it('builds stable query keys for resources', () => {
    expect(queryKeys.reports.all).toEqual(['reports']);
    expect(queryKeys.reports.detail(5)).toEqual(['reports', 5]);
    expect(queryKeys.jobs.history(3)).toEqual(['job-history', 3]);
    expect(queryKeys.parameters.lov(9, 'west')).toEqual([
      'parameter-lov',
      9,
      'west',
    ]);
    expect(queryKeys.parameters.lov(9)).toEqual(['parameter-lov', 9, null]);
  });
});
