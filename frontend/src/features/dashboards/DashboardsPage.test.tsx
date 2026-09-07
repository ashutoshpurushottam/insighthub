import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DashboardsPage } from './DashboardsPage';

const fetchDashboards = vi.fn();

vi.mock('./api', () => ({
  fetchDashboards: () => fetchDashboards(),
  deleteDashboard: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardsPage', () => {
  beforeEach(() => {
    fetchDashboards.mockReset();
  });

  it('shows empty state when there are no dashboards', async () => {
    fetchDashboards.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no dashboard/i)).toBeInTheDocument();
    });
  });

  it('lists dashboards', async () => {
    fetchDashboards.mockResolvedValue([
      {
        id: 1,
        name: 'Ops Board',
        columnsCount: 2,
        active: true,
        items: [],
        layoutType: 'GRID',
        autoRefreshSeconds: 0,
      },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Ops Board')).toBeInTheDocument();
    });
  });
});
