import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { ResultsTable } from './ResultsTable';

describe('ResultsTable', () => {
  const columns = ['name', 'amount'];
  const rows = [
    { name: 'Beta', amount: 20 },
    { name: 'Alpha', amount: 10 },
    { name: 'Gamma', amount: 30 },
  ];

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
});
