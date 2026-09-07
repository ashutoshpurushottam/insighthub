import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  countByStatus,
  createDebouncer,
  filterBySearch,
  groupBy,
  matchesSearch,
  paginateItems,
  sortByField,
  uniqueBy,
} from './list-utils';

describe('list-utils', () => {
  const items = [
    { id: 1, name: 'Alpha', active: true, type: 'A' },
    { id: 2, name: 'Beta', active: false, type: 'B' },
    { id: 3, name: 'Alpine', active: true, type: 'A' },
  ];

  it('matches and filters by search', () => {
    expect(matchesSearch(items[0], 'alp', ['name'])).toBe(true);
    expect(filterBySearch(items, 'alp', ['name'])).toHaveLength(2);
    expect(filterBySearch(items, '', ['name'])).toHaveLength(3);
  });

  it('sorts and paginates', () => {
    expect(sortByField(items, 'name', 'asc')[0].name).toBe('Alpha');
    expect(sortByField(items, 'name', 'desc')[0].name).toBe('Beta');

    const page = paginateItems(items, 1, 2);
    expect(page.items).toHaveLength(2);
    expect(page.totalPages).toBe(2);
  });

  it('groups, uniques, and counts status', () => {
    const grouped = groupBy(items, (i) => i.type);
    expect(grouped.A).toHaveLength(2);

    expect(uniqueBy([{ id: 1 }, { id: 1 }, { id: 2 }], (i) => i.id)).toHaveLength(2);
    expect(countByStatus(items)).toEqual({ total: 3, active: 2, inactive: 1 });
  });

  it('debounces function calls', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debouncer = createDebouncer(100);
    debouncer.run(fn);
    debouncer.run(fn);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledOnce();
    debouncer.cancel();
    vi.useRealTimers();
  });
});
