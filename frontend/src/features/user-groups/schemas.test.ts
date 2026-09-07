import { describe, it, expect } from 'vitest';

import { toggleIdInList, userGroupSchema } from './schemas';

describe('user-groups schemas', () => {
  it('parses a user group with defaults', () => {
    const result = userGroupSchema.safeParse({ name: 'Admins' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.memberIds).toEqual([]);
      expect(result.data.roleIds).toEqual([]);
    }
  });

  it('toggles ids in a list', () => {
    expect(toggleIdInList([1, 2], 3)).toEqual([1, 2, 3]);
    expect(toggleIdInList([1, 2, 3], 2)).toEqual([1, 3]);
  });
});
