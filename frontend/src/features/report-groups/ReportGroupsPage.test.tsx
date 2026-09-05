import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ReportGroupsPage } from './ReportGroupsPage';

const fetchReportGroups = vi.fn();

vi.mock('./api', () => ({
  fetchReportGroups: () => fetchReportGroups(),
  deleteReportGroup: vi.fn(),
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
        <ReportGroupsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ReportGroupsPage', () => {
  beforeEach(() => {
    fetchReportGroups.mockReset();
  });

  it('shows empty state when there are no groups', async () => {
    fetchReportGroups.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no (report )?group/i)).toBeInTheDocument();
    });
  });

  it('lists report groups', async () => {
    fetchReportGroups.mockResolvedValue([
      { id: 1, name: 'Finance', description: 'Finance reports' },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Finance')).toBeInTheDocument();
    });
  });
});
