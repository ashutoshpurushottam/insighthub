/**
 * Report runner helpers: parameter defaults, validation, URL sync.
 */

export interface RunnerParameter {
  name: string;
  label?: string;
  required?: boolean;
  defaultValue?: string | null;
  resolvedDefaultValue?: string | null;
  hidden?: boolean;
  allowNull?: boolean;
  multiValue?: boolean;
  type?: string;
}

export type ParamValues = Record<string, string | string[] | null>;

/**
 * Build initial parameter values from parameter definitions.
 */
export function buildDefaultParamValues(parameters: RunnerParameter[]): ParamValues {
  const values: ParamValues = {};
  for (const param of parameters) {
    const resolved = param.resolvedDefaultValue ?? param.defaultValue ?? null;
    if (param.multiValue) {
      values[param.name] = resolved
        ? resolved.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
    } else {
      values[param.name] = resolved;
    }
  }
  return values;
}

/**
 * Validate required parameters before running a report.
 */
export function validateParamValues(
  parameters: RunnerParameter[],
  values: ParamValues,
): string[] {
  const errors: string[] = [];

  for (const param of parameters) {
    if (param.hidden) continue;
    if (!param.required) continue;

    const value = values[param.name];
    const isEmptyArray = Array.isArray(value) && value.length === 0;
    const isEmpty =
      value === null ||
      value === undefined ||
      value === '' ||
      isEmptyArray;

    if (isEmpty && !param.allowNull) {
      errors.push(`${param.label || param.name} is required`);
    }
  }

  return errors;
}

/**
 * Flatten parameter values for API payloads (arrays joined when needed).
 */
export function flattenParamValues(
  values: ParamValues,
  joinMulti = false,
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      out[key] = joinMulti ? value.join(',') : value;
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Serialize param values into URL search params.
 */
export function paramsToSearchParams(values: ParamValues): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) sp.append(key, item);
      }
    } else {
      sp.set(key, value);
    }
  }
  return sp;
}

/**
 * Parse URL search params into ParamValues using parameter definitions.
 */
export function searchParamsToParamValues(
  search: URLSearchParams | string,
  parameters: RunnerParameter[],
): ParamValues {
  const sp = typeof search === 'string' ? new URLSearchParams(search) : search;
  const values: ParamValues = {};

  for (const param of parameters) {
    if (param.multiValue) {
      values[param.name] = sp.getAll(param.name);
    } else {
      values[param.name] = sp.get(param.name);
    }
  }

  return values;
}

/**
 * Merge URL overrides on top of defaults.
 * Null/undefined overrides are ignored so missing URL keys do not wipe defaults.
 */
export function mergeParamValues(
  defaults: ParamValues,
  overrides: ParamValues,
): ParamValues {
  const merged: ParamValues = { ...defaults };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined) continue;
    merged[key] = value;
  }
  return merged;
}

/**
 * Count how many visible parameters have non-empty values.
 */
export function countFilledParams(
  parameters: RunnerParameter[],
  values: ParamValues,
): { filled: number; totalVisible: number } {
  const visible = parameters.filter((p) => !p.hidden);
  let filled = 0;
  for (const param of visible) {
    const value = values[param.name];
    if (Array.isArray(value) ? value.length > 0 : value != null && value !== '') {
      filled += 1;
    }
  }
  return { filled, totalVisible: visible.length };
}

/**
 * Human-readable summary of current filters for dashboards / headers.
 */
export function summarizeParamValues(
  parameters: RunnerParameter[],
  values: ParamValues,
  maxItems = 4,
): string {
  const parts: string[] = [];
  for (const param of parameters) {
    if (param.hidden) continue;
    const value = values[param.name];
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
      continue;
    }
    const display = Array.isArray(value) ? value.join(', ') : value;
    parts.push(`${param.label || param.name}: ${display}`);
    if (parts.length >= maxItems) break;
  }
  if (parts.length === 0) return 'No filters';
  return parts.join(' · ');
}

/** Reserved query keys used for drill-down parent navigation context */
export const DRILL_DOWN_FROM_PARAM = '_ihFrom';
export const DRILL_DOWN_FROM_PAGE_PARAM = '_ihFromPage';
export const DRILL_DOWN_RETURN_PARAM = '_ihReturn';

const RESERVED_QUERY_KEYS = new Set([
  DRILL_DOWN_FROM_PARAM,
  DRILL_DOWN_FROM_PAGE_PARAM,
  DRILL_DOWN_RETURN_PARAM,
  'page',
]);

export interface DrillDownPathOptions {
  childReportId: number;
  triggerColumn: string;
  triggerValue: unknown;
  row: Record<string, unknown>;
  paramMappings?: Array<{ parentColumnName: string; childParamName: string }>;
  parentReportId?: number;
  parentPage?: number;
}

/**
 * Build the child report runner path with mapped params and parent context.
 */
export function buildDrillDownPath(options: DrillDownPathOptions): string {
  const {
    childReportId,
    triggerColumn,
    triggerValue,
    row,
    paramMappings = [],
    parentReportId,
    parentPage,
  } = options;

  const searchParams = new URLSearchParams();

  for (const mapping of paramMappings) {
    const paramValue = row[mapping.parentColumnName];
    if (paramValue !== null && paramValue !== undefined) {
      searchParams.set(mapping.childParamName, String(paramValue));
    }
  }

  // Fallback when no explicit mappings are configured
  if (paramMappings.length === 0 && triggerValue !== null && triggerValue !== undefined) {
    searchParams.set(triggerColumn, String(triggerValue));
  }

  if (parentReportId != null && !Number.isNaN(parentReportId)) {
    searchParams.set(DRILL_DOWN_FROM_PARAM, String(parentReportId));
  }
  if (parentPage != null && parentPage > 0) {
    searchParams.set(DRILL_DOWN_FROM_PAGE_PARAM, String(parentPage));
  }

  const queryString = searchParams.toString();
  return `/reports/${childReportId}/run${queryString ? `?${queryString}` : ''}`;
}

/**
 * True when the URL indicates navigation from a parent report (drill-down).
 * Reserved keys alone (page / return flags) do not count.
 */
export function isDrillDownNavigation(search: URLSearchParams | string): boolean {
  const sp = typeof search === 'string' ? new URLSearchParams(search) : search;
  if (sp.has(DRILL_DOWN_FROM_PARAM)) return true;
  // Back-compat: any non-reserved query param counts as drill-down context
  for (const key of sp.keys()) {
    if (!RESERVED_QUERY_KEYS.has(key)) {
      return true;
    }
  }
  return false;
}

/**
 * True when the runner should auto-execute on load (drill-down or return from child).
 */
export function shouldAutoRunFromSearch(search: URLSearchParams | string): boolean {
  const sp = typeof search === 'string' ? new URLSearchParams(search) : search;
  if (sp.get(DRILL_DOWN_RETURN_PARAM) === '1') return true;
  return isDrillDownNavigation(sp);
}

/**
 * Resolve the parent report path for the Back control.
 */
export function resolveParentReportPath(search: URLSearchParams | string): string | null {
  const sp = typeof search === 'string' ? new URLSearchParams(search) : search;
  const fromId = sp.get(DRILL_DOWN_FROM_PARAM);
  if (!fromId) return null;

  const parentParams = new URLSearchParams();
  parentParams.set(DRILL_DOWN_RETURN_PARAM, '1');
  const fromPage = sp.get(DRILL_DOWN_FROM_PAGE_PARAM);
  if (fromPage) {
    parentParams.set('page', fromPage);
  }
  const qs = parentParams.toString();
  return `/reports/${fromId}/run${qs ? `?${qs}` : ''}`;
}

/**
 * Strip reserved drill-down navigation keys from param values.
 */
export function stripDrillDownMetaParams(values: ParamValues): ParamValues {
  const out: ParamValues = { ...values };
  delete out[DRILL_DOWN_FROM_PARAM];
  delete out[DRILL_DOWN_FROM_PAGE_PARAM];
  delete out[DRILL_DOWN_RETURN_PARAM];
  delete out.page;
  return out;
}

/**
 * Parse URL params into overrides for known report parameters only.
 * Keys absent from the URL are omitted (so defaults are preserved on merge).
 * Reserved drill-down meta keys are never treated as report params.
 */
export function urlSearchToOverrides(
  search: URLSearchParams | string,
  parameters: RunnerParameter[],
): ParamValues {
  const sp = typeof search === 'string' ? new URLSearchParams(search) : search;
  const values: ParamValues = {};

  for (const param of parameters) {
    if (RESERVED_QUERY_KEYS.has(param.name)) {
      continue;
    }
    if (!sp.has(param.name)) continue;
    if (param.multiValue) {
      values[param.name] = sp.getAll(param.name);
    } else {
      values[param.name] = sp.get(param.name);
    }
  }

  return values;
}

/**
 * Whether required params are satisfied enough to auto-run.
 */
export function canAutoRunReport(
  parameters: RunnerParameter[],
  values: ParamValues,
): boolean {
  return validateParamValues(parameters, values).length === 0;
}
