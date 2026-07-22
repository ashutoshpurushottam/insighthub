import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import type { DrillDownInfo, SortDirection } from '../types';
import { DrillDownCell } from './DrillDownCell';

interface ResultsTableProps {
  /** Column names from the query result */
  columns: string[];
  /** Row data from the query result */
  rows: Record<string, unknown>[];
  /** Optional drill-down links for clickable columns */
  drillDownLinks?: DrillDownInfo[];
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSortChange?: (column: string, direction?: SortDirection) => void;
}

/**
 * Sortable table for displaying report execution results.
 * Sorting is performed client-side on the current page data.
 * Clickable column headers toggle sort: none → ASC → DESC → none.
 */
export function ResultsTable({
  columns,
  rows,
  drillDownLinks = [],
}: ResultsTableProps) {
  const [sortColumn, setSortColumn] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection | undefined>();

  const handleHeaderClick = useCallback(
    (column: string) => {
      if (sortColumn !== column) {
        setSortColumn(column);
        setSortDirection('ASC');
      } else if (sortDirection === 'ASC') {
        setSortDirection('DESC');
      } else if (sortDirection === 'DESC') {
        setSortColumn(undefined);
        setSortDirection(undefined);
      } else {
        setSortColumn(column);
        setSortDirection('ASC');
      }
    },
    [sortColumn, sortDirection],
  );

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-gray-300" />;
    }
    if (sortDirection === 'ASC') {
      return <ArrowUp className="h-3.5 w-3.5 text-blue-600" />;
    }
    if (sortDirection === 'DESC') {
      return <ArrowDown className="h-3.5 w-3.5 text-blue-600" />;
    }
    return <ArrowUpDown className="h-3.5 w-3.5 text-gray-300" />;
  };

  /** Client-side sorted rows */
  const sortedRows = useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];

      // Handle nulls — push them to the end
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      let comparison = 0;

      // Numeric comparison
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        // String comparison (case-insensitive)
        comparison = String(valA).localeCompare(String(valB), undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      }

      return sortDirection === 'DESC' ? -comparison : comparison;
    });
  }, [rows, sortColumn, sortDirection]);

  // Build a map of column -> drillDown for quick lookup
  const drillDownMap = useMemo(() => {
    const map = new Map<string, DrillDownInfo>();
    for (const link of drillDownLinks) {
      map.set(link.column, link);
    }
    return map;
  }, [drillDownLinks]);

  if (columns.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
        No results to display.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="cursor-pointer select-none whitespace-nowrap px-4 py-3 text-left font-medium text-gray-600 hover:bg-gray-100"
                onClick={() => handleHeaderClick(col)}
              >
                <div className="flex items-center gap-1">
                  <span>{col}</span>
                  {getSortIcon(col)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {sortedRows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-gray-400"
              >
                No data returned.
              </td>
            </tr>
          ) : (
            sortedRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-gray-50">
                {columns.map((col) => {
                  const drillDown = drillDownMap.get(col);
                  return (
                    <td key={col} className="whitespace-nowrap px-4 py-2 text-gray-700">
                      {drillDown ? (
                        <DrillDownCell
                          value={row[col]}
                          drillDown={drillDown}
                          row={row}
                          paramMappings={[{ parentColumnName: col, childParamName: col }]}
                        />
                      ) : (
                        formatCellValue(row[col])
                      )}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/** Formats cell values for display */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
