import { create } from 'zustand';

import { runAdHocQuery, runReport } from '../api';

import type { RunReportResult, SqlEditorState, ValidationError } from './sql-editor.types';

export const useSqlEditorStore = create<SqlEditorState>()((set) => ({
  isExecuting: false,
  result: null,
  error: null,
  validationErrors: [],

  execute: async (sql: string, datasourceId: number, reportId?: number): Promise<void> => {
    // 1. Clear previous results/errors and set loading
    set({ isExecuting: true, result: null, error: null });

    try {
      // 2. Route to appropriate API based on whether report is saved
      let result: RunReportResult;
      if (reportId !== undefined) {
        result = await runReport(reportId);
      } else {
        result = await runAdHocQuery(datasourceId, sql);
      }

      // 3. On success: store result
      set({ result, isExecuting: false });
    } catch (err: unknown) {
      // 4. On error: determine error message
      let message: string;

      if (err instanceof Error && 'response' in err) {
        // Axios error with a server response
        const axiosError = err as { response?: { data?: { message?: string } } };
        message =
          axiosError.response?.data?.message || 'Query execution failed';
      } else if (err instanceof Error && 'request' in err) {
        // Network error — request was made but no response received
        message =
          'Unable to reach the server. Check your connection and try again.';
      } else {
        message = 'Query execution failed';
      }

      set({ error: message, isExecuting: false });
    }
  },

  setValidationErrors: (errors: ValidationError[]): void => {
    set({ validationErrors: errors });
  },

  clearResults: (): void => {
    set({ result: null, error: null });
  },
}));
