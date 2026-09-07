import { describe, it, expect } from 'vitest';

import { cn } from './utils';

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('ignores falsy values', () => {
    expect(cn('block', false && 'hidden', null, undefined, 'text-sm')).toBe(
      'block text-sm',
    );
  });

  it('merges conflicting Tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });
});
