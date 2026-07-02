import { useCallback, useEffect, useMemo, useState } from 'react';

import { DateRangePicker } from './DateRangePicker';
import { LovDropdown } from './LovDropdown';
import { NullCheckbox } from './NullCheckbox';
import type { Parameter } from '../types';

export type ParameterValues = Record<string, string | string[]>;

interface ParameterFormProps {
  /** List of parameter definitions for the report */
  parameters: Parameter[];
  /** Current parameter values */
  values: ParameterValues;
  /** Callback when parameter values change */
  onChange: (values: ParameterValues) => void;
  /** Whether the form is disabled (e.g., during execution) */
  disabled?: boolean;
  /** List of parameter names currently set to NULL */
  nullParams?: string[];
  /** Callback when nullParams change */
  onNullParamsChange?: (nullParams: string[]) => void;
}

/**
 * Runtime parameter input form for report execution.
 * Renders appropriate controls per parameter type and supports
 * cascading LOV dropdowns, multi-value selects, expression defaults,
 * and NULL checkboxes for parameters with allowNull enabled.
 */
export function ParameterForm({
  parameters,
  values,
  onChange,
  disabled = false,
  nullParams = [],
  onNullParamsChange,
}: ParameterFormProps) {
  // Initialize defaults on mount
  const [initialized, setInitialized] = useState(false);

  const sortedParams = useMemo(
    () => [...parameters].sort((a, b) => a.position - b.position),
    [parameters],
  );

  // Visible parameters exclude hidden ones; hidden params still contribute
  // their default values via the useEffect below but are not rendered.
  const visibleParams = useMemo(
    () => sortedParams.filter((p) => !p.hidden),
    [sortedParams],
  );

  // Build a map of param ID → param for parent lookups
  const paramById = useMemo(() => {
    const map = new Map<number, Parameter>();
    parameters.forEach((p) => map.set(p.id, p));
    return map;
  }, [parameters]);

  // Pre-populate defaults on first render
  useEffect(() => {
    if (initialized || parameters.length === 0) return;

    const defaults: ParameterValues = {};
    parameters.forEach((param) => {
      const resolvedDefault = (param as any).resolvedDefaultValue ?? param.defaultValue;
      if (resolvedDefault && !values[param.name]) {
        if (param.multiValue) {
          defaults[param.name] = [resolvedDefault];
        } else {
          defaults[param.name] = resolvedDefault;
        }
      }
    });

    if (Object.keys(defaults).length > 0) {
      onChange({ ...values, ...defaults });
    }
    setInitialized(true);
  }, [parameters, values, onChange, initialized]);

  const handleChange = useCallback(
    (paramName: string, value: string | string[]) => {
      onChange({ ...values, [paramName]: value });
    },
    [values, onChange],
  );

  const handleNullChange = useCallback(
    (paramName: string, isNull: boolean) => {
      if (!onNullParamsChange) return;

      if (isNull) {
        // Add to nullParams if not already present
        if (!nullParams.includes(paramName)) {
          onNullParamsChange([...nullParams, paramName]);
        }
      } else {
        // Remove from nullParams
        onNullParamsChange(nullParams.filter((name) => name !== paramName));
      }
    },
    [nullParams, onNullParamsChange],
  );

  // Get the current value for a parameter's parent (for cascading)
  const getParentValue = useCallback(
    (param: Parameter): string | undefined => {
      if (!param.parentParamId) return undefined;
      const parentParam = paramById.get(param.parentParamId);
      if (!parentParam) return undefined;
      const parentVal = values[parentParam.name];
      if (Array.isArray(parentVal)) return parentVal[0];
      return parentVal || undefined;
    },
    [paramById, values],
  );

  if (parameters.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
        This report has no parameters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visibleParams.map((param) => (
        <ParameterField
          key={param.id}
          param={param}
          value={values[param.name] ?? (param.multiValue ? [] : '')}
          onChange={(val) => handleChange(param.name, val)}
          onFormChange={handleChange}
          formValues={values}
          parentValue={getParentValue(param)}
          disabled={disabled}
          isNull={nullParams.includes(param.name)}
          onNullChange={handleNullChange}
        />
      ))}
    </div>
  );
}

// === Individual Parameter Field ===

interface ParameterFieldProps {
  param: Parameter;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  /** Broader change handler that can update any parameter by name */
  onFormChange: (paramName: string, value: string | string[]) => void;
  /** All current form values, used to read from/to parameter values */
  formValues: ParameterValues;
  parentValue?: string;
  disabled: boolean;
  isNull: boolean;
  onNullChange: (paramName: string, isNull: boolean) => void;
}

function ParameterField({
  param,
  value,
  onChange,
  onFormChange,
  formValues,
  parentValue,
  disabled,
  isNull,
  onNullChange,
}: ParameterFieldProps) {
  // When isNull is true, the input should be disabled
  const inputDisabled = disabled || isNull;

  const label = (
    <div className="mb-1 flex items-center justify-between">
      <label className="label block">
        {param.label}
        {param.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {param.allowNull && (
        <NullCheckbox
          paramName={param.name}
          checked={isNull}
          onChange={onNullChange}
          disabled={disabled}
        />
      )}
    </div>
  );

  switch (param.type) {
    case 'TEXT':
      return (
        <div>
          {label}
          <input
            type="text"
            className="input-field"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={param.placeholder || param.label}
            required={param.required}
            disabled={inputDisabled}
          />
        </div>
      );

    case 'NUMBER':
      return (
        <div>
          {label}
          <input
            type="number"
            className="input-field"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={param.placeholder || param.label}
            required={param.required}
            disabled={inputDisabled}
          />
        </div>
      );

    case 'DATE':
      return (
        <div>
          {label}
          <input
            type="date"
            className="input-field"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            required={param.required}
            disabled={inputDisabled}
          />
        </div>
      );

    case 'DATETIME':
      return (
        <div>
          {label}
          <input
            type="datetime-local"
            className="input-field"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            required={param.required}
            disabled={inputDisabled}
          />
        </div>
      );

    case 'BOOLEAN':
      return (
        <div>
          {label}
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={value === 'true'}
              onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
              disabled={inputDisabled}
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300" />
            <span className="ml-2 text-sm text-gray-600">
              {value === 'true' ? 'Yes' : 'No'}
            </span>
          </label>
        </div>
      );

    case 'DROPDOWN':
      return (
        <div>
          {label}
          <LovDropdown
            parameterId={param.id}
            value={value}
            onChange={onChange}
            multiValue={param.multiValue}
            parentValue={parentValue}
            hasParent={!!param.parentParamId}
            disabled={inputDisabled}
            required={param.required}
            staticOptions={
              param.lovType === 'STATIC' ? param.lovStaticValues : undefined
            }
          />
        </div>
      );

    case 'DATERANGE': {
      const fromParamName = param.fromParameterName ?? '';
      const toParamName = param.toParameterName ?? '';
      const fromValue =
        typeof formValues[fromParamName] === 'string'
          ? (formValues[fromParamName] as string)
          : '';
      const toValue =
        typeof formValues[toParamName] === 'string'
          ? (formValues[toParamName] as string)
          : '';

      return (
        <div className="sm:col-span-2 lg:col-span-3">
          {label}
          <DateRangePicker
            fromParameterName={fromParamName}
            toParameterName={toParamName}
            onFromChange={(date) => onFormChange(fromParamName, date)}
            onToChange={(date) => onFormChange(toParamName, date)}
            fromValue={fromValue}
            toValue={toValue}
            disabled={inputDisabled}
          />
        </div>
      );
    }

    default:
      return (
        <div>
          {label}
          <input
            type="text"
            className="input-field"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={param.label}
            disabled={inputDisabled}
          />
        </div>
      );
  }
}
