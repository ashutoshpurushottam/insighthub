import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Play, Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';

import { LoadingSpinner, PageHeader } from '@/components/ui';
import { ErrorDisplay } from '@/features/reports/sql-editor/ErrorDisplay';
import { ResultPane } from '@/features/reports/sql-editor/ResultPane';
import { SplitPanel } from '@/features/reports/sql-editor/SplitPanel';
import { SqlEditor } from '@/features/reports/sql-editor/SqlEditor';
import { validateSql } from '@/features/reports/sql-editor/SqlValidator';
import { useSqlEditorStore } from '@/features/reports/sql-editor/useSqlEditorStore';
import { apiClient } from '@/lib/api-client';

import { DrillDownManager } from '../components/DrillDownManager';
import { ParameterManager } from '../components/ParameterManager';
import { ReportRulesManager } from '../components/ReportRulesManager';
import type { GuardrailsConfig, Report } from '../types';

// === Types ===

type TabId = 'general' | 'parameters' | 'rules' | 'drill-downs' | 'guardrails';

interface TabDefinition {
  id: TabId;
  label: string;
}

const TABS: TabDefinition[] = [
  { id: 'general', label: 'General' },
  { id: 'parameters', label: 'Parameters' },
  { id: 'rules', label: 'Rules' },
  { id: 'drill-downs', label: 'Drill-Downs' },
  { id: 'guardrails', label: 'Guardrails' },
];

interface ReportGroup {
  id: number;
  name: string;
}

interface Datasource {
  id: number;
  name: string;
}

interface GeneralFormState {
  name: string;
  description: string;
  contactPerson: string;
  reportGroupId: number | '';
  datasourceId: number | '';
  sqlSource: string;
  reportType: string;
  active: boolean;
  usesRules: boolean;
  defaultFormat: string;
}

interface GuardrailsFormState {
  maxRows: number | '';
  maxExportRows: number | '';
  maxDateRangeDays: number | '';
  executionTimeoutSeconds: number | '';
  maxConcurrentPerUser: number | '';
  maxResultSizeBytes: number | '';
}

// === API Functions ===

async function fetchReport(id: number): Promise<Report> {
  const { data } = await apiClient.get(`/reports/${id}`);
  return data;
}

async function createReport(payload: Partial<Report>): Promise<Report> {
  const { data } = await apiClient.post('/reports', payload);
  return data;
}

async function updateReport(id: number, payload: Partial<Report>): Promise<Report> {
  const { data } = await apiClient.put(`/reports/${id}`, payload);
  return data;
}

async function cloneReport(id: number): Promise<Report> {
  const { data } = await apiClient.post(`/reports/${id}/clone`);
  return data;
}

async function fetchReportGroups(): Promise<ReportGroup[]> {
  const { data } = await apiClient.get('/report-groups');
  return Array.isArray(data) ? data : data.data ?? [];
}

async function fetchDatasources(): Promise<Datasource[]> {
  const { data } = await apiClient.get('/datasources');
  return Array.isArray(data) ? data : data.data ?? [];
}

async function fetchReportGuardrails(reportId: number): Promise<GuardrailsConfig | null> {
  try {
    const { data } = await apiClient.get(`/reports/${reportId}/guardrails`);
    return data;
  } catch {
    return null;
  }
}

async function saveReportGuardrails(
  reportId: number,
  payload: Partial<GuardrailsConfig>,
): Promise<GuardrailsConfig> {
  const { data } = await apiClient.put(`/reports/${reportId}/guardrails`, payload);
  return data;
}

// === Component ===

export function ReportBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = !!id;
  const reportId = id ? Number(id) : undefined;

  const [activeTab, setActiveTab] = useState<TabId>('general');

  // General form state
  const [general, setGeneral] = useState<GeneralFormState>({
    name: '',
    description: '',
    contactPerson: '',
    reportGroupId: '',
    datasourceId: '',
    sqlSource: '',
    reportType: '',
    active: true,
    usesRules: false,
    defaultFormat: 'CSV',
  });

  // Guardrails form state
  const [guardrails, setGuardrails] = useState<GuardrailsFormState>({
    maxRows: '',
    maxExportRows: '',
    maxDateRangeDays: '',
    executionTimeoutSeconds: '',
    maxConcurrentPerUser: '',
    maxResultSizeBytes: '',
  });

  // Fetch existing report data when editing
  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => fetchReport(reportId!),
    enabled: isEditMode,
  });

  // Fetch report groups for dropdown
  const { data: reportGroups = [] } = useQuery({
    queryKey: ['report-groups'],
    queryFn: fetchReportGroups,
  });

  // Fetch datasources for dropdown
  const { data: datasources = [] } = useQuery({
    queryKey: ['datasources'],
    queryFn: fetchDatasources,
  });

  // Fetch per-report guardrails when editing
  const { data: existingGuardrails } = useQuery({
    queryKey: ['report-guardrails', reportId],
    queryFn: () => fetchReportGuardrails(reportId!),
    enabled: isEditMode,
  });

  // Populate form from fetched report
  useEffect(() => {
    if (report) {
      setGeneral({
        name: report.name ?? '',
        description: report.description ?? '',
        contactPerson: report.contactPerson ?? '',
        reportGroupId: report.reportGroupId ?? '',
        datasourceId: report.datasourceId ?? '',
        sqlSource: report.reportSource ?? '',
        reportType: report.reportType != null ? String(report.reportType) : '',
        active: report.active ?? true,
        usesRules: report.usesRules ?? false,
        defaultFormat: report.defaultReportFormat ?? 'CSV',
      });
    }
  }, [report]);

  // Populate guardrails form from fetched data
  useEffect(() => {
    if (existingGuardrails) {
      setGuardrails({
        maxRows: existingGuardrails.maxRows ?? '',
        maxExportRows: existingGuardrails.maxExportRows ?? '',
        maxDateRangeDays: existingGuardrails.maxDateRangeDays ?? '',
        executionTimeoutSeconds: existingGuardrails.executionTimeoutSeconds ?? '',
        maxConcurrentPerUser: existingGuardrails.maxConcurrentPerUser ?? '',
        maxResultSizeBytes: existingGuardrails.maxResultSizeBytes ?? '',
      });
    }
  }, [existingGuardrails]);

  // Save/Create mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Partial<Report> = {
        name: general.name.trim(),
        description: general.description.trim() || undefined,
        contactPerson: general.contactPerson.trim() || undefined,
        reportGroupId: general.reportGroupId ? Number(general.reportGroupId) : undefined,
        datasourceId: general.datasourceId ? Number(general.datasourceId) : undefined,
        reportSource: general.sqlSource,
        reportType: general.reportType ? Number(general.reportType) : 0,
        active: general.active,
        usesRules: general.usesRules,
        defaultReportFormat: general.defaultFormat || undefined,
      };

      if (isEditMode && reportId) {
        return updateReport(reportId, payload);
      }
      return createReport(payload);
    },
    onSuccess: async (savedReport) => {
      // Save guardrails if any values are provided
      const hasGuardrailValues = Object.values(guardrails).some((v) => v !== '');
      if (hasGuardrailValues && savedReport.id) {
        const guardrailPayload: Partial<GuardrailsConfig> = {};
        if (guardrails.maxRows !== '') guardrailPayload.maxRows = Number(guardrails.maxRows);
        if (guardrails.maxExportRows !== '') guardrailPayload.maxExportRows = Number(guardrails.maxExportRows);
        if (guardrails.maxDateRangeDays !== '') guardrailPayload.maxDateRangeDays = Number(guardrails.maxDateRangeDays);
        if (guardrails.executionTimeoutSeconds !== '') guardrailPayload.executionTimeoutSeconds = Number(guardrails.executionTimeoutSeconds);
        if (guardrails.maxConcurrentPerUser !== '') guardrailPayload.maxConcurrentPerUser = Number(guardrails.maxConcurrentPerUser);
        if (guardrails.maxResultSizeBytes !== '') guardrailPayload.maxResultSizeBytes = Number(guardrails.maxResultSizeBytes);

        try {
          await saveReportGuardrails(savedReport.id, guardrailPayload);
        } catch {
          toast.error('Report saved, but failed to save guardrails');
        }
      }

      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['report', savedReport.id] });
      toast.success(isEditMode ? 'Report updated' : 'Report created');

      if (!isEditMode) {
        navigate(`/reports/${savedReport.id}/edit`, { replace: true });
      }
    },
    onError: () => toast.error('Failed to save report'),
  });

  // Clone mutation
  const cloneMutation = useMutation({
    mutationFn: () => cloneReport(reportId!),
    onSuccess: (cloned) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(`Report cloned as "${cloned.name}"`);
      navigate(`/reports/${cloned.id}/edit`);
    },
    onError: () => toast.error('Failed to clone report'),
  });

  const handleSave = () => {
    if (!general.name.trim()) {
      toast.error('Report name is required');
      setActiveTab('general');
      return;
    }
    saveMutation.mutate();
  };

  const handleClone = () => {
    if (!reportId) return;
    cloneMutation.mutate();
  };

  if (isEditMode && reportLoading) {
    return <LoadingSpinner size="lg" className="mt-20" />;
  }

  return (
    <div>
      <PageHeader
        title={isEditMode ? `Edit Report: ${report?.name ?? ''}` : 'Create Report'}
        description={
          isEditMode
            ? 'Update report configuration, parameters, drill-downs, and guardrails'
            : 'Configure a new report with SQL source, parameters, and settings'
        }
        actions={
          <div className="flex items-center gap-2">
            {isEditMode && (
              <button
                type="button"
                onClick={handleClone}
                disabled={cloneMutation.isPending}
                className="btn-secondary inline-flex items-center gap-1"
              >
                <Copy className="h-4 w-4" />
                {cloneMutation.isPending ? 'Cloning...' : 'Clone'}
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="btn-primary inline-flex items-center gap-1"
            >
              <Save className="h-4 w-4" />
              {saveMutation.isPending
                ? 'Saving...'
                : isEditMode
                  ? 'Update'
                  : 'Save'}
            </button>
          </div>
        }
      />

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Report builder tabs">
          {TABS.map((tab) => {
            const isDisabled =
              !isEditMode && (tab.id === 'parameters' || tab.id === 'rules' || tab.id === 'drill-downs');
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                disabled={isDisabled}
                className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : isDisabled
                      ? 'cursor-not-allowed border-transparent text-gray-300'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'general' && (
          <GeneralTab
            form={general}
            onChange={setGeneral}
            reportGroups={reportGroups}
            datasources={datasources}
          />
        )}

        {activeTab === 'parameters' && reportId && (
          <ParameterManager reportId={reportId} />
        )}

        {activeTab === 'rules' && reportId && (
          <ReportRulesManager reportId={reportId} />
        )}

        {activeTab === 'drill-downs' && reportId && (
          <DrillDownManager reportId={reportId} />
        )}

        {activeTab === 'guardrails' && (
          <GuardrailsTab form={guardrails} onChange={setGuardrails} />
        )}
      </div>
    </div>
  );
}

// === General Tab ===

interface GeneralTabProps {
  form: GeneralFormState;
  onChange: (form: GeneralFormState) => void;
  reportGroups: ReportGroup[];
  datasources: Datasource[];
}

const REPORT_FORMATS = ['CSV', 'XLSX', 'PDF'];

function GeneralTab({ form, onChange, reportGroups, datasources }: GeneralTabProps) {
  const update = <K extends keyof GeneralFormState>(
    field: K,
    value: GeneralFormState[K],
  ) => {
    onChange({ ...form, [field]: value });
  };

  const {
    isExecuting,
    result,
    error,
    validationErrors,
    execute,
    setValidationErrors,
  } = useSqlEditorStore();

  const handleRun = useCallback(() => {
    if (!form.datasourceId || isExecuting) return;

    const errors = validateSql(form.sqlSource);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    execute(form.sqlSource, Number(form.datasourceId));
  }, [form.datasourceId, form.sqlSource, isExecuting, execute, setValidationErrors]);

  const isRunDisabled = !form.datasourceId || isExecuting;
  const runButtonLabel = isExecuting ? 'Running...' : 'Run';
  const tooltipText = !form.datasourceId
    ? 'Select a datasource to run queries'
    : undefined;

  const topContent = (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={handleRun}
          disabled={isRunDisabled}
          title={tooltipText}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
            isRunDisabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800'
          }`}
          aria-label={tooltipText ?? runButtonLabel}
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          {runButtonLabel}
        </button>
      </div>

      {/* SQL Editor */}
      <div className="flex-1 min-h-0">
        <SqlEditor
          value={form.sqlSource}
          onChange={(value) => update('sqlSource', value)}
          onExecute={handleRun}
          placeholder="SELECT * FROM ..."
        />
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="flex flex-col gap-1 px-3 py-2">
          {validationErrors.map((err) => (
            <ErrorDisplay
              key={err.type}
              message={err.message}
              type="validation"
            />
          ))}
        </div>
      )}
    </div>
  );

  const bottomContent = (
    <ResultPane isLoading={isExecuting} result={result} error={error} />
  );

  return (
    <div className="space-y-6">
      {/* Name & Contact Person */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="label">
            Report Name <span className="text-red-500">*</span>
          </label>
          <input
            className="input-field"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Monthly Sales Report"
          />
        </div>
        <div>
          <label className="label">Contact Person</label>
          <input
            className="input-field"
            value={form.contactPerson}
            onChange={(e) => update('contactPerson', e.target.value)}
            placeholder="John Doe"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="label">Description</label>
        <textarea
          className="input-field"
          rows={3}
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Brief description of what this report does..."
        />
      </div>

      {/* Report Group & Datasource */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="label">Report Group</label>
          <select
            className="input-field"
            value={form.reportGroupId}
            onChange={(e) =>
              update('reportGroupId', e.target.value ? Number(e.target.value) : '')
            }
          >
            <option value="">— No group —</option>
            {reportGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Datasource</label>
          <select
            className="input-field"
            value={form.datasourceId}
            onChange={(e) =>
              update('datasourceId', e.target.value ? Number(e.target.value) : '')
            }
          >
            <option value="">— Select datasource —</option>
            {datasources.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SQL Editor with Run button and Result Pane */}
      <div>
        <label className="label">SQL Source</label>
        <div style={{ height: '500px' }}>
          <SplitPanel topContent={topContent} bottomContent={bottomContent} />
        </div>
      </div>

      {/* Report Type, Default Format, Active Toggle, Uses Rules Toggle */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="label">Report Type</label>
          <input
            className="input-field"
            value={form.reportType}
            onChange={(e) => update('reportType', e.target.value)}
            placeholder="e.g. Tabular, Chart"
          />
        </div>
        <div>
          <label className="label">Default Format</label>
          <select
            className="input-field"
            value={form.defaultFormat}
            onChange={(e) => update('defaultFormat', e.target.value)}
          >
            {REPORT_FORMATS.map((fmt) => (
              <option key={fmt} value={fmt}>
                {fmt}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col justify-end gap-2 pb-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => update('active', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Active
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.usesRules}
              onChange={(e) => update('usesRules', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Uses Rules
          </label>
        </div>
      </div>
    </div>
  );
}

// === Guardrails Tab ===

interface GuardrailsTabProps {
  form: GuardrailsFormState;
  onChange: (form: GuardrailsFormState) => void;
}

function GuardrailsTab({ form, onChange }: GuardrailsTabProps) {
  const update = <K extends keyof GuardrailsFormState>(
    field: K,
    value: GuardrailsFormState[K],
  ) => {
    onChange({ ...form, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700">Per-Report Guardrails Override</h3>
        <p className="mt-1 text-xs text-gray-500">
          Override global guardrail defaults for this specific report. Leave blank to use the global
          setting.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="label">Max Rows</label>
          <input
            type="number"
            className="input-field"
            value={form.maxRows}
            onChange={(e) =>
              update('maxRows', e.target.value ? Number(e.target.value) : '')
            }
            placeholder="e.g. 10000"
            min={1}
          />
          <p className="mt-1 text-xs text-gray-400">
            Maximum rows returned in execution results.
          </p>
        </div>
        <div>
          <label className="label">Max Export Rows</label>
          <input
            type="number"
            className="input-field"
            value={form.maxExportRows}
            onChange={(e) =>
              update('maxExportRows', e.target.value ? Number(e.target.value) : '')
            }
            placeholder="e.g. 100000"
            min={1}
          />
          <p className="mt-1 text-xs text-gray-400">
            Maximum rows included in export files.
          </p>
        </div>
        <div>
          <label className="label">Max Date Range (Days)</label>
          <input
            type="number"
            className="input-field"
            value={form.maxDateRangeDays}
            onChange={(e) =>
              update('maxDateRangeDays', e.target.value ? Number(e.target.value) : '')
            }
            placeholder="e.g. 365"
            min={1}
          />
          <p className="mt-1 text-xs text-gray-400">
            Maximum allowed date range in days for date-pair parameters.
          </p>
        </div>
        <div>
          <label className="label">Timeout (Seconds)</label>
          <input
            type="number"
            className="input-field"
            value={form.executionTimeoutSeconds}
            onChange={(e) =>
              update(
                'executionTimeoutSeconds',
                e.target.value ? Number(e.target.value) : '',
              )
            }
            placeholder="e.g. 60"
            min={1}
          />
          <p className="mt-1 text-xs text-gray-400">
            Query execution timeout before cancellation.
          </p>
        </div>
        <div>
          <label className="label">Max Concurrent Per User</label>
          <input
            type="number"
            className="input-field"
            value={form.maxConcurrentPerUser}
            onChange={(e) =>
              update(
                'maxConcurrentPerUser',
                e.target.value ? Number(e.target.value) : '',
              )
            }
            placeholder="e.g. 3"
            min={1}
          />
          <p className="mt-1 text-xs text-gray-400">
            Maximum simultaneous executions per user.
          </p>
        </div>
        <div>
          <label className="label">Max Result Size (Bytes)</label>
          <input
            type="number"
            className="input-field"
            value={form.maxResultSizeBytes}
            onChange={(e) =>
              update(
                'maxResultSizeBytes',
                e.target.value ? Number(e.target.value) : '',
              )
            }
            placeholder="e.g. 52428800"
            min={1}
          />
          <p className="mt-1 text-xs text-gray-400">
            Maximum result set size in bytes (default 50 MB).
          </p>
        </div>
      </div>
    </div>
  );
}
