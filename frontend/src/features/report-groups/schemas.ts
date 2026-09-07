import { z } from 'zod';

export const reportGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(200).optional(),
});

export type ReportGroupFormData = z.infer<typeof reportGroupSchema>;
