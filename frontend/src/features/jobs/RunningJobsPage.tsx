import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Clock, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

import { EmptyState, LoadingSpinner, PageHeader } from '@/components/ui';

import { cancelJob, fetchRunningJobs } from './api';

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

/** Live-updating duration component that ticks every second. */
function LiveDuration({ startTime }: { startTime: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const start = new Date(startTime).getTime();
  const diffMs = now - start;

  if (diffMs < 0) return <span>0s</span>;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return <span>{seconds}s</span>;

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60)
    return (
      <span>
        {minutes}m {remainingSeconds}s
      </span>
    );

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return (
    <span>
      {hours}h {remainingMinutes}m
    </span>
  );
}

export function RunningJobsPage() {
  const queryClient = useQueryClient();

  const {
    data: runningJobs,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['jobs-running'],
    queryFn: fetchRunningJobs,
    refetchInterval: 10000,
  });

  const cancelMutation = useMutation({
    mutationFn: (jobId: number) => cancelJob(jobId),
    onSuccess: () => {
      toast.success('Job cancelled');
      queryClient.invalidateQueries({ queryKey: ['jobs-running'] });
    },
    onError: () => {
      toast.error('Failed to cancel job');
    },
  });

  return (
    <div>
      <PageHeader
        title="Running Jobs"
        description="Currently executing jobs. Auto-refreshes every 10 seconds."
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
          Failed to load running jobs.
        </div>
      )}

      {!isLoading && !error && (!runningJobs || runningJobs.length === 0) && (
        <EmptyState
          title="No running jobs"
          description="There are no jobs currently executing."
          icon={<Loader2 className="h-12 w-12" />}
        />
      )}

      {runningJobs && runningJobs.length > 0 && (
        <div className="card overflow-hidden p-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Job Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Started At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Duration
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {runningJobs.map((execution) => (
                <tr key={execution.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      {execution.jobName ?? `Job #${execution.jobId}`}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      {formatDateTime(execution.startTime)}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    <LiveDuration startTime={execution.startTime} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => cancelMutation.mutate(execution.jobId)}
                      disabled={cancelMutation.isPending}
                      className="inline-flex items-center gap-1 rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                      title="Cancel job"
                    >
                      {cancelMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      Cancel
                    </button>
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
