import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  formatBytes,
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDurationMs,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  inferColumnFormatter,
  pluralize,
  truncateText,
} from './formatters';

describe('formatters', () => {
  it('formats numbers, percents, and currency', () => {
    expect(formatNumber(1234.5)).toContain('1');
    expect(formatNumber(null)).toBe('—');
    expect(formatPercent(50)).toMatch(/50/);
    expect(formatCurrency(12.5, 'USD')).toMatch(/12/);
    expect(formatCompactNumber(1500)).toMatch(/1\.5/i);
  });

  it('formats dates and relative times', () => {
    expect(formatDate('2026-01-15', 'iso')).toBe('2026-01-15');
    expect(formatDate(null)).toBe('—');
    expect(formatDateTime('2026-01-15T12:00:00Z')).not.toBe('—');

    const now = new Date('2026-01-15T12:00:00Z');
    expect(formatRelativeTime('2026-01-15T11:00:00Z', now)).toMatch(/hour/i);
  });

  it('formats bytes and durations', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatDurationMs(250)).toBe('250ms');
    expect(formatDurationMs(1500)).toBe('1.5s');
    expect(formatDurationMs(125000)).toMatch(/2m/);
  });

  it('truncates and pluralizes', () => {
    expect(truncateText('hello world', 5)).toBe('hell…');
    expect(pluralize(1, 'row')).toBe('1 row');
    expect(pluralize(2, 'row')).toBe('2 rows');
  });

  it('infers column formatters', () => {
    const boolFmt = inferColumnFormatter([true, false]);
    expect(boolFmt(true)).toBe('Yes');

    const numFmt = inferColumnFormatter([1, 2, 3]);
    expect(numFmt(10)).not.toBe('—');

    const dateFmt = inferColumnFormatter(['2026-01-01', '2026-02-01']);
    expect(dateFmt('2026-01-01')).not.toBe('—');
  });
});
