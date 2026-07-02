import type { ValidationError } from './sql-editor.types';

/**
 * Validates a SQL string for structural issues.
 * Returns all applicable errors simultaneously (not just the first one found).
 *
 * Checks performed:
 * 1. Empty/whitespace-only input
 * 2. Unbalanced parentheses (outside string literals and comments)
 * 3. Unclosed string literal (odd number of unescaped single quotes outside comments)
 */
export function validateSql(sql: string): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check 1: Empty/whitespace-only
  if (sql.trim().length === 0) {
    errors.push({ type: 'empty', message: 'SQL query cannot be empty' });
  }

  // For checks 2 and 3, we scan the string while tracking whether we're
  // inside a string literal or comment, so we can correctly skip those regions.
  let openParens = 0;
  let closeParens = 0;
  let unescapedQuoteCount = 0;

  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];

    // Check for single-line comment: --
    if (ch === '-' && i + 1 < sql.length && sql[i + 1] === '-') {
      // Skip to end of line
      i += 2;
      while (i < sql.length && sql[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Check for multi-line comment: /* ... */
    if (ch === '/' && i + 1 < sql.length && sql[i + 1] === '*') {
      // Skip until closing */
      i += 2;
      while (i < sql.length) {
        if (sql[i] === '*' && i + 1 < sql.length && sql[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
      continue;
    }

    // Check for string literal: ' ... '
    if (ch === "'") {
      unescapedQuoteCount++;
      i++;
      // Scan through the string literal content
      while (i < sql.length) {
        if (sql[i] === "'") {
          // Check if this is an escaped quote ''
          if (i + 1 < sql.length && sql[i + 1] === "'") {
            // Escaped quote – skip both characters, don't count them
            i += 2;
          } else {
            // Closing quote
            unescapedQuoteCount++;
            i++;
            break;
          }
        } else {
          i++;
        }
      }
      continue;
    }

    // Outside comments and strings: count parentheses
    if (ch === '(') {
      openParens++;
    } else if (ch === ')') {
      closeParens++;
    }

    i++;
  }

  // Check 2: Unbalanced parentheses
  if (openParens !== closeParens) {
    errors.push({
      type: 'unbalanced-parentheses',
      message: 'Unbalanced parentheses',
    });
  }

  // Check 3: Unclosed string literal (odd number of unescaped quotes)
  if (unescapedQuoteCount % 2 !== 0) {
    errors.push({
      type: 'unclosed-string',
      message: 'Unclosed string literal',
    });
  }

  return errors;
}
