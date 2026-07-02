import { useState } from 'react';

import {
  DEFAULT_SQL_EDITOR_CONFIG,
  type ErrorDisplayProps,
} from './sql-editor.types';

/**
 * Displays an error message with red styling and accessibility attributes.
 * Truncates messages longer than 500 characters with a "Show more" toggle.
 */
export function ErrorDisplay({ message, type }: ErrorDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = DEFAULT_SQL_EDITOR_CONFIG.maxErrorDisplayLength;
  const isTruncated = message.length > maxLength;

  const displayedMessage =
    isTruncated && !isExpanded ? message.slice(0, maxLength) : message;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded border bg-red-50 border-red-200 text-red-800 p-3"
      data-error-type={type}
    >
      <p className="text-sm whitespace-pre-wrap break-words">
        {displayedMessage}
        {isTruncated && !isExpanded && '…'}
      </p>
      {isTruncated && (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="mt-1 text-sm font-medium text-red-700 underline hover:text-red-900"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}
