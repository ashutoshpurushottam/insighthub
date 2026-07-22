import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { EmptyState, LoadingSpinner, PageHeader } from '@/components/ui';

import { deleteReport, fetchReports } from './api';

export function ReportsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const {
    data: reports,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['reports'],
    queryFn: fetchReports,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Report deleted');
    },
    onError: () => toast.error('Failed to delete report'),
  });

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Create and manage SQL reports"
        actions={
          <button
            className="btn-primary"
            onClick={() => navigate('/reports/new')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Report
          </button>
        }
      />

      {isLoading && <LoadingSpinner size="lg" className="mt-12" />}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Failed to load reports.
        </div>
      )}

      {!isLoading && !error && (!reports || reports.length === 0) && (
        <EmptyState
          title="No reports yet"
          description="Create your first report with a SQL query."
          icon={<BarChart3 className="h-12 w-12" />}
          action={
            <button
              className="btn-primary"
              onClick={() => navigate('/reports/new')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Report
            </button>
          }
        />
      )}

      {reports && reports.length > 0 && (
        <div className="card overflow-hidden p-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Group
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Datasource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">
                      {report.name}
                    </div>
                    {report.shortDescription && (
                      <div className="text-xs text-gray-500">
                        {report.shortDescription}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {report.reportGroupName || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {report.datasourceName || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        report.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {report.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => navigate(`/reports/${report.id}/run`)}
                      className="mr-2 text-green-600 hover:text-green-800"
                      title="Run"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => navigate(`/reports/${report.id}/edit`)}
                      className="mr-2 text-primary-600 hover:text-primary-800"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${report.name}"?`))
                          deleteMutation.mutate(report.id);
                      }}
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

    </div>
  );
}
