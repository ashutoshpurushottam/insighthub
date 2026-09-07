/**
 * Shared display formatters for tables, dashboards, and exports.
 */

const DEFAULT_LOCALE = 'en-US';

export function formatNumber(
  value: number | null | undefined,
  options: Intl.NumberFormatOptions = {},
  locale = DEFAULT_LOCALE,
): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatPercent(
  value: number | null | undefined,
  fractionDigits = 1,
  locale = DEFAULT_LOCALE,
): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value / 100);
}

export function formatCurrency(
  value: number | null | undefined,
  currency = 'USD',
  locale = DEFAULT_LOCALE,
): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

export function formatCompactNumber(
  value: number | null | undefined,
  locale = DEFAULT_LOCALE,
): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export type DateFormatStyle = 'short' | 'medium' | 'long' | 'full' | 'iso';

export function formatDate(
  value: string | Date | null | undefined,
  style: DateFormatStyle = 'medium',
  locale = DEFAULT_LOCALE,
): string {
  if (value == null || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  if (style === 'iso') {
    return date.toISOString().slice(0, 10);
  }

  return new Intl.DateTimeFormat(locale, { dateStyle: style }).format(date);
}

export function formatDateTime(
  value: string | Date | null | undefined,
  locale = DEFAULT_LOCALE,
): string {
  if (value == null || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatRelativeTime(
  value: string | Date | null | undefined,
  now: Date = new Date(),
  locale = DEFAULT_LOCALE,
): string {
  if (value == null || value === '') return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const diffSec = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), 'day');
  if (abs < 86400 * 365) return rtf.format(Math.round(diffSec / (86400 * 30)), 'month');
  return rtf.format(Math.round(diffSec / (86400 * 365)), 'year');
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes) || bytes < 0) return '—';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exp;
  return `${value.toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms) || ms < 0) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = Math.round(seconds % 60);
  if (minutes < 60) return `${minutes}m ${rem}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function truncateText(text: string | null | undefined, max = 80): string {
  if (text == null) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Infer a sensible formatter for a column based on sample values.
 */
export function inferColumnFormatter(
  values: unknown[],
): (value: unknown) => string {
  const samples = values.filter((v) => v != null).slice(0, 20);
  if (samples.length === 0) {
    return (v) => (v == null ? '—' : String(v));
  }

  if (samples.every((v) => typeof v === 'boolean')) {
    return (v) => (v == null ? '—' : v ? 'Yes' : 'No');
  }

  if (samples.every((v) => typeof v === 'number' || (typeof v === 'string' && v !== '' && !Number.isNaN(Number(v))))) {
    const nums = samples.map((v) => Number(v));
    const looksLikePercent = nums.every((n) => n >= 0 && n <= 100) &&
      samples.some((v) => String(v).includes('.'));
    if (looksLikePercent) {
      return (v) => (v == null ? '—' : formatPercent(Number(v)));
    }
    return (v) => (v == null ? '—' : formatNumber(Number(v)));
  }

  if (
    samples.every((v) => {
      if (v instanceof Date) return true;
      if (typeof v !== 'string') return false;
      const d = new Date(v);
      return !Number.isNaN(d.getTime()) && /\d{4}-\d{2}-\d{2}/.test(v);
    })
  ) {
    return (v) => formatDateTime(v as string | Date);
  }

  return (v) => (v == null ? '—' : String(v));
}
