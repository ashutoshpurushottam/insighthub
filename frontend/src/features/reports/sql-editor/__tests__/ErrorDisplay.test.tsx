import { render, screen, fireEvent } from '@testing-library/react';
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

import { ErrorDisplay } from '../ErrorDisplay';
import { DEFAULT_SQL_EDITOR_CONFIG } from '../sql-editor.types';

const MAX_LENGTH = DEFAULT_SQL_EDITOR_CONFIG.maxErrorDisplayLength; // 500

describe('ErrorDisplay', () => {
  describe('rendering and accessibility', () => {
    it('renders with role="alert" for screen reader announcement', () => {
      render(<ErrorDisplay message="Some error" type="execution" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has aria-live="assertive" attribute', () => {
      render(<ErrorDisplay message="Some error" type="validation" />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('renders with red styling classes', () => {
      render(<ErrorDisplay message="Error occurred" type="execution" />);
      const alert = screen.getByRole('alert');
      expect(alert.className).toContain('bg-red-50');
      expect(alert.className).toContain('border-red-200');
      expect(alert.className).toContain('text-red-800');
    });

    it('exposes the error type via data attribute', () => {
      render(<ErrorDisplay message="Validation error" type="validation" />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('data-error-type', 'validation');
    });

    it('exposes execution error type via data attribute', () => {
      render(<ErrorDisplay message="Execution error" type="execution" />);
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('data-error-type', 'execution');
    });
  });

  describe('short messages (≤500 chars)', () => {
    it('displays the full message when length is under the threshold', () => {
      const message = 'Query failed: syntax error near "SELCT"';
      render(<ErrorDisplay message={message} type="execution" />);
      expect(screen.getByText(message)).toBeInTheDocument();
    });

    it('displays the full message when length is exactly 500 chars', () => {
      const message = 'x'.repeat(MAX_LENGTH);
      render(<ErrorDisplay message={message} type="execution" />);
      expect(screen.getByText(message)).toBeInTheDocument();
    });

    it('does not show "Show more" button for short messages', () => {
      render(<ErrorDisplay message="Short error" type="validation" />);
      expect(screen.queryByText('Show more')).not.toBeInTheDocument();
    });
  });

  describe('long messages (>500 chars) with truncation', () => {
    const longMessage = 'a'.repeat(MAX_LENGTH + 100);

    it('truncates the message to 500 chars initially', () => {
      render(<ErrorDisplay message={longMessage} type="execution" />);
      const displayed = screen.getByRole('alert').querySelector('p');
      // The displayed text should be 500 chars + ellipsis character
      expect(displayed?.textContent).toHaveLength(MAX_LENGTH + 1); // +1 for '…'
    });

    it('shows "Show more" button for long messages', () => {
      render(<ErrorDisplay message={longMessage} type="execution" />);
      expect(screen.getByText('Show more')).toBeInTheDocument();
    });

    it('expands to full message when "Show more" is clicked', () => {
      render(<ErrorDisplay message={longMessage} type="execution" />);
      fireEvent.click(screen.getByText('Show more'));
      const displayed = screen.getByRole('alert').querySelector('p');
      expect(displayed?.textContent).toBe(longMessage);
    });

    it('changes button to "Show less" after expanding', () => {
      render(<ErrorDisplay message={longMessage} type="execution" />);
      fireEvent.click(screen.getByText('Show more'));
      expect(screen.getByText('Show less')).toBeInTheDocument();
      expect(screen.queryByText('Show more')).not.toBeInTheDocument();
    });

    it('collapses back when "Show less" is clicked', () => {
      render(<ErrorDisplay message={longMessage} type="execution" />);
      fireEvent.click(screen.getByText('Show more'));
      fireEvent.click(screen.getByText('Show less'));
      const displayed = screen.getByRole('alert').querySelector('p');
      expect(displayed?.textContent).toHaveLength(MAX_LENGTH + 1); // truncated + '…'
      expect(screen.getByText('Show more')).toBeInTheDocument();
    });
  });
});


/**
 * Property 9: Error message truncation
 *
 * For any error message string, if its length is ≤ 500 characters the ErrorDisplay
 * SHALL render the full text. If its length exceeds 500 characters, the ErrorDisplay
 * SHALL render only the first 500 characters with a "Show more" control that reveals
 * the full text when activated.
 *
 * **Validates: Requirements 5.4**
 */
describe('Property 9: Error message truncation', () => {
  it('renders full text for messages ≤ 500 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: MAX_LENGTH }),
        (message) => {
          const { unmount } = render(
            <ErrorDisplay message={message} type="execution" />,
          );
          const alertEl = screen.getByRole('alert');
          const paragraph = alertEl.querySelector('p');

          // Full text should be rendered without truncation
          expect(paragraph?.textContent).toBe(message);

          // No "Show more" button should be present
          expect(screen.queryByText('Show more')).not.toBeInTheDocument();

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('truncates messages > 500 characters to first 500 chars with ellipsis and "Show more" control', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: MAX_LENGTH + 1, maxLength: 1500 }),
        (message) => {
          const { unmount } = render(
            <ErrorDisplay message={message} type="execution" />,
          );
          const alertEl = screen.getByRole('alert');
          const paragraph = alertEl.querySelector('p');

          // Displayed text should be first 500 chars + '…'
          const expectedTruncated = message.slice(0, MAX_LENGTH) + '…';
          expect(paragraph?.textContent).toBe(expectedTruncated);

          // "Show more" button must be present
          expect(screen.getByText('Show more')).toBeInTheDocument();

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('"Show more" control reveals full text when activated', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: MAX_LENGTH + 1, maxLength: 1500 }),
        (message) => {
          const { unmount } = render(
            <ErrorDisplay message={message} type="execution" />,
          );

          // Click "Show more" to expand
          fireEvent.click(screen.getByText('Show more'));

          const alertEl = screen.getByRole('alert');
          const paragraph = alertEl.querySelector('p');

          // Full message should now be displayed
          expect(paragraph?.textContent).toBe(message);

          // "Show less" should be present instead of "Show more"
          expect(screen.getByText('Show less')).toBeInTheDocument();
          expect(screen.queryByText('Show more')).not.toBeInTheDocument();

          unmount();
        },
      ),
      { numRuns: 100 },
    );
  });
});
