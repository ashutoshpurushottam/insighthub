import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { LoadingSpinner, PageHeader } from '@/components/ui';
import { apiClient } from '@/lib/api-client';

import type { GuardrailsConfig } from '../types';

// === API Functions ===

async function fetchGuardrails(): Promise<GuardrailsConfig> {
  const { data } = await apiClient.get<GuardrailsConfig>('/guardrails');
  return data;
}

async function updateGuardrails(config: GuardrailsConfig): Promise<GuardrailsConfig> {
  const { data } = await apiClient.put<GuardrailsConfig>('/guardrails', config);
  return data;
}

// === Types ===

interface FormState {
  maxRows: string;
  maxExportRows: string;
  maxDateRangeDays: string;
  executionTimeoutSeconds: string;
  maxConcurrentPerUser: string;
  maxResultSizeBytes: string;
}

interface ValidationErrors {
  maxRows?: string;
  maxExportRows?: string;
  maxDateRangeDays?: string;
  executionTimeoutSeconds?: string;
  maxConcurrentPerUser?: string;
  maxResultSizeBytes?: string;
}

// === Helpers ===

function configToFormState(config: GuardrailsConfig): FormState {
  return {
    maxRows: String(config.maxRows),
    maxExportRows: String(config.maxExportRows),
    maxDateRangeDays: String(config.maxDateRangeDays),
    executionTimeoutSeconds: String(config.executionTimeoutSeconds),
    maxConcurrentPerUser: String(config.maxConcurrentPerUser),
    maxResultSizeBytes: String(config.maxResultSizeBytes),
  };
}

function validateForm(state: FormState): ValidationErrors {
  const errors: ValidationErrors = {};
  const fields: (keyof FormState)[] = [
    'maxRows',
    'maxExportRows',
    'maxDateRangeDays',
    'executionTimeoutSeconds',
    'maxConcurrentPerUser',
    'maxResultSizeBytes',
  ];

  for (const field of fields) {
    const value = state[field].trim();
    if (!value) {
      errors[field] = 'This field is required';
    } else {
      const num = Number(value);
      if (!Number.isInteger(num) || num <= 0) {
        errors[field] = 'Must be a positive integer';
      }
    }
  }

  return errors;
}

// === Component ===

export function GuardrailsSettingsPage() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>({
    maxRows: '',
    maxExportRows: '',
    maxDateRangeDays: '',
    executionTimeoutSeconds: '',
    maxConcurrentPerUser: '',
    maxResultSizeBytes: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});

  const {
    data: config,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ['guardrails'],
    queryFn: fetchGuardrails,
  });

  // Populate form when data loads
  useEffect(() => {
    if (config) {
      setForm(configToFormState(config));
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: updateGuardrails,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardrails'] });
      toast.success('Guardrails settings saved');
    },
    onError: () => {
      toast.error('Failed to save guardrails settings');
    },
  });

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const payload: GuardrailsConfig = {
      id: config?.id,
      maxRows: Number(form.maxRows),
      maxExportRows: Number(form.maxExportRows),
      maxDateRangeDays: Number(form.maxDateRangeDays),
      executionTimeoutSeconds: Number(form.executionTimeoutSeconds),
      maxConcurrentPerUser: Number(form.maxConcurrentPerUser),
      maxResultSizeBytes: Number(form.maxResultSizeBytes),
    };

    saveMutation.mutate(payload);
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" className="mt-20" />;
  }

  if (fetchError) {
    return (
      <div className="mt-20 text-center">
        <p className="text-lg text-red-600">
          Failed to load guardrails settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guardrails Settings"
        description="Configure global execution limits and safety guardrails for all reports."
      />

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="flex items-center gap-2 border-b border-gray-200 pb-4">
          <ShieldCheck className="h-5 w-5 text-blue-600" />
          <h2 className="text-sm font-semibold text-gray-800">
            Global Execution Limits
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <GuardrailField
            label="Max Rows (Display)"
            description="Maximum rows returned for in-app display"
            value={form.maxRows}
            error={errors.maxRows}
            onChange={(v) => handleChange('maxRows', v)}
          />
          <GuardrailField
            label="Max Export Rows"
            description="Maximum rows allowed in exported files"
            value={form.maxExportRows}
            error={errors.maxExportRows}
            onChange={(v) => handleChange('maxExportRows', v)}
          />
          <GuardrailField
            label="Max Date Range (Days)"
            description="Maximum allowed date range span in days"
            value={form.maxDateRangeDays}
            error={errors.maxDateRangeDays}
            onChange={(v) => handleChange('maxDateRangeDays', v)}
          />
          <GuardrailField
            label="Execution Timeout (Seconds)"
            description="Maximum query execution time before cancellation"
            value={form.executionTimeoutSeconds}
            error={errors.executionTimeoutSeconds}
            onChange={(v) => handleChange('executionTimeoutSeconds', v)}
          />
          <GuardrailField
            label="Max Concurrent Per User"
            description="Maximum simultaneous report executions per user"
            value={form.maxConcurrentPerUser}
            error={errors.maxConcurrentPerUser}
            onChange={(v) => handleChange('maxConcurrentPerUser', v)}
          />
          <GuardrailField
            label="Max Result Size (Bytes)"
            description="Maximum result payload size in bytes"
            value={form.maxResultSizeBytes}
            error={errors.maxResultSizeBytes}
            onChange={(v) => handleChange('maxResultSizeBytes', v)}
          />
        </div>

        <div className="flex justify-end border-t border-gray-200 pt-4">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="btn-primary inline-flex items-center gap-2"
          >
            {saveMutation.isPending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

// === Field Component ===

interface GuardrailFieldProps {
  label: string;
  description: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

function GuardrailField({
  label,
  description,
  value,
  error,
  onChange,
}: GuardrailFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <p className="text-xs text-gray-500">{description}</p>
      <input
        type="number"
        min="1"
        step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
        }`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
