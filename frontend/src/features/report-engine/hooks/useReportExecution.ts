import { useMutation } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { apiClient } from '@/lib/api-client';

import type {
  ExecuteReportRequest,
  PaginatedResult,
  SortDirection,
} from '../types';

/**
 * POST /api/reports/{id}/execute
 * Sends execution params and pagination/sort settings.
 */
async function executeReport(
  reportId: number,
  request: ExecuteReportRequest,
): Promise<PaginatedResult> {
  const { data } = await apiClient.post<PaginatedResult>(
    `/reports/${reportId}/execute`,
    request,
  );
  return data;
}

interface UseReportExecutionOptions {
  reportId: number;
}

/**
 * TanStack mutation hook for executing a report.
 *
 * Manages:
 * - Parameter values passed to execution
 * - Pagination (page, pageSize) with reset-to-page-1 on sort change
 * - Sort column and direction
 * - Loading, error, and success states
 */
export function useReportExecution({ reportId }: UseReportExecutionOptions) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState<string | undefined>();
  const [sortDirection, setSortDirection] = useState<SortDirection | undefined>();

  // Keep a ref to the latest params so re-executions (page/sort changes) use them
  const lastParamsRef = useRef<Record<string, string | string[]>>({});
  const lastNullParamsRef = useRef<string[]>([]);

  const mutation = useMutation({
    mutationFn: (request: ExecuteReportRequest) =>
      executeReport(reportId, request),
  });

  /**
   * Execute the report with the given parameters and current pagination/sort state.
   */
  const execute = useCallback(
    (params: Record<string, string | string[]>, nullParams?: string[]) => {
      lastParamsRef.current = params;
      lastNullParamsRef.current = nullParams ?? [];
      mutation.mutate({
        params,
        nullParams: nullParams && nullParams.length > 0 ? nullParams : undefined,
        page,
        pageSize,
        sortColumn,
        sortDirection,
      });
    },
    [mutation, page, pageSize, sortColumn, sortDirection],
  );

  /**
   * Re-execute with the last-used params (for page/sort changes).
   */
  const reExecute = useCallback(
    (overrides?: {
      page?: number;
      pageSize?: number;
      sortColumn?: string;
      sortDirection?: SortDirection;
    }) => {
      const effectivePage = overrides?.page ?? page;
      const effectivePageSize = overrides?.pageSize ?? pageSize;
      const effectiveSortColumn = overrides?.sortColumn !== undefined
        ? overrides.sortColumn
        : sortColumn;
      const effectiveSortDirection = overrides?.sortDirection !== undefined
        ? overrides.sortDirection
        : sortDirection;

      mutation.mutate({
        params: lastParamsRef.current,
        nullParams: lastNullParamsRef.current.length > 0 ? lastNullParamsRef.current : undefined,
        page: effectivePage,
        pageSize: effectivePageSize,
        sortColumn: effectiveSortColumn,
        sortDirection: effectiveSortDirection,
      });
    },
    [mutation, page, pageSize, sortColumn, sortDirection],
  );

  /**
   * Handle page change — re-execute at the new page.
   */
  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      reExecute({ page: newPage });
    },
    [reExecute],
  );

  /**
   * Handle page size change — reset to page 1 and re-execute.
   */
  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      setPage(1);
      setPageSize(newPageSize);
      reExecute({ page: 1, pageSize: newPageSize });
    },
    [reExecute],
  );

  /**
   * Handle sort change — reset to page 1 and re-execute.
   */
  const handleSortChange = useCallback(
    (column: string, direction?: SortDirection) => {
      setSortColumn(direction ? column : undefined);
      setSortDirection(direction);
      setPage(1);
      reExecute({
        page: 1,
        sortColumn: direction ? column : undefined,
        sortDirection: direction,
      });
    },
    [reExecute],
  );

  return {
    /** Execute with given params */
    execute,
    /** The result data (null until first successful execution) */
    data: mutation.data ?? null,
    /** Whether the execution is currently in progress */
    isLoading: mutation.isPending,
    /** Error from the last execution attempt */
    error: mutation.error,
    /** Whether the execution has completed successfully at least once */
    isSuccess: mutation.isSuccess,
    /** Current page (1-based) */
    page,
    /** Current page size */
    pageSize,
    /** Current sort column */
    sortColumn,
    /** Current sort direction */
    sortDirection,
    /** Handle page change */
    handlePageChange,
    /** Handle page size change */
    handlePageSizeChange,
    /** Handle sort column/direction change */
    handleSortChange,
    /** Reset the mutation state */
    reset: mutation.reset,
  };
}
