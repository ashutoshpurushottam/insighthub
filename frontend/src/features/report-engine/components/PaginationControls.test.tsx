import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { PaginationControls } from './PaginationControls';

describe('PaginationControls', () => {
  const pagination = {
    page: 2,
    pageSize: 25,
    totalRows: 100,
    totalPages: 4,
  };

  it('shows the current row range', () => {
    render(
      <PaginationControls
        pagination={pagination}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Showing/i).textContent).toMatch(/26/);
    expect(screen.getByText(/Showing/i).textContent).toMatch(/50/);
    expect(screen.getByText(/Showing/i).textContent).toMatch(/100/);
  });

  it('navigates to first and previous pages', () => {
    const onPageChange = vi.fn();
    render(
      <PaginationControls
        pagination={pagination}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('First page'));
    expect(onPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByLabelText('Previous page'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('navigates to next and last pages', () => {
    const onPageChange = vi.fn();
    render(
      <PaginationControls
        pagination={pagination}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText('Next page'));
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByLabelText('Last page'));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('disables first/previous on page 1', () => {
    render(
      <PaginationControls
        pagination={{ ...pagination, page: 1 }}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('First page')).toBeDisabled();
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
  });

  it('changes page size', () => {
    const onPageSizeChange = vi.fn();
    render(
      <PaginationControls
        pagination={pagination}
        onPageChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Rows per page:'), {
      target: { value: '50' },
    });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('submits a valid page number on Enter', () => {
    const onPageChange = vi.fn();
    render(
      <PaginationControls
        pagination={pagination}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />,
    );

    const input = screen.getByLabelText('Page number');
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
