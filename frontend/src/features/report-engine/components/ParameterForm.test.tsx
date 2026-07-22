import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ParameterForm } from './ParameterForm';
import type { Parameter } from '../types';

function makeParam(overrides: Partial<Parameter> = {}): Parameter {
  return {
    id: 1,
    reportId: 1,
    name: 'param1',
    label: 'Param 1',
    type: 'TEXT',
    required: false,
    position: 1,
    multiValue: false,
    hidden: false,
    allowNull: false,
    ...overrides,
  };
}

describe('ParameterForm — hidden parameters', () => {
  it('does not render hidden parameters as form inputs', () => {
    const params: Parameter[] = [
      makeParam({ id: 1, name: 'visible', label: 'Visible Param', hidden: false, position: 1 }),
      makeParam({ id: 2, name: 'secret', label: 'Secret Param', hidden: true, position: 2 }),
    ];

    render(
      <ParameterForm parameters={params} values={{}} onChange={vi.fn()} />,
    );

    expect(screen.getByText('Visible Param')).toBeInTheDocument();
    expect(screen.queryByText('Secret Param')).not.toBeInTheDocument();
  });

  it('populates default values for hidden parameters via onChange', () => {
    const params: Parameter[] = [
      makeParam({
        id: 1,
        name: 'hidden_date',
        label: 'Hidden Date',
        hidden: true,
        defaultValue: '2026-01-01',
        position: 1,
      }),
      makeParam({
        id: 2,
        name: 'visible_text',
        label: 'Visible Text',
        hidden: false,
        position: 2,
      }),
    ];

    const onChange = vi.fn();
    render(
      <ParameterForm parameters={params} values={{}} onChange={onChange} />,
    );

    // The useEffect should call onChange with the hidden param's default value
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ hidden_date: '2026-01-01' }),
    );
  });

  it('renders empty grid when all parameters are hidden', () => {
    const params: Parameter[] = [
      makeParam({ id: 1, name: 'h1', label: 'H1', hidden: true, position: 1, defaultValue: 'x' }),
    ];

    const { container } = render(
      <ParameterForm parameters={params} values={{}} onChange={vi.fn()} />,
    );

    // Should not show the "no parameters" message since parameters exist
    expect(screen.queryByText('This report has no parameters.')).not.toBeInTheDocument();
    // The grid should be rendered but empty of visible fields
    const grid = container.querySelector('.grid');
    expect(grid).toBeInTheDocument();
    expect(grid?.children.length).toBe(0);
  });
});
