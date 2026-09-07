import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DatasourcesPage } from './DatasourcesPage';

const fetchDatasources = vi.fn();

vi.mock('./api', () => ({
  fetchDatasources: () => fetchDatasources(),
  deleteDatasource: vi.fn(),
  testDatasourceConnection: vi.fn(),
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
        <DatasourcesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DatasourcesPage', () => {
  beforeEach(() => {
    fetchDatasources.mockReset();
  });

  it('shows empty state when there are no datasources', async () => {
    fetchDatasources.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no datasource/i)).toBeInTheDocument();
    });
  });

  it('lists datasources', async () => {
    fetchDatasources.mockResolvedValue([
      {
        id: 1,
        name: 'Demo DB',
        databaseType: 'H2',
        url: 'jdbc:h2:mem:test',
        active: true,
      },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Demo DB')).toBeInTheDocument();
    });
  });
});
