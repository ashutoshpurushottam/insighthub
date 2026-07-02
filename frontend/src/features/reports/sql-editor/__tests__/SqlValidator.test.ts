import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

import { validateSql } from '../SqlValidator';

describe('SqlValidator', () => {
  describe('Check 1: Empty/whitespace-only', () => {
    it('returns empty error for empty string', () => {
      const errors = validateSql('');
      expect(errors).toContainEqual({
        type: 'empty',
        message: 'SQL query cannot be empty',
      });
    });

    it('returns empty error for whitespace-only string', () => {
      const errors = validateSql('   \t\n  ');
      expect(errors).toContainEqual({
        type: 'empty',
        message: 'SQL query cannot be empty',
      });
    });

    it('does not return empty error for valid SQL', () => {
      const errors = validateSql('SELECT 1');
      const emptyErrors = errors.filter((e) => e.type === 'empty');
      expect(emptyErrors).toHaveLength(0);
    });
  });

  describe('Check 2: Unbalanced parentheses', () => {
    it('returns error for unmatched opening parenthesis', () => {
      const errors = validateSql('SELECT (1');
      expect(errors).toContainEqual({
        type: 'unbalanced-parentheses',
        message: 'Unbalanced parentheses',
      });
    });

    it('returns error for unmatched closing parenthesis', () => {
      const errors = validateSql('SELECT 1)');
      expect(errors).toContainEqual({
        type: 'unbalanced-parentheses',
        message: 'Unbalanced parentheses',
      });
    });

    it('does not flag balanced parentheses', () => {
      const errors = validateSql('SELECT COUNT(*)');
      const parenErrors = errors.filter(
        (e) => e.type === 'unbalanced-parentheses'
      );
      expect(parenErrors).toHaveLength(0);
    });

    it('ignores parentheses inside string literals', () => {
      const errors = validateSql("SELECT '(' FROM t");
      const parenErrors = errors.filter(
        (e) => e.type === 'unbalanced-parentheses'
      );
      expect(parenErrors).toHaveLength(0);
    });

    it('ignores parentheses inside single-line comments', () => {
      const errors = validateSql('SELECT 1 -- (\n FROM t');
      const parenErrors = errors.filter(
        (e) => e.type === 'unbalanced-parentheses'
      );
      expect(parenErrors).toHaveLength(0);
    });

    it('ignores parentheses inside multi-line comments', () => {
      const errors = validateSql('SELECT /* ( */ 1 FROM t');
      const parenErrors = errors.filter(
        (e) => e.type === 'unbalanced-parentheses'
      );
      expect(parenErrors).toHaveLength(0);
    });
  });

  describe('Check 3: Unclosed string literal', () => {
    it('returns error for unclosed string', () => {
      const errors = validateSql("SELECT 'hello");
      expect(errors).toContainEqual({
        type: 'unclosed-string',
        message: 'Unclosed string literal',
      });
    });

    it('does not flag properly closed strings', () => {
      const errors = validateSql("SELECT 'hello' FROM t");
      const stringErrors = errors.filter((e) => e.type === 'unclosed-string');
      expect(stringErrors).toHaveLength(0);
    });

    it('handles escaped quotes correctly (double single quote)', () => {
      const errors = validateSql("SELECT 'it''s fine' FROM t");
      const stringErrors = errors.filter((e) => e.type === 'unclosed-string');
      expect(stringErrors).toHaveLength(0);
    });

    it('ignores quotes inside single-line comments', () => {
      const errors = validateSql("SELECT 1 -- don't worry\nFROM t");
      const stringErrors = errors.filter((e) => e.type === 'unclosed-string');
      expect(stringErrors).toHaveLength(0);
    });

    it('ignores quotes inside multi-line comments', () => {
      const errors = validateSql("SELECT /* it's a comment */ 1 FROM t");
      const stringErrors = errors.filter((e) => e.type === 'unclosed-string');
      expect(stringErrors).toHaveLength(0);
    });
  });

  describe('Multiple errors simultaneously', () => {
    it('returns both unbalanced-parentheses and unclosed-string', () => {
      const errors = validateSql("SELECT (1, 'hello");
      const types = errors.map((e) => e.type);
      expect(types).toContain('unbalanced-parentheses');
      expect(types).toContain('unclosed-string');
    });

    it('returns all three errors for empty string (only empty applies)', () => {
      const errors = validateSql('');
      // Empty string only triggers the empty check
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('empty');
    });

    it('returns empty + unbalanced + unclosed for whitespace with parens issue', () => {
      // Actually whitespace-only won't have parens/quotes... test a realistic multi-error case
      const errors = validateSql("(('hello");
      const types = errors.map((e) => e.type);
      expect(types).toContain('unbalanced-parentheses');
      expect(types).toContain('unclosed-string');
    });
  });

  describe('Valid SQL returns no errors', () => {
    it('returns empty array for simple SELECT', () => {
      expect(validateSql('SELECT * FROM users')).toEqual([]);
    });

    it('returns empty array for complex query with balanced parens and strings', () => {
      const sql = "SELECT COUNT(*) FROM users WHERE name = 'John' AND (age > 18 OR status = 'active')";
      expect(validateSql(sql)).toEqual([]);
    });

    it('returns empty array for query with comments', () => {
      const sql = "-- This is a comment\nSELECT /* another comment */ * FROM users";
      expect(validateSql(sql)).toEqual([]);
    });

    it('returns empty array for query with quotes inside single-line comments', () => {
      const sql = "SELECT -- 'unclosed\nFROM t";
      expect(validateSql(sql)).toEqual([]);
    });

    it('returns empty array for query with properly escaped quotes', () => {
      const sql = "SELECT 'it''s' FROM t";
      expect(validateSql(sql)).toEqual([]);
    });

    it('returns empty array for query with parentheses inside strings', () => {
      const sql = "SELECT '(' FROM t";
      expect(validateSql(sql)).toEqual([]);
    });

    it('returns empty array for nested subqueries with balanced parens', () => {
      const sql = "SELECT * FROM (SELECT id FROM (SELECT id FROM users) sub1) sub2";
      expect(validateSql(sql)).toEqual([]);
    });

    it('returns empty array for query with multiple string literals', () => {
      const sql = "SELECT * FROM users WHERE name = 'Alice' AND status = 'active'";
      expect(validateSql(sql)).toEqual([]);
    });

    it('returns empty array for query with multi-line comment containing quotes and parens', () => {
      const sql = "SELECT /* it's (not) a problem */ * FROM t";
      expect(validateSql(sql)).toEqual([]);
    });
  });

  describe('Specific invalid input cases', () => {
    it('detects unbalanced parentheses in SELECT (a FROM b', () => {
      const errors = validateSql('SELECT (a FROM b');
      expect(errors).toContainEqual({
        type: 'unbalanced-parentheses',
        message: 'Unbalanced parentheses',
      });
    });

    it('detects extra closing parenthesis in SELECT a) FROM b', () => {
      const errors = validateSql('SELECT a) FROM b');
      expect(errors).toContainEqual({
        type: 'unbalanced-parentheses',
        message: 'Unbalanced parentheses',
      });
    });

    it("detects unclosed string in SELECT 'hello FROM users", () => {
      const errors = validateSql("SELECT 'hello FROM users");
      expect(errors).toContainEqual({
        type: 'unclosed-string',
        message: 'Unclosed string literal',
      });
    });

    it('detects multiple errors: unbalanced parens and unclosed string', () => {
      const errors = validateSql("SELECT (a, 'hello FROM b");
      const types = errors.map((e) => e.type);
      expect(types).toContain('unbalanced-parentheses');
      expect(types).toContain('unclosed-string');
      expect(errors.length).toBe(2);
    });

    it('detects multiple nested unbalanced parentheses', () => {
      const errors = validateSql('SELECT ((a, b FROM t');
      expect(errors).toContainEqual({
        type: 'unbalanced-parentheses',
        message: 'Unbalanced parentheses',
      });
    });

    it('detects unclosed string at end of complex query', () => {
      const errors = validateSql("SELECT a FROM b WHERE c = 'value");
      expect(errors).toContainEqual({
        type: 'unclosed-string',
        message: 'Unclosed string literal',
      });
    });
  });

  describe('Property 4: Empty/whitespace validation', () => {
    /**
     * **Validates: Requirements 2.2**
     *
     * For any string composed entirely of whitespace characters (spaces, tabs,
     * newlines, or the empty string), validateSql SHALL return an error array
     * containing an error of type 'empty' with message "SQL query cannot be empty".
     */
    it('returns empty error for any whitespace-only string', () => {
      const whitespaceArb = fc
        .array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 0, maxLength: 50 })
        .map((chars) => chars.join(''));

      fc.assert(
        fc.property(whitespaceArb, (whitespaceString) => {
          const errors = validateSql(whitespaceString);
          const emptyErrors = errors.filter((e) => e.type === 'empty');
          expect(emptyErrors).toHaveLength(1);
          expect(emptyErrors[0]).toEqual({
            type: 'empty',
            message: 'SQL query cannot be empty',
          });
        }),
        { numRuns: 100 }
      );
    });

    it('returns empty error for the empty string', () => {
      const errors = validateSql('');
      const emptyErrors = errors.filter((e) => e.type === 'empty');
      expect(emptyErrors).toHaveLength(1);
      expect(emptyErrors[0]).toEqual({
        type: 'empty',
        message: 'SQL query cannot be empty',
      });
    });
  });

  describe('Property 5: Parenthesis balance validation', () => {
    /**
     * **Validates: Requirements 2.3**
     *
     * For any SQL string where the count of '(' characters outside string literals
     * and comments differs from the count of ')' characters outside string literals
     * and comments, validateSql SHALL return an error of type 'unbalanced-parentheses'.
     */

    // Arbitrary for generating safe SQL content (no quotes, no comment starters, no parens)
    const safeSqlContent = fc
      .array(
        fc.constantFrom(
          'a', 'b', 'c', 'x', 'y', 'z',
          '1', '2', '3',
          ' ', ',', '+', '=', '<', '>'
        ),
        { minLength: 1, maxLength: 20 }
      )
      .map((chars) => chars.join(''));

    it('detects extra opening parentheses', () => {
      fc.assert(
        fc.property(
          safeSqlContent,
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 0, max: 5 }),
          (content, extraOpen, balanced) => {
            // Build a string with more '(' than ')'
            const balancedPart = '('.repeat(balanced) + content + ')'.repeat(balanced);
            const sql = 'SELECT ' + '('.repeat(extraOpen) + balancedPart;
            const errors = validateSql(sql);
            const parenErrors = errors.filter(
              (e) => e.type === 'unbalanced-parentheses'
            );
            expect(parenErrors).toHaveLength(1);
            expect(parenErrors[0].type).toBe('unbalanced-parentheses');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('detects extra closing parentheses', () => {
      fc.assert(
        fc.property(
          safeSqlContent,
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 0, max: 5 }),
          (content, extraClose, balanced) => {
            // Build a string with more ')' than '('
            const balancedPart = '('.repeat(balanced) + content + ')'.repeat(balanced);
            const sql = 'SELECT ' + balancedPart + ')'.repeat(extraClose);
            const errors = validateSql(sql);
            const parenErrors = errors.filter(
              (e) => e.type === 'unbalanced-parentheses'
            );
            expect(parenErrors).toHaveLength(1);
            expect(parenErrors[0].type).toBe('unbalanced-parentheses');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('detects imbalance when open count differs from close count', () => {
      fc.assert(
        fc.property(
          safeSqlContent,
          fc.integer({ min: 0, max: 5 }),
          fc.integer({ min: 0, max: 5 }),
          (content, openCount, closeCount) => {
            // Only test when counts actually differ
            fc.pre(openCount !== closeCount);
            const sql = 'SELECT ' + '('.repeat(openCount) + content + ')'.repeat(closeCount);
            const errors = validateSql(sql);
            const parenErrors = errors.filter(
              (e) => e.type === 'unbalanced-parentheses'
            );
            expect(parenErrors).toHaveLength(1);
            expect(parenErrors[0].type).toBe('unbalanced-parentheses');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('does not flag balanced parentheses outside strings and comments', () => {
      fc.assert(
        fc.property(
          safeSqlContent,
          fc.integer({ min: 0, max: 5 }),
          (content, balanced) => {
            // Equal number of open and close parens outside strings/comments
            const sql = 'SELECT ' + '('.repeat(balanced) + content + ')'.repeat(balanced);
            const errors = validateSql(sql);
            const parenErrors = errors.filter(
              (e) => e.type === 'unbalanced-parentheses'
            );
            expect(parenErrors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Unclosed string validation', () => {
    /**
     * **Validates: Requirements 2.4**
     *
     * For any SQL string containing an odd number of unescaped single-quote
     * characters outside of comments, validateSql SHALL return an error of
     * type 'unclosed-string'.
     */

    // Arbitrary for generating safe SQL prefix (no single quotes, no comment starters)
    const safePrefixArb = fc
      .array(
        fc.constantFrom(
          'S', 'E', 'L', 'C', 'T', ' ',
          'a', 'b', 'c', 'x', 'y', 'z',
          '1', '2', '3',
          ',', '+', '=', '<', '>', '(', ')'
        ),
        { minLength: 1, maxLength: 20 }
      )
      .map((chars) => chars.join(''));

    // Arbitrary for generating content after the unclosed quote (no single quotes)
    const noQuoteContentArb = fc
      .array(
        fc.constantFrom(
          'a', 'b', 'c', 'd', 'e', 'f',
          'x', 'y', 'z',
          '1', '2', '3',
          ' ', ',', '+', '=', '<', '>'
        ),
        { minLength: 0, maxLength: 20 }
      )
      .map((chars) => chars.join(''));

    it('detects unclosed string when a single quote opens but never closes', () => {
      fc.assert(
        fc.property(
          safePrefixArb,
          noQuoteContentArb,
          (prefix, afterQuote) => {
            // Build SQL with exactly one unescaped single quote (unclosed string)
            const sql = 'SELECT ' + prefix + "'" + afterQuote;
            const errors = validateSql(sql);
            const stringErrors = errors.filter(
              (e) => e.type === 'unclosed-string'
            );
            expect(stringErrors).toHaveLength(1);
            expect(stringErrors[0].type).toBe('unclosed-string');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('detects unclosed string with multiple closed strings plus one trailing open quote', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 3 }),
          noQuoteContentArb,
          noQuoteContentArb,
          (closedCount, closedContent, trailingContent) => {
            // Build SQL with some properly closed strings then one unclosed
            const closedStrings = Array.from(
              { length: closedCount },
              () => "'" + closedContent + "'"
            ).join(' AND col = ');
            const prefix = closedCount > 0
              ? 'SELECT ' + closedStrings + ' AND val = '
              : 'SELECT ';
            const sql = prefix + "'" + trailingContent;
            const errors = validateSql(sql);
            const stringErrors = errors.filter(
              (e) => e.type === 'unclosed-string'
            );
            expect(stringErrors).toHaveLength(1);
            expect(stringErrors[0].type).toBe('unclosed-string');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('does not flag properly closed strings (even number of unescaped quotes)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 4 }),
          noQuoteContentArb,
          (pairCount, content) => {
            // Build SQL with properly paired single quotes
            const closedStrings = Array.from(
              { length: pairCount },
              () => "'" + content + "'"
            ).join(', ');
            const sql = 'SELECT ' + closedStrings;
            const errors = validateSql(sql);
            const stringErrors = errors.filter(
              (e) => e.type === 'unclosed-string'
            );
            expect(stringErrors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
