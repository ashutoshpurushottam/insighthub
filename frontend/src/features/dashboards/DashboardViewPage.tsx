import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { LoadingSpinner, PageHeader } from '@/components/ui';
import { runReport, type RunReportResult } from '@/features/reports/api';

import { fetchDashboardById, type DashboardItem } from './api';
import { useEffect, useState } from 'react';

export function DashboardViewPage() {
  const { id } = useParams<{ id: string }>();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', id],
    queryFn: () => fetchDashboardById(Number(id)),
    enabled: !!id,
  });

  if (isLoading || !dashboard) {
    return <LoadingSpinner size="lg" className="mt-20" />;
  }

  return (
    <div>
      <PageHeader
        title={dashboard.name}
        description={dashboard.description}
      />
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${dashboard.columnsCount}, 1fr)`,
        }}
      >
        {dashboard.items.map((item) => (
          <DashboardCard key={item.id} item={item} colSpan={item.colSpan} />
        ))}
      </div>
    </div>
  );
}

function DashboardCard({ item, colSpan }: { item: DashboardItem; colSpan: number }) {
  const [result, setResult] = useState<RunReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runReport(item.reportId, {})
      .then(setResult)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [item.reportId]);

  return (
    <div
      className="card overflow-hidden"
      style={{ gridColumn: `span ${colSpan}` }}
    >
      <h3 className="mb-3 text-sm font-semibold text-gray-700">
        {item.title || item.reportName}
      </h3>

      {loading && <LoadingSpinner size="sm" />}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {result && result.rows.length > 0 && (
        <div className="max-h-60 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                {result.columns.map((col) => (
                  <th key={col} className="px-3 py-1.5 text-left font-medium text-gray-600">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.rows.slice(0, 20).map((row, idx) => (
                <tr key={idx}>
                  {result.columns.map((col) => (
                    <td key={col} className="whitespace-nowrap px-3 py-1 text-gray-500">
                      {row[col] != null ? String(row[col]) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {result.rowCount > 20 && (
            <p className="mt-1 px-3 text-xs text-gray-400">
              Showing 20 of {result.rowCount} rows
            </p>
          )}
        </div>
      )}

      {result && result.rows.length === 0 && (
        <p className="text-xs text-gray-400">No data</p>
      )}
    </div>
  );
}
