import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { DateRangePicker, calculatePresetRange } from './DateRangePicker';

describe('DateRangePicker', () => {
  const defaultProps = {
    fromParameterName: 'start_date',
    toParameterName: 'end_date',
    onFromChange: vi.fn(),
    onToChange: vi.fn(),
  };

  it('renders from and to date inputs', () => {
    render(<DateRangePicker {...defaultProps} />);
    expect(screen.getByLabelText('From date for start_date')).toBeInTheDocument();
    expect(screen.getByLabelText('To date for end_date')).toBeInTheDocument();
  });

  it('displays the current from/to values', () => {
    render(
      <DateRangePicker
        {...defaultProps}
        fromValue="2024-01-01"
        toValue="2024-01-31"
      />,
    );
    expect(screen.getByLabelText('From date for start_date')).toHaveValue('2024-01-01');
    expect(screen.getByLabelText('To date for end_date')).toHaveValue('2024-01-31');
  });

  it('calls onFromChange when from date is changed manually', () => {
    const onFromChange = vi.fn();
    render(<DateRangePicker {...defaultProps} onFromChange={onFromChange} />);
    fireEvent.change(screen.getByLabelText('From date for start_date'), {
      target: { value: '2024-03-15' },
    });
    expect(onFromChange).toHaveBeenCalledWith('2024-03-15');
  });

  it('calls onToChange when to date is changed manually', () => {
    const onToChange = vi.fn();
    render(<DateRangePicker {...defaultProps} onToChange={onToChange} />);
    fireEvent.change(screen.getByLabelText('To date for end_date'), {
      target: { value: '2024-03-20' },
    });
    expect(onToChange).toHaveBeenCalledWith('2024-03-20');
  });

  it('renders all 10 preset buttons', () => {
    render(<DateRangePicker {...defaultProps} />);
    const presets = [
      'Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days',
      'This Month', 'Last Month', 'This Quarter', 'Last Quarter',
      'This Year', 'Last Year',
    ];
    presets.forEach((preset) => {
      expect(screen.getByRole('button', { name: preset })).toBeInTheDocument();
    });
  });

  it('calls onFromChange and onToChange when a preset is clicked', () => {
    const onFromChange = vi.fn();
    const onToChange = vi.fn();
    render(
      <DateRangePicker
        {...defaultProps}
        onFromChange={onFromChange}
        onToChange={onToChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onFromChange).toHaveBeenCalledTimes(1);
    expect(onToChange).toHaveBeenCalledTimes(1);
    // Both should be the same date for "Today"
    expect(onFromChange.mock.calls[0][0]).toBe(onToChange.mock.calls[0][0]);
  });

  it('disables all inputs and buttons when disabled', () => {
    render(<DateRangePicker {...defaultProps} disabled />);
    expect(screen.getByLabelText('From date for start_date')).toBeDisabled();
    expect(screen.getByLabelText('To date for end_date')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Today' })).toBeDisabled();
  });

  it('highlights active preset when values match', () => {
    const range = calculatePresetRange('Today');
    render(
      <DateRangePicker
        {...defaultProps}
        fromValue={range.from}
        toValue={range.to}
      />,
    );
    const todayBtn = screen.getByRole('button', { name: 'Today' });
    expect(todayBtn.className).toContain('bg-blue-600');
  });
});

describe('calculatePresetRange', () => {
  // Use a fixed reference date: 2024-07-15 (Monday)
  const referenceDate = new Date(2024, 6, 15); // July 15, 2024

  it('Today returns the current date for both from and to', () => {
    const range = calculatePresetRange('Today', referenceDate);
    expect(range.from).toBe('2024-07-15');
    expect(range.to).toBe('2024-07-15');
  });

  it('Yesterday returns the previous day for both from and to', () => {
    const range = calculatePresetRange('Yesterday', referenceDate);
    expect(range.from).toBe('2024-07-14');
    expect(range.to).toBe('2024-07-14');
  });

  it('Last 7 Days returns 7 days including today', () => {
    const range = calculatePresetRange('Last 7 Days', referenceDate);
    expect(range.from).toBe('2024-07-09');
    expect(range.to).toBe('2024-07-15');
  });

  it('Last 30 Days returns 30 days including today', () => {
    const range = calculatePresetRange('Last 30 Days', referenceDate);
    expect(range.from).toBe('2024-06-16');
    expect(range.to).toBe('2024-07-15');
  });

  it('This Month returns first and last day of current month', () => {
    const range = calculatePresetRange('This Month', referenceDate);
    expect(range.from).toBe('2024-07-01');
    expect(range.to).toBe('2024-07-31');
  });

  it('Last Month returns first and last day of previous month', () => {
    const range = calculatePresetRange('Last Month', referenceDate);
    expect(range.from).toBe('2024-06-01');
    expect(range.to).toBe('2024-06-30');
  });

  it('This Quarter returns first and last day of current quarter (Q3)', () => {
    const range = calculatePresetRange('This Quarter', referenceDate);
    expect(range.from).toBe('2024-07-01');
    expect(range.to).toBe('2024-09-30');
  });

  it('Last Quarter returns first and last day of previous quarter (Q2)', () => {
    const range = calculatePresetRange('Last Quarter', referenceDate);
    expect(range.from).toBe('2024-04-01');
    expect(range.to).toBe('2024-06-30');
  });

  it('This Year returns Jan 1 to Dec 31 of current year', () => {
    const range = calculatePresetRange('This Year', referenceDate);
    expect(range.from).toBe('2024-01-01');
    expect(range.to).toBe('2024-12-31');
  });

  it('Last Year returns Jan 1 to Dec 31 of previous year', () => {
    const range = calculatePresetRange('Last Year', referenceDate);
    expect(range.from).toBe('2023-01-01');
    expect(range.to).toBe('2023-12-31');
  });

  it('Last Quarter in Q1 wraps to Q4 of previous year', () => {
    const janDate = new Date(2024, 1, 15); // Feb 15, 2024 (Q1)
    const range = calculatePresetRange('Last Quarter', janDate);
    expect(range.from).toBe('2023-10-01');
    expect(range.to).toBe('2023-12-31');
  });

  it('Last Month in January wraps to December of previous year', () => {
    const janDate = new Date(2024, 0, 15); // Jan 15, 2024
    const range = calculatePresetRange('Last Month', janDate);
    expect(range.from).toBe('2023-12-01');
    expect(range.to).toBe('2023-12-31');
  });
});
