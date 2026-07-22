import { useCallback, useEffect, useRef } from 'react';
import { useController } from 'react-hook-form';

import { ErrorDisplay } from './ErrorDisplay';
import { ResultPane } from './ResultPane';
import { SplitPanel } from './SplitPanel';
import type { ReportFormData, SqlEditorPanelProps } from './sql-editor.types';
import { SqlEditor } from './SqlEditor';
import { validateSql } from './SqlValidator';
import { useSqlEditorStore } from './useSqlEditorStore';

/**
 * Top-level SQL Editor Panel container.
 *
 * Integrates the SqlEditor with React Hook Form, provides a toolbar with
 * a Run button, handles validation and execution flow, and renders a
 * split-panel layout with editor (top) and results (bottom).
 */
export function SqlEditorPanel({
  control,
  name,
  datasourceId,
  reportId,
}: SqlEditorPanelProps) {
  const { field } = useController<ReportFormData, typeof name>({
    control,
    name,
  });

  const {
    isExecuting,
    result,
    error,
    validationErrors,
    execute,
    setValidationErrors,
  } = useSqlEditorStore();

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Handles query execution triggered by Run button click or Ctrl/Cmd+Enter.
   * Validates first; if errors, sets them in store and blocks execution.
   * If valid, clears validation errors and calls store.execute().
   */
  const handleRun = useCallback(() => {
    // Block if no datasource selected
    if (datasourceId === null) {
      return;
    }

    // Block if already executing
    if (isExecuting) {
      return;
    }

    const sql = field.value ?? '';
    const errors = validateSql(sql);

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    execute(sql, datasourceId, reportId);
  }, [datasourceId, isExecuting, field.value, setValidationErrors, execute, reportId]);

  /**
   * Handles editor value changes.
   * Updates the form field value and debounces re-validation to clear
   * errors within 200ms of the user fixing issues.
   */
  const handleChange = useCallback(
    (value: string) => {
      field.onChange(value);

      // Debounced re-validation to clear errors
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const errors = validateSql(value);
        if (errors.length === 0) {
          setValidationErrors([]);
        } else {
          setValidationErrors(errors);
        }
      }, 200);
    },
    [field, setValidationErrors],
  );

  // Determine Run button state
  const isRunDisabled = datasourceId === null || isExecuting;
  const runButtonLabel = isExecuting ? 'Running...' : 'Run';
  const tooltipText =
    datasourceId === null ? 'Select a datasource to run queries' : undefined;

  // Top content: toolbar + editor + validation errors
  const topContent = (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
        <div className="relative">
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunDisabled}
            title={tooltipText}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
              isRunDisabled
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
            }`}
            aria-label={tooltipText ?? runButtonLabel}
          >
            {/* Play icon */}
            <svg
              className="w-4 h-4"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M4 2l10 6-10 6V2z" />
            </svg>
            {runButtonLabel}
          </button>
        </div>
      </div>

      {/* SQL Editor */}
      <div className="flex-1 min-h-0">
        <SqlEditor
          value={field.value ?? ''}
          onChange={handleChange}
          onExecute={handleRun}
        />
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="flex flex-col gap-1 px-3 py-2">
          {validationErrors.map((err) => (
            <ErrorDisplay
              key={err.type}
              message={err.message}
              type="validation"
            />
          ))}
        </div>
      )}
    </div>
  );

  // Bottom content: result pane
  const bottomContent = (
    <ResultPane isLoading={isExecuting} result={result} error={error} />
  );

  return (
    <SplitPanel topContent={topContent} bottomContent={bottomContent} />
  );
}
