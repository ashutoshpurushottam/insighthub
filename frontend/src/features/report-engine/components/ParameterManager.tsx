import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Edit2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { apiClient } from '@/lib/api-client';

import type {
  LovOption,
  LovType,
  Parameter,
  ParameterType,
} from '../types';

// === API Functions ===

async function fetchParameters(reportId: number): Promise<Parameter[]> {
  const { data } = await apiClient.get(`/reports/${reportId}/parameters`);
  return data;
}

async function createParameter(
  reportId: number,
  payload: ParameterFormData,
): Promise<Parameter> {
  const { data } = await apiClient.post(
    `/reports/${reportId}/parameters`,
    payload,
  );
  return data;
}

async function updateParameter(
  id: number,
  payload: ParameterFormData,
): Promise<Parameter> {
  const { data } = await apiClient.put(`/parameters/${id}`, payload);
  return data;
}

async function deleteParameter(id: number): Promise<void> {
  await apiClient.delete(`/parameters/${id}`);
}

// === Interfaces ===

const PARAMETER_TYPES: ParameterType[] = [
  'TEXT',
  'NUMBER',
  'DATE',
  'DATETIME',
  'BOOLEAN',
  'DROPDOWN',
  'DATERANGE',
];

const LOV_TYPES: LovType[] = ['DYNAMIC', 'STATIC'];

interface ParameterFormData {
  name: string;
  label: string;
  type: ParameterType;
  defaultValue: string;
  required: boolean;
  position: number;
  lovType?: LovType | null;
  lovQuery?: string;
  lovStaticValues?: LovOption[];
  parentParamId?: number | null;
  multiValue: boolean;
  hidden: boolean;
  allowNull: boolean;
  fromParameterName?: string;
  toParameterName?: string;
}

interface ParameterManagerProps {
  reportId: number;
}

interface StaticValueEntry {
  value: string;
  label: string;
}

// === Component ===

export function ParameterManager({ reportId }: ParameterManagerProps) {
  const queryClient = useQueryClient();
  const [editingParam, setEditingParam] = useState<Parameter | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: parameters = [], isLoading } = useQuery({
    queryKey: ['report-parameters', reportId],
    queryFn: () => fetchParameters(reportId),
    enabled: !!reportId,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteParameter,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['report-parameters', reportId],
      });
      toast.success('Parameter deleted');
    },
    onError: () => toast.error('Failed to delete parameter'),
  });

  const handleEdit = (param: Parameter) => {
    setEditingParam(param);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingParam(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingParam(null);
  };

  const handleDelete = (param: Parameter) => {
    if (window.confirm(`Delete parameter "${param.name}"?`)) {
      deleteMutation.mutate(param.id);
    }
  };

  const handleMoveUp = (param: Parameter) => {
    const sorted = [...parameters].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((p) => p.id === param.id);
    if (idx <= 0) return;
    const prev = sorted[idx - 1];
    // Swap positions
    swapPositions(param, prev);
  };

  const handleMoveDown = (param: Parameter) => {
    const sorted = [...parameters].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((p) => p.id === param.id);
    if (idx < 0 || idx >= sorted.length - 1) return;
    const next = sorted[idx + 1];
    swapPositions(param, next);
  };

  const swapPositions = async (paramA: Parameter, paramB: Parameter) => {
    try {
      await updateParameter(paramA.id, {
        name: paramA.name,
        label: paramA.label,
        type: paramA.type,
        defaultValue: paramA.defaultValue ?? '',
        required: paramA.required,
        position: paramB.position,
        lovType: paramA.lovType ?? null,
        lovQuery: paramA.lovQuery,
        lovStaticValues: paramA.lovStaticValues,
        parentParamId: paramA.parentParamId ?? null,
        multiValue: paramA.multiValue,
        hidden: paramA.hidden,
        allowNull: paramA.allowNull,
        fromParameterName: paramA.fromParameterName,
        toParameterName: paramA.toParameterName,
      });
      await updateParameter(paramB.id, {
        name: paramB.name,
        label: paramB.label,
        type: paramB.type,
        defaultValue: paramB.defaultValue ?? '',
        required: paramB.required,
        position: paramA.position,
        lovType: paramB.lovType ?? null,
        lovQuery: paramB.lovQuery,
        lovStaticValues: paramB.lovStaticValues,
        parentParamId: paramB.parentParamId ?? null,
        multiValue: paramB.multiValue,
        hidden: paramB.hidden,
        allowNull: paramB.allowNull,
        fromParameterName: paramB.fromParameterName,
        toParameterName: paramB.toParameterName,
      });
      queryClient.invalidateQueries({
        queryKey: ['report-parameters', reportId],
      });
    } catch {
      toast.error('Failed to reorder parameters');
    }
  };

  const sortedParams = [...parameters].sort(
    (a, b) => a.position - b.position,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-gray-500">Loading parameters...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          Parameters ({parameters.length})
        </h3>
        <button onClick={handleAdd} className="btn-primary flex items-center gap-1 text-sm">
          <Plus className="h-4 w-4" />
          Add Parameter
        </button>
      </div>

      {/* Parameter Table */}
      {sortedParams.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          No parameters defined. Click "Add Parameter" to create one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">
                  Pos
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">
                  Name
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">
                  Label
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">
                  Type
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">
                  Default
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">
                  Required
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">
                  Multi
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">
                  Hidden
                </th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">
                  Allow Null
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">
                  LOV
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedParams.map((param, idx) => (
                <tr key={param.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500">{param.position}</td>
                  <td className="px-3 py-2 font-mono text-gray-900">
                    {param.name}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{param.label}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {param.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {param.defaultValue || '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {param.required ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {param.multiValue ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {param.hidden ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {param.allowNull ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {param.lovType ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleMoveUp(param)}
                        disabled={idx === 0}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                        title="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(param)}
                        disabled={idx === sortedParams.length - 1}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-30"
                        title="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(param)}
                        className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(param)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
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

      {/* Add/Edit Form Modal */}
      {showForm && (
        <ParameterFormModal
          reportId={reportId}
          parameter={editingParam}
          parameters={parameters}
          nextPosition={
            parameters.length > 0
              ? Math.max(...parameters.map((p) => p.position)) + 1
              : 1
          }
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}

// === Form Modal ===

interface ParameterFormModalProps {
  reportId: number;
  parameter: Parameter | null;
  parameters: Parameter[];
  nextPosition: number;
  onClose: () => void;
}

function ParameterFormModal({
  reportId,
  parameter,
  parameters,
  nextPosition,
  onClose,
}: ParameterFormModalProps) {
  const isEdit = !!parameter;
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState(parameter?.name ?? '');
  const [label, setLabel] = useState(parameter?.label ?? '');
  const [type, setType] = useState<ParameterType>(parameter?.type ?? 'TEXT');
  const [defaultValue, setDefaultValue] = useState(
    parameter?.defaultValue ?? '',
  );
  const [required, setRequired] = useState(parameter?.required ?? false);
  const [position, setPosition] = useState(parameter?.position ?? nextPosition);
  const [multiValue, setMultiValue] = useState(parameter?.multiValue ?? false);
  const [hidden, setHidden] = useState(parameter?.hidden ?? false);
  const [allowNull, setAllowNull] = useState(parameter?.allowNull ?? false);
  const [fromParameterName, setFromParameterName] = useState(
    parameter?.fromParameterName ?? '',
  );
  const [toParameterName, setToParameterName] = useState(
    parameter?.toParameterName ?? '',
  );
  const [parentParamId, setParentParamId] = useState<number | null>(
    parameter?.parentParamId ?? null,
  );

  // LOV state
  const [lovType, setLovType] = useState<LovType | null>(
    parameter?.lovType ?? null,
  );
  const [lovQuery, setLovQuery] = useState(parameter?.lovQuery ?? '');
  const [staticValues, setStaticValues] = useState<StaticValueEntry[]>(
    parameter?.lovStaticValues ?? [],
  );

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!label.trim()) newErrors.label = 'Label is required';
    if (type === 'DROPDOWN' && !lovType) {
      newErrors.lovType = 'LOV type is required for DROPDOWN parameters';
    }
    if (lovType === 'DYNAMIC' && !lovQuery.trim()) {
      newErrors.lovQuery = 'LOV query is required for dynamic LOV';
    }
    if (
      lovType === 'STATIC' &&
      staticValues.filter((v) => v.value.trim()).length === 0
    ) {
      newErrors.staticValues =
        'At least one static value is required for static LOV';
    }
    if (type === 'DATERANGE') {
      if (!fromParameterName.trim()) {
        newErrors.fromParameterName = 'From Parameter Name is required for DATERANGE';
      }
      if (!toParameterName.trim()) {
        newErrors.toParameterName = 'To Parameter Name is required for DATERANGE';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, label, type, lovType, lovQuery, staticValues, fromParameterName, toParameterName]);

  const createMutation = useMutation({
    mutationFn: (data: ParameterFormData) => createParameter(reportId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['report-parameters', reportId],
      });
      toast.success('Parameter created');
      onClose();
    },
    onError: () => toast.error('Failed to create parameter'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: ParameterFormData) =>
      updateParameter(parameter!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['report-parameters', reportId],
      });
      toast.success('Parameter updated');
      onClose();
    },
    onError: () => toast.error('Failed to update parameter'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const formData: ParameterFormData = {
      name: name.trim(),
      label: label.trim(),
      type,
      defaultValue: defaultValue.trim(),
      required,
      position,
      lovType: type === 'DROPDOWN' ? lovType : null,
      lovQuery: lovType === 'DYNAMIC' ? lovQuery : undefined,
      lovStaticValues:
        lovType === 'STATIC'
          ? staticValues.filter((v) => v.value.trim())
          : undefined,
      parentParamId: parentParamId || null,
      multiValue,
      hidden,
      allowNull,
      fromParameterName: type === 'DATERANGE' ? fromParameterName.trim() : undefined,
      toParameterName: type === 'DATERANGE' ? toParameterName.trim() : undefined,
    };

    if (isEdit) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Available parents: other parameters of type DROPDOWN (exclude self)
  const availableParents = parameters.filter(
    (p) => p.type === 'DROPDOWN' && p.id !== parameter?.id,
  );

  // Reset LOV settings when type changes away from DROPDOWN
  useEffect(() => {
    if (type !== 'DROPDOWN') {
      setLovType(null);
      setLovQuery('');
      setStaticValues([]);
      setParentParamId(null);
    }
    if (type !== 'DATERANGE') {
      setFromParameterName('');
      setToParameterName('');
    }
  }, [type]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Parameter' : 'Add Parameter'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name & Label */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input
                className="input-field font-mono"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="param_name"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="label">Label *</label>
              <input
                className="input-field"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Display Label"
              />
              {errors.label && (
                <p className="mt-1 text-xs text-red-600">{errors.label}</p>
              )}
            </div>
          </div>

          {/* Type & Position */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Type *</label>
              <select
                className="input-field"
                value={type}
                onChange={(e) => setType(e.target.value as ParameterType)}
              >
                {PARAMETER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Default Value</label>
              <input
                className="input-field"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                placeholder={
                  type === 'BOOLEAN'
                    ? 'true / false'
                    : type === 'DATE'
                      ? 'CURDATE() or yyyy-MM-dd'
                      : ''
                }
              />
            </div>
            <div>
              <label className="label">Position</label>
              <input
                type="number"
                className="input-field"
                value={position}
                onChange={(e) => setPosition(Number(e.target.value))}
                min={1}
              />
            </div>
          </div>

          {/* Required & Multi-value & Hidden & Allow Null */}
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={multiValue}
                onChange={(e) => setMultiValue(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Multi-value (allows multiple selections)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={hidden}
                onChange={(e) => setHidden(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Hidden
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={allowNull}
                onChange={(e) => setAllowNull(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Allow Null
            </label>
          </div>

          {/* Date Range Configuration — only for DATERANGE type */}
          {type === 'DATERANGE' && (
            <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
              <legend className="px-2 text-sm font-medium text-gray-600">
                Date Range Configuration
              </legend>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">From Parameter Name *</label>
                  <input
                    className="input-field font-mono"
                    value={fromParameterName}
                    onChange={(e) => setFromParameterName(e.target.value)}
                    placeholder="start_date"
                  />
                  {errors.fromParameterName && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.fromParameterName}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    The parameter that receives the from-date value.
                  </p>
                </div>
                <div>
                  <label className="label">To Parameter Name *</label>
                  <input
                    className="input-field font-mono"
                    value={toParameterName}
                    onChange={(e) => setToParameterName(e.target.value)}
                    placeholder="end_date"
                  />
                  {errors.toParameterName && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.toParameterName}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    The parameter that receives the to-date value.
                  </p>
                </div>
              </div>
            </fieldset>
          )}

          {/* LOV Configuration — only for DROPDOWN type */}
          {type === 'DROPDOWN' && (
            <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
              <legend className="px-2 text-sm font-medium text-gray-600">
                LOV Configuration
              </legend>

              {/* LOV Type */}
              <div>
                <label className="label">LOV Type *</label>
                <select
                  className="input-field"
                  value={lovType ?? ''}
                  onChange={(e) =>
                    setLovType(
                      e.target.value ? (e.target.value as LovType) : null,
                    )
                  }
                >
                  <option value="">Select LOV type...</option>
                  {LOV_TYPES.map((lt) => (
                    <option key={lt} value={lt}>
                      {lt === 'DYNAMIC'
                        ? 'Dynamic (SQL Query)'
                        : 'Static (Fixed Values)'}
                    </option>
                  ))}
                </select>
                {errors.lovType && (
                  <p className="mt-1 text-xs text-red-600">{errors.lovType}</p>
                )}
              </div>

              {/* Dynamic LOV — Query */}
              {lovType === 'DYNAMIC' && (
                <div>
                  <label className="label">LOV Query</label>
                  <textarea
                    className="input-field font-mono text-sm"
                    rows={4}
                    value={lovQuery}
                    onChange={(e) => setLovQuery(e.target.value)}
                    placeholder="SELECT id AS value, name AS label FROM lookup_table WHERE ..."
                  />
                  {errors.lovQuery && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.lovQuery}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    Query must return &quot;value&quot; and &quot;label&quot;
                    columns. Use :parentValue for cascading.
                  </p>
                </div>
              )}

              {/* Static LOV — Value/Label pairs editor */}
              {lovType === 'STATIC' && (
                <StaticValuesEditor
                  values={staticValues}
                  onChange={setStaticValues}
                  error={errors.staticValues}
                />
              )}

              {/* Cascading Parent */}
              <div>
                <label className="label">Cascading Parent</label>
                <select
                  className="input-field"
                  value={parentParamId ?? ''}
                  onChange={(e) =>
                    setParentParamId(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                >
                  <option value="">None (independent)</option>
                  {availableParents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.name})
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  If selected, this dropdown&apos;s options will refresh when the
                  parent value changes.
                </p>
              </div>
            </fieldset>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary"
            >
              {isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// === Static Values Editor Sub-component ===

interface StaticValuesEditorProps {
  values: StaticValueEntry[];
  onChange: (values: StaticValueEntry[]) => void;
  error?: string;
}

function StaticValuesEditor({
  values,
  onChange,
  error,
}: StaticValuesEditorProps) {
  const handleAdd = () => {
    onChange([...values, { value: '', label: '' }]);
  };

  const handleRemove = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const handleChange = (
    index: number,
    field: 'value' | 'label',
    val: string,
  ) => {
    const updated = values.map((item, i) =>
      i === index ? { ...item, [field]: val } : item,
    );
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      <label className="label">Static Values</label>
      {values.length === 0 && (
        <p className="text-xs text-gray-400">
          No values defined. Add at least one value/label pair.
        </p>
      )}
      <div className="space-y-2">
        {values.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              className="input-field flex-1"
              placeholder="Value"
              value={entry.value}
              onChange={(e) => handleChange(idx, 'value', e.target.value)}
            />
            <input
              className="input-field flex-1"
              placeholder="Label"
              value={entry.label}
              onChange={(e) => handleChange(idx, 'label', e.target.value)}
            />
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
              title="Remove"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
      >
        <Plus className="h-3 w-3" />
        Add Value
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
