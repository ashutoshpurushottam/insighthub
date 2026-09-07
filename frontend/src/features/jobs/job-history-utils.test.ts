import { describe, it, expect } from 'vitest';

import {
  durationMs,
  filterExecutionsByStatus,
  formatDateTime,
  formatDuration,
  getJobHistoryDownloadUrl,
  statusBadgeClass,
  summarizeJobHistory,
} from './job-history-utils';

describe('job-history-utils', () => {
  it('formats durations', () => {
    expect(formatDuration('2026-01-01T00:00:00Z', '2026-01-01T00:00:45Z')).toBe('45s');
    expect(formatDuration('2026-01-01T00:00:00Z', '2026-01-01T00:02:05Z')).toBe('2m 5s');
    expect(formatDuration('2026-01-01T00:00:00Z')).toBe('—');
  });

  it('computes duration ms and badges', () => {
    expect(durationMs('2026-01-01T00:00:00Z', '2026-01-01T00:00:01Z')).toBe(1000);
    expect(statusBadgeClass('SUCCESS')).toContain('green');
    expect(statusBadgeClass('FAILED')).toContain('red');
    expect(formatDateTime(undefined)).toBe('—');
  });

  it('builds download URLs', () => {
    expect(getJobHistoryDownloadUrl('http://localhost/api/', 3, 9)).toBe(
      'http://localhost/api/jobs/3/history/9/download',
    );
  });

  it('summarizes and filters executions', () => {
    const executions = [
      { status: 'SUCCESS', startTime: '2026-01-01T00:00:00Z', endTime: '2026-01-01T00:00:02Z' },
      { status: 'FAILED', startTime: '2026-01-01T01:00:00Z', endTime: '2026-01-01T01:00:01Z' },
      { status: 'RUNNING', startTime: '2026-01-01T02:00:00Z' },
    ];

    const stats = summarizeJobHistory(executions);
    expect(stats.total).toBe(3);
    expect(stats.success).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.running).toBe(1);
    expect(stats.successRate).toBe(50);
    expect(stats.averageDurationMs).toBe(1500);

    expect(filterExecutionsByStatus(executions, 'FAILED')).toHaveLength(1);
    expect(filterExecutionsByStatus(executions, 'ALL')).toHaveLength(3);
  });
});
