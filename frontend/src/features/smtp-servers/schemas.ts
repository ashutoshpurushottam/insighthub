import { z } from 'zod';

export const smtpServerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  server: z.string().min(1, 'Server host is required').max(200),
  port: z.coerce.number().min(1, 'Port is required').max(65535),
  useStarttls: z.boolean(),
  useAuth: z.boolean(),
  username: z.string().max(200).optional(),
  password: z.string().max(500).optional(),
  fromAddress: z.string().max(200).optional(),
  active: z.boolean(),
});

export type SmtpServerFormData = z.infer<typeof smtpServerSchema>;

/**
 * Validate optional email-ish from address (empty allowed).
 */
export function isValidOptionalEmail(value?: string): boolean {
  if (!value || value.trim() === '') return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Common SMTP ports for quick suggestions.
 */
export const COMMON_SMTP_PORTS = [25, 465, 587, 2525] as const;

export function suggestPortForSecurity(useStarttls: boolean, useSslImplicit: boolean): number {
  if (useSslImplicit) return 465;
  if (useStarttls) return 587;
  return 25;
}
