import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AccessRightsPage } from './AccessRightsPage';

vi.mock('./api', () => ({
  getUserReportRights: vi.fn().mockResolvedValue([]),
  getUserReportGroupRights: vi.fn().mockResolvedValue([]),
  getUserGroupReportRights: vi.fn().mockResolvedValue([]),
  getUserGroupReportGroupRights: vi.fn().mockResolvedValue([]),
  setUserReportRights: vi.fn(),
  setUserReportGroupRights: vi.fn(),
  setUserGroupReportRights: vi.fn(),
  setUserGroupReportGroupRights: vi.fn(),
}));

vi.mock('@/features/users/api', () => ({
  fetchUsers: vi.fn().mockResolvedValue([
    { id: 1, username: 'alice', accessLevel: 1, active: true, publicUser: false },
  ]),
}));

vi.mock('@/features/user-groups/api', () => ({
  fetchUserGroups: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/features/reports/api', () => ({
  fetchReports: vi.fn().mockResolvedValue([{ id: 10, name: 'Sales', active: true, hidden: false, reportType: 1 }]),
}));

vi.mock('@/features/report-groups/api', () => ({
  fetchReportGroups: vi.fn().mockResolvedValue([]),
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
        <AccessRightsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AccessRightsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the access rights page heading', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Access Rights')).toBeInTheDocument();
    });
  });

  it('shows subject selection controls', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Assign to/i)).toBeInTheDocument();
      expect(screen.getByText(/Select User/i)).toBeInTheDocument();
    });
  });
});
