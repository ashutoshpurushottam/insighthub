import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { RulesPage } from './RulesPage';

const getAll = vi.fn();

vi.mock('./api', () => ({
  rulesApi: {
    getAll: () => getAll(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <RulesPage />
    </MemoryRouter>,
  );
}

describe('RulesPage', () => {
  beforeEach(() => {
    getAll.mockReset();
  });

  it('shows empty state when there are no rules', async () => {
    getAll.mockResolvedValue([]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no rules defined/i)).toBeInTheDocument();
    });
  });

  it('lists rules', async () => {
    getAll.mockResolvedValue([
      { id: 1, name: 'Region filter', description: 'RLS' },
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Region filter')).toBeInTheDocument();
    });
  });
});
