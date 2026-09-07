import { z } from 'zod';

export const accessRightSchema = z.object({
  reportId: z.coerce.number().optional().nullable(),
  reportGroupId: z.coerce.number().optional().nullable(),
  userId: z.coerce.number().optional().nullable(),
  userGroupId: z.coerce.number().optional().nullable(),
  accessLevel: z.enum(['VIEW', 'EDIT', 'ADMIN']).default('VIEW'),
});

export type AccessRightFormData = z.infer<typeof accessRightSchema>;

/**
 * An access right must target a report OR report group, and a user OR user group.
 */
export function validateAccessRightTarget(data: AccessRightFormData): string | null {
  const hasReportTarget = !!data.reportId || !!data.reportGroupId;
  const hasPrincipal = !!data.userId || !!data.userGroupId;

  if (!hasReportTarget) {
    return 'Select a report or report group';
  }
  if (!hasPrincipal) {
    return 'Select a user or user group';
  }
  return null;
}

export function accessLevelLabel(level: string): string {
  switch (level.toUpperCase()) {
    case 'VIEW':
      return 'View';
    case 'EDIT':
      return 'Edit';
    case 'ADMIN':
      return 'Admin';
    default:
      return level;
  }
}
