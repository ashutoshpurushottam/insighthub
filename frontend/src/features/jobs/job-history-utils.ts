export type JobStatus =
  | 'SUCCESS'
  | 'FAILED'
  | 'RUNNING'
  | 'CANCELLED'
  | 'SKIPPED'
  | string;

export interface JobHistoryStats {
  total: number;
  success: number;
  failed: number;
  running: number;
  cancelled: number;
  skipped: number;
  other: number;
  successRate: number;
  averageDurationMs: number | null;
}

/**
 * Format a duration between two ISO timestamps.
 */
export function formatDuration(startTime: string, endTime?: string): string {
  if (!endTime) return '—';
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return '—';

  const diffMs = end - start;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Duration in milliseconds, or null when incomplete/invalid.
 */
export function durationMs(startTime: string, endTime?: string): number | null {
  if (!endTime) return null;
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return end - start;
}

export function statusBadgeClass(status: JobStatus): string {
  switch (String(status).toUpperCase()) {
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

export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export function getJobHistoryDownloadUrl(
  apiBaseUrl: string,
  jobId: string | number,
  executionId: number,
): string {
  const base = apiBaseUrl.replace(/\/$/, '');
  return `${base}/jobs/${jobId}/history/${executionId}/download`;
}

export function summarizeJobHistory(
  executions: Array<{
    status: string;
    startTime: string;
    endTime?: string;
  }>,
): JobHistoryStats {
  const stats: JobHistoryStats = {
    total: executions.length,
    success: 0,
    failed: 0,
    running: 0,
    cancelled: 0,
    skipped: 0,
    other: 0,
    successRate: 0,
    averageDurationMs: null,
  };

  const durations: number[] = [];

  for (const execution of executions) {
    const status = execution.status.toUpperCase();
    switch (status) {
      case 'SUCCESS':
        stats.success += 1;
        break;
      case 'FAILED':
        stats.failed += 1;
        break;
      case 'RUNNING':
        stats.running += 1;
        break;
      case 'CANCELLED':
        stats.cancelled += 1;
        break;
      case 'SKIPPED':
        stats.skipped += 1;
        break;
      default:
        stats.other += 1;
    }

    const ms = durationMs(execution.startTime, execution.endTime);
    if (ms != null) durations.push(ms);
  }

  const completed = stats.success + stats.failed;
  stats.successRate = completed === 0 ? 0 : (stats.success / completed) * 100;
  stats.averageDurationMs =
    durations.length === 0
      ? null
      : durations.reduce((a, b) => a + b, 0) / durations.length;

  return stats;
}

/**
 * Filter executions by status (case-insensitive). Empty filter returns all.
 */
export function filterExecutionsByStatus<T extends { status: string }>(
  executions: T[],
  statusFilter?: string,
): T[] {
  if (!statusFilter || statusFilter === 'ALL') return executions;
  const needle = statusFilter.toUpperCase();
  return executions.filter((e) => e.status.toUpperCase() === needle);
}
