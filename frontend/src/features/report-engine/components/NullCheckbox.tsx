/**
 * NullCheckbox — A small checkbox that allows users to explicitly set
 * a parameter value to NULL. Rendered next to parameter inputs when
 * the parameter definition has `allowNull: true`.
 */

interface NullCheckboxProps {
  /** The parameter name this checkbox controls */
  paramName: string;
  /** Whether the NULL checkbox is currently checked */
  checked: boolean;
  /** Callback when the checkbox is toggled */
  onChange: (paramName: string, isNull: boolean) => void;
  /** Whether the checkbox itself should be disabled */
  disabled?: boolean;
}

export function NullCheckbox({
  paramName,
  checked,
  onChange,
  disabled = false,
}: NullCheckboxProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(paramName, e.target.checked)}
        disabled={disabled}
        className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
        aria-label={`Set ${paramName} to NULL`}
      />
      <span className="select-none font-mono text-[11px] font-medium uppercase tracking-wide text-gray-500">
        NULL
      </span>
    </label>
  );
}
