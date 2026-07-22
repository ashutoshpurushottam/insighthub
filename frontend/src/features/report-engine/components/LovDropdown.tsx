import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { useParameterLov } from '../hooks/useParameterLov';
import type { LovOption } from '../types';

interface LovDropdownProps {
  /** The parameter ID whose LOV options to fetch */
  parameterId: number;
  /** Current selected value(s) */
  value: string | string[];
  /** Callback when selection changes */
  onChange: (value: string | string[]) => void;
  /** Whether multiple selections are allowed */
  multiValue?: boolean;
  /** Parent parameter value for cascading */
  parentValue?: string;
  /** Whether this dropdown requires a parent selection to be enabled */
  hasParent?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Optional static LOV options (bypass API fetch) */
  staticOptions?: LovOption[];
}

/**
 * Dynamic/static LOV select with cascading support.
 * Fetches options from GET /api/parameters/{id}/lov?parentValue=x.
 * Refreshes when parent value changes.
 */
export function LovDropdown({
  parameterId,
  value,
  onChange,
  multiValue = false,
  parentValue,
  hasParent = false,
  disabled = false,
  required = false,
  staticOptions,
}: LovDropdownProps) {
  const prevParentValue = useRef(parentValue);

  // Only fetch from API if no static options are provided
  const shouldFetch = !staticOptions;
  const parentDisabled = hasParent && !parentValue;

  const { data: fetchedOptions, isLoading, isError } = useParameterLov({
    parameterId,
    parentValue,
    enabled: shouldFetch && !parentDisabled,
  });

  const options: LovOption[] = staticOptions ?? fetchedOptions ?? [];

  // Clear child selection when parent value changes
  useEffect(() => {
    if (hasParent && prevParentValue.current !== parentValue) {
      prevParentValue.current = parentValue;
      if (multiValue) {
        onChange([]);
      } else {
        onChange('');
      }
    }
  }, [parentValue, hasParent, multiValue, onChange]);

  const isDisabled = disabled || parentDisabled;

  if (multiValue) {
    return (
      <div className="relative">
        <select
          multiple
          className="input-field min-h-[80px]"
          value={Array.isArray(value) ? value : value ? [value] : []}
          onChange={(e) => {
            const selected = Array.from(
              e.target.selectedOptions,
              (opt) => opt.value,
            );
            onChange(selected);
          }}
          disabled={isDisabled}
          required={required}
        >
          {isLoading && (
            <option disabled>Loading...</option>
          )}
          {!isLoading && options.length === 0 && (
            <option disabled value="">
              No options available
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {isLoading && (
          <div className="absolute right-2 top-2">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          </div>
        )}
        {parentDisabled && (
          <p className="mt-1 text-xs text-gray-400">
            Select a parent value first
          </p>
        )}
        {isError && (
          <p className="mt-1 text-xs text-red-500">
            Failed to load options
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        className="input-field"
        value={Array.isArray(value) ? value[0] ?? '' : value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isDisabled}
        required={required}
      >
        <option value="">
          {isLoading
            ? 'Loading...'
            : parentDisabled
              ? '— Select parent first —'
              : options.length === 0
                ? '— No options available —'
                : '— Select —'}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {isLoading && (
        <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        </div>
      )}
      {parentDisabled && (
        <p className="mt-1 text-xs text-gray-400">
          Select a parent value first
        </p>
      )}
      {isError && (
        <p className="mt-1 text-xs text-red-500">
          Failed to load options
        </p>
      )}
    </div>
  );
}
