import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { EmptyState, LoadingSpinner, PageHeader } from '@/components/ui';

import {
  deleteReportGroup,
  fetchReportGroups,
  type ReportGroup,
} from './api';
import { ReportGroupFormModal } from './ReportGroupFormModal';

export function ReportGroupsPage() {
  const [modalGroup, setModalGroup] = useState<
    ReportGroup | null | undefined
  >(undefined);
  const queryClient = useQueryClient();

  const {
    data: groups,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['report-groups'],
    queryFn: fetchReportGroups,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReportGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-groups'] });
      toast.success('Report group deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete'),
  });

  const handleDelete = (group: ReportGroup) => {
    if (confirm(`Delete group "${group.name}"?`)) {
      deleteMutation.mutate(group.id);
    }
  };

  return (
    <div>
      <PageHeader
        title="Report Groups"
        description="Organize reports into categories"
        actions={
          <button className="btn-primary" onClick={() => setModalGroup(null)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Group
          </button>
        }
      />

      {isLoading && <LoadingSpinner size="lg" className="mt-12" />}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Failed to load report groups.
        </div>
      )}

      {!isLoading && !error && (!groups || groups.length === 0) && (
        <EmptyState
          title="No report groups"
          description="Create groups to organize your reports."
          icon={<FolderOpen className="h-12 w-12" />}
          action={
            <button
              className="btn-primary"
              onClick={() => setModalGroup(null)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Group
            </button>
          }
        />
      )}

      {groups && groups.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div key={group.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary-50 p-2">
                    <FolderOpen className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="mt-0.5 text-sm text-gray-500">
                        {group.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setModalGroup(group)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-primary-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(group)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4 border-t border-gray-100 pt-3">
                <span className="text-sm text-gray-500">
                  {group.reportCount}{' '}
                  {group.reportCount === 1 ? 'report' : 'reports'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalGroup !== undefined && (
        <ReportGroupFormModal
          group={modalGroup}
          onClose={() => setModalGroup(undefined)}
        />
      )}
    </div>
  );
}
