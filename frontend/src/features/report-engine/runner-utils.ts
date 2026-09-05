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
 */
export function mergeParamValues(
  defaults: ParamValues,
  overrides: ParamValues,
): ParamValues {
  return { ...defaults, ...overrides };
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
