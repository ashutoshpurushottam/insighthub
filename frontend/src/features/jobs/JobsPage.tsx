import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, History, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { EmptyState, LoadingSpinner, PageHeader } from '@/components/ui';

import { deleteJob, fetchJobs, runJob, type Job } from './api';
import { JobFormModal } from './JobFormModal';

export function JobsPage() {
  const [formJob, setFormJob] = useState<Job | null | undefined>(undefined);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job deleted');
    },
    onError: () => toast.error('Failed to delete job'),
  });

  const runMutation = useMutation({
    mutationFn: runJob,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      if (result.success) toast.success(result.message || 'Job triggered');
      else toast.error(result.message || 'Job run failed');
    },
    onError: () => toast.error('Failed to run job'),
  });

  const handleDelete = (job: Job) => {
    if (confirm(`Delete job "${job.name}"?`)) {
      deleteMutation.mutate(job.id);
    }
  };

  const formatJobType = (type: string) =>
    type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div>
      <PageHeader
        title="Jobs"
        description="Schedule and manage automated report execution"
        actions={
          <button className="btn-primary" onClick={() => setFormJob(null)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Job
          </button>
        }
      />

      {isLoading && <LoadingSpinner size="lg" className="mt-12" />}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">Failed to load jobs.</div>
      )}

      {!isLoading && !error && (!jobs || jobs.length === 0) && (
        <EmptyState
          title="No jobs scheduled"
          description="Create a job to automate report delivery."
          icon={<Clock className="h-12 w-12" />}
        />
      )}

      {jobs && jobs.length > 0 && (
        <div className="card overflow-hidden p-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Report
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Last Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{job.name}</div>
                    {job.description && (
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{job.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {job.reportName || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {formatJobType(job.jobType)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {job.scheduleName ? (
                      <div>
                        <div>{job.scheduleName}</div>
                        <code className="text-xs text-gray-400">{job.cronExpression}</code>
                      </div>
                    ) : job.cronExpression ? (
                      <code className="text-xs text-gray-500">{job.cronExpression}</code>
                    ) : (
                      <span className="text-xs text-gray-400">Manual</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        job.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {job.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        job.lastRunStatus === 'SUCCESS'
                          ? 'bg-green-100 text-green-800'
                          : job.lastRunStatus === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : job.lastRunStatus === 'RUNNING'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {job.lastRunStatus || 'Never'}
                    </span>
                    {job.lastRunAt && (
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(job.lastRunAt).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => navigate(`/jobs/${job.id}/edit`)}
                      className="mr-2 text-primary-600 hover:text-primary-800"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => runMutation.mutate(job.id)}
                      disabled={runMutation.isPending}
                      className="mr-2 text-green-600 hover:text-green-800"
                      title="Run Now"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/jobs/${job.id}/history`)}
                      className="mr-2 text-blue-600 hover:text-blue-800"
                      title="History"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(job)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formJob !== undefined && (
        <JobFormModal job={formJob} onClose={() => setFormJob(undefined)} />
      )}
    </div>
  );
}
