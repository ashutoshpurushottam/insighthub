import { z } from 'zod';

export const reportSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  shortDescription: z.string().max(254).optional(),
  reportGroupId: z.coerce.number().nullable().optional(),
  datasourceId: z.coerce.number().nullable().optional(),
  reportSource: z.string().optional(),
  active: z.boolean(),
});

export type ReportFormData = z.infer<typeof reportSchema>;
