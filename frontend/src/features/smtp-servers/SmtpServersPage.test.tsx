import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SmtpServersPage } from './SmtpServersPage';

const fetchSmtpServers = vi.fn();

vi.mock('./api', () => ({
  fetchSmtpServers: () => fetchSmtpServers(),
  deleteSmtpServer: vi.fn(),
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
        <SmtpServersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SmtpServersPage', () => {
  beforeEach(() => {
    fetchSmtpServers.mockReset();
  });

  it('shows empty state when there are no servers', async () => {
    fetchSmtpServers.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no smtp|no server/i)).toBeInTheDocument();
    });
  });

  it('lists SMTP servers', async () => {
    fetchSmtpServers.mockResolvedValue([
      {
        id: 1,
        name: 'Corp Mail',
        server: 'smtp.example.com',
        port: 587,
        useStarttls: true,
        useAuth: true,
        active: true,
      },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Corp Mail')).toBeInTheDocument();
    });
  });
});
