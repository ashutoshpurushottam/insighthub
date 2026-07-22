import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useForm, FormProvider } from 'react-hook-form';

import { SqlEditorPanel } from '../SqlEditorPanel';
import type { ReportFormData } from '../sql-editor.types';
import { useSqlEditorStore } from '../useSqlEditorStore';

// Mock the API module
vi.mock('../../api', () => ({
  runReport: vi.fn(),
  runAdHocQuery: vi.fn(),
}));

import { runReport, runAdHocQuery } from '../../api';

const mockedRunReport = vi.mocked(runReport);
const mockedRunAdHocQuery = vi.mocked(runAdHocQuery);

/**
 * Wrapper component that provides React Hook Form context for testing SqlEditorPanel.
 */
function TestWrapper({
  defaultValues,
  datasourceId,
  reportId,
  onSubmit,
}: {
  defaultValues?: Partial<ReportFormData>;
  datasourceId: number | null;
  reportId?: number;
  onSubmit?: (data: ReportFormData) => void;
}) {
  const methods = useForm<ReportFormData>({
    defaultValues: {
      name: 'Test Report',
      active: true,
      reportSource: '',
      ...defaultValues,
    },
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit ?? (() => {}))}>
        <SqlEditorPanel
          control={methods.control}
          name="reportSource"
          datasourceId={datasourceId}
          reportId={reportId}
        />
        <button type="submit" data-testid="submit-btn">
          Submit
        </button>
      </form>
    </FormProvider>
  );
}

describe('SqlEditorPanel Integration Tests', () => {
  beforeEach(() => {
    // Reset Zustand store state between tests
    useSqlEditorStore.setState({
      isExecuting: false,
      result: null,
      error: null,
      validationErrors: [],
    });
    vi.clearAllMocks();
  });

  describe('React Hook Form Integration (Req 6.1, 6.2)', () => {
    it('syncs editor content with form field value on change', async () => {
      const onSubmit = vi.fn();
      render(<TestWrapper datasourceId={1} onSubmit={onSubmit} />);

      const textarea = screen.getByLabelText('SQL Query Editor');

      fireEvent.change(textarea, { target: { value: 'SELECT * FROM users' } });

      // Submit the form to verify the value is synced
      fireEvent.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ reportSource: 'SELECT * FROM users' }),
          expect.anything(),
        );
      });
    });

    it('populates existing value in edit mode (Req 6.3)', () => {
      render(
        <TestWrapper
          datasourceId={1}
          reportId={5}
          defaultValues={{ reportSource: 'SELECT id FROM orders' }}
        />,
      );

      const textarea = screen.getByLabelText('SQL Query Editor');
      expect(textarea).toHaveValue('SELECT id FROM orders');
    });

    it('form submission includes reportSource value (Req 6.1)', async () => {
      const onSubmit = vi.fn();
      render(
        <TestWrapper
          datasourceId={1}
          defaultValues={{ reportSource: 'SELECT 1' }}
          onSubmit={onSubmit}
        />,
      );

      fireEvent.click(screen.getByTestId('submit-btn'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ reportSource: 'SELECT 1' }),
          expect.anything(),
        );
      });
    });
  });

  describe('Run Button States (Req 3.1, 3.3, 3.5)', () => {
    it('renders Run button with label', () => {
      render(<TestWrapper datasourceId={1} />);

      const runButton = screen.getByRole('button', { name: /run/i });
      expect(runButton).toBeInTheDocument();
      expect(runButton).toHaveTextContent('Run');
    });

    it('disables Run button when no datasource is selected', () => {
      render(<TestWrapper datasourceId={null} />);

      const runButton = screen.getByRole('button', {
        name: /select a datasource/i,
      });
      expect(runButton).toBeDisabled();
    });

    it('shows tooltip "Select a datasource to run queries" when disabled (Req 3.5)', () => {
      render(<TestWrapper datasourceId={null} />);

      const runButton = screen.getByRole('button', {
        name: /select a datasource/i,
      });
      expect(runButton).toHaveAttribute(
        'title',
        'Select a datasource to run queries',
      );
    });

    it('shows "Running..." and is disabled during execution (Req 3.3)', async () => {
      // Set the store to executing state directly to avoid async issues
      useSqlEditorStore.setState({ isExecuting: true });

      render(
        <TestWrapper
          datasourceId={1}
          defaultValues={{ reportSource: 'SELECT * FROM users' }}
        />,
      );

      const btn = screen.getByRole('button', { name: /running/i });
      expect(btn).toHaveTextContent('Running...');
      expect(btn).toBeDisabled();
    });

    it('Run button returns to enabled after execution completes', () => {
      // Start in executing state
      useSqlEditorStore.setState({ isExecuting: true });

      const { rerender } = render(
        <TestWrapper
          datasourceId={1}
          defaultValues={{ reportSource: 'SELECT * FROM users' }}
        />,
      );

      expect(
        screen.getByRole('button', { name: /running/i }),
      ).toBeDisabled();

      // Simulate execution completing
      act(() => {
        useSqlEditorStore.setState({
          isExecuting: false,
          result: {
            columns: ['id'],
            rows: [{ id: 1 }],
            rowCount: 1,
            executionMs: 50,
          },
        });
      });

      rerender(
        <TestWrapper
          datasourceId={1}
          defaultValues={{ reportSource: 'SELECT * FROM users' }}
        />,
      );

      const btn = screen.getByRole('button', { name: /run/i });
      expect(btn).toHaveTextContent('Run');
      expect(btn).not.toBeDisabled();
    });
  });

  describe('Ctrl+Enter Keyboard Shortcut (Req 7.6)', () => {
    it('triggers execution when datasource is selected and SQL is valid', async () => {
      mockedRunAdHocQuery.mockResolvedValue({
        columns: ['id'],
        rows: [{ id: 1 }],
        rowCount: 1,
        executionMs: 42,
      });

      render(
        <TestWrapper
          datasourceId={3}
          defaultValues={{ reportSource: 'SELECT * FROM products' }}
        />,
      );

      const textarea = screen.getByLabelText('SQL Query Editor');

      await act(async () => {
        fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
      });

      expect(mockedRunAdHocQuery).toHaveBeenCalledWith(
        3,
        'SELECT * FROM products',
      );
    });

    it('triggers execution with Cmd+Enter (Mac shortcut)', async () => {
      mockedRunAdHocQuery.mockResolvedValue({
        columns: ['count'],
        rows: [{ count: 10 }],
        rowCount: 1,
        executionMs: 20,
      });

      render(
        <TestWrapper
          datasourceId={2}
          defaultValues={{ reportSource: 'SELECT COUNT(*) FROM users' }}
        />,
      );

      const textarea = screen.getByLabelText('SQL Query Editor');

      await act(async () => {
        fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });
      });

      expect(mockedRunAdHocQuery).toHaveBeenCalledWith(
        2,
        'SELECT COUNT(*) FROM users',
      );
    });

    it('does NOT trigger execution when datasource is null (Req 7.7)', async () => {
      render(
        <TestWrapper
          datasourceId={null}
          defaultValues={{ reportSource: 'SELECT * FROM users' }}
        />,
      );

      const textarea = screen.getByLabelText('SQL Query Editor');

      await act(async () => {
        fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
      });

      expect(mockedRunAdHocQuery).not.toHaveBeenCalled();
      expect(mockedRunReport).not.toHaveBeenCalled();
    });

    it('does NOT trigger execution when SQL is empty', async () => {
      render(
        <TestWrapper datasourceId={1} defaultValues={{ reportSource: '' }} />,
      );

      const textarea = screen.getByLabelText('SQL Query Editor');

      await act(async () => {
        fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
      });

      expect(mockedRunAdHocQuery).not.toHaveBeenCalled();
    });
  });

  describe('Validation Errors (Req 6.6)', () => {
    it('displays validation error when trying to run empty SQL', async () => {
      render(
        <TestWrapper datasourceId={1} defaultValues={{ reportSource: '' }} />,
      );

      const runButton = screen.getByRole('button', { name: /run/i });

      await act(async () => {
        fireEvent.click(runButton);
      });

      expect(
        screen.getByText('SQL query cannot be empty'),
      ).toBeInTheDocument();

      // API should not have been called
      expect(mockedRunAdHocQuery).not.toHaveBeenCalled();
    });

    it('displays validation error for unbalanced parentheses', async () => {
      render(
        <TestWrapper
          datasourceId={1}
          defaultValues={{ reportSource: 'SELECT * FROM users WHERE (id = 1' }}
        />,
      );

      const runButton = screen.getByRole('button', { name: /run/i });

      await act(async () => {
        fireEvent.click(runButton);
      });

      expect(screen.getByText('Unbalanced parentheses')).toBeInTheDocument();
    });

    it('displays multiple validation errors simultaneously', async () => {
      render(
        <TestWrapper
          datasourceId={1}
          defaultValues={{
            reportSource: "SELECT * FROM users WHERE (name = 'test",
          }}
        />,
      );

      const runButton = screen.getByRole('button', { name: /run/i });

      await act(async () => {
        fireEvent.click(runButton);
      });

      expect(screen.getByText('Unbalanced parentheses')).toBeInTheDocument();
      expect(screen.getByText('Unclosed string literal')).toBeInTheDocument();
    });

    it('clears validation errors after user types valid content', async () => {
      vi.useFakeTimers();

      render(
        <TestWrapper datasourceId={1} defaultValues={{ reportSource: '' }} />,
      );

      const runButton = screen.getByRole('button', { name: /run/i });
      const textarea = screen.getByLabelText('SQL Query Editor');

      // Trigger validation error
      await act(async () => {
        fireEvent.click(runButton);
      });

      expect(
        screen.getByText('SQL query cannot be empty'),
      ).toBeInTheDocument();

      // User types valid SQL
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'SELECT 1' } });
      });

      // Advance timers to trigger debounced re-validation (200ms)
      await act(async () => {
        vi.advanceTimersByTime(250);
      });

      expect(
        screen.queryByText('SQL query cannot be empty'),
      ).not.toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('Query Execution Flow', () => {
    it('calls runAdHocQuery with correct params for unsaved reports', async () => {
      mockedRunAdHocQuery.mockResolvedValue({
        columns: ['name'],
        rows: [{ name: 'Alice' }],
        rowCount: 1,
        executionMs: 30,
      });

      render(
        <TestWrapper
          datasourceId={7}
          defaultValues={{ reportSource: 'SELECT name FROM employees' }}
        />,
      );

      const runButton = screen.getByRole('button', { name: /run/i });

      await act(async () => {
        fireEvent.click(runButton);
      });

      expect(mockedRunAdHocQuery).toHaveBeenCalledWith(
        7,
        'SELECT name FROM employees',
      );
    });

    it('calls runReport for saved reports (with reportId)', async () => {
      mockedRunReport.mockResolvedValue({
        columns: ['total'],
        rows: [{ total: 100 }],
        rowCount: 1,
        executionMs: 55,
      });

      render(
        <TestWrapper
          datasourceId={2}
          reportId={42}
          defaultValues={{ reportSource: 'SELECT COUNT(*) FROM orders' }}
        />,
      );

      const runButton = screen.getByRole('button', { name: /run/i });

      await act(async () => {
        fireEvent.click(runButton);
      });

      expect(mockedRunReport).toHaveBeenCalledWith(42);
    });
  });
});
