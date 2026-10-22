import { describe, it, expect } from 'vitest';

import {
  formatFieldErrors,
  getErrorMessage,
  isAuthError,
  isForbiddenError,
  parseApiError,
} from './api-errors';

describe('api-errors', () => {
  it('extracts messages from Error and Axios-like objects', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
    expect(getErrorMessage('plain')).toBe('plain');
    expect(
      getErrorMessage({
        response: { data: { message: 'from server' }, status: 400 },
      }),
    ).toBe('from server');
    expect(
      getErrorMessage({
        response: { data: '  plain body  ', status: 500 },
      }),
    ).toBe('  plain body  ');
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
  });

  it('parses structured API errors', () => {
    const details = parseApiError({
      response: {
        status: 422,
        data: {
          message: 'Invalid',
          code: 'VALIDATION',
          fieldErrors: { name: 'required' },
        },
      },
    });

    expect(details.status).toBe(422);
    expect(details.code).toBe('VALIDATION');
    expect(details.fieldErrors?.name).toBe('required');
  });

  it('detects auth and forbidden statuses', () => {
    expect(isAuthError({ response: { status: 401 } })).toBe(true);
    expect(isForbiddenError({ response: { status: 403 } })).toBe(true);
    expect(isAuthError({ response: { status: 500 } })).toBe(false);
  });

  it('formats field errors', () => {
    expect(formatFieldErrors({ name: 'required', url: 'invalid' })).toBe(
      'name: required; url: invalid',
    );
    expect(formatFieldErrors(undefined)).toBeNull();
  });
});
