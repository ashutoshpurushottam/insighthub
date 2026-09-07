import { AxiosError } from 'axios';

export interface ApiErrorDetails {
  status?: number;
  message: string;
  code?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Extract a user-facing message from an unknown thrown value (Axios or Error).
 */
export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!error) return fallback;

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  const axiosError = error as AxiosError<unknown>;
  const data = axiosError?.response?.data;
  if (typeof data === 'string' && data.trim()) {
    return data;
  }
  if (data && typeof data === 'object') {
    const body = data as { message?: string; error?: string; detail?: string };
    if (body.message) return body.message;
    if (body.error) return body.error;
    if (body.detail) return body.detail;
  }

  if (axiosError?.message) {
    return axiosError.message;
  }

  return fallback;
}

/**
 * Parse an Axios (or generic) error into a structured details object.
 */
export function parseApiError(error: unknown, fallback = 'Request failed'): ApiErrorDetails {
  const axiosError = error as AxiosError<{
    message?: string;
    error?: string;
    code?: string;
    errors?: Record<string, string>;
    fieldErrors?: Record<string, string>;
  }>;

  const status = axiosError?.response?.status;
  const data = axiosError?.response?.data;
  const fieldErrors = data?.fieldErrors ?? data?.errors;

  return {
    status,
    message: getErrorMessage(error, fallback),
    code: data?.code,
    fieldErrors: fieldErrors && typeof fieldErrors === 'object' ? fieldErrors : undefined,
  };
}

/**
 * True when the error represents an auth failure that should force re-login.
 */
export function isAuthError(error: unknown): boolean {
  const status = (error as AxiosError)?.response?.status;
  return status === 401;
}

/**
 * True when the caller is forbidden (authenticated but not allowed).
 */
export function isForbiddenError(error: unknown): boolean {
  const status = (error as AxiosError)?.response?.status;
  return status === 403;
}

/**
 * Format field validation errors into a single readable string.
 */
export function formatFieldErrors(fieldErrors?: Record<string, string>): string | null {
  if (!fieldErrors || Object.keys(fieldErrors).length === 0) {
    return null;
  }
  return Object.entries(fieldErrors)
    .map(([field, message]) => `${field}: ${message}`)
    .join('; ');
}
