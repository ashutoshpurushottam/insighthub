import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { ResultPane, formatCellValue } from '../ResultPane';
import { DEFAULT_SQL_EDITOR_CONFIG } from '../sql-editor.types';
import type { RunReportResult } from '../../api';

const TRUNCATE_LENGTH = DEFAULT_SQL_EDITOR_CONFIG.cellTruncateLength; // 200

describe('ResultPane', () => {
  describe('idle state', () => {
    it('renders placeholder when no loading, result, or error', () => {
      render(<ResultPane isLoading={false} result={null} error={null} />);
      expect(screen.getByText('Run a query to see results')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('renders spinner and "Executing query..." message', () => {
      render(<ResultPane isLoading={true} result={null} error={null} />);
      expect(screen.getByText('Executing query...')).toBeInTheDocument();
    });

    it('shows loading state even when result is present', () => {
      const result: RunReportResult = {
        columns: ['id'],
        rows: [{ id: 1 }],
        rowCount: 1,
        executionMs: 50,
      };
      render(<ResultPane isLoading={true} result={result} error={null} />);
      expect(screen.getByText('Executing query...')).toBeInTheDocument();
      expect(screen.queryByText('1 rows • 50ms')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders ErrorDisplay with the error message', () => {
      render(
        <ResultPane isLoading={false} result={null} error="Syntax error near SELECT" />,
      );
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Syntax error near SELECT')).toBeInTheDocument();
    });

    it('ErrorDisplay has execution type', () => {
      render(
        <ResultPane isLoading={false} result={null} error="Some error" />,
      );
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('data-error-type', 'execution');
    });
  });

  describe('success state with data', () => {
    const result: RunReportResult = {
      columns: ['id', 'name', 'email'],
      rows: [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' },
      ],
      rowCount: 2,
      executionMs: 128,
    };

    it('renders metadata bar with row count and execution time', () => {
      render(<ResultPane isLoading={false} result={result} error={null} />);
      expect(screen.getByText('2 rows • 128ms')).toBeInTheDocument();
    });

    it('renders table with column headers', () => {
      render(<ResultPane isLoading={false} result={result} error={null} />);
      expect(screen.getByText('id')).toBeInTheDocument();
      expect(screen.getByText('name')).toBeInTheDocument();
      expect(screen.getByText('email')).toBeInTheDocument();
    });

    it('renders table with row data', () => {
      render(<ResultPane isLoading={false} result={result} error={null} />);
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    });

    it('has overflow-auto on the table container for scrolling', () => {
      const { container } = render(
        <ResultPane isLoading={false} result={result} error={null} />,
      );
      const scrollContainer = container.querySelector('.overflow-auto');
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('success state with zero rows', () => {
    const emptyResult: RunReportResult = {
      columns: ['id', 'name'],
      rows: [],
      rowCount: 0,
      executionMs: 45,
    };

    it('renders "Query returned no data" message', () => {
      render(<ResultPane isLoading={false} result={emptyResult} error={null} />);
      expect(screen.getByText('Query returned no data')).toBeInTheDocument();
    });

    it('still renders the metadata bar', () => {
      render(<ResultPane isLoading={false} result={emptyResult} error={null} />);
      expect(screen.getByText('0 rows • 45ms')).toBeInTheDocument();
    });

    it('does not render a table', () => {
      const { container } = render(
        <ResultPane isLoading={false} result={emptyResult} error={null} />,
      );
      expect(container.querySelector('table')).not.toBeInTheDocument();
    });
  });

  describe('cell value formatting', () => {
    it('renders null values as "—"', () => {
      const result: RunReportResult = {
        columns: ['value'],
        rows: [{ value: null }],
        rowCount: 1,
        executionMs: 10,
      };
      render(<ResultPane isLoading={false} result={result} error={null} />);
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('truncates values longer than 200 characters with "…"', () => {
      const longValue = 'x'.repeat(TRUNCATE_LENGTH + 50);
      const result: RunReportResult = {
        columns: ['data'],
        rows: [{ data: longValue }],
        rowCount: 1,
        executionMs: 10,
      };
      render(<ResultPane isLoading={false} result={result} error={null} />);
      const expectedText = 'x'.repeat(TRUNCATE_LENGTH) + '…';
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    });

    it('does not truncate values at exactly 200 characters', () => {
      const exactValue = 'y'.repeat(TRUNCATE_LENGTH);
      const result: RunReportResult = {
        columns: ['data'],
        rows: [{ data: exactValue }],
        rowCount: 1,
        executionMs: 10,
      };
      render(<ResultPane isLoading={false} result={result} error={null} />);
      expect(screen.getByText(exactValue)).toBeInTheDocument();
    });
  });
});

describe('formatCellValue', () => {
  it('returns "—" for null', () => {
    expect(formatCellValue(null)).toBe('—');
  });

  it('returns "—" for undefined', () => {
    expect(formatCellValue(undefined)).toBe('—');
  });

  it('returns the string representation for short values', () => {
    expect(formatCellValue('hello')).toBe('hello');
    expect(formatCellValue(42)).toBe('42');
    expect(formatCellValue(true)).toBe('true');
  });

  it('truncates strings longer than 200 chars', () => {
    const long = 'a'.repeat(250);
    const result = formatCellValue(long);
    expect(result).toHaveLength(TRUNCATE_LENGTH + 1); // 200 chars + '…'
    expect(result.endsWith('…')).toBe(true);
  });

  it('does not truncate strings at exactly 200 chars', () => {
    const exact = 'b'.repeat(TRUNCATE_LENGTH);
    expect(formatCellValue(exact)).toBe(exact);
  });
});

/**
 * Property 8: Cell value formatting
 * **Validates: Requirements 4.3**
 *
 * For any cell value:
 * - null/undefined → '—'
 * - strings ≤ 200 chars → original string
 * - strings > 200 chars → first 200 chars + '…'
 */
describe('Property 8: Cell value formatting', () => {
  it('null and undefined inputs always produce "—"', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined),
        (value) => {
          expect(formatCellValue(value)).toBe('—');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('strings at or below 200 chars are returned unchanged', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: TRUNCATE_LENGTH }),
        (str) => {
          expect(formatCellValue(str)).toBe(str);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('strings exceeding 200 chars are truncated to first 200 chars + "…"', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: TRUNCATE_LENGTH + 1, maxLength: 1000 }),
        (str) => {
          const result = formatCellValue(str);
          expect(result).toBe(str.slice(0, TRUNCATE_LENGTH) + '…');
          expect(result).toHaveLength(TRUNCATE_LENGTH + 1);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 7: Result table column rendering', () => {
  /**
   * **Validates: Requirements 4.2**
   *
   * For any RunReportResult with an arbitrary list of column names,
   * the ResultPane table SHALL render header cells whose text content
   * matches each column name in order.
   */
  it('renders header cells matching column names in exact order for arbitrary columns', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 30 }), {
          minLength: 1,
          maxLength: 10,
        }),
        (columns: string[]) => {
          // Build a single row with dummy values for each column
          const row: Record<string, unknown> = {};
          for (const col of columns) {
            row[col] = 'value';
          }

          const result: RunReportResult = {
            columns,
            rows: [row],
            rowCount: 1,
            executionMs: 100,
          };

          const { container, unmount } = render(
            <ResultPane isLoading={false} result={result} error={null} />,
          );

          const thElements = container.querySelectorAll('th');
          expect(thElements).toHaveLength(columns.length);

          columns.forEach((colName, index) => {
            expect(thElements[index].textContent).toBe(colName);
          });

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });
});
