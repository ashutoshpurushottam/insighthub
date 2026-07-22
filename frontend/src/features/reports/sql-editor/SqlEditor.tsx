import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { SqlEditorProps, Token, TokenType } from './sql-editor.types';
import { DEFAULT_SQL_EDITOR_CONFIG } from './sql-editor.types';
import { tokenize } from './SqlTokenizer';

/** Tailwind class mapping for each token type */
const TOKEN_CLASSES: Record<TokenType, string> = {
  keyword: 'text-blue-600',
  string: 'text-green-600',
  number: 'text-orange-500',
  comment: 'text-gray-400 italic',
  default: 'text-gray-800',
};

/**
 * SQL code editor component.
 *
 * Renders a hidden `<textarea>` for input capture (preserving native undo/redo)
 * overlaid with a `<pre><code>` block that displays tokenized, syntax-highlighted
 * output. Line numbers render in a left gutter.
 *
 * Keyboard handling:
 * - Tab → inserts 2 spaces (preserves undo history via execCommand)
 * - Escape → releases focus trap so next Tab moves focus normally
 * - Ctrl/Cmd+Enter → calls onExecute prop
 */
export function SqlEditor({
  value,
  onChange,
  placeholder = 'SELECT * FROM ...',
  minHeight = DEFAULT_SQL_EDITOR_CONFIG.minHeight,
  'aria-label': ariaLabel = 'SQL Query Editor',
  onExecute,
}: SqlEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [tabTrapped, setTabTrapped] = useState(true);

  // Re-enable tab trapping when user types (resumes editing after Escape)
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      if (!tabTrapped) {
        setTabTrapped(true);
      }
    },
    [onChange, tabTrapped],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab → insert 2 spaces (only when tab trapping is active)
      if (e.key === 'Tab' && !e.shiftKey && tabTrapped) {
        e.preventDefault();
        // Use execCommand to preserve native undo/redo history
        document.execCommand('insertText', false, '  ');
        return;
      }

      // Escape → release focus trap
      if (e.key === 'Escape') {
        setTabTrapped(false);
        return;
      }

      // Ctrl/Cmd + Enter → execute query
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (onExecute) {
          onExecute();
        }
        return;
      }
    },
    [tabTrapped, onExecute],
  );

  // Compute line numbers from value
  const lineCount = useMemo(() => {
    if (!value) return 1;
    return value.split('\n').length;
  }, [value]);

  // Tokenize the value for syntax highlighting
  const tokens: Token[] = useMemo(() => {
    if (!value) return [];
    return tokenize(value);
  }, [value]);

  // Sync textarea scroll with highlight layer
  const highlightRef = useRef<HTMLPreElement>(null);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Keep textarea value in sync with prop (for external updates)
  useEffect(() => {
    if (textareaRef.current && textareaRef.current.value !== value) {
      textareaRef.current.value = value;
    }
  }, [value]);

  return (
    <div
      className="relative flex border border-gray-300 rounded bg-white font-mono text-sm"
      style={{ minHeight: `${minHeight}px` }}
    >
      {/* Line numbers gutter */}
      <div
        className="flex-shrink-0 bg-gray-50 border-r border-gray-200 text-gray-400 text-right select-none py-2 px-2"
        aria-hidden="true"
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i + 1} className="leading-5">
            {i + 1}
          </div>
        ))}
      </div>

      {/* Editor area (highlight + textarea layered) */}
      <div className="relative flex-1 overflow-hidden">
        {/* Syntax-highlighted layer */}
        <pre
          ref={highlightRef}
          className="absolute inset-0 m-0 p-2 overflow-hidden pointer-events-none whitespace-pre-wrap break-words leading-5"
          aria-hidden="true"
        >
          <code>
            {value === '' ? (
              <span className="text-gray-400">{placeholder}</span>
            ) : (
              tokens.map((token, idx) => (
                <span key={idx} className={TOKEN_CLASSES[token.type]}>
                  {token.value}
                </span>
              ))
            )}
          </code>
        </pre>

        {/* Hidden textarea for input capture */}
        <textarea
          ref={textareaRef}
          className="relative w-full h-full m-0 p-2 bg-transparent text-transparent caret-gray-800 resize-none outline-none leading-5 whitespace-pre-wrap break-words"
          style={{ minHeight: `${minHeight}px` }}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          aria-label={ariaLabel}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          placeholder=""
        />
      </div>
    </div>
  );
}
