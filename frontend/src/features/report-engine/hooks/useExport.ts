import { saveAs } from 'file-saver';
import { useCallback, useState } from 'react';

import { apiClient } from '@/lib/api-client';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

interface ExportState {
  csv: boolean;
  xlsx: boolean;
  pdf: boolean;
}

interface UseExportOptions {
  reportId: number;
}

/**
 * Hook for triggering file downloads from the export endpoints.
 * POSTs to the export endpoint with current params and uses file-saver
 * to trigger a browser download from the blob response.
 */
export function useExport({ reportId }: UseExportOptions) {
  const [loading, setLoading] = useState<ExportState>({
    csv: false,
    xlsx: false,
    pdf: false,
  });
  const [error, setError] = useState<string | null>(null);

  const exportReport = useCallback(
    async (
      format: ExportFormat,
      params: Record<string, string | string[]>,
      reportName?: string,
    ) => {
      setLoading((prev) => ({ ...prev, [format]: true }));
      setError(null);

      try {
        const response = await apiClient.post(
          `/reports/${reportId}/export/${format}`,
          { params },
          { responseType: 'blob' },
        );

        // Determine filename from Content-Disposition header or fallback
        const contentDisposition = response.headers?.['content-disposition'];
        let filename = `${reportName || 'report'}.${format}`;

        if (contentDisposition) {
          const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (match?.[1]) {
            filename = match[1].replace(/['"]/g, '');
          }
        }

        // Trigger browser download
        const blob = new Blob([response.data], {
          type: getContentType(format),
        });
        saveAs(blob, filename);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Export failed. Please try again.';
        setError(message);
      } finally {
        setLoading((prev) => ({ ...prev, [format]: false }));
      }
    },
    [reportId],
  );

  const exportCsv = useCallback(
    (params: Record<string, string | string[]>, reportName?: string) =>
      exportReport('csv', params, reportName),
    [exportReport],
  );

  const exportXlsx = useCallback(
    (params: Record<string, string | string[]>, reportName?: string) =>
      exportReport('xlsx', params, reportName),
    [exportReport],
  );

  const exportPdf = useCallback(
    (params: Record<string, string | string[]>, reportName?: string) =>
      exportReport('pdf', params, reportName),
    [exportReport],
  );

  return {
    /** Export as CSV */
    exportCsv,
    /** Export as XLSX */
    exportXlsx,
    /** Export as PDF */
    exportPdf,
    /** Generic export by format */
    exportReport,
    /** Loading state per format */
    loading,
    /** Whether any export is currently in progress */
    isExporting: loading.csv || loading.xlsx || loading.pdf,
    /** Last error message (cleared on next attempt) */
    error,
  };
}

function getContentType(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return 'text/csv';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'pdf':
      return 'application/pdf';
  }
}
