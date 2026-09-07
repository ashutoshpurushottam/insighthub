import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useExport } from './useExport';
import { useParameterLov } from './useParameterLov';
import { useReportExecution } from './useReportExecution';

const { postMock, getMock, saveAsMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMock: vi.fn(),
  saveAsMock: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: postMock,
    get: getMock,
  },
}));

vi.mock('file-saver', () => ({
  saveAs: saveAsMock,
}));

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe('useExport', () => {
  beforeEach(() => {
    postMock.mockReset();
    saveAsMock.mockReset();
  });

  it('downloads a CSV blob and clears loading state', async () => {
    postMock.mockResolvedValue({
      data: new Blob(['a,b']),
      headers: { 'content-disposition': 'attachment; filename="sales.csv"' },
    });

    const { result } = renderHook(() => useExport({ reportId: 11 }));

    await act(async () => {
      await result.current.exportCsv({ region: 'West' }, 'Sales');
    });

    expect(postMock).toHaveBeenCalledWith(
      '/reports/11/export/csv',
      { params: { region: 'West' } },
      { responseType: 'blob' },
    );
    expect(saveAsMock).toHaveBeenCalled();
    expect(saveAsMock.mock.calls[0][1]).toBe('sales.csv');
    expect(result.current.loading.csv).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('captures export errors', async () => {
    postMock.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useExport({ reportId: 11 }));

    await act(async () => {
      await result.current.exportPdf({}, 'Sales');
    });

    expect(result.current.error).toMatch(/boom|Export failed/i);
    expect(result.current.loading.pdf).toBe(false);
  });
});

describe('useParameterLov', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('fetches LOV options with parent value', async () => {
    getMock.mockResolvedValue({
      data: [{ value: '1', label: 'West' }],
    });

    const { result } = renderHook(
      () => useParameterLov({ parameterId: 5, parentValue: 'US' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getMock).toHaveBeenCalledWith('/parameters/5/lov', {
      params: { parentValue: 'US' },
    });
    expect(result.current.data).toEqual([{ value: '1', label: 'West' }]);
  });

  it('stays idle when disabled', async () => {
    const { result } = renderHook(
      () => useParameterLov({ parameterId: 5, enabled: false }),
      { wrapper: createWrapper() },
    );

    expect(result.current.fetchStatus).toBe('idle');
    expect(getMock).not.toHaveBeenCalled();
  });
});

describe('useReportExecution', () => {
  beforeEach(() => {
    postMock.mockReset();
  });

  it('executes a report and stores the result', async () => {
    postMock.mockResolvedValue({
      data: {
        columns: ['id'],
        rows: [{ id: 1 }],
        pagination: { page: 1, pageSize: 25, totalRows: 1, totalPages: 1 },
        executionMs: 12,
        truncated: false,
        drillDownLinks: [],
      },
    });

    const { result } = renderHook(() => useReportExecution({ reportId: 42 }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.execute({ region: 'East' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(postMock).toHaveBeenCalledWith(
      '/reports/42/execute',
      expect.objectContaining({
        params: { region: 'East' },
        page: 1,
        pageSize: 25,
      }),
    );
    expect(result.current.data?.rows).toEqual([{ id: 1 }]);
  });

  it('re-executes on page change using last params', async () => {
    postMock.mockResolvedValue({
      data: {
        columns: ['id'],
        rows: [],
        pagination: { page: 2, pageSize: 25, totalRows: 0, totalPages: 1 },
        executionMs: 5,
        truncated: false,
        drillDownLinks: [],
      },
    });

    const { result } = renderHook(() => useReportExecution({ reportId: 42 }), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.execute({ region: 'East' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      result.current.handlePageChange(2);
    });

    await waitFor(() =>
      expect(postMock).toHaveBeenLastCalledWith(
        '/reports/42/execute',
        expect.objectContaining({
          params: { region: 'East' },
          page: 2,
        }),
      ),
    );
    expect(result.current.page).toBe(2);
  });
});
