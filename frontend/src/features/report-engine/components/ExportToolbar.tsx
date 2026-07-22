import { Download, FileSpreadsheet, FileText } from 'lucide-react';

import { LoadingSpinner } from '@/components/ui';

import type { ExportFormat } from '../hooks/useExport';

interface ExportToolbarProps {
  /** Whether the report has been executed at least once */
  hasResults: boolean;
  /** Loading state per format */
  loading: Record<ExportFormat, boolean>;
  /** Handler for CSV export */
  onExportCsv: () => void;
  /** Handler for XLSX export */
  onExportXlsx: () => void;
  /** Handler for PDF export */
  onExportPdf: () => void;
}

/**
 * Export toolbar with CSV, XLSX, and PDF buttons.
 * Buttons are disabled until report has been executed at least once.
 * Shows loading spinner on the active export button.
 */
export function ExportToolbar({
  hasResults,
  loading,
  onExportCsv,
  onExportXlsx,
  onExportPdf,
}: ExportToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-500">Export:</span>

      <ExportButton
        label="CSV"
        icon={<FileText className="h-4 w-4" />}
        disabled={!hasResults}
        loading={loading.csv}
        onClick={onExportCsv}
      />
      <ExportButton
        label="XLSX"
        icon={<FileSpreadsheet className="h-4 w-4" />}
        disabled={!hasResults}
        loading={loading.xlsx}
        onClick={onExportXlsx}
      />
      <ExportButton
        label="PDF"
        icon={<Download className="h-4 w-4" />}
        disabled={!hasResults}
        loading={loading.pdf}
        onClick={onExportPdf}
      />
    </div>
  );
}

// === Internal Button Component ===

interface ExportButtonProps {
  label: string;
  icon: React.ReactNode;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}

function ExportButton({ label, icon, disabled, loading, onClick }: ExportButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      title={disabled ? 'Run the report first to enable export' : `Export as ${label}`}
    >
      {loading ? <LoadingSpinner size="sm" /> : icon}
      <span>{label}</span>
    </button>
  );
}
