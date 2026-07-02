import {
  DEFAULT_SQL_EDITOR_CONFIG,
  type ResultPaneProps,
} from './sql-editor.types';
import { ErrorDisplay } from './ErrorDisplay';

/**
 * Formats a cell value for display in the results table.
 * - null/undefined → '—'
 * - Strings longer than cellTruncateLength → truncated with '…'
 * - Everything else → string coercion
 */
export function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }

  const str = String(value);
  const maxLen = DEFAULT_SQL_EDITOR_CONFIG.cellTruncateLength;

  if (str.length > maxLen) {
    return str.slice(0, maxLen) + '…';
  }

  return str;
}

/**
 * Displays query execution results in one of four states:
 * - Idle: placeholder prompting user to run a query
 * - Loading: spinner with "Executing query..." message
 * - Success: metadata bar + scrollable table (or "no data" message)
 * - Error: ErrorDisplay component with execution error
 */
export function ResultPane({ isLoading, result, error }: ResultPaneProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>Executing query...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4">
        <ErrorDisplay message={error} type="execution" />
      </div>
    );
  }

  // Success state
  if (result) {
    // Zero rows
    if (result.rowCount === 0) {
      return (
        <div className="flex flex-col h-full">
          <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-200">
            {result.rowCount} rows • {result.executionMs}ms
          </div>
          <div className="flex items-center justify-center flex-1 p-4 text-gray-500">
            Query returned no data
          </div>
        </div>
      );
    }

    // Rows present
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-200">
          {result.rowCount} rows • {result.executionMs}ms
        </div>
        <div className="flex-1 overflow-auto">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                {result.columns.map((column) => (
                  <th
                    key={column}
                    className="px-3 py-2 text-left font-medium text-gray-700 border-b border-gray-200 whitespace-nowrap"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  {result.columns.map((column) => (
                    <td
                      key={`${rowIndex}-${column}`}
                      className="px-3 py-1.5 text-gray-800 whitespace-nowrap"
                    >
                      {formatCellValue(row[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Idle state (no loading, no result, no error)
  return (
    <div className="flex items-center justify-center h-full p-4 text-gray-400">
      Run a query to see results
    </div>
  );
}
