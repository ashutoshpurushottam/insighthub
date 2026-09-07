import { describe, it, expect } from 'vitest';

import {
  accessLevelLabel,
  accessRightSchema,
  validateAccessRightTarget,
} from './schemas';

describe('access-rights schemas', () => {
  it('parses an access right', () => {
    const result = accessRightSchema.safeParse({
      reportId: 1,
      userId: 2,
      accessLevel: 'EDIT',
    });
    expect(result.success).toBe(true);
  });

  it('validates target and principal requirements', () => {
    expect(
      validateAccessRightTarget({
        reportId: null,
        reportGroupId: null,
        userId: 1,
        userGroupId: null,
        accessLevel: 'VIEW',
      }),
    ).toMatch(/report/i);

    expect(
      validateAccessRightTarget({
        reportId: 1,
        reportGroupId: null,
        userId: null,
        userGroupId: null,
        accessLevel: 'VIEW',
      }),
    ).toMatch(/user/i);

    expect(
      validateAccessRightTarget({
        reportId: 1,
        reportGroupId: null,
        userId: 2,
        userGroupId: null,
        accessLevel: 'VIEW',
      }),
    ).toBeNull();
  });

  it('labels access levels', () => {
    expect(accessLevelLabel('VIEW')).toBe('View');
    expect(accessLevelLabel('ADMIN')).toBe('Admin');
  });
});
