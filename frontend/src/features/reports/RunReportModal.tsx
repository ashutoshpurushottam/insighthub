import { useMutation, useQuery } from '@tanstack/react-query';
import { BarChart3, Play, Table2, X } from 'lucide-react';
import { useState } from 'react';

import { LoadingSpinner } from '@/components/ui';

import {
  fetchReportParameters,
  runReport,
  type Parameter,
  type Report,
  type RunReportResult,
} from './api';
import { ChartView, type ChartType } from './ChartView';

interface Props {
  report: Report;
  onClose: () => void;
}

export function RunReportModal({ report, onClose }: Props) {
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [chartType, setChartType] = useState<ChartType>('bar');

  const { data: parameters } = useQuery({
    queryKey: ['report-parameters', report.id],
    queryFn: () => fetchReportParameters(report.id),
  });

  // Initialize defaults when params load
  if (parameters && Object.keys(paramValues).length === 0) {
    const defaults: Record<string, string> = {};
    parameters.forEach((p) => {
      const resolved = (p as any).resolvedDefaultValue ?? p.defaultValue;
      if (resolved) defaults[p.name] = resolved;
    });
    if (Object.keys(defaults).length > 0) setParamValues(defaults);
  }

  const mutation = useMutation({
    mutationFn: () => runReport(report.id, paramValues),
  });

  const result: RunReportResult | undefined = mutation.data;

  const setParam = (name: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {report.name}
            </h2>
            <p className="text-sm text-gray-500">
              {report.datasourceName || 'No datasource'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="btn-primary"
            >
              <Play className="mr-2 h-4 w-4" />
              {mutation.isPending ? 'Running...' : 'Run'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Parameters */}
        {parameters && parameters.length > 0 && (
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <div className="flex flex-wrap gap-4">
              {parameters.map((param) => (
                <ParameterInput
                  key={param.id}
                  param={param}
                  value={paramValues[param.name] ?? ''}
                  onChange={(val) => setParam(param.name, val)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div
          className="overflow-auto p-6"
          style={{ maxHeight: 'calc(90vh - 160px)' }}
        >
          {mutation.isPending && (
            <LoadingSpinner size="lg" className="py-12" />
          )}

          {mutation.isError && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {(mutation.error as Error).message || 'Failed to run report'}
            </div>
          )}

          {result && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{result.rowCount} rows</span>
                  <span>•</span>
                  <span>{result.executionMs}ms</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`rounded p-1.5 ${viewMode === 'table' ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Table view"
                  >
                    <Table2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('chart')}
                    className={`rounded p-1.5 ${viewMode === 'chart' ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Chart view"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </button>
                  {viewMode === 'chart' && (
                    <select
                      value={chartType}
                      onChange={(e) => setChartType(e.target.value as ChartType)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                    >
                      <option value="bar">Bar</option>
                      <option value="line">Line</option>
                      <option value="area">Area</option>
                      <option value="pie">Pie</option>
                    </select>
                  )}
                </div>
              </div>

              {result.rows.length === 0 ? (
                <p className="py-8 text-center text-gray-500">
                  Query returned no data.
                </p>
              ) : viewMode === 'chart' ? (
                <ChartView data={result} chartType={chartType} />
              ) : (
                <div className="overflow-x-auto rounded-md border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {result.columns.map((col) => (
                          <th
                            key={col}
                            className="whitespace-nowrap px-4 py-2 text-left font-medium text-gray-700"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          {result.columns.map((col) => (
                            <td
                              key={col}
                              className="whitespace-nowrap px-4 py-2 text-gray-600"
                            >
                              {row[col] != null ? String(row[col]) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!mutation.isPending && !mutation.isError && !result && (
            <p className="py-12 text-center text-gray-400">
              {parameters && parameters.length > 0
                ? 'Fill in parameters above and click "Run".'
                : 'Click "Run" to execute this report.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ParameterInput({
  param,
  value,
  onChange,
}: {
  param: Parameter;
  value: string;
  onChange: (val: string) => void;
}) {
  const label = param.label || param.name;

  switch (param.paramType) {
    case 'BOOLEAN':
      return (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
            className="rounded border-gray-300 text-primary-600"
          />
          {label}
        </label>
      );
    case 'NUMBER':
      return (
        <div className="min-w-[140px]">
          <label className="text-xs font-medium text-gray-600">{label}</label>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={param.placeholder ?? ''}
            className="input-field mt-1"
          />
        </div>
      );
    case 'DATE':
      return (
        <div className="min-w-[160px]">
          <label className="text-xs font-medium text-gray-600">{label}</label>
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="input-field mt-1"
          />
        </div>
      );
    default:
      return (
        <div className="min-w-[160px]">
          <label className="text-xs font-medium text-gray-600">
            {label}
            {param.required && <span className="text-red-500"> *</span>}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={param.placeholder ?? ''}
            className="input-field mt-1"
          />
        </div>
      );
  }
}
