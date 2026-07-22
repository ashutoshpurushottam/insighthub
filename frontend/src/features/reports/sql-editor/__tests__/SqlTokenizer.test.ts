import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { tokenize } from '../SqlTokenizer';

describe('Feature: sql-editor-panel, Property 1: Tokenizer completeness (round-trip)', () => {
  /**
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.7**
   *
   * For any SQL string, the concatenation of all token `value` fields
   * returned by `tokenize(sql)` SHALL equal the original input string
   * exactly — no characters are lost or added during tokenization.
   */
  it('should preserve all characters: tokenize(s).map(t => t.value).join("") === s for arbitrary strings', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const tokens = tokenize(s);
        const reconstructed = tokens.map((t) => t.value).join('');
        expect(reconstructed).toBe(s);
      }),
      { numRuns: 100 },
    );
  });

  it('should preserve all characters for SQL-like content with keywords, strings, numbers, and comments', () => {
    // Custom arbitrary that generates SQL-like content fragments
    const sqlLikeArb = fc.oneof(
      // Plain SQL keywords mixed with identifiers
      fc.constantFrom(
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'INSERT', 'UPDATE', 'DELETE',
        'GROUP BY', 'ORDER BY', 'HAVING', 'UNION', 'LIMIT', 'AND', 'OR',
        'select', 'from', 'where', 'Select', 'From', 'Where',
      ),
      // Single-quoted strings (including escaped quotes)
      fc.string().map((s) => `'${s.replace(/'/g, "''")}'`),
      // Unclosed strings (edge case)
      fc.string().map((s) => `'${s}`),
      // Numeric literals
      fc.oneof(
        fc.integer().map(String),
        fc.double({ noNaN: true, noDefaultInfinity: true }).map(String),
        fc.tuple(fc.integer({ min: 1, max: 999 }), fc.integer({ min: 1, max: 20 }))
          .map(([base, exp]) => `${base}e${exp}`),
      ),
      // Single-line comments
      fc.string().map((s) => `--${s.replace(/\n/g, '')}\n`),
      // Multi-line comments
      fc.string().map((s) => `/*${s.replace(/\*\//g, '* /')}*/`),
      // Operators and punctuation
      fc.constantFrom('(', ')', ',', '.', ';', '*', '+', '-', '/', '=', '<', '>', '!='),
      // Whitespace
      fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 5 })
        .map((chars) => chars.join('')),
      // Random text (identifiers etc.)
      fc.string(),
    );

    const sqlStatementArb = fc.array(sqlLikeArb, { minLength: 1, maxLength: 20 }).map((parts) => parts.join(' '));

    fc.assert(
      fc.property(sqlStatementArb, (sql) => {
        const tokens = tokenize(sql);
        const reconstructed = tokens.map((t) => t.value).join('');
        expect(reconstructed).toBe(sql);
      }),
      { numRuns: 100 },
    );
  });

  it('should preserve all characters for strings with unicode characters', () => {
    const unicodeArb = fc.stringMatching(/^[\s\S]*$/);

    fc.assert(
      fc.property(unicodeArb, (s) => {
        const tokens = tokenize(s);
        const reconstructed = tokens.map((t) => t.value).join('');
        expect(reconstructed).toBe(s);
      }),
      { numRuns: 100 },
    );
  });

  it('should preserve all characters for strings containing SQL comment delimiters', () => {
    const commentDelimiterArb = fc.array(
      fc.oneof(
        fc.constant('--'),
        fc.constant('/*'),
        fc.constant('*/'),
        fc.constant('\n'),
        fc.constant("'"),
        fc.constant("''"),
        fc.array(fc.constantFrom('-', '/', '*', ' ', 'a', '1', '\n', '\t'), { minLength: 1, maxLength: 5 })
          .map((chars) => chars.join('')),
      ),
      { minLength: 1, maxLength: 10 },
    ).map((parts) => parts.join(''));

    fc.assert(
      fc.property(commentDelimiterArb, (s) => {
        const tokens = tokenize(s);
        const reconstructed = tokens.map((t) => t.value).join('');
        expect(reconstructed).toBe(s);
      }),
      { numRuns: 100 },
    );
  });
});


describe('Feature: sql-editor-panel, Property 3: Literal classification', () => {
  /**
   * **Validates: Requirements 1.2, 1.3, 1.4**
   *
   * For any valid single-quoted string literal (including those with '' escaped quotes),
   * tokenize SHALL produce a token with type: 'string'.
   * For any valid numeric literal (integer, decimal, scientific notation),
   * tokenize SHALL produce a token with type: 'number'.
   * For any valid comment (single-line -- or multi-line),
   * tokenize SHALL produce a token with type: 'comment'.
   */

  it('classifies valid single-quoted string literals as "string"', () => {
    // Generate valid string literal content: segments that are either
    // a non-quote character or an escaped quote ''
    const stringContentArb = fc
      .array(
        fc.oneof(
          // Regular printable characters (no single quotes)
          fc.array(
            fc.constantFrom(
              'a', 'b', 'c', 'x', 'y', 'z', '0', '1', '9',
              ' ', '-', '_', '.', ',', '!', '@', '#', '$',
            ),
            { minLength: 1, maxLength: 3 },
          ).map((chars) => chars.join('')),
          // Escaped single quote
          fc.constant("''"),
        ),
        { minLength: 0, maxLength: 15 },
      )
      .map((parts) => "'" + parts.join('') + "'");

    fc.assert(
      fc.property(stringContentArb, (literal) => {
        const tokens = tokenize(literal);
        // The entire literal should produce exactly one token of type 'string'
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('string');
        expect(tokens[0].value).toBe(literal);
      }),
      { numRuns: 100 },
    );
  });

  it('classifies valid numeric literals (integers) as "number"', () => {
    const integerArb = fc
      .integer({ min: 0, max: 999999999 })
      .map((n) => n.toString());

    fc.assert(
      fc.property(integerArb, (literal) => {
        const tokens = tokenize(literal);
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('number');
        expect(tokens[0].value).toBe(literal);
      }),
      { numRuns: 100 },
    );
  });

  it('classifies valid numeric literals (decimals) as "number"', () => {
    const decimalArb = fc
      .tuple(
        fc.integer({ min: 0, max: 99999 }),
        fc.integer({ min: 0, max: 99999 }),
      )
      .map(([intPart, fracPart]) => `${intPart}.${fracPart}`);

    fc.assert(
      fc.property(decimalArb, (literal) => {
        const tokens = tokenize(literal);
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('number');
        expect(tokens[0].value).toBe(literal);
      }),
      { numRuns: 100 },
    );
  });

  it('classifies valid numeric literals (scientific notation) as "number"', () => {
    const scientificArb = fc
      .tuple(
        fc.integer({ min: 1, max: 999 }),
        fc.constantFrom('e', 'E'),
        fc.constantFrom('', '+', '-'),
        fc.integer({ min: 1, max: 99 }),
      )
      .map(([base, e, sign, exp]) => `${base}${e}${sign}${exp}`);

    fc.assert(
      fc.property(scientificArb, (literal) => {
        const tokens = tokenize(literal);
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('number');
        expect(tokens[0].value).toBe(literal);
      }),
      { numRuns: 100 },
    );
  });

  it('classifies valid single-line comments as "comment"', () => {
    // Single-line comment: -- followed by content (no newlines)
    const singleLineCommentArb = fc
      .array(
        fc.constantFrom(
          'a', 'b', 'c', 'x', 'y', 'z', '0', '1', '9',
          ' ', '-', '_', '.', ',', '!', '@', '#', '$', '*', '/',
        ),
        { minLength: 0, maxLength: 40 },
      )
      .map((chars) => `--${chars.join('')}`);

    fc.assert(
      fc.property(singleLineCommentArb, (literal) => {
        const tokens = tokenize(literal);
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('comment');
        expect(tokens[0].value).toBe(literal);
      }),
      { numRuns: 100 },
    );
  });

  it('classifies valid multi-line comments as "comment"', () => {
    // Multi-line comment: /* content */ where content doesn't contain */
    const multiLineCommentArb = fc
      .array(
        fc.constantFrom(
          'a', 'b', 'c', 'x', 'y', 'z', '0', '1', '9',
          ' ', '-', '_', '.', ',', '!', '\n', '\t',
        ),
        { minLength: 0, maxLength: 40 },
      )
      .map((chars) => `/*${chars.join('')}*/`);

    fc.assert(
      fc.property(multiLineCommentArb, (literal) => {
        const tokens = tokenize(literal);
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe('comment');
        expect(tokens[0].value).toBe(literal);
      }),
      { numRuns: 100 },
    );
  });
});


// ============================================================
// Unit Tests for SqlTokenizer
// ============================================================

describe('SqlTokenizer - Unit Tests', () => {
  /**
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.7**
   */

  describe('basic SQL statement tokenization', () => {
    it('tokenizes SELECT * FROM users correctly', () => {
      const tokens = tokenize('SELECT * FROM users');
      expect(tokens).toEqual([
        { type: 'keyword', value: 'SELECT' },
        { type: 'default', value: ' ' },
        { type: 'default', value: '*' },
        { type: 'default', value: ' ' },
        { type: 'keyword', value: 'FROM' },
        { type: 'default', value: ' ' },
        { type: 'default', value: 'users' },
      ]);
    });

    it('tokenizes SELECT name FROM users WHERE age > 18 with proper token sequence', () => {
      const tokens = tokenize('SELECT name FROM users WHERE age > 18');

      // SELECT → keyword
      expect(tokens[0]).toEqual({ type: 'keyword', value: 'SELECT' });
      // space → default
      expect(tokens[1]).toEqual({ type: 'default', value: ' ' });
      // name → default (identifier)
      expect(tokens[2]).toEqual({ type: 'default', value: 'name' });
      // space → default
      expect(tokens[3]).toEqual({ type: 'default', value: ' ' });
      // FROM → keyword
      expect(tokens[4]).toEqual({ type: 'keyword', value: 'FROM' });
      // space → default
      expect(tokens[5]).toEqual({ type: 'default', value: ' ' });
      // users → default (identifier)
      expect(tokens[6]).toEqual({ type: 'default', value: 'users' });
      // space → default
      expect(tokens[7]).toEqual({ type: 'default', value: ' ' });
      // WHERE → keyword
      expect(tokens[8]).toEqual({ type: 'keyword', value: 'WHERE' });
      // space → default
      expect(tokens[9]).toEqual({ type: 'default', value: ' ' });
      // age → default (identifier)
      expect(tokens[10]).toEqual({ type: 'default', value: 'age' });
      // space → default
      expect(tokens[11]).toEqual({ type: 'default', value: ' ' });
      // > → default (operator)
      expect(tokens[12]).toEqual({ type: 'default', value: '>' });
      // space → default
      expect(tokens[13]).toEqual({ type: 'default', value: ' ' });
      // 18 → number
      expect(tokens[14]).toEqual({ type: 'number', value: '18' });

      // Verify round-trip
      expect(tokens.map((t) => t.value).join('')).toBe('SELECT name FROM users WHERE age > 18');
    });
  });

  describe('edge cases: empty and whitespace input', () => {
    it('returns an empty array for an empty string', () => {
      const tokens = tokenize('');
      expect(tokens).toEqual([]);
    });

    it('returns default tokens for whitespace-only input', () => {
      const tokens = tokenize('   \t\n  ');
      // All tokens should be of type 'default'
      expect(tokens.length).toBeGreaterThan(0);
      for (const token of tokens) {
        expect(token.type).toBe('default');
      }
      // Round-trip preserved
      expect(tokens.map((t) => t.value).join('')).toBe('   \t\n  ');
    });
  });

  describe('string literals', () => {
    it('tokenizes a simple string literal', () => {
      const tokens = tokenize("'hello world'");
      expect(tokens).toEqual([{ type: 'string', value: "'hello world'" }]);
    });

    it('tokenizes string literals with escaped single quotes (double-quote escape)', () => {
      const tokens = tokenize("'it''s a test'");
      expect(tokens).toEqual([{ type: 'string', value: "'it''s a test'" }]);
    });

    it('tokenizes multiple escaped quotes in a string', () => {
      const tokens = tokenize("'she said ''hi'' to me'");
      expect(tokens).toEqual([{ type: 'string', value: "'she said ''hi'' to me'" }]);
    });

    it('tokenizes an empty string literal', () => {
      const tokens = tokenize("''");
      expect(tokens).toEqual([{ type: 'string', value: "''" }]);
    });
  });

  describe('numeric literals', () => {
    it('tokenizes integers', () => {
      const tokens = tokenize('42');
      expect(tokens).toEqual([{ type: 'number', value: '42' }]);
    });

    it('tokenizes decimal numbers', () => {
      const tokens = tokenize('3.14');
      expect(tokens).toEqual([{ type: 'number', value: '3.14' }]);
    });

    it('tokenizes numbers starting with a decimal point', () => {
      const tokens = tokenize('.5');
      expect(tokens).toEqual([{ type: 'number', value: '.5' }]);
    });

    it('tokenizes scientific notation (lowercase e)', () => {
      const tokens = tokenize('2.5e10');
      expect(tokens).toEqual([{ type: 'number', value: '2.5e10' }]);
    });

    it('tokenizes scientific notation (uppercase E)', () => {
      const tokens = tokenize('1E3');
      expect(tokens).toEqual([{ type: 'number', value: '1E3' }]);
    });

    it('tokenizes scientific notation with sign', () => {
      const tokens = tokenize('1.5e-3');
      expect(tokens).toEqual([{ type: 'number', value: '1.5e-3' }]);
    });

    it('tokenizes scientific notation with positive sign', () => {
      const tokens = tokenize('7e+2');
      expect(tokens).toEqual([{ type: 'number', value: '7e+2' }]);
    });
  });

  describe('comments', () => {
    it('tokenizes single-line comments (-- to end of line)', () => {
      const tokens = tokenize('-- this is a comment');
      expect(tokens).toEqual([{ type: 'comment', value: '-- this is a comment' }]);
    });

    it('tokenizes single-line comment followed by a newline and more code', () => {
      const tokens = tokenize('-- comment\nSELECT');
      expect(tokens).toEqual([
        { type: 'comment', value: '-- comment' },
        { type: 'default', value: '\n' },
        { type: 'keyword', value: 'SELECT' },
      ]);
    });

    it('tokenizes multi-line comments', () => {
      const tokens = tokenize('/* multi\nline */');
      expect(tokens).toEqual([{ type: 'comment', value: '/* multi\nline */' }]);
    });

    it('tokenizes multi-line comments with nested asterisks', () => {
      const tokens = tokenize('/* inner * star */');
      expect(tokens).toEqual([{ type: 'comment', value: '/* inner * star */' }]);
    });

    it('handles nested comment delimiters (no true nesting support, closes at first */)', () => {
      // SQL doesn't standardize nested comments; our tokenizer closes at first */
      const input = '/* outer /* inner */ still_outside';
      const tokens = tokenize(input);
      // The comment ends at the first */
      expect(tokens[0]).toEqual({ type: 'comment', value: '/* outer /* inner */' });
      // Remaining text is tokenized normally
      const remaining = tokens.slice(1).map((t) => t.value).join('');
      expect(remaining).toBe(' still_outside');
      // Round-trip preserved
      expect(tokens.map((t) => t.value).join('')).toBe(input);
    });

    it('handles unclosed multi-line comments (consumes rest of input)', () => {
      const tokens = tokenize('/* unclosed comment');
      expect(tokens).toEqual([{ type: 'comment', value: '/* unclosed comment' }]);
    });
  });

  describe('keyword case insensitivity', () => {
    it('recognizes uppercase keywords', () => {
      const tokens = tokenize('SELECT FROM WHERE');
      const keywordTokens = tokens.filter((t) => t.type === 'keyword');
      expect(keywordTokens.map((t) => t.value)).toEqual(['SELECT', 'FROM', 'WHERE']);
    });

    it('recognizes lowercase keywords', () => {
      const tokens = tokenize('select from where');
      const keywordTokens = tokens.filter((t) => t.type === 'keyword');
      expect(keywordTokens.map((t) => t.value)).toEqual(['select', 'from', 'where']);
    });

    it('recognizes mixed-case keywords', () => {
      const tokens = tokenize('SeLeCt FrOm WhErE');
      const keywordTokens = tokens.filter((t) => t.type === 'keyword');
      expect(keywordTokens.map((t) => t.value)).toEqual(['SeLeCt', 'FrOm', 'WhErE']);
    });
  });

  describe('very long input (performance and correctness)', () => {
    it('handles very long input (5000+ characters) correctly', () => {
      // Build a SQL string with 5000+ characters
      const repeatedQuery = 'SELECT id, name FROM users WHERE active = 1; ';
      const repetitions = Math.ceil(5100 / repeatedQuery.length);
      const longInput = repeatedQuery.repeat(repetitions);

      expect(longInput.length).toBeGreaterThan(5000);

      const tokens = tokenize(longInput);

      // Round-trip preserved
      expect(tokens.map((t) => t.value).join('')).toBe(longInput);

      // Contains expected token types
      const types = new Set(tokens.map((t) => t.type));
      expect(types.has('keyword')).toBe(true);
      expect(types.has('number')).toBe(true);
      expect(types.has('default')).toBe(true);
    });

    it('handles long string containing only one token type', () => {
      const longComment = '-- ' + 'a'.repeat(5000);
      const tokens = tokenize(longComment);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe('comment');
      expect(tokens[0].value).toBe(longComment);
    });
  });

  describe('complex SQL statements', () => {
    it('tokenizes a query with string, number, keyword, and comment tokens', () => {
      const sql = "SELECT name FROM users WHERE age > 21 AND city = 'NYC' -- filter";
      const tokens = tokenize(sql);

      // Verify token types for key positions
      expect(tokens.find((t) => t.value === 'SELECT')?.type).toBe('keyword');
      expect(tokens.find((t) => t.value === 'FROM')?.type).toBe('keyword');
      expect(tokens.find((t) => t.value === 'WHERE')?.type).toBe('keyword');
      expect(tokens.find((t) => t.value === 'AND')?.type).toBe('keyword');
      expect(tokens.find((t) => t.value === '21')?.type).toBe('number');
      expect(tokens.find((t) => t.value === "'NYC'")?.type).toBe('string');
      expect(tokens.find((t) => t.value === '-- filter')?.type).toBe('comment');
      expect(tokens.find((t) => t.value === 'name')?.type).toBe('default');
      expect(tokens.find((t) => t.value === 'users')?.type).toBe('default');

      // Round-trip
      expect(tokens.map((t) => t.value).join('')).toBe(sql);
    });

    it('tokenizes multi-line SQL with various constructs', () => {
      const sql = `SELECT
  COUNT(*) AS total,
  AVG(price) AS avg_price
FROM products
WHERE category IN ('electronics', 'books')
/* only active */
AND active = 1`;

      const tokens = tokenize(sql);

      // Round-trip
      expect(tokens.map((t) => t.value).join('')).toBe(sql);

      // Verify key tokens
      const keywords = tokens.filter((t) => t.type === 'keyword').map((t) => t.value.toUpperCase());
      expect(keywords).toContain('SELECT');
      expect(keywords).toContain('COUNT');
      expect(keywords).toContain('AS');
      expect(keywords).toContain('AVG');
      expect(keywords).toContain('FROM');
      expect(keywords).toContain('WHERE');
      expect(keywords).toContain('IN');
      expect(keywords).toContain('AND');

      // Verify strings
      const strings = tokens.filter((t) => t.type === 'string').map((t) => t.value);
      expect(strings).toContain("'electronics'");
      expect(strings).toContain("'books'");

      // Verify comment
      const comments = tokens.filter((t) => t.type === 'comment').map((t) => t.value);
      expect(comments).toContain('/* only active */');

      // Verify numbers
      const numbers = tokens.filter((t) => t.type === 'number').map((t) => t.value);
      expect(numbers).toContain('1');
    });
  });

  describe('token type validity', () => {
    it('only produces valid token types', () => {
      const sql = "SELECT 'text' FROM t WHERE x = 3.14 -- end\n/* block */";
      const tokens = tokenize(sql);
      const validTypes = new Set(['keyword', 'string', 'number', 'comment', 'default']);
      for (const token of tokens) {
        expect(validTypes.has(token.type)).toBe(true);
        expect(token.value.length).toBeGreaterThan(0);
      }
    });
  });
});
