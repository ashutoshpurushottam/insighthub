import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useSqlEditorStore } from '../useSqlEditorStore';

// Mock the API module
vi.mock('../../api', () => ({
  runReport: vi.fn(),
  runAdHocQuery: vi.fn(),
}));

import { runReport, runAdHocQuery } from '../../api';

const mockedRunReport = vi.mocked(runReport);
const mockedRunAdHocQuery = vi.mocked(runAdHocQuery);

describe('useSqlEditorStore', () => {
  beforeEach(() => {
    // Reset store state between tests
    useSqlEditorStore.setState({
      isExecuting: false,
      result: null,
      error: null,
      validationErrors: [],
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useSqlEditorStore.getState();
      expect(state.isExecuting).toBe(false);
      expect(state.result).toBeNull();
      expect(state.error).toBeNull();
      expect(state.validationErrors).toEqual([]);
    });
  });

  describe('execute', () => {
    it('calls runAdHocQuery when no reportId is provided', async () => {
      const mockResult = {
        columns: ['id', 'name'],
        rows: [{ id: 1, name: 'Test' }],
        rowCount: 1,
        executionMs: 42,
      };
      mockedRunAdHocQuery.mockResolvedValue(mockResult);

      await useSqlEditorStore.getState().execute('SELECT * FROM users', 5);

      expect(mockedRunAdHocQuery).toHaveBeenCalledWith(5, 'SELECT * FROM users');
      expect(mockedRunReport).not.toHaveBeenCalled();

      const state = useSqlEditorStore.getState();
      expect(state.result).toEqual(mockResult);
      expect(state.isExecuting).toBe(false);
      expect(state.error).toBeNull();
    });

    it('calls runReport when reportId is provided', async () => {
      const mockResult = {
        columns: ['count'],
        rows: [{ count: 42 }],
        rowCount: 1,
        executionMs: 100,
      };
      mockedRunReport.mockResolvedValue(mockResult);

      await useSqlEditorStore.getState().execute('SELECT COUNT(*) FROM users', 5, 10);

      expect(mockedRunReport).toHaveBeenCalledWith(10);
      expect(mockedRunAdHocQuery).not.toHaveBeenCalled();

      const state = useSqlEditorStore.getState();
      expect(state.result).toEqual(mockResult);
      expect(state.isExecuting).toBe(false);
      expect(state.error).toBeNull();
    });

    it('clears previous results and error before executing', async () => {
      // Set some previous state
      useSqlEditorStore.setState({
        result: { columns: ['a'], rows: [], rowCount: 0, executionMs: 10 },
        error: 'old error',
      });

      mockedRunAdHocQuery.mockResolvedValue({
        columns: ['b'],
        rows: [],
        rowCount: 0,
        executionMs: 20,
      });

      const executePromise = useSqlEditorStore.getState().execute('SELECT 1', 1);

      // During execution, previous results should be cleared
      const duringState = useSqlEditorStore.getState();
      expect(duringState.result).toBeNull();
      expect(duringState.error).toBeNull();
      expect(duringState.isExecuting).toBe(true);

      await executePromise;
    });

    it('stores error message from server response', async () => {
      const axiosError = new Error('Request failed') as Error & {
        response: { data: { message: string } };
      };
      (axiosError as unknown as Record<string, unknown>).response = {
        data: { message: 'Table "users" not found' },
      };
      mockedRunAdHocQuery.mockRejectedValue(axiosError);

      await useSqlEditorStore.getState().execute('SELECT * FROM users', 1);

      const state = useSqlEditorStore.getState();
      expect(state.error).toBe('Table "users" not found');
      expect(state.isExecuting).toBe(false);
      expect(state.result).toBeNull();
    });

    it('shows network error when no response is received', async () => {
      const networkError = new Error('Network Error') as Error & {
        request: object;
      };
      (networkError as unknown as Record<string, unknown>).request = {};
      mockedRunAdHocQuery.mockRejectedValue(networkError);

      await useSqlEditorStore.getState().execute('SELECT 1', 1);

      const state = useSqlEditorStore.getState();
      expect(state.error).toBe(
        'Unable to reach the server. Check your connection and try again.',
      );
      expect(state.isExecuting).toBe(false);
      expect(state.result).toBeNull();
    });

    it('shows generic error when error has no response or request', async () => {
      mockedRunAdHocQuery.mockRejectedValue(new Error('Something weird'));

      await useSqlEditorStore.getState().execute('SELECT 1', 1);

      const state = useSqlEditorStore.getState();
      expect(state.error).toBe('Query execution failed');
      expect(state.isExecuting).toBe(false);
    });

    it('shows generic error for server response without message', async () => {
      const axiosError = new Error('Request failed') as Error & {
        response: { data: Record<string, unknown> };
      };
      (axiosError as unknown as Record<string, unknown>).response = { data: {} };
      mockedRunAdHocQuery.mockRejectedValue(axiosError);

      await useSqlEditorStore.getState().execute('SELECT 1', 1);

      const state = useSqlEditorStore.getState();
      expect(state.error).toBe('Query execution failed');
    });
  });

  describe('setValidationErrors', () => {
    it('sets validation errors', () => {
      const errors = [
        { type: 'empty' as const, message: 'SQL query cannot be empty' },
        { type: 'unbalanced-parentheses' as const, message: 'Unbalanced parentheses' },
      ];

      useSqlEditorStore.getState().setValidationErrors(errors);

      expect(useSqlEditorStore.getState().validationErrors).toEqual(errors);
    });

    it('clears validation errors with empty array', () => {
      useSqlEditorStore.setState({
        validationErrors: [
          { type: 'empty', message: 'SQL query cannot be empty' },
        ],
      });

      useSqlEditorStore.getState().setValidationErrors([]);

      expect(useSqlEditorStore.getState().validationErrors).toEqual([]);
    });
  });

  describe('clearResults', () => {
    it('clears result and error', () => {
      useSqlEditorStore.setState({
        result: { columns: ['a'], rows: [], rowCount: 0, executionMs: 10 },
        error: 'some error',
      });

      useSqlEditorStore.getState().clearResults();

      const state = useSqlEditorStore.getState();
      expect(state.result).toBeNull();
      expect(state.error).toBeNull();
    });

    it('does not affect isExecuting or validationErrors', () => {
      useSqlEditorStore.setState({
        isExecuting: true,
        validationErrors: [{ type: 'empty', message: 'SQL query cannot be empty' }],
        result: { columns: ['a'], rows: [], rowCount: 0, executionMs: 10 },
        error: 'some error',
      });

      useSqlEditorStore.getState().clearResults();

      const state = useSqlEditorStore.getState();
      expect(state.isExecuting).toBe(true);
      expect(state.validationErrors).toHaveLength(1);
    });
  });
});
