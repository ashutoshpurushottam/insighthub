import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { ResultsTable } from './ResultsTable';

const navigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

describe('ResultsTable', () => {
  const columns = ['name', 'amount'];
  const rows = [
    { name: 'Beta', amount: 20 },
    { name: 'Alpha', amount: 10 },
    { name: 'Gamma', amount: 30 },
  ];

  beforeEach(() => {
    navigate.mockClear();
  });

  it('shows empty state when there are no columns', () => {
    render(<ResultsTable columns={[]} rows={[]} />);
    expect(screen.getByText('No results to display.')).toBeInTheDocument();
  });

  it('renders column headers and cell values', () => {
    render(<ResultsTable columns={columns} rows={rows} />);
    expect(screen.getByText('name')).toBeInTheDocument();
    expect(screen.getByText('amount')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('sorts ascending then descending when header is clicked', () => {
    render(<ResultsTable columns={columns} rows={rows} />);
    const nameHeader = screen.getByText('name');

    fireEvent.click(nameHeader);
    const cellsAsc = screen.getAllByRole('row').slice(1).map((row) => row.textContent);
    expect(cellsAsc[0]).toContain('Alpha');

    fireEvent.click(nameHeader);
    const cellsDesc = screen.getAllByRole('row').slice(1).map((row) => row.textContent);
    expect(cellsDesc[0]).toContain('Gamma');
  });

  it('shows no data message for empty rows', () => {
    render(<ResultsTable columns={columns} rows={[]} />);
    expect(screen.getByText('No data returned.')).toBeInTheDocument();
  });

  it('renders drill-down cells when configured', () => {
    render(
      <MemoryRouter>
        <ResultsTable
          columns={columns}
          rows={rows}
          drillDownLinks={[
            {
              column: 'name',
              childReportId: 99,
              childReportName: 'Detail',
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByTitle('Drill down to Detail').length).toBeGreaterThan(0);
  });

  it('navigates with mapped params and parent context from drill-down config', () => {
    render(
      <MemoryRouter>
        <ResultsTable
          columns={columns}
          rows={rows}
          parentReportId={10}
          parentPage={2}
          drillDownLinks={[
            {
              column: 'name',
              childReportId: 99,
              childReportName: 'Detail',
              paramMappings: [
                { parentColumnName: 'name', childParamName: 'customer' },
                { parentColumnName: 'amount', childParamName: 'amt' },
              ],
            },
          ]}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByTitle('Drill down to Detail')[0]);
    expect(navigate).toHaveBeenCalledWith(
      '/reports/99/run?customer=Beta&amt=20&_ihFrom=10&_ihFromPage=2',
    );
  });
});
