import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { SplitPanel } from '../SplitPanel';

describe('SplitPanel', () => {
  it('renders top and bottom content', () => {
    render(
      <SplitPanel
        topContent={<div>Top Area</div>}
        bottomContent={<div>Bottom Area</div>}
      />,
    );

    expect(screen.getByText('Top Area')).toBeInTheDocument();
    expect(screen.getByText('Bottom Area')).toBeInTheDocument();
  });

  it('renders a separator element with correct role and aria attributes', () => {
    render(
      <SplitPanel
        topContent={<div>Top</div>}
        bottomContent={<div>Bottom</div>}
      />,
    );

    const separator = screen.getByRole('separator');
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
    expect(separator).toHaveAttribute('aria-label', 'Resize panels');
  });

  it('applies row-resize cursor on the divider', () => {
    render(
      <SplitPanel
        topContent={<div>Top</div>}
        bottomContent={<div>Bottom</div>}
      />,
    );

    const separator = screen.getByRole('separator');
    expect(separator).toHaveStyle({ cursor: 'row-resize' });
  });

  it('applies the initial top ratio as flex-basis on the top panel', () => {
    const { container } = render(
      <SplitPanel
        topContent={<div>Top</div>}
        bottomContent={<div>Bottom</div>}
        initialTopRatio={0.7}
      />,
    );

    const topPanel = container.querySelector('[style*="flex: 0 0 70%"]');
    expect(topPanel).toBeInTheDocument();
  });

  it('uses default ratio of 0.6 when no initialTopRatio is provided', () => {
    const { container } = render(
      <SplitPanel
        topContent={<div>Top</div>}
        bottomContent={<div>Bottom</div>}
      />,
    );

    const topPanel = container.querySelector('[style*="flex: 0 0 60%"]');
    expect(topPanel).toBeInTheDocument();
  });

  it('starts dragging on pointer down on the separator', () => {
    const { container } = render(
      <SplitPanel
        topContent={<div>Top</div>}
        bottomContent={<div>Bottom</div>}
      />,
    );

    const separator = screen.getByRole('separator');

    // Mock setPointerCapture / releasePointerCapture
    separator.setPointerCapture = () => {};
    separator.releasePointerCapture = () => {};

    fireEvent.pointerDown(separator, { pointerId: 1 });

    // When dragging, user-select should be 'none' on the container
    const containerDiv = container.firstElementChild as HTMLElement;
    expect(containerDiv).toHaveStyle({ userSelect: 'none' });
  });

  it('stops dragging on pointer up', () => {
    const { container } = render(
      <SplitPanel
        topContent={<div>Top</div>}
        bottomContent={<div>Bottom</div>}
      />,
    );

    const separator = screen.getByRole('separator');
    const containerDiv = container.firstElementChild as HTMLElement;

    // Mock pointer capture APIs (not available in jsdom)
    separator.setPointerCapture = () => {};
    separator.releasePointerCapture = () => {};
    containerDiv.setPointerCapture = () => {};
    containerDiv.releasePointerCapture = () => {};

    fireEvent.pointerDown(separator, { pointerId: 1 });
    expect(containerDiv).toHaveStyle({ userSelect: 'none' });

    fireEvent.pointerUp(containerDiv, { pointerId: 1 });
    expect(containerDiv).toHaveStyle({ userSelect: 'auto' });
  });
});
