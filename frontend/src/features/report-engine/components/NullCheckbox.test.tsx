import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { NullCheckbox } from './NullCheckbox';

describe('NullCheckbox', () => {
  it('renders a checkbox with NULL label', () => {
    render(<NullCheckbox paramName="region" checked={false} onChange={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox', { name: /set region to null/i });
    expect(checkbox).toBeInTheDocument();
    expect(screen.getByText('NULL')).toBeInTheDocument();
  });

  it('checkbox is unchecked when checked prop is false', () => {
    render(<NullCheckbox paramName="region" checked={false} onChange={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('checkbox is checked when checked prop is true', () => {
    render(<NullCheckbox paramName="region" checked={true} onChange={vi.fn()} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('calls onChange with paramName and true when checked', () => {
    const onChange = vi.fn();
    render(<NullCheckbox paramName="status" checked={false} onChange={onChange} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith('status', true);
  });

  it('calls onChange with paramName and false when unchecked', () => {
    const onChange = vi.fn();
    render(<NullCheckbox paramName="status" checked={true} onChange={onChange} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith('status', false);
  });

  it('disables the checkbox when disabled is true', () => {
    render(<NullCheckbox paramName="region" checked={false} onChange={vi.fn()} disabled />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });
});
