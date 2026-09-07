import { describe, it, expect } from 'vitest';

import {
  buildExportFilename,
  escapeCsvField,
  formatExportCellValue,
  getExportContentType,
  getExportExtension,
  getExportFormatLabel,
  parseContentDispositionFilename,
  resolveExportFilename,
  rowsToCsv,
  sanitizeFilename,
} from './export-utils';

describe('export-utils', () => {
  it('returns content types and labels', () => {
    expect(getExportContentType('csv')).toBe('text/csv');
    expect(getExportContentType('pdf')).toBe('application/pdf');
    expect(getExportFormatLabel('xlsx')).toContain('Excel');
  });

  it('returns file extensions for each export format', () => {
    expect(getExportExtension('csv')).toBe('csv');
    expect(getExportExtension('xlsx')).toBe('xlsx');
    expect(getExportExtension('pdf')).toBe('pdf');
    expect(getExportExtension('json')).toBe('json');
    expect(getExportExtension('xml')).toBe('xml');
  });

  it('sanitizes filenames', () => {
    expect(sanitizeFilename('My Report / Q1')).toBe('My_Report_Q1');
    expect(sanitizeFilename('   ')).toBe('report');
  });

  it('builds fallback filenames with timestamps', () => {
    const name = buildExportFilename('Sales', 'csv', new Date('2026-01-02T03:04:05'));
    expect(name).toMatch(/^Sales_20260102_030405\.csv$/);
  });

  it('parses Content-Disposition filenames', () => {
    expect(parseContentDispositionFilename('attachment; filename="out.csv"')).toBe(
      'out.csv',
    );
    expect(
      parseContentDispositionFilename("attachment; filename*=UTF-8''data%20set.pdf"),
    ).toBe('data set.pdf');
    expect(parseContentDispositionFilename(null)).toBeNull();
  });

  it('resolves filename preferring Content-Disposition', () => {
    expect(
      resolveExportFilename('attachment; filename="prefer.csv"', 'ignored', 'csv'),
    ).toBe('prefer.csv');
  });

  it('formats and escapes CSV fields', () => {
    expect(formatExportCellValue(null)).toBe('');
    expect(formatExportCellValue(true)).toBe('true');
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  it('serializes rows to CSV', () => {
    const csv = rowsToCsv(['name', 'qty'], [{ name: 'A', qty: 1 }, { name: 'B,C', qty: 2 }]);
    expect(csv).toBe('name,qty\nA,1\n"B,C",2');
  });
});
