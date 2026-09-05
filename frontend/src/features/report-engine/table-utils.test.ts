import { describe, it, expect } from 'vitest';

import {
  clampPage,
  compareCellValues,
  formatCellValue,
  nextSortState,
  paginationRange,
  sortRows,
} from './table-utils';

describe('table-utils', () => {
  describe('formatCellValue', () => {
    it('formats nullish and boolean values', () => {
      expect(formatCellValue(null)).toBe('—');
      expect(formatCellValue(undefined)).toBe('—');
      expect(formatCellValue(true)).toBe('Yes');
      expect(formatCellValue(false)).toBe('No');
    });

    it('stringifies objects and numbers', () => {
      expect(formatCellValue(42)).toBe('42');
      expect(formatCellValue({ a: 1 })).toBe('{"a":1}');
    });
  });

  describe('compareCellValues / sortRows', () => {
    it('sorts numbers ascending and descending', () => {
      expect(compareCellValues(1, 2, 'ASC')).toBeLessThan(0);
      expect(compareCellValues(1, 2, 'DESC')).toBeGreaterThan(0);
    });

    it('pushes nulls to the end', () => {
      expect(compareCellValues(null, 1, 'ASC')).toBe(1);
      expect(compareCellValues(1, null, 'ASC')).toBe(-1);
    });

    it('sorts rows by column', () => {
      const rows = [
        { name: 'b', n: 2 },
        { name: 'a', n: 1 },
      ];
      const sorted = sortRows(rows, 'name', 'ASC');
      expect(sorted[0].name).toBe('a');
    });
  });

  describe('nextSortState', () => {
    it('cycles none → ASC → DESC → none', () => {
      expect(nextSortState(undefined, undefined, 'col')).toEqual({
        column: 'col',
        direction: 'ASC',
      });
      expect(nextSortState('col', 'ASC', 'col')).toEqual({
        column: 'col',
        direction: 'DESC',
      });
      expect(nextSortState('col', 'DESC', 'col')).toEqual({
        column: undefined,
        direction: undefined,
      });
    });
  });

  describe('pagination helpers', () => {
    it('computes display range', () => {
      expect(paginationRange(2, 25, 100)).toEqual({ startRow: 26, endRow: 50 });
      expect(paginationRange(1, 10, 0)).toEqual({ startRow: 0, endRow: 0 });
    });

    it('clamps page numbers', () => {
      expect(clampPage(0, 5)).toBe(1);
      expect(clampPage(99, 5)).toBe(5);
      expect(clampPage(3, 0)).toBe(1);
    });
  });
});
