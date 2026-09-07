/**
 * Shared table cell formatting for results grids.
 */
export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '—';
    return String(value);
  }
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export type SortDirection = 'ASC' | 'DESC';

/**
 * Compare two cell values for client-side sorting.
 */
export function compareCellValues(
  valA: unknown,
  valB: unknown,
  direction: SortDirection,
): number {
  if (valA == null && valB == null) return 0;
  if (valA == null) return 1;
  if (valB == null) return -1;

  let comparison = 0;
  if (typeof valA === 'number' && typeof valB === 'number') {
    comparison = valA - valB;
  } else {
    comparison = String(valA).localeCompare(String(valB), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  }

  return direction === 'DESC' ? -comparison : comparison;
}

/**
 * Sort rows by a column and direction.
 */
export function sortRows(
  rows: Record<string, unknown>[],
  sortColumn: string | undefined,
  sortDirection: SortDirection | undefined,
): Record<string, unknown>[] {
  if (!sortColumn || !sortDirection) return rows;
  return [...rows].sort((a, b) =>
    compareCellValues(a[sortColumn], b[sortColumn], sortDirection),
  );
}

/**
 * Cycle sort state: none → ASC → DESC → none.
 */
export function nextSortState(
  currentColumn: string | undefined,
  currentDirection: SortDirection | undefined,
  clickedColumn: string,
): { column: string | undefined; direction: SortDirection | undefined } {
  if (currentColumn !== clickedColumn) {
    return { column: clickedColumn, direction: 'ASC' };
  }
  if (currentDirection === 'ASC') {
    return { column: clickedColumn, direction: 'DESC' };
  }
  if (currentDirection === 'DESC') {
    return { column: undefined, direction: undefined };
  }
  return { column: clickedColumn, direction: 'ASC' };
}

/**
 * Compute pagination display range (1-based inclusive).
 */
export function paginationRange(
  page: number,
  pageSize: number,
  totalRows: number,
): { startRow: number; endRow: number } {
  if (totalRows === 0) return { startRow: 0, endRow: 0 };
  const startRow = (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalRows);
  return { startRow, endRow };
}

export function clampPage(page: number, totalPages: number): number {
  if (totalPages <= 0) return 1;
  return Math.max(1, Math.min(totalPages, page));
}
