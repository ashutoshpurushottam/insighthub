import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DrillDownManager } from './DrillDownManager';

const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: vi.fn(),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function renderManager() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <DrillDownManager reportId={10} />
    </QueryClientProvider>,
  );
}

describe('DrillDownManager', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockDelete.mockReset();
  });

  it('shows empty state when there are no drill-downs', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('drill-downs')) return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });

    renderManager();

    await waitFor(() => {
      expect(screen.getByText('No drill-down links')).toBeInTheDocument();
    });
  });

  it('lists existing drill-down links', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('drill-downs')) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              childReportId: 2,
              childReportName: 'Orders Detail',
              triggerColumn: 'order_id',
              position: 1,
              paramMappings: [],
            },
          ],
        });
      }
      return Promise.resolve({ data: [{ id: 2, name: 'Orders Detail' }] });
    });

    renderManager();

    await waitFor(() => {
      expect(screen.getByText(/Orders Detail/i)).toBeInTheDocument();
      expect(screen.getByText(/order_id/i)).toBeInTheDocument();
    });
  });

  it('shows an error message when loading fails', async () => {
    mockGet.mockRejectedValue(new Error('network'));
    renderManager();

    await waitFor(() => {
      expect(screen.getByText(/failed to load drill-down/i)).toBeInTheDocument();
    });
  });
});
