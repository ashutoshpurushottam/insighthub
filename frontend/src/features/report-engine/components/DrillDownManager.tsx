import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link2, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { apiClient } from '@/lib/api-client';

import type { DrillDownLink, DrillDownParamMapping } from '../types';

// === Interfaces ===

interface DrillDownManagerProps {
  reportId: number;
}

interface ReportSummary {
  id: number;
  name: string;
}

interface CreateDrillDownPayload {
  childReportId: number;
  triggerColumn: string;
  position: number;
  paramMappings: Omit<DrillDownParamMapping, 'id'>[];
}

// === API functions ===

async function fetchDrillDownLinks(reportId: number): Promise<DrillDownLink[]> {
  const { data } = await apiClient.get(`/reports/${reportId}/drill-downs`);
  return data;
}

async function createDrillDownLink(
  reportId: number,
  payload: CreateDrillDownPayload,
): Promise<DrillDownLink> {
  const { data } = await apiClient.post(
    `/reports/${reportId}/drill-downs`,
    payload,
  );
  return data;
}

async function deleteDrillDownLink(linkId: number): Promise<void> {
  await apiClient.delete(`/drill-downs/${linkId}`);
}

async function fetchReportsList(): Promise<ReportSummary[]> {
  const { data } = await apiClient.get('/reports');
  return data;
}

// === Component ===

export function DrillDownManager({ reportId }: DrillDownManagerProps) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const {
    data: drillDownLinks,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['drill-downs', reportId],
    queryFn: () => fetchDrillDownLinks(reportId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDrillDownLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drill-downs', reportId] });
      toast.success('Drill-down link deleted');
      setDeleteConfirmId(null);
    },
    onError: () => toast.error('Failed to delete drill-down link'),
  });

  if (isLoading) {
    return <LoadingSpinner className="py-8" />;
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        Failed to load drill-down links.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          Drill-Down Links
        </h3>
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="btn-primary inline-flex items-center gap-1 text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Link
        </button>
      </div>

      {/* Existing drill-down links list */}
      {!drillDownLinks || drillDownLinks.length === 0 ? (
        <EmptyState
          title="No drill-down links"
          description="Add a drill-down link to enable navigation from this report to child reports."
          icon={<Link2 className="h-12 w-12" />}
        />
      ) : (
        <div className="divide-y divide-gray-200 rounded-md border border-gray-200">
          {drillDownLinks.map((link) => (
            <DrillDownLinkRow
              key={link.id}
              link={link}
              isDeleting={deleteMutation.isPending && deleteConfirmId === link.id}
              showDeleteConfirm={deleteConfirmId === link.id}
              onDeleteClick={() => setDeleteConfirmId(link.id)}
              onDeleteConfirm={() => deleteMutation.mutate(link.id)}
              onDeleteCancel={() => setDeleteConfirmId(null)}
            />
          ))}
        </div>
      )}

      {/* Add form modal */}
      {showAddForm && (
        <AddDrillDownForm
          reportId={reportId}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

// === Drill-Down Link Row ===

interface DrillDownLinkRowProps {
  link: DrillDownLink;
  isDeleting: boolean;
  showDeleteConfirm: boolean;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

function DrillDownLinkRow({
  link,
  isDeleting,
  showDeleteConfirm,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: DrillDownLinkRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <span className="text-sm font-medium text-gray-900">
            {link.childReportName || `Report #${link.childReportId}`}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
          <span>
            Trigger: <code className="rounded bg-gray-100 px-1">{link.triggerColumn}</code>
          </span>
          {link.paramMappings.length > 0 && (
            <span>
              Mappings:{' '}
              {link.paramMappings
                .map((m) => `${m.parentColumnName} → ${m.childParamName}`)
                .join(', ')}
            </span>
          )}
        </div>
      </div>

      <div className="ml-4 flex-shrink-0">
        {showDeleteConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600">Delete?</span>
            <button
              type="button"
              onClick={onDeleteConfirm}
              disabled={isDeleting}
              className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Yes'}
            </button>
            <button
              type="button"
              onClick={onDeleteCancel}
              className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onDeleteClick}
            className="text-gray-400 hover:text-red-600"
            title="Delete drill-down link"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// === Add Drill-Down Form ===

interface AddDrillDownFormProps {
  reportId: number;
  onClose: () => void;
}

interface ParamMappingRow {
  parentColumnName: string;
  childParamName: string;
}

function AddDrillDownForm({ reportId, onClose }: AddDrillDownFormProps) {
  const queryClient = useQueryClient();
  const [childReportId, setChildReportId] = useState<number | ''>('');
  const [triggerColumn, setTriggerColumn] = useState('');
  const [paramMappings, setParamMappings] = useState<ParamMappingRow[]>([
    { parentColumnName: '', childParamName: '' },
  ]);

  const { data: reports } = useQuery({
    queryKey: ['reports'],
    queryFn: fetchReportsList,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateDrillDownPayload) =>
      createDrillDownLink(reportId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drill-downs', reportId] });
      toast.success('Drill-down link created');
      onClose();
    },
    onError: () => toast.error('Failed to create drill-down link'),
  });

  const handleAddMapping = () => {
    setParamMappings([...paramMappings, { parentColumnName: '', childParamName: '' }]);
  };

  const handleRemoveMapping = (index: number) => {
    setParamMappings(paramMappings.filter((_, i) => i !== index));
  };

  const handleMappingChange = (
    index: number,
    field: keyof ParamMappingRow,
    value: string,
  ) => {
    const updated = [...paramMappings];
    updated[index] = { ...updated[index], [field]: value };
    setParamMappings(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!childReportId || !triggerColumn.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Filter out empty mappings
    const validMappings = paramMappings.filter(
      (m) => m.parentColumnName.trim() && m.childParamName.trim(),
    );

    createMutation.mutate({
      childReportId: Number(childReportId),
      triggerColumn: triggerColumn.trim(),
      position: 0,
      paramMappings: validMappings,
    });
  };

  // Exclude current report from child report options
  const availableReports = reports?.filter((r) => r.id !== reportId) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Add Drill-Down Link
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Child Report Selection */}
          <div>
            <label className="label">
              Child Report <span className="text-red-500">*</span>
            </label>
            <select
              className="input-field"
              value={childReportId}
              onChange={(e) =>
                setChildReportId(e.target.value ? Number(e.target.value) : '')
              }
            >
              <option value="">Select a report...</option>
              {availableReports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Trigger Column */}
          <div>
            <label className="label">
              Trigger Column <span className="text-red-500">*</span>
            </label>
            <input
              className="input-field"
              placeholder="Column name that triggers drill-down"
              value={triggerColumn}
              onChange={(e) => setTriggerColumn(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              The result column whose cell clicks will open the child report.
            </p>
          </div>

          {/* Parameter Mappings */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label">Parameter Mappings</label>
              <button
                type="button"
                onClick={handleAddMapping}
                className="text-xs text-primary-600 hover:text-primary-700"
              >
                + Add mapping
              </button>
            </div>
            <p className="mb-2 text-xs text-gray-500">
              Map parent result columns to child report parameters.
            </p>
            <div className="space-y-2">
              {paramMappings.map((mapping, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    className="input-field flex-1"
                    placeholder="Parent column"
                    value={mapping.parentColumnName}
                    onChange={(e) =>
                      handleMappingChange(index, 'parentColumnName', e.target.value)
                    }
                  />
                  <span className="text-sm text-gray-400">→</span>
                  <input
                    className="input-field flex-1"
                    placeholder="Child param"
                    value={mapping.childParamName}
                    onChange={(e) =>
                      handleMappingChange(index, 'childParamName', e.target.value)
                    }
                  />
                  {paramMappings.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMapping(index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn-primary"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
