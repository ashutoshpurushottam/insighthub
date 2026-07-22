import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { EmptyState, LoadingSpinner, PageHeader } from '@/components/ui';

import {
  deleteDatasource,
  fetchDatasources,
  testDatasourceConnection,
  type Datasource,
} from './api';
import { DatasourceFormModal } from './DatasourceFormModal';

export function DatasourcesPage() {
  const [modalDs, setModalDs] = useState<Datasource | null | undefined>(
    undefined,
  );
  const [testingId, setTestingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const {
    data: datasources,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['datasources'],
    queryFn: fetchDatasources,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDatasource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasources'] });
      toast.success('Datasource deleted');
    },
    onError: () => toast.error('Failed to delete datasource'),
  });

  const handleTest = async (id: number) => {
    setTestingId(id);
    try {
      const result = await testDatasourceConnection(id);
      if (result.success) {
        toast.success(`Connection OK (${result.elapsedMs}ms)`);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Test failed');
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = (ds: Datasource) => {
    if (confirm(`Delete datasource "${ds.name}"?`)) {
      deleteMutation.mutate(ds.id);
    }
  };

  return (
    <div>
      <PageHeader
        title="Datasources"
        description="Manage database connections for reports"
        actions={
          <button className="btn-primary" onClick={() => setModalDs(null)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Datasource
          </button>
        }
      />

      {isLoading && <LoadingSpinner size="lg" className="mt-12" />}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Failed to load datasources.
        </div>
      )}

      {!isLoading && !error && (!datasources || datasources.length === 0) && (
        <EmptyState
          title="No datasources configured"
          description="Add a database connection to start creating reports."
          icon={<Database className="h-12 w-12" />}
          action={
            <button className="btn-primary" onClick={() => setModalDs(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Datasource
            </button>
          }
        />
      )}

      {datasources && datasources.length > 0 && (
        <div className="card overflow-hidden p-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  URL
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
              {datasources.map((ds) => (
                <tr key={ds.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-gray-400" />
                      {ds.name}
                    </div>
                    {ds.description && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {ds.description}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {ds.databaseType || '—'}
                  </td>
                  <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-500">
                    <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                      {ds.url || '—'}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        ds.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {ds.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => handleTest(ds.id)}
                      disabled={testingId === ds.id}
                      className="mr-2 text-green-600 hover:text-green-800"
                      title="Test Connection"
                    >
                      <Zap
                        className={`h-4 w-4 ${testingId === ds.id ? 'animate-pulse' : ''}`}
                      />
                    </button>
                    <button
                      onClick={() => setModalDs(ds)}
                      className="mr-2 text-primary-600 hover:text-primary-800"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ds)}
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

      {modalDs !== undefined && (
        <DatasourceFormModal
          datasource={modalDs}
          onClose={() => setModalDs(undefined)}
        />
      )}
    </div>
  );
}
