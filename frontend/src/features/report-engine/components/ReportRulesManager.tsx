import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { apiClient } from '@/lib/api-client';

// === Types ===

interface Rule {
  id: number;
  name: string;
  description?: string;
}

interface ReportRuleMapping {
  id: number;
  reportId: number;
  ruleId: number;
  ruleName: string;
  columnName: string;
}

interface AddReportRulePayload {
  ruleId: number;
  columnName: string;
}

// === API Functions ===

async function fetchReportRules(reportId: number): Promise<ReportRuleMapping[]> {
  const { data } = await apiClient.get(`/reports/${reportId}/rules`);
  return data;
}

async function addReportRule(
  reportId: number,
  payload: AddReportRulePayload,
): Promise<ReportRuleMapping> {
  const { data } = await apiClient.post(`/reports/${reportId}/rules`, payload);
  return data;
}

async function removeReportRule(
  reportId: number,
  ruleId: number,
): Promise<void> {
  await apiClient.delete(`/reports/${reportId}/rules/${ruleId}`);
}

async function fetchAllRules(): Promise<Rule[]> {
  const { data } = await apiClient.get('/rules');
  return data;
}

// === Props ===

interface ReportRulesManagerProps {
  reportId: number;
}

// === Component ===

export function ReportRulesManager({ reportId }: ReportRulesManagerProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: reportRules = [], isLoading } = useQuery({
    queryKey: ['report-rules', reportId],
    queryFn: () => fetchReportRules(reportId),
    enabled: !!reportId,
  });

  const removeMutation = useMutation({
    mutationFn: (ruleId: number) => removeReportRule(reportId, ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['report-rules', reportId],
      });
      toast.success('Rule mapping removed');
    },
    onError: () => toast.error('Failed to remove rule mapping'),
  });

  const handleRemove = (mapping: ReportRuleMapping) => {
    if (window.confirm(`Remove rule "${mapping.ruleName}" from this report?`)) {
      removeMutation.mutate(mapping.ruleId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Loading rule mappings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-700">
            Rule Mappings ({reportRules.length})
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Link rules to this report and specify which column each rule filters on.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-1 text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Rule
        </button>
      </div>

      {/* Rules Table */}
      {reportRules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No rules linked to this report. Click &quot;Add Rule&quot; to associate a rule.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Rule Name
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">
                  Column Name
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reportRules.map((mapping) => (
                <tr key={mapping.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {mapping.ruleName}
                  </td>
                  <td className="px-4 py-2 font-mono text-gray-700">
                    {mapping.columnName}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => handleRemove(mapping)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Remove rule mapping"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Rule Form Modal */}
      {showForm && (
        <AddRuleFormModal
          reportId={reportId}
          existingRuleIds={reportRules.map((r) => r.ruleId)}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// === Add Rule Form Modal ===

interface AddRuleFormModalProps {
  reportId: number;
  existingRuleIds: number[];
  onClose: () => void;
}

function AddRuleFormModal({
  reportId,
  existingRuleIds,
  onClose,
}: AddRuleFormModalProps) {
  const queryClient = useQueryClient();

  const [selectedRuleId, setSelectedRuleId] = useState<number | ''>('');
  const [columnName, setColumnName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: allRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['rules'],
    queryFn: fetchAllRules,
  });

  // Filter out rules already linked to this report
  const availableRules = allRules.filter(
    (rule) => !existingRuleIds.includes(rule.id),
  );

  const addMutation = useMutation({
    mutationFn: (payload: AddReportRulePayload) =>
      addReportRule(reportId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['report-rules', reportId],
      });
      toast.success('Rule mapping added');
      onClose();
    },
    onError: () => toast.error('Failed to add rule mapping'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!selectedRuleId) {
      newErrors.ruleId = 'Please select a rule';
    }
    if (!columnName.trim()) {
      newErrors.columnName = 'Column name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    addMutation.mutate({
      ruleId: Number(selectedRuleId),
      columnName: columnName.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Add Rule Mapping
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rule Dropdown */}
          <div>
            <label className="label">Rule *</label>
            {rulesLoading ? (
              <div className="text-sm text-gray-400">Loading rules...</div>
            ) : availableRules.length === 0 ? (
              <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
                {allRules.length === 0
                  ? 'No rules have been defined yet. Create a rule first.'
                  : 'All available rules are already linked to this report.'}
              </div>
            ) : (
              <select
                className="input-field"
                value={selectedRuleId}
                onChange={(e) =>
                  setSelectedRuleId(
                    e.target.value ? Number(e.target.value) : '',
                  )
                }
              >
                <option value="">— Select a rule —</option>
                {availableRules.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.name}
                    {rule.description ? ` — ${rule.description}` : ''}
                  </option>
                ))}
              </select>
            )}
            {errors.ruleId && (
              <p className="mt-1 text-xs text-red-600">{errors.ruleId}</p>
            )}
          </div>

          {/* Column Name Input */}
          <div>
            <label className="label">Column Name *</label>
            <input
              className="input-field font-mono"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder="e.g. employees.region"
            />
            {errors.columnName && (
              <p className="mt-1 text-xs text-red-600">{errors.columnName}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">
              The database column that this rule will filter on (e.g.
              table.column or just column).
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={addMutation.isPending || availableRules.length === 0}
              className="btn-primary"
            >
              {addMutation.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
