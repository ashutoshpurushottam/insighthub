import { z } from 'zod';

export const userGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().default(''),
  memberIds: z.array(z.number()).default([]),
  roleIds: z.array(z.number()).default([]),
});

export type UserGroupFormData = z.infer<typeof userGroupSchema>;

export function toggleIdInList(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}
