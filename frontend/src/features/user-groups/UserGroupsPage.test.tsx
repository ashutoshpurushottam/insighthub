import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { UserGroupsPage } from './UserGroupsPage';

const fetchUserGroups = vi.fn();

vi.mock('./api', () => ({
  fetchUserGroups: () => fetchUserGroups(),
  deleteUserGroup: vi.fn(),
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
        <UserGroupsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('UserGroupsPage', () => {
  beforeEach(() => {
    fetchUserGroups.mockReset();
  });

  it('shows empty state when there are no groups', async () => {
    fetchUserGroups.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no (user )?group/i)).toBeInTheDocument();
    });
  });

  it('lists user groups', async () => {
    fetchUserGroups.mockResolvedValue([
      { id: 1, name: 'Analysts', description: 'BI team', memberCount: 3, roleNames: ['VIEWER'] },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Analysts')).toBeInTheDocument();
    });
  });
});
