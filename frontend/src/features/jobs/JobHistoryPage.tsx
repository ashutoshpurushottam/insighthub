import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Download, History } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState, LoadingSpinner, PageHeader } from '@/components/ui';

import { fetchJobHistory, type JobExecution } from './api';

function formatDuration(startTime: string, endTime?: string): string {
  if (!endTime) return '—';
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const diffMs = end - start;

  if (diffMs < 0) return '—';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function statusBadgeClass(status: string): string {
  switch (status.toUpperCase()) {
    case 'SUCCESS':
      return 'bg-green-100 text-green-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    case 'RUNNING':
      return 'bg-blue-100 text-blue-800';
    case 'CANCELLED':
      return 'bg-yellow-100 text-yellow-800';
    case 'SKIPPED':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

function getDownloadUrl(jobId: string, execution: JobExecution): string {
  const baseURL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/insighthub/api';
  return `${baseURL}/jobs/${jobId}/history/${execution.id}/download`;
}

export function JobHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);

  const {
    data: executions,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['job-history', jobId],
    queryFn: () => fetchJobHistory(jobId),
    enabled: !isNaN(jobId),
  });

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

      {!isLoading && !error && (!executions || executions.length === 0) && (
        <EmptyState
          title="No execution history"
          description="This job has not been executed yet."
          icon={<History className="h-12 w-12" />}
        />
      )}

      {executions && executions.length > 0 && (
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
              {executions.map((execution) => (
                <tr key={execution.id} className="hover:bg-gray-50">
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
                  <td className="max-w-xs truncate px-6 py-4 text-sm text-red-600" title={execution.errorMessage}>
                    {execution.errorMessage || '—'}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    {execution.outputFile ? (
                      <a
                        href={getDownloadUrl(id!, execution)}
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
