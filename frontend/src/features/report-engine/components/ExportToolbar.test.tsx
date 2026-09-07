import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ExportToolbar } from './ExportToolbar';

describe('ExportToolbar', () => {
  const loading = { csv: false, xlsx: false, pdf: false };

  it('renders CSV, XLSX, and PDF buttons', () => {
    render(
      <ExportToolbar
        hasResults
        loading={loading}
        onExportCsv={vi.fn()}
        onExportXlsx={vi.fn()}
        onExportPdf={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /xlsx/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pdf/i })).toBeInTheDocument();
  });

  it('disables buttons when there are no results', () => {
    render(
      <ExportToolbar
        hasResults={false}
        loading={loading}
        onExportCsv={vi.fn()}
        onExportXlsx={vi.fn()}
        onExportPdf={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /csv/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /xlsx/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /pdf/i })).toBeDisabled();
  });

  it('invokes handlers when enabled buttons are clicked', () => {
    const onExportCsv = vi.fn();
    const onExportXlsx = vi.fn();
    const onExportPdf = vi.fn();

    render(
      <ExportToolbar
        hasResults
        loading={loading}
        onExportCsv={onExportCsv}
        onExportXlsx={onExportXlsx}
        onExportPdf={onExportPdf}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /csv/i }));
    fireEvent.click(screen.getByRole('button', { name: /xlsx/i }));
    fireEvent.click(screen.getByRole('button', { name: /pdf/i }));

    expect(onExportCsv).toHaveBeenCalledOnce();
    expect(onExportXlsx).toHaveBeenCalledOnce();
    expect(onExportPdf).toHaveBeenCalledOnce();
  });

  it('disables the active format while loading', () => {
    render(
      <ExportToolbar
        hasResults
        loading={{ csv: true, xlsx: false, pdf: false }}
        onExportCsv={vi.fn()}
        onExportXlsx={vi.fn()}
        onExportPdf={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /csv/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /xlsx/i })).not.toBeDisabled();
  });
});
