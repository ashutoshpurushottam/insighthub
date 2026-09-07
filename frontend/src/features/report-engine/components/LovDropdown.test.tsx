import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { LovDropdown } from './LovDropdown';

vi.mock('../hooks/useParameterLov', () => ({
  useParameterLov: () => ({
    data: [
      { value: 'us', label: 'United States' },
      { value: 'ca', label: 'Canada' },
    ],
    isLoading: false,
    isError: false,
  }),
}));

describe('LovDropdown', () => {
  it('renders static options without fetching', () => {
    render(
      <LovDropdown
        parameterId={1}
        value=""
        onChange={vi.fn()}
        staticOptions={[
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
        ]}
      />,
    );

    expect(screen.getByRole('option', { name: 'Option A' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Option B' })).toBeInTheDocument();
  });

  it('calls onChange when a value is selected', () => {
    const onChange = vi.fn();
    render(
      <LovDropdown
        parameterId={1}
        value=""
        onChange={onChange}
        staticOptions={[{ value: 'a', label: 'Option A' }]}
      />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'a' } });
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('disables child dropdown until parent is selected', () => {
    render(
      <LovDropdown
        parameterId={2}
        value=""
        onChange={vi.fn()}
        hasParent
        parentValue={undefined}
        staticOptions={[{ value: 'x', label: 'Child' }]}
      />,
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByText('Select a parent value first')).toBeInTheDocument();
  });

  it('supports multi-value selection', () => {
    const onChange = vi.fn();
    render(
      <LovDropdown
        parameterId={1}
        value={[]}
        onChange={onChange}
        multiValue
        staticOptions={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />,
    );

    const select = screen.getByRole('listbox');
    const options = screen.getAllByRole('option');
    // Simulate multi-select by changing selectedOptions via fireEvent
    Object.defineProperty(select, 'selectedOptions', {
      value: [options[0], options[1]],
    });
    fireEvent.change(select);
    expect(onChange).toHaveBeenCalled();
  });

  it('clears value when parent changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <LovDropdown
        parameterId={2}
        value="old"
        onChange={onChange}
        hasParent
        parentValue="p1"
        staticOptions={[{ value: 'x', label: 'Child' }]}
      />,
    );

    rerender(
      <LovDropdown
        parameterId={2}
        value="old"
        onChange={onChange}
        hasParent
        parentValue="p2"
        staticOptions={[{ value: 'x', label: 'Child' }]}
      />,
    );

    expect(onChange).toHaveBeenCalledWith('');
  });
});
