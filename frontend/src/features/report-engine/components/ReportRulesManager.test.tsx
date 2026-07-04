import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ReportRulesManager } from './ReportRulesManager';

// Mock the api-client module
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from '@/lib/api-client';

const mockReportRules = [
  { id: 1, reportId: 10, ruleId: 1, ruleName: 'GeoArea', columnName: 'employees.region' },
  { id: 2, reportId: 10, ruleId: 2, ruleName: 'Department', columnName: 'departments.dept_id' },
];

const mockAllRules = [
  { id: 1, name: 'GeoArea', description: 'Geographic area filter' },
  { id: 2, name: 'Department', description: 'Department filter' },
  { id: 3, name: 'CostCenter', description: 'Cost center filter' },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ReportRulesManager', () => {
  it('renders loading state initially', () => {
    vi.mocked(apiClient.get).mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<ReportRulesManager reportId={10} />, { wrapper: createWrapper() });
    expect(screen.getByText('Loading rule mappings...')).toBeInTheDocument();
  });

  it('renders rule mappings table after loading', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockReportRules });

    render(<ReportRulesManager reportId={10} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('GeoArea')).toBeInTheDocument();
    });

    expect(screen.getByText('employees.region')).toBeInTheDocument();
    expect(screen.getByText('Department')).toBeInTheDocument();
    expect(screen.getByText('departments.dept_id')).toBeInTheDocument();
  });

  it('shows rule count in header', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockReportRules });

    render(<ReportRulesManager reportId={10} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Rule Mappings (2)')).toBeInTheDocument();
    });
  });

  it('shows empty state when no rules are linked', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });

    render(<ReportRulesManager reportId={10} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByText(/No rules linked to this report/),
      ).toBeInTheDocument();
    });
  });

  it('shows Add Rule button', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockReportRules });

    render(<ReportRulesManager reportId={10} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add rule/i })).toBeInTheDocument();
    });
  });

  it('opens add form modal when Add Rule is clicked', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: mockReportRules }) // report rules
      .mockResolvedValueOnce({ data: mockAllRules }); // all rules for dropdown

    render(<ReportRulesManager reportId={10} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add rule/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add rule/i }));

    await waitFor(() => {
      expect(screen.getByText('Add Rule Mapping')).toBeInTheDocument();
    });
  });

  it('filters out already-linked rules from the dropdown', async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({ data: mockReportRules }) // report rules
      .mockResolvedValueOnce({ data: mockAllRules }); // all rules for dropdown

    render(<ReportRulesManager reportId={10} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add rule/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /add rule/i }));

    await waitFor(() => {
      expect(screen.getByText('Add Rule Mapping')).toBeInTheDocument();
    });

    // CostCenter (id=3) should be available since rules 1 & 2 are already linked
    await waitFor(() => {
      const select = screen.getByRole('combobox');
      const options = Array.from(select.querySelectorAll('option'));
      const optionTexts = options.map((o) => o.textContent);
      expect(optionTexts.some((t) => t?.includes('CostCenter'))).toBe(true);
      // GeoArea and Department should NOT be in the dropdown
      expect(optionTexts.some((t) => t?.includes('GeoArea'))).toBe(false);
      expect(optionTexts.some((t) => t?.includes('Department'))).toBe(false);
    });
  });
});
