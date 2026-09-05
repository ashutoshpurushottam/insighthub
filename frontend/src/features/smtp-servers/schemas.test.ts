import { describe, it, expect } from 'vitest';

import {
  isValidOptionalEmail,
  smtpServerSchema,
  suggestPortForSecurity,
} from './schemas';

describe('smtp-servers schemas', () => {
  it('accepts a valid SMTP server', () => {
    const result = smtpServerSchema.safeParse({
      name: 'Gmail',
      server: 'smtp.gmail.com',
      port: 587,
      useStarttls: true,
      useAuth: true,
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid ports', () => {
    const result = smtpServerSchema.safeParse({
      name: 'Bad',
      server: 'mail.example.com',
      port: 70000,
      useStarttls: false,
      useAuth: false,
      active: true,
    });
    expect(result.success).toBe(false);
  });

  it('validates optional emails and suggests ports', () => {
    expect(isValidOptionalEmail('')).toBe(true);
    expect(isValidOptionalEmail('a@b.com')).toBe(true);
    expect(isValidOptionalEmail('nope')).toBe(false);
    expect(suggestPortForSecurity(true, false)).toBe(587);
    expect(suggestPortForSecurity(false, true)).toBe(465);
  });
});
