import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { JobsPage } from './JobsPage';

const fetchJobs = vi.fn();

vi.mock('./api', () => ({
  fetchJobs: () => fetchJobs(),
  deleteJob: vi.fn(),
  runJob: vi.fn(),
  JOB_TYPES: ['PUBLISH', 'EMAIL_ATTACHMENT'],
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
        <JobsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('JobsPage', () => {
  beforeEach(() => {
    fetchJobs.mockReset();
  });

  it('shows empty state when there are no jobs', async () => {
    fetchJobs.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no job/i)).toBeInTheDocument();
    });
  });

  it('lists jobs', async () => {
    fetchJobs.mockResolvedValue([
      {
        id: 1,
        name: 'Nightly publish',
        jobType: 'PUBLISH',
        active: true,
        reportName: 'Sales',
      },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Nightly publish')).toBeInTheDocument();
    });
  });
});
