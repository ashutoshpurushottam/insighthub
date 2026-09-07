import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { DrillDownCell } from './DrillDownCell';

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

describe('DrillDownCell', () => {
  beforeEach(() => {
    navigate.mockClear();
  });

  it('renders the display value', () => {
    render(
      <MemoryRouter>
        <DrillDownCell
          value="Acme"
          drillDown={{
            column: 'customer',
            childReportId: 5,
            childReportName: 'Orders',
          }}
          row={{ customer: 'Acme', region: 'West' }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByTitle('Drill down to Orders')).toBeInTheDocument();
  });

  it('navigates with mapped query params on click', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(
      <MemoryRouter>
        <DrillDownCell
          value="Acme"
          drillDown={{
            column: 'customer',
            childReportId: 5,
            childReportName: 'Orders',
          }}
          row={{ customer: 'Acme', region: 'West' }}
          paramMappings={[
            { parentColumnName: 'customer', childParamName: 'cust' },
            { parentColumnName: 'region', childParamName: 'reg' },
          ]}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(navigate).toHaveBeenCalledWith('/reports/5/run?cust=Acme&reg=West');
  });

  it('encodes parent report context for Back navigation', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(
      <MemoryRouter>
        <DrillDownCell
          value="Acme"
          drillDown={{
            column: 'customer',
            childReportId: 5,
            childReportName: 'Orders',
          }}
          row={{ customer: 'Acme' }}
          paramMappings={[
            { parentColumnName: 'customer', childParamName: 'cust' },
          ]}
          parentReportId={12}
          parentPage={3}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(navigate).toHaveBeenCalledWith(
      '/reports/5/run?cust=Acme&_ihFrom=12&_ihFromPage=3',
    );
  });

  it('uses drillDown.paramMappings when prop mappings are omitted', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(
      <MemoryRouter>
        <DrillDownCell
          value="Acme"
          drillDown={{
            column: 'customer',
            childReportId: 5,
            childReportName: 'Orders',
            paramMappings: [
              { parentColumnName: 'customer', childParamName: 'cust_id' },
            ],
          }}
          row={{ customer: 'Acme' }}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(navigate).toHaveBeenCalledWith('/reports/5/run?cust_id=Acme');
  });

  it('falls back to trigger column when mappings are empty', async () => {
    const { fireEvent } = await import('@testing-library/react');
    render(
      <MemoryRouter>
        <DrillDownCell
          value="42"
          drillDown={{
            column: 'id',
            childReportId: 7,
            childReportName: 'Detail',
          }}
          row={{ id: 42 }}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(navigate).toHaveBeenCalledWith('/reports/7/run?id=42');
  });

  it('formats null values as an em dash', () => {
    render(
      <MemoryRouter>
        <DrillDownCell
          value={null}
          drillDown={{
            column: 'customer',
            childReportId: 5,
            childReportName: 'Orders',
          }}
          row={{ customer: null }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
