import { describe, it, expect } from 'vitest';

import {
  buildCronExpression,
  isValidCronToken,
  jobFormSchema,
  jobModalSchema,
} from './schemas';

describe('jobs schemas', () => {
  it('accepts a valid modal payload', () => {
    const result = jobModalSchema.safeParse({
      name: 'Nightly',
      reportId: 1,
      jobType: 'PUBLISH',
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty job name', () => {
    const result = jobModalSchema.safeParse({
      name: '',
      reportId: 1,
      jobType: 'PUBLISH',
      active: true,
    });
    expect(result.success).toBe(false);
  });

  it('parses the full job form with defaults', () => {
    const result = jobFormSchema.safeParse({
      name: 'Daily email',
      reportId: '5',
      jobType: 'EMAIL_ATTACHMENT',
      active: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reportId).toBe(5);
      expect(result.data.outputFormat).toBe('CSV');
      expect(result.data.cronSecond).toBe('0');
    }
  });

  it('builds cron expressions and validates tokens', () => {
    expect(
      buildCronExpression({
        cronMinute: '0',
        cronHour: '8',
        cronDay: '*',
        cronMonth: '*',
        cronWeekday: '?',
      }),
    ).toBe('0 0 8 * * ? *');

    expect(isValidCronToken('*')).toBe(true);
    expect(isValidCronToken('0/5')).toBe(true);
    expect(isValidCronToken('bad token')).toBe(false);
  });
});
