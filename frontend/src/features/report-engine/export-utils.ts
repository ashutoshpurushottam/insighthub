export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json' | 'xml';

const CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  json: 'application/json',
  xml: 'application/xml',
};

const EXTENSIONS: Record<ExportFormat, string> = {
  csv: 'csv',
  xlsx: 'xlsx',
  pdf: 'pdf',
  json: 'json',
  xml: 'xml',
};

/**
 * MIME type for a given export format.
 */
export function getExportContentType(format: ExportFormat): string {
  return CONTENT_TYPES[format];
}

/**
 * File extension for a given export format.
 */
export function getExportExtension(format: ExportFormat): string {
  return EXTENSIONS[format];
}

/**
 * Sanitize a report name for use in a download filename.
 */
export function sanitizeFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 180);

  return cleaned || 'report';
}

/**
 * Build a fallback download filename when Content-Disposition is absent.
 */
export function buildExportFilename(
  reportName: string | undefined,
  format: ExportFormat,
  timestamp: Date = new Date(),
): string {
  const base = sanitizeFilename(reportName || 'report');
  const stamp = formatTimestampForFilename(timestamp);
  return `${base}_${stamp}.${getExportExtension(format)}`;
}

/**
 * Parse filename from a Content-Disposition header value.
 * Returns null when the header does not contain a usable filename.
 */
export function parseContentDispositionFilename(
  contentDisposition: string | undefined | null,
): string | null {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/['"]/g, ''));
    } catch {
      return utf8Match[1].trim().replace(/['"]/g, '');
    }
  }

  const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
  if (match?.[1]) {
    return match[1].replace(/['"]/g, '').trim() || null;
  }

  return null;
}

/**
 * Resolve the download filename preferring Content-Disposition, then fallback.
 */
export function resolveExportFilename(
  contentDisposition: string | undefined | null,
  reportName: string | undefined,
  format: ExportFormat,
  timestamp?: Date,
): string {
  return (
    parseContentDispositionFilename(contentDisposition) ??
    buildExportFilename(reportName, format, timestamp)
  );
}

/**
 * Format a cell value for CSV/table export display.
 */
export function formatExportCellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Escape a CSV field (RFC 4180 style).
 */
export function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convert columns + rows into a CSV string.
 */
export function rowsToCsv(
  columns: string[],
  rows: Record<string, unknown>[],
): string {
  const header = columns.map(escapeCsvField).join(',');
  const body = rows
    .map((row) =>
      columns.map((col) => escapeCsvField(formatExportCellValue(row[col]))).join(','),
    )
    .join('\n');
  return body ? `${header}\n${body}` : header;
}

/**
 * Human-readable label for an export format.
 */
export function getExportFormatLabel(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return 'CSV';
    case 'xlsx':
      return 'Excel (XLSX)';
    case 'pdf':
      return 'PDF';
    case 'json':
      return 'JSON';
    case 'xml':
      return 'XML';
  }
}

function formatTimestampForFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}
