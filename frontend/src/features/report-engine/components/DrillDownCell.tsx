import { ArrowRight } from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import type { DrillDownInfo, DrillDownParamMapping } from '../types';
import { buildDrillDownPath } from '../runner-utils';

interface DrillDownCellProps {
  /** The display value of the cell */
  value: unknown;
  /** The drill-down configuration for this column */
  drillDown: DrillDownInfo;
  /** The full row data, used to extract mapped param values */
  row: Record<string, unknown>;
  /** Optional param mappings: parentColumn -> childParamName */
  paramMappings?: DrillDownParamMapping[];
  /** Parent report id used to restore navigation on Back */
  parentReportId?: number;
  /** Optional parent page to restore on Back */
  parentPage?: number;
}

/**
 * Renders a cell value with a drill-down arrow icon.
 * On click, navigates to the child report runner with mapped params as URL query parameters.
 */
export function DrillDownCell({
  value,
  drillDown,
  row,
  paramMappings,
  parentReportId,
  parentPage,
}: DrillDownCellProps) {
  const navigate = useNavigate();
  const mappings =
    paramMappings ??
    drillDown.paramMappings ??
    [];

  const handleClick = useCallback(() => {
    const path = buildDrillDownPath({
      childReportId: drillDown.childReportId,
      triggerColumn: drillDown.column,
      triggerValue: value,
      row,
      paramMappings: mappings,
      parentReportId,
      parentPage,
    });
    navigate(path);
  }, [
    navigate,
    drillDown.childReportId,
    drillDown.column,
    value,
    row,
    mappings,
    parentReportId,
    parentPage,
  ]);

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
