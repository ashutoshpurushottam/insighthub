import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import type { PaginationMeta } from '../types';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

interface PaginationControlsProps {
  /** Current pagination metadata */
  pagination: PaginationMeta;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange: (pageSize: number) => void;
}

/**
 * Pagination controls with First/Previous/Next/Last buttons,
 * direct page number input, and page size selector.
 */
export function PaginationControls({
  pagination,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const { page, pageSize, totalRows, totalPages } = pagination;
  const [pageInput, setPageInput] = useState(String(page));

  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  const handleFirst = useCallback(() => {
    onPageChange(1);
    setPageInput('1');
  }, [onPageChange]);

  const handlePrevious = useCallback(() => {
    const newPage = Math.max(1, page - 1);
    onPageChange(newPage);
    setPageInput(String(newPage));
  }, [page, onPageChange]);

  const handleNext = useCallback(() => {
    const newPage = Math.min(totalPages, page + 1);
    onPageChange(newPage);
    setPageInput(String(newPage));
  }, [page, totalPages, onPageChange]);

  const handleLast = useCallback(() => {
    onPageChange(totalPages);
    setPageInput(String(totalPages));
  }, [totalPages, onPageChange]);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const parsed = parseInt(pageInput, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
        onPageChange(parsed);
      } else {
        // Reset to current page on invalid input
        setPageInput(String(page));
      }
    }
  };

  const handlePageInputBlur = () => {
    const parsed = parseInt(pageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      onPageChange(parsed);
    } else {
      setPageInput(String(page));
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onPageSizeChange(Number(e.target.value));
  };

  // Calculate display range
  const startRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalRows);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
      {/* Info */}
      <div className="text-gray-600">
        Showing{' '}
        <span className="font-medium text-gray-900">{startRow}</span>
        {' – '}
        <span className="font-medium text-gray-900">{endRow}</span>
        {' of '}
        <span className="font-medium text-gray-900">
          {totalRows.toLocaleString()}
        </span>{' '}
        rows
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleFirst}
          disabled={isFirstPage}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
          title="First page"
          aria-label="First page"
        >
          <ChevronFirst className="h-4 w-4" />
        </button>
        <button
          onClick={handlePrevious}
          disabled={isFirstPage}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
          title="Previous page"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1.5 text-gray-600">
          <span>Page</span>
          <input
            type="number"
            className="w-14 rounded border border-gray-300 px-2 py-1 text-center text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={pageInput}
            onChange={handlePageInputChange}
            onKeyDown={handlePageInputSubmit}
            onBlur={handlePageInputBlur}
            min={1}
            max={totalPages}
            aria-label="Page number"
          />
          <span>of {totalPages}</span>
        </div>

        <button
          onClick={handleNext}
          disabled={isLastPage}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
          title="Next page"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={handleLast}
          disabled={isLastPage}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
          title="Last page"
          aria-label="Last page"
        >
          <ChevronLast className="h-4 w-4" />
        </button>
      </div>

      {/* Page size selector */}
      <div className="flex items-center gap-2">
        <label htmlFor="page-size" className="text-gray-600">
          Rows per page:
        </label>
        <select
          id="page-size"
          className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={pageSize}
          onChange={handlePageSizeChange}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
