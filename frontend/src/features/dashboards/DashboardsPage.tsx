import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { EmptyState, LoadingSpinner, PageHeader } from '@/components/ui';

import { deleteDashboard, fetchDashboards, type Dashboard } from './api';
import { DashboardFormModal } from './DashboardFormModal';

export function DashboardsPage() {
  const [formDash, setFormDash] = useState<Dashboard | null | undefined>(undefined);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: dashboards, isLoading, error } = useQuery({
    queryKey: ['dashboards'],
    queryFn: fetchDashboards,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDashboard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success('Dashboard deleted');
    },
  });

  return (
    <div>
      <PageHeader
        title="Dashboards"
        description="Multi-report views"
        actions={
          <button className="btn-primary" onClick={() => setFormDash(null)}>
            <Plus className="mr-2 h-4 w-4" />
            New Dashboard
          </button>
        }
      />

      {isLoading && <LoadingSpinner size="lg" className="mt-12" />}
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">Failed to load.</div>}

      {!isLoading && !error && (!dashboards || dashboards.length === 0) && (
        <EmptyState title="No dashboards" icon={<LayoutDashboard className="h-12 w-12" />} />
      )}

      {dashboards && dashboards.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((d) => (
            <div key={d.id} className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/dashboards/${d.id}`)}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{d.name}</h3>
                  {d.description && <p className="mt-1 text-sm text-gray-500">{d.description}</p>}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${d.name}"?`)) deleteMutation.mutate(d.id); }}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex gap-2 text-xs text-gray-500">
                <span>{d.items.length} reports</span>
                <span>•</span>
                <span>{d.columnsCount} columns</span>
                {d.autoRefreshSeconds > 0 && <><span>•</span><span>⟳ {d.autoRefreshSeconds}s</span></>}
              </div>
            </div>
          ))}
        </div>
      )}

      {formDash !== undefined && (
        <DashboardFormModal dashboard={formDash} onClose={() => setFormDash(undefined)} />
      )}
    </div>
  );
}
