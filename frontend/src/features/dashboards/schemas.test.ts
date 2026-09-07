import { describe, it, expect } from 'vitest';

import {
  buildDashboardGridTemplate,
  clampColSpan,
  dashboardSchema,
  reindexDashboardItems,
  sortDashboardItems,
} from './schemas';

describe('dashboards schemas', () => {
  it('accepts a valid dashboard', () => {
    const result = dashboardSchema.safeParse({
      name: 'Ops',
      columnsCount: 3,
      items: [{ reportId: 1, title: 'A', position: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it('builds grid templates and clamps spans', () => {
    expect(buildDashboardGridTemplate(3)).toBe('repeat(3, minmax(0, 1fr))');
    expect(clampColSpan(5, 2)).toBe(2);
    expect(clampColSpan(0, 4)).toBe(1);
  });

  it('sorts and reindexes items', () => {
    const items = [
      { position: 2, id: 'b' },
      { position: 0, id: 'a' },
    ];
    expect(sortDashboardItems(items).map((i) => i.id)).toEqual(['a', 'b']);
    expect(reindexDashboardItems(items).map((i) => i.position)).toEqual([0, 1]);
  });
});
