import type { Token, TokenType } from './sql-editor.types';
import { SQL_KEYWORDS } from './sql-editor.types';

/**
 * Tokenizes a SQL string into an array of classified tokens.
 *
 * State-machine tokenizer that scans character-by-character, handling:
 * - SQL keywords (case-insensitive match against SQL_KEYWORDS)
 * - Single-quoted strings (with '' escape sequences)
 * - Numeric literals (integers, decimals, scientific notation)
 * - Single-line comments (--)
 * - Multi-line comments (/* ... *​/)
 * - Everything else → 'default'
 *
 * Key invariant: tokenize(s).map(t => t.value).join('') === s
 */
export function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  const len = sql.length;
  let i = 0;

  while (i < len) {
    const ch = sql[i];

    // --- Single-line comment: -- to end of line ---
    if (ch === '-' && i + 1 < len && sql[i + 1] === '-') {
      const start = i;
      i += 2;
      while (i < len && sql[i] !== '\n') {
        i++;
      }
      tokens.push({ type: 'comment', value: sql.slice(start, i) });
      continue;
    }

    // --- Multi-line comment: /* ... */ ---
    if (ch === '/' && i + 1 < len && sql[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i < len) {
        if (sql[i] === '*' && i + 1 < len && sql[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
      tokens.push({ type: 'comment', value: sql.slice(start, i) });
      continue;
    }

    // --- Single-quoted string literal ---
    if (ch === "'") {
      const start = i;
      i++; // skip opening quote
      while (i < len) {
        if (sql[i] === "'") {
          // Check for '' escape sequence
          if (i + 1 < len && sql[i + 1] === "'") {
            i += 2; // skip escaped quote
          } else {
            i++; // skip closing quote
            break;
          }
        } else {
          i++;
        }
      }
      tokens.push({ type: 'string', value: sql.slice(start, i) });
      continue;
    }

    // --- Numeric literal (integers, decimals, scientific notation) ---
    if (isDigit(ch) || (ch === '.' && i + 1 < len && isDigit(sql[i + 1]))) {
      const start = i;
      i = scanNumber(sql, i);
      tokens.push({ type: 'number', value: sql.slice(start, i) });
      continue;
    }

    // --- Word (potential keyword or identifier → default) ---
    if (isWordStart(ch)) {
      const start = i;
      i++;
      while (i < len && isWordChar(sql[i])) {
        i++;
      }
      const word = sql.slice(start, i);
      const type: TokenType = SQL_KEYWORDS.has(word.toUpperCase())
        ? 'keyword'
        : 'default';
      tokens.push({ type, value: word });
      continue;
    }

    // --- Default: any other single character ---
    tokens.push({ type: 'default', value: ch });
    i++;
  }

  return tokens;
}

/** Check if character is a digit 0-9 */
function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

/** Check if character can start a word (letter or underscore) */
function isWordStart(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

/** Check if character can continue a word (letter, digit, or underscore) */
function isWordChar(ch: string): boolean {
  return isWordStart(ch) || isDigit(ch);
}

/**
 * Scan a numeric literal starting at position i.
 * Handles integers, decimals, and scientific notation (e.g., 2.5e10, 1E-3).
 * Returns the new position after the number.
 */
function scanNumber(sql: string, i: number): number {
  const len = sql.length;

  // Integer part (may be empty if we started with '.')
  while (i < len && isDigit(sql[i])) {
    i++;
  }

  // Decimal part
  if (i < len && sql[i] === '.') {
    i++;
    while (i < len && isDigit(sql[i])) {
      i++;
    }
  }

  // Scientific notation part (e or E, optionally followed by + or -)
  if (i < len && (sql[i] === 'e' || sql[i] === 'E')) {
    const next = i + 1;
    if (next < len) {
      if (isDigit(sql[next])) {
        i = next + 1;
        while (i < len && isDigit(sql[i])) {
          i++;
        }
      } else if ((sql[next] === '+' || sql[next] === '-') && next + 1 < len && isDigit(sql[next + 1])) {
        i = next + 2;
        while (i < len && isDigit(sql[i])) {
          i++;
        }
      }
    }
  }

  return i;
}
