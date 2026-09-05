import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

import type { RunReportResult } from './api';
import {
  CHART_TYPE_OPTIONS,
  aggregatePieSlices,
  chartColorAt,
  isCartesianChart,
  isStackedChart,
  prepareChartData,
  summarizeNumericColumns,
  type ChartType,
} from './chart-utils';

export type { ChartType };
export { CHART_TYPE_OPTIONS };

interface ChartViewProps {
  data: RunReportResult;
  chartType: ChartType;
  xAxis?: string;
  yAxis?: string[];
  showSummary?: boolean;
}

export function ChartView({
  data,
  chartType,
  xAxis,
  yAxis,
  showSummary = true,
}: ChartViewProps) {
  if (!data.rows.length || !data.columns.length) {
    return <p className="py-8 text-center text-gray-400">No data to chart.</p>;
  }

  const prepared = prepareChartData(data, { xAxis, yAxis });
  const { xColumn, yColumns, chartData, pieColumn, scatterPoints, heatmapCells } =
    prepared;

  if (yColumns.length === 0 && chartType !== 'heatmap') {
    return (
      <p className="py-8 text-center text-gray-400">
        No numeric columns available for charting.
      </p>
    );
  }

  const summaries = showSummary
    ? summarizeNumericColumns(data, yColumns)
    : [];

  return (
    <div className="space-y-3">
      {summaries.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          {summaries.map((s) => (
            <div
              key={s.column}
              className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5"
            >
              <span className="font-medium text-gray-800">{s.column}</span>
              <span className="mx-1.5 text-gray-300">|</span>
              min {s.min.toLocaleString()} · max {s.max.toLocaleString()} · avg{' '}
              {s.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          ))}
        </div>
      )}

      {chartType === 'pie' || chartType === 'donut' ? (
        <PieDonutChart
          chartData={chartData}
          nameKey={xColumn}
          valueKey={pieColumn}
          donut={chartType === 'donut'}
        />
      ) : chartType === 'scatter' ? (
        <ScatterView points={scatterPoints} />
      ) : chartType === 'heatmap' ? (
        <HeatmapView cells={heatmapCells} />
      ) : isCartesianChart(chartType) ? (
        <CartesianView
          chartType={chartType}
          chartData={chartData}
          xColumn={xColumn}
          yColumns={yColumns}
        />
      ) : (
        <CartesianView
          chartType="bar"
          chartData={chartData}
          xColumn={xColumn}
          yColumns={yColumns}
        />
      )}
    </div>
  );
}

function CartesianView({
  chartType,
  chartData,
  xColumn,
  yColumns,
}: {
  chartType: ChartType;
  chartData: Record<string, unknown>[];
  xColumn: string;
  yColumns: string[];
}) {
  const ChartComponent =
    chartType === 'line'
      ? LineChart
      : chartType === 'area'
        ? AreaChart
        : BarChart;

  const stacked = isStackedChart(chartType);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ChartComponent data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xColumn} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {yColumns.map((col, idx) => {
          const color = chartColorAt(idx);
          if (chartType === 'line') {
            return (
              <Line
                key={col}
                type="monotone"
                dataKey={col}
                stroke={color}
                strokeWidth={2}
              />
            );
          }
          if (chartType === 'area') {
            return (
              <Area
                key={col}
                type="monotone"
                dataKey={col}
                fill={color}
                stroke={color}
                fillOpacity={0.3}
                stackId={stacked ? 'a' : undefined}
              />
            );
          }
          return (
            <Bar
              key={col}
              dataKey={col}
              fill={color}
              stackId={stacked ? 'stack' : undefined}
            />
          );
        })}
      </ChartComponent>
    </ResponsiveContainer>
  );
}

function PieDonutChart({
  chartData,
  nameKey,
  valueKey,
  donut,
}: {
  chartData: Record<string, unknown>[];
  nameKey: string;
  valueKey: string;
  donut: boolean;
}) {
  const slices = aggregatePieSlices(chartData, nameKey, valueKey);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={donut ? 55 : 0}
          outerRadius={110}
          label={(entry) => entry.name}
        >
          {slices.map((_, idx) => (
            <Cell key={idx} fill={chartColorAt(idx)} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ScatterView({
  points,
}: {
  points: Array<{ x: number; y: number; label: string }>;
}) {
  if (points.length === 0) {
    return (
      <p className="py-8 text-center text-gray-400">
        Need at least one numeric Y column for scatter plots.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" dataKey="x" name="X" tick={{ fontSize: 12 }} />
        <YAxis type="number" dataKey="y" name="Y" tick={{ fontSize: 12 }} />
        <ZAxis range={[60, 60]} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter name="Points" data={points} fill={chartColorAt(0)} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

function HeatmapView({
  cells,
}: {
  cells: Array<{ x: string; y: string; value: number }>;
}) {
  if (cells.length === 0) {
    return (
      <p className="py-8 text-center text-gray-400">No heatmap data available.</p>
    );
  }

  const xs = Array.from(new Set(cells.map((c) => c.x)));
  const ys = Array.from(new Set(cells.map((c) => c.y)));
  const values = cells.map((c) => c.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const valueAt = (x: string, y: string) =>
    cells.find((c) => c.x === x && c.y === y)?.value;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="p-2 text-left text-gray-500">Series</th>
            {xs.map((x) => (
              <th key={x} className="p-2 text-center font-medium text-gray-600">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ys.map((y) => (
            <tr key={y}>
              <td className="whitespace-nowrap p-2 font-medium text-gray-700">{y}</td>
              {xs.map((x) => {
                const value = valueAt(x, y);
                const intensity =
                  value == null ? 0 : (value - min) / range;
                const bg = `rgba(59, 130, 246, ${0.15 + intensity * 0.75})`;
                return (
                  <td
                    key={`${x}-${y}`}
                    className="border border-white p-2 text-center text-gray-800"
                    style={{ backgroundColor: value == null ? '#f3f4f6' : bg }}
                    title={value == null ? 'n/a' : String(value)}
                  >
                    {value == null ? '—' : value.toLocaleString()}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
