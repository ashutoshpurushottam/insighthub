/**
 * Client-side filtering / search helpers for list pages.
 */

export interface SearchableItem {
  [key: string]: unknown;
}

/**
 * Case-insensitive substring match across selected fields.
 */
export function matchesSearch<T extends SearchableItem>(
  item: T,
  query: string,
  fields: Array<keyof T | string>,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return fields.some((field) => {
    const value = item[field as keyof T];
    if (value == null) return false;
    return String(value).toLowerCase().includes(q);
  });
}

export function filterBySearch<T extends SearchableItem>(
  items: T[],
  query: string,
  fields: Array<keyof T | string>,
): T[] {
  if (!query.trim()) return items;
  return items.filter((item) => matchesSearch(item, query, fields));
}

export type SortOrder = 'asc' | 'desc';

export function sortByField<T extends SearchableItem>(
  items: T[],
  field: keyof T | string,
  order: SortOrder = 'asc',
): T[] {
  const factor = order === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = a[field as keyof T];
    const bv = b[field as keyof T];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') {
      return (av - bv) * factor;
    }
    return String(av).localeCompare(String(bv), undefined, { sensitivity: 'base' }) * factor;
  });
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number,
): { items: T[]; total: number; totalPages: number; page: number } {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    totalPages,
    page: safePage,
  };
}

export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string,
): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

export function uniqueBy<T>(items: T[], keyFn: (item: T) => string | number): T[] {
  const seen = new Set<string | number>();
  const result: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

export function countByStatus<T extends { active?: boolean }>(
  items: T[],
): { total: number; active: number; inactive: number } {
  let active = 0;
  for (const item of items) {
    if (item.active) active += 1;
  }
  return {
    total: items.length,
    active,
    inactive: items.length - active,
  };
}

/**
 * Debounce helper for search inputs (testable via fake timers).
 */
export function createDebouncer(delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    run(fn: () => void) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(fn, delayMs);
    },
    cancel() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
