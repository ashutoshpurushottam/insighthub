import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Download, History } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState, LoadingSpinner, PageHeader } from '@/components/ui';
import { queryKeys } from '@/lib/query-keys';

import { fetchJobHistory, type JobExecution } from './api';
import {
  filterExecutionsByStatus,
  formatDateTime,
  formatDuration,
  getJobHistoryDownloadUrl,
  statusBadgeClass,
  summarizeJobHistory,
} from './job-history-utils';

const STATUS_FILTERS = ['ALL', 'SUCCESS', 'FAILED', 'RUNNING', 'CANCELLED', 'SKIPPED'] as const;

export function JobHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('ALL');

  const {
    data: executions,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.jobs.history(jobId),
    queryFn: () => fetchJobHistory(jobId),
    enabled: !isNaN(jobId),
  });

  const filtered = useMemo(
    () => filterExecutionsByStatus(executions ?? [], statusFilter),
    [executions, statusFilter],
  );

  const stats = useMemo(
    () => summarizeJobHistory(executions ?? []),
    [executions],
  );

  const apiBase =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/insighthub/api';

  return (
    <div>
      <PageHeader
        title="Job Execution History"
        description="View past executions and their results"
        actions={
          <Link to="/jobs" className="btn-secondary inline-flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Jobs
          </Link>
        }
      />

      {isLoading && <LoadingSpinner size="lg" className="mt-12" />}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Failed to load execution history.
        </div>
      )}

      {!isLoading && !error && executions && executions.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total runs" value={String(stats.total)} />
          <StatCard
            label="Success rate"
            value={`${stats.successRate.toFixed(0)}%`}
            hint={`${stats.success} succeeded · ${stats.failed} failed`}
          />
          <StatCard
            label="Avg duration"
            value={
              stats.averageDurationMs == null
                ? '—'
                : `${Math.round(stats.averageDurationMs / 1000)}s`
            }
          />
          <StatCard
            label="In progress"
            value={String(stats.running)}
            hint={`${stats.cancelled} cancelled · ${stats.skipped} skipped`}
          />
        </div>
      )}

      {!isLoading && !error && executions && executions.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                statusFilter === status
                  ? 'bg-primary-100 text-primary-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'ALL' ? 'All' : status}
            </button>
          ))}
        </div>
      )}

      {!isLoading && !error && (!executions || executions.length === 0) && (
        <EmptyState
          title="No execution history"
          description="This job has not been executed yet."
          icon={<History className="h-12 w-12" />}
        />
      )}

      {filtered.length > 0 && (
        <div className="card overflow-hidden p-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Start Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  End Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Rows
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Error Message
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Download
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filtered.map((execution) => (
                <HistoryRow
                  key={execution.id}
                  execution={execution}
                  downloadUrl={
                    execution.outputFile
                      ? getJobHistoryDownloadUrl(apiBase, id!, execution.id)
                      : null
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading &&
        !error &&
        executions &&
        executions.length > 0 &&
        filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">
            No executions match the selected status filter.
          </p>
        )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function HistoryRow({
  execution,
  downloadUrl,
}: {
  execution: JobExecution;
  downloadUrl: string | null;
}) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          {formatDateTime(execution.startTime)}
        </div>
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
        {formatDateTime(execution.endTime)}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
        {formatDuration(execution.startTime, execution.endTime)}
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(execution.status)}`}
        >
          {execution.status}
        </span>
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
        {execution.rowsGenerated ?? '—'}
      </td>
      <td
        className="max-w-xs truncate px-6 py-4 text-sm text-red-600"
        title={execution.errorMessage}
      >
        {execution.errorMessage || '—'}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
        {downloadUrl ? (
          <a
            href={downloadUrl}
            className="text-primary-600 hover:text-primary-800"
            title="Download output file"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="inline h-4 w-4" />
          </a>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
    </tr>
  );
}
