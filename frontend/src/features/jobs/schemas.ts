import { z } from 'zod';

export const JOB_FORM_TYPES = [
  'EMAIL_ATTACHMENT',
  'EMAIL_INLINE',
  'PUBLISH',
  'ALERT',
  'BURST',
  'CONDITIONAL_EMAIL_ATTACHMENT',
  'CONDITIONAL_EMAIL_INLINE',
  'CONDITIONAL_PUBLISH',
  'JUST_RUN_IT',
] as const;

export const OUTPUT_FORMATS = ['CSV', 'XLSX', 'PDF', 'HTML'] as const;

export const jobModalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  reportId: z.coerce.number().min(1, 'Report is required'),
  scheduleId: z.coerce.number().nullable().optional(),
  jobType: z.string().min(1),
  outputFormat: z.string().optional(),
  recipients: z.string().max(1000).optional(),
  active: z.boolean(),
});

export type JobModalFormData = z.infer<typeof jobModalSchema>;

export const jobFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional().default(''),
  reportId: z.coerce.number().min(1, 'Report is required'),
  jobType: z.enum(JOB_FORM_TYPES),
  outputFormat: z.string().max(20).optional().default('CSV'),
  active: z.boolean().default(true),

  cronSecond: z.string().max(20).optional().default('0'),
  cronMinute: z.string().max(20).optional().default(''),
  cronHour: z.string().max(20).optional().default(''),
  cronDay: z.string().max(20).optional().default('?'),
  cronMonth: z.string().max(20).optional().default('*'),
  cronWeekday: z.string().max(20).optional().default('*'),
  cronYear: z.string().max(20).optional().default('*'),
  timeZone: z.string().max(50).optional().default(''),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  extraSchedules: z.string().optional().default(''),
  manual: z.boolean().default(false),

  emailTo: z.string().max(2000).optional().default(''),
  emailCc: z.string().max(2000).optional().default(''),
  emailBcc: z.string().max(2000).optional().default(''),
  emailReplyTo: z.string().max(500).optional().default(''),
  emailFrom: z.string().max(200).optional().default(''),
  emailSubject: z.string().max(500).optional().default(''),
  emailMessage: z.string().optional().default(''),
  smtpServerId: z.coerce.number().optional().nullable(),
  dynamicRecipientsReportId: z.coerce.number().optional().nullable(),

  runsToArchive: z.coerce.number().min(0).optional().default(0),
  allowSharing: z.boolean().default(false),
  allowSplitting: z.boolean().default(false),
  fixedFileName: z.string().max(200).optional().default(''),
  subDirectory: z.string().max(200).optional().default(''),

  preRunReportIds: z.string().max(500).optional().default(''),
  postRunReportIds: z.string().max(500).optional().default(''),
  batchFile: z.string().max(200).optional().default(''),
  errorNotificationEmail: z.string().max(500).optional().default(''),
});

export type JobFormData = z.infer<typeof jobFormSchema>;

/**
 * Build a Quartz-style cron expression from form fields.
 */
export function buildCronExpression(parts: {
  cronSecond?: string;
  cronMinute?: string;
  cronHour?: string;
  cronDay?: string;
  cronMonth?: string;
  cronWeekday?: string;
  cronYear?: string;
}): string {
  return [
    parts.cronSecond || '0',
    parts.cronMinute || '0',
    parts.cronHour || '*',
    parts.cronDay || '?',
    parts.cronMonth || '*',
    parts.cronWeekday || '*',
    parts.cronYear || '*',
  ].join(' ');
}

/**
 * Validate that a cron field looks like a simple Quartz token.
 */
export function isValidCronToken(token: string): boolean {
  if (!token || token.trim() === '') return false;
  return /^[\d*/,?#LW\-]+$/i.test(token.trim());
}
