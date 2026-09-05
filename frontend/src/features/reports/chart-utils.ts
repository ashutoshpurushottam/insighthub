export type ChartType =
  | 'bar'
  | 'stacked-bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'heatmap';

export const CHART_TYPE_OPTIONS: Array<{ value: ChartType; label: string }> = [
  { value: 'bar', label: 'Bar' },
  { value: 'stacked-bar', label: 'Stacked Bar' },
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'pie', label: 'Pie' },
  { value: 'donut', label: 'Donut' },
  { value: 'scatter', label: 'Scatter' },
  { value: 'heatmap', label: 'Heatmap' },
];

export const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
  '#6366f1',
  '#f97316',
];

export interface ChartDataset {
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface PreparedChartData {
  xColumn: string;
  yColumns: string[];
  chartData: Record<string, unknown>[];
  pieColumn: string;
  scatterPoints: Array<{ x: number; y: number; label: string }>;
  heatmapCells: Array<{ x: string; y: string; value: number }>;
}

export function isNumericValue(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string' && value.trim() !== '') {
    return !Number.isNaN(Number(value));
  }
  return false;
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Detect the best X-axis column: first string-like column, else first column.
 */
export function detectXColumn(
  data: ChartDataset,
  preferred?: string,
): string {
  if (preferred && data.columns.includes(preferred)) {
    return preferred;
  }

  const stringCol = data.columns.find((col) =>
    data.rows.some((row) => typeof row[col] === 'string' && !isNumericValue(row[col])),
  );

  return stringCol || data.columns[0] || 'x';
}

/**
 * Detect numeric Y-axis columns, excluding the X column.
 */
export function detectYColumns(
  data: ChartDataset,
  xColumn: string,
  preferred?: string[],
): string[] {
  if (preferred && preferred.length > 0) {
    return preferred.filter((col) => data.columns.includes(col) && col !== xColumn);
  }

  return data.columns.filter(
    (col) =>
      col !== xColumn && data.rows.some((row) => isNumericValue(row[col])),
  );
}

/**
 * Normalize report rows into numeric chart series keyed by column name.
 */
export function buildCartesianChartData(
  data: ChartDataset,
  xColumn: string,
  yColumns: string[],
): Record<string, unknown>[] {
  return data.rows.map((row) => {
    const entry: Record<string, unknown> = { [xColumn]: row[xColumn] };
    for (const col of yColumns) {
      entry[col] = toNumber(row[col]);
    }
    return entry;
  });
}

/**
 * Build scatter points from the first two numeric columns (or explicit axes).
 */
export function buildScatterPoints(
  data: ChartDataset,
  xColumn: string,
  yColumns: string[],
): Array<{ x: number; y: number; label: string }> {
  const yCol = yColumns[0];
  if (!yCol) return [];

  return data.rows.map((row, idx) => ({
    x: toNumber(row[xColumn], idx),
    y: toNumber(row[yCol]),
    label: String(row[xColumn] ?? idx),
  }));
}

/**
 * Build heatmap cells: X category × Y series name → value.
 */
export function buildHeatmapCells(
  data: ChartDataset,
  xColumn: string,
  yColumns: string[],
): Array<{ x: string; y: string; value: number }> {
  const cells: Array<{ x: string; y: string; value: number }> = [];
  for (const row of data.rows) {
    const x = String(row[xColumn] ?? '');
    for (const yCol of yColumns) {
      cells.push({ x, y: yCol, value: toNumber(row[yCol]) });
    }
  }
  return cells;
}

/**
 * Prepare all derived chart structures from raw report results.
 */
export function prepareChartData(
  data: ChartDataset,
  options: { xAxis?: string; yAxis?: string[] } = {},
): PreparedChartData {
  const xColumn = detectXColumn(data, options.xAxis);
  const yColumns = detectYColumns(data, xColumn, options.yAxis);
  const chartData = buildCartesianChartData(data, xColumn, yColumns);
  const pieColumn = yColumns[0] || data.columns.find((c) => c !== xColumn) || xColumn;

  return {
    xColumn,
    yColumns,
    chartData,
    pieColumn,
    scatterPoints: buildScatterPoints(data, xColumn, yColumns),
    heatmapCells: buildHeatmapCells(data, xColumn, yColumns),
  };
}

/**
 * Aggregate pie/donut slices, merging duplicate X labels.
 */
export function aggregatePieSlices(
  chartData: Record<string, unknown>[],
  nameKey: string,
  valueKey: string,
): Array<{ name: string; value: number }> {
  const map = new Map<string, number>();
  for (const row of chartData) {
    const name = String(row[nameKey] ?? 'Unknown');
    map.set(name, (map.get(name) ?? 0) + toNumber(row[valueKey]));
  }
  return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
}

/**
 * Whether a chart type uses cartesian axes (vs polar / specialized).
 */
export function isCartesianChart(chartType: ChartType): boolean {
  return (
    chartType === 'bar' ||
    chartType === 'stacked-bar' ||
    chartType === 'line' ||
    chartType === 'area'
  );
}

/**
 * Whether stacked series rendering should be used.
 */
export function isStackedChart(chartType: ChartType): boolean {
  return chartType === 'stacked-bar';
}

/**
 * Pick a stable color for an index.
 */
export function chartColorAt(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/**
 * Summarize numeric columns for a lightweight stats strip.
 */
export function summarizeNumericColumns(
  data: ChartDataset,
  columns: string[],
): Array<{ column: string; min: number; max: number; sum: number; avg: number }> {
  return columns.map((column) => {
    const values = data.rows.map((row) => toNumber(row[column])).filter((n) => Number.isFinite(n));
    if (values.length === 0) {
      return { column, min: 0, max: 0, sum: 0, avg: 0 };
    }
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      column,
      min: Math.min(...values),
      max: Math.max(...values),
      sum,
      avg: sum / values.length,
    };
  });
}
