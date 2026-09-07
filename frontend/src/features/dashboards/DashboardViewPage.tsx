import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, RefreshCw, Table2 } from 'lucide-react';
import { useParams } from 'react-router-dom';

import { LoadingSpinner, PageHeader } from '@/components/ui';
import { ChartView, type ChartType } from '@/features/reports/ChartView';
import { CHART_TYPE_OPTIONS } from '@/features/reports/chart-utils';
import { runReport, type RunReportResult } from '@/features/reports/api';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/api-errors';

import { fetchDashboardById, type DashboardItem } from './api';
import {
  buildDashboardGridTemplate,
  clampColSpan,
  sortDashboardItems,
} from './schemas';

export function DashboardViewPage() {
  const { id } = useParams<{ id: string }>();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: queryKeys.dashboards.detail(id ?? ''),
    queryFn: () => fetchDashboardById(Number(id)),
    enabled: !!id,
  });

  const items = useMemo(
    () => (dashboard ? sortDashboardItems(dashboard.items) : []),
    [dashboard],
  );

  if (isLoading || !dashboard) {
    return <LoadingSpinner size="lg" className="mt-20" />;
  }

  return (
    <div>
      <PageHeader
        title={dashboard.name}
        description={
          dashboard.description ||
          `${items.length} portlet${items.length === 1 ? '' : 's'} · ${dashboard.columnsCount} columns`
        }
      />
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: buildDashboardGridTemplate(dashboard.columnsCount),
        }}
      >
        {items.map((item) => (
          <DashboardCard
            key={item.id}
            item={item}
            colSpan={clampColSpan(item.colSpan, dashboard.columnsCount)}
          />
        ))}
      </div>
    </div>
  );
}

function DashboardCard({
  item,
  colSpan,
}: {
  item: DashboardItem;
  colSpan: number;
}) {
  const [result, setResult] = useState<RunReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    runReport(item.reportId, {})
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((e) => {
        if (!cancelled) setError(getErrorMessage(e, 'Failed to load report'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item.reportId, refreshKey]);

  return (
    <div
      className="card overflow-hidden"
      style={{ gridColumn: `span ${colSpan}` }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-700">
          {item.title || item.reportName}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={`rounded p-1 ${viewMode === 'table' ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:text-gray-600'}`}
            onClick={() => setViewMode('table')}
            title="Table view"
          >
            <Table2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={`rounded p-1 ${viewMode === 'chart' ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:text-gray-600'}`}
            onClick={() => setViewMode('chart')}
            title="Chart view"
          >
            <BarChart3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded p-1 text-gray-400 hover:text-gray-600"
            onClick={() => setRefreshKey((k) => k + 1)}
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {viewMode === 'chart' && (
        <div className="mb-2">
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartType)}
            className="rounded border border-gray-300 px-2 py-1 text-xs"
          >
            {CHART_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && <LoadingSpinner size="sm" />}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {result && viewMode === 'chart' && (
        <ChartView data={result} chartType={chartType} showSummary={false} />
      )}

      {result && viewMode === 'table' && result.rows.length > 0 && (
        <div className="max-h-60 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                {result.columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-1.5 text-left font-medium text-gray-600"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.rows.slice(0, 20).map((row, idx) => (
                <tr key={idx}>
                  {result.columns.map((col) => (
                    <td
                      key={col}
                      className="whitespace-nowrap px-3 py-1 text-gray-500"
                    >
                      {row[col] != null ? String(row[col]) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {result.rowCount > 20 && (
            <p className="mt-1 px-3 text-xs text-gray-400">
              Showing 20 of {result.rowCount} rows · {result.executionMs}ms
            </p>
          )}
        </div>
      )}

      {result && viewMode === 'table' && result.rows.length === 0 && (
        <p className="text-xs text-gray-400">No data</p>
      )}
    </div>
  );
}
