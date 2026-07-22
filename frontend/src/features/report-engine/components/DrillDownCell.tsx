import { ArrowRight } from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import type { DrillDownInfo } from '../types';

interface DrillDownCellProps {
  /** The display value of the cell */
  value: unknown;
  /** The drill-down configuration for this column */
  drillDown: DrillDownInfo;
  /** The full row data, used to extract mapped param values */
  row: Record<string, unknown>;
  /** Optional param mappings: parentColumn -> childParamName */
  paramMappings?: Array<{ parentColumnName: string; childParamName: string }>;
}

/**
 * Renders a cell value with a drill-down arrow icon.
 * On click, navigates to the child report runner with mapped params as URL query parameters.
 */
export function DrillDownCell({
  value,
  drillDown,
  row,
  paramMappings = [],
}: DrillDownCellProps) {
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    const searchParams = new URLSearchParams();

    // Map parent row column values to child report parameter names
    for (const mapping of paramMappings) {
      const paramValue = row[mapping.parentColumnName];
      if (paramValue !== null && paramValue !== undefined) {
        searchParams.set(mapping.childParamName, String(paramValue));
      }
    }

    // If no explicit mappings, use the trigger column value as a fallback
    if (paramMappings.length === 0 && value !== null && value !== undefined) {
      searchParams.set(drillDown.column, String(value));
    }

    const queryString = searchParams.toString();
    const path = `/reports/${drillDown.childReportId}/run${queryString ? `?${queryString}` : ''}`;
    navigate(path);
  }, [navigate, drillDown, row, paramMappings, value]);

  const displayValue = formatCellValue(value);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="group inline-flex items-center gap-1.5 text-left text-blue-600 hover:text-blue-800 hover:underline"
      title={`Drill down to ${drillDown.childReportName}`}
    >
      <span>{displayValue}</span>
      <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

/** Formats cell values for display */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
