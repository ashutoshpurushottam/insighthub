import { useCallback, useMemo } from 'react';

export interface DateRangePickerProps {
  /** Name of the parameter that receives the from-date value */
  fromParameterName: string;
  /** Name of the parameter that receives the to-date value */
  toParameterName: string;
  /** Callback when the from-date changes */
  onFromChange: (date: string) => void;
  /** Callback when the to-date changes */
  onToChange: (date: string) => void;
  /** Current from-date value (yyyy-MM-dd) */
  fromValue?: string;
  /** Current to-date value (yyyy-MM-dd) */
  toValue?: string;
  /** Whether the control is disabled */
  disabled?: boolean;
}

interface DateRange {
  from: string;
  to: string;
}

type PresetName =
  | 'Today'
  | 'Yesterday'
  | 'Last 7 Days'
  | 'Last 30 Days'
  | 'This Month'
  | 'Last Month'
  | 'This Quarter'
  | 'Last Quarter'
  | 'This Year'
  | 'Last Year';

/** Format a Date to yyyy-MM-dd string */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Calculate from/to dates for a preset range */
export function calculatePresetRange(preset: PresetName, today?: Date): DateRange {
  const now = today ?? new Date();
  const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'Today':
      return { from: formatDate(currentDate), to: formatDate(currentDate) };

    case 'Yesterday': {
      const yesterday = new Date(currentDate);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: formatDate(yesterday), to: formatDate(yesterday) };
    }

    case 'Last 7 Days': {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - 6);
      return { from: formatDate(start), to: formatDate(currentDate) };
    }

    case 'Last 30 Days': {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - 29);
      return { from: formatDate(start), to: formatDate(currentDate) };
    }

    case 'This Month': {
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      return { from: formatDate(firstDay), to: formatDate(lastDay) };
    }

    case 'Last Month': {
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
      return { from: formatDate(firstDay), to: formatDate(lastDay) };
    }

    case 'This Quarter': {
      const quarterStart = Math.floor(currentDate.getMonth() / 3) * 3;
      const firstDay = new Date(currentDate.getFullYear(), quarterStart, 1);
      const lastDay = new Date(currentDate.getFullYear(), quarterStart + 3, 0);
      return { from: formatDate(firstDay), to: formatDate(lastDay) };
    }

    case 'Last Quarter': {
      const currentQuarterStart = Math.floor(currentDate.getMonth() / 3) * 3;
      const lastQuarterStart = currentQuarterStart - 3;
      const year =
        lastQuarterStart < 0
          ? currentDate.getFullYear() - 1
          : currentDate.getFullYear();
      const month = ((lastQuarterStart % 12) + 12) % 12;
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 3, 0);
      return { from: formatDate(firstDay), to: formatDate(lastDay) };
    }

    case 'This Year': {
      const firstDay = new Date(currentDate.getFullYear(), 0, 1);
      const lastDay = new Date(currentDate.getFullYear(), 11, 31);
      return { from: formatDate(firstDay), to: formatDate(lastDay) };
    }

    case 'Last Year': {
      const firstDay = new Date(currentDate.getFullYear() - 1, 0, 1);
      const lastDay = new Date(currentDate.getFullYear() - 1, 11, 31);
      return { from: formatDate(firstDay), to: formatDate(lastDay) };
    }
  }
}

const PRESETS: PresetName[] = [
  'Today',
  'Yesterday',
  'Last 7 Days',
  'Last 30 Days',
  'This Month',
  'Last Month',
  'This Quarter',
  'Last Quarter',
  'This Year',
  'Last Year',
];

/**
 * DateRangePicker component for selecting date ranges.
 * Provides two date inputs (from/to) and preset range buttons.
 * When a preset or manual date is selected, it updates the underlying
 * fromParameterName and toParameterName parameters.
 */
export function DateRangePicker({
  fromParameterName,
  toParameterName,
  onFromChange,
  onToChange,
  fromValue = '',
  toValue = '',
  disabled = false,
}: DateRangePickerProps) {
  const handlePresetClick = useCallback(
    (preset: PresetName) => {
      const range = calculatePresetRange(preset);
      onFromChange(range.from);
      onToChange(range.to);
    },
    [onFromChange, onToChange],
  );

  const activePreset = useMemo(() => {
    if (!fromValue || !toValue) return undefined;
    for (const preset of PRESETS) {
      const range = calculatePresetRange(preset);
      if (range.from === fromValue && range.to === toValue) {
        return preset;
      }
    }
    return undefined;
  }, [fromValue, toValue]);

  return (
    <div className="space-y-3">
      {/* Date inputs */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="label mb-1 block text-xs text-gray-500">
            From ({fromParameterName})
          </label>
          <input
            type="date"
            className="input-field w-full"
            value={fromValue}
            onChange={(e) => onFromChange(e.target.value)}
            disabled={disabled}
            aria-label={`From date for ${fromParameterName}`}
          />
        </div>
        <span className="mt-5 text-gray-400">→</span>
        <div className="flex-1">
          <label className="label mb-1 block text-xs text-gray-500">
            To ({toParameterName})
          </label>
          <input
            type="date"
            className="input-field w-full"
            value={toValue}
            onChange={(e) => onToChange(e.target.value)}
            disabled={disabled}
            aria-label={`To date for ${toParameterName}`}
          />
        </div>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`rounded px-2 py-1 text-xs transition-colors ${
              activePreset === preset
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => handlePresetClick(preset)}
            disabled={disabled}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
}
