import { saveAs } from 'file-saver';
import { useCallback, useState } from 'react';

import { apiClient } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/api-errors';

import {
  getExportContentType,
  resolveExportFilename,
  type ExportFormat as UtilExportFormat,
} from '../export-utils';

export type ExportFormat = Extract<UtilExportFormat, 'csv' | 'xlsx' | 'pdf'>;

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

        const contentDisposition = response.headers?.['content-disposition'];
        const filename = resolveExportFilename(
          contentDisposition,
          reportName,
          format,
        );

        const blob = new Blob([response.data], {
          type: getExportContentType(format),
        });
        saveAs(blob, filename);
      } catch (err) {
        setError(getErrorMessage(err, 'Export failed. Please try again.'));
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
    exportCsv,
    exportXlsx,
    exportPdf,
    exportReport,
    loading,
    isExporting: loading.csv || loading.xlsx || loading.pdf,
    error,
  };
}
