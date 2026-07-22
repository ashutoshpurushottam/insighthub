import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { SqlEditor } from './SqlEditor';

describe('SqlEditor', () => {
  it('renders a textarea with the provided value', () => {
    render(<SqlEditor value="SELECT 1" onChange={vi.fn()} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('SELECT 1');
  });

  it('uses monospace font on the textarea', () => {
    render(<SqlEditor value="" onChange={vi.fn()} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea.className).toContain('font-mono');
  });

  it('calls onChange when text is typed', () => {
    const onChange = vi.fn();
    render(<SqlEditor value="" onChange={onChange} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'SELECT *' } });
    expect(onChange).toHaveBeenCalledWith('SELECT *');
  });

  it('displays line numbers matching number of lines', () => {
    const sql = 'SELECT *\nFROM users\nWHERE id = 1';
    render(<SqlEditor value={sql} onChange={vi.fn()} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows a single line number for empty value', () => {
    render(<SqlEditor value="" onChange={vi.fn()} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders placeholder text', () => {
    render(
      <SqlEditor value="" onChange={vi.fn()} placeholder="Enter SQL..." />,
    );
    const textarea = screen.getByPlaceholderText('Enter SQL...');
    expect(textarea).toBeInTheDocument();
  });

  it('disables the textarea when disabled prop is true', () => {
    render(<SqlEditor value="" onChange={vi.fn()} disabled />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });
});
