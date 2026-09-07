import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, BarChart3, Play, Table2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { LoadingSpinner, PageHeader } from '@/components/ui';
import { apiClient } from '@/lib/api-client';

import { ExportToolbar } from '../components/ExportToolbar';
import { PaginationControls } from '../components/PaginationControls';
import { ParameterForm, type ParameterValues } from '../components/ParameterForm';
import { ResultsTable } from '../components/ResultsTable';
import { useExport } from '../hooks/useExport';
import { useReportExecution } from '../hooks/useReportExecution';
import {
  buildDefaultParamValues,
  canAutoRunReport,
  flattenParamValues,
  isDrillDownNavigation,
  mergeParamValues,
  resolveParentReportPath,
  shouldAutoRunFromSearch,
  urlSearchToOverrides,
  type ParamValues,
} from '../runner-utils';
import type { Parameter, Report } from '../types';

// === API Functions ===

async function fetchReport(id: number): Promise<Report> {
  const { data } = await apiClient.get<Report>(`/reports/${id}`);
  return data;
}

async function fetchParameters(reportId: number): Promise<Parameter[]> {
  const { data } = await apiClient.get<Parameter[]>(
    `/reports/${reportId}/parameters`,
  );
  return Array.isArray(data) ? data : [];
}

function toFormValues(values: ParamValues): ParameterValues {
  const out: ParameterValues = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) continue;
    out[key] = value;
  }
  return out;
}

// === Component ===

type ViewMode = 'table' | 'chart';

export function ReportRunnerPage() {
  const { id } = useParams<{ id: string }>();
  const reportId = Number(id);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const searchKey = searchParams.toString();

  const [paramValues, setParamValues] = useState<ParameterValues>({});
  const [nullParams, setNullParams] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [paramsReady, setParamsReady] = useState(false);

  const isDrillDown = isDrillDownNavigation(searchParams);
  const shouldAutoRun = shouldAutoRunFromSearch(searchParams);
  const parentPath = resolveParentReportPath(searchParams);
  const autoExecuted = useRef(false);

  // Load report metadata
  const {
    data: report,
    isLoading: reportLoading,
    error: reportError,
  } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => fetchReport(reportId),
    enabled: !!reportId && !isNaN(reportId),
  });

  // Load parameter definitions
  const { data: parameters = [], isLoading: paramsLoading } = useQuery({
    queryKey: ['report-parameters', reportId],
    queryFn: () => fetchParameters(reportId),
    enabled: !!reportId && !isNaN(reportId),
  });

  // Execution hook
  const {
    execute,
    data: result,
    isLoading: executing,
    error: executionError,
    isSuccess,
    handlePageChange,
    handlePageSizeChange,
    page,
  } = useReportExecution({ reportId });

  // Export hook
  const {
    exportCsv,
    exportXlsx,
    exportPdf,
    loading: exportLoading,
  } = useExport({ reportId });

  // Reset local state when navigating to a different report
  useEffect(() => {
    autoExecuted.current = false;
    setParamValues({});
    setNullParams([]);
    setViewMode('table');
    setParamsReady(false);
  }, [reportId]);

  // Merge URL overrides with parameter defaults (drill-down + shared links)
  useEffect(() => {
    if (paramsLoading) return;

    const defaults = buildDefaultParamValues(parameters);
    const overrides = urlSearchToOverrides(searchParams, parameters);
    setParamValues(toFormValues(mergeParamValues(defaults, overrides)));
    setParamsReady(true);
    autoExecuted.current = false;
  }, [reportId, parameters, paramsLoading, searchKey, searchParams]);

  const handleRun = useCallback(() => {
    execute(flattenParamValues(paramValues), nullParams);
  }, [execute, paramValues, nullParams]);

  // Auto-run on drill-down arrival or return from a child report
  useEffect(() => {
    if (!paramsReady || !shouldAutoRun || autoExecuted.current || paramsLoading) {
      return;
    }
    if (!canAutoRunReport(parameters, paramValues)) {
      return;
    }
    autoExecuted.current = true;
    execute(flattenParamValues(paramValues), nullParams);
  }, [
    paramsReady,
    shouldAutoRun,
    paramsLoading,
    parameters,
    paramValues,
    nullParams,
    execute,
  ]);

  const handleBack = useCallback(() => {
    if (parentPath) {
      navigate(parentPath);
      return;
    }
    navigate(-1);
  }, [navigate, parentPath]);

  // Export handlers — pass current params to export endpoints
  const handleExportCsv = useCallback(() => {
    exportCsv(flattenParamValues(paramValues), report?.name);
  }, [exportCsv, paramValues, report?.name]);

  const handleExportXlsx = useCallback(() => {
    exportXlsx(flattenParamValues(paramValues), report?.name);
  }, [exportXlsx, paramValues, report?.name]);

  const handleExportPdf = useCallback(() => {
    exportPdf(flattenParamValues(paramValues), report?.name);
  }, [exportPdf, paramValues, report?.name]);

  // Loading state for initial page load
  if (reportLoading || paramsLoading) {
    return <LoadingSpinner size="lg" className="mt-20" />;
  }

  // Error state for report not found
  if (reportError || !report) {
    return (
      <div className="mt-20 text-center">
        <p className="text-lg text-red-600">
          Failed to load report. It may not exist or you lack access.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      {/* Back button for drill-down navigation */}
      {isDrillDown && (
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to parent report
        </button>
      )}

      <PageHeader
        title={report.name}
        description={report.description || 'Execute and view report results'}
      />

      {/* Parameter Form */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">Parameters</h2>
          <button
            type="button"
            onClick={handleRun}
            disabled={executing}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            {executing ? 'Running...' : 'Run Report'}
          </button>
        </div>

        <ParameterForm
          parameters={parameters}
          values={paramValues}
          onChange={setParamValues}
          disabled={executing}
          nullParams={nullParams}
          onNullParamsChange={setNullParams}
        />
      </section>

      {/* Execution Error */}
      {executionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-sm font-medium text-red-800">Execution failed</p>
          </div>
          <p className="mt-1 text-sm text-red-700">
            {(executionError as Error).message || 'An unexpected error occurred.'}
          </p>
        </div>
      )}

      {/* Loading Spinner during execution */}
      {executing && (
        <div className="flex flex-col items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <p className="mt-3 text-sm text-gray-500">Executing report...</p>
        </div>
      )}

      {/* Results Section */}
      {isSuccess && result && !executing && (
        <section className="space-y-4">
          {/* Metadata bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>
                Execution time:{' '}
                <span className="font-medium text-gray-900">
                  {result.executionMs}ms
                </span>
              </span>
              <span className="text-gray-300">|</span>
              <span>
                Total rows:{' '}
                <span className="font-medium text-gray-900">
                  {result.pagination.totalRows.toLocaleString()}
                </span>
              </span>
            </div>

            {/* View mode toggle (chart/table) */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  viewMode === 'table'
                    ? 'bg-gray-100 font-medium text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Table view"
              >
                <Table2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  viewMode === 'chart'
                    ? 'bg-gray-100 font-medium text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                title="Chart view (coming soon)"
              >
                <BarChart3 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Truncation Warning */}
          {result.truncated && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">
                Results were truncated
                {result.truncationReason
                  ? ` (${result.truncationReason})`
                  : ''}
                . Not all rows are displayed. Consider adding filters or
                narrowing your date range.
              </p>
            </div>
          )}

          {/* Export Toolbar */}
          <ExportToolbar
            hasResults={isSuccess && !!result}
            loading={exportLoading}
            onExportCsv={handleExportCsv}
            onExportXlsx={handleExportXlsx}
            onExportPdf={handleExportPdf}
          />

          {/* Table or Chart View */}
          {viewMode === 'table' ? (
            <>
              <ResultsTable
                columns={result.columns}
                rows={result.rows}
                drillDownLinks={result.drillDownLinks}
                parentReportId={reportId}
                parentPage={page}
              />
              <PaginationControls
                pagination={result.pagination}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">
                Chart visualization coming soon
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
