import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ParameterManager } from './ParameterManager';

const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    put: (...args: unknown[]) => mockPut(...args),
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
      <ParameterManager reportId={1} />
    </QueryClientProvider>,
  );
}

describe('ParameterManager', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockPut.mockReset();
    mockDelete.mockReset();
  });

  it('shows empty state when there are no parameters', async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderManager();

    await waitFor(() => {
      expect(screen.getByText(/no parameters/i)).toBeInTheDocument();
    });
  });

  it('lists existing parameters', async () => {
    mockGet.mockResolvedValue({
      data: [
        {
          id: 1,
          reportId: 1,
          name: 'region',
          label: 'Region',
          type: 'TEXT',
          required: true,
          position: 1,
          multiValue: false,
          hidden: false,
          allowNull: false,
        },
      ],
    });

    renderManager();

    await waitFor(() => {
      expect(screen.getByText('region')).toBeInTheDocument();
      expect(screen.getByText('Region')).toBeInTheDocument();
    });
  });

  it('opens the add parameter form', async () => {
    mockGet.mockResolvedValue({ data: [] });
    renderManager();

    await waitFor(() => screen.getByText(/no parameters/i));
    fireEvent.click(screen.getByRole('button', { name: /add parameter/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /add parameter/i })).toBeInTheDocument();
    });
  });
});
