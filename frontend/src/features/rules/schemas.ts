import { z } from 'zod';

export const ruleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
});

export type RuleFormData = z.infer<typeof ruleSchema>;

export const ruleValueSchema = z.object({
  userId: z.coerce.number().min(1, 'User is required'),
  ruleValue: z.string().min(1, 'Value is required').max(2000),
});

export type RuleValueFormData = z.infer<typeof ruleValueSchema>;
