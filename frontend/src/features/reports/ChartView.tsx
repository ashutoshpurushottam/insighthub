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
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { RunReportResult } from './api';

export type ChartType = 'bar' | 'line' | 'area' | 'pie';

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
];

interface ChartViewProps {
  data: RunReportResult;
  chartType: ChartType;
  xAxis?: string;
  yAxis?: string[];
}

export function ChartView({ data, chartType, xAxis, yAxis }: ChartViewProps) {
  if (!data.rows.length || !data.columns.length) {
    return <p className="py-8 text-center text-gray-400">No data to chart.</p>;
  }

  // Auto-detect axes: first string column = X, numeric columns = Y
  const xColumn =
    xAxis ||
    data.columns.find((col) =>
      data.rows.some((row) => typeof row[col] === 'string'),
    ) ||
    data.columns[0];

  const yColumns =
    yAxis && yAxis.length > 0
      ? yAxis
      : data.columns.filter(
          (col) =>
            col !== xColumn &&
            data.rows.some(
              (row) => typeof row[col] === 'number' || !isNaN(Number(row[col])),
            ),
        );

  // Ensure numeric values
  const chartData = data.rows.map((row) => {
    const entry: Record<string, unknown> = { [xColumn]: row[xColumn] };
    yColumns.forEach((col) => {
      entry[col] = Number(row[col]) || 0;
    });
    return entry;
  });

  if (chartType === 'pie') {
    const pieCol = yColumns[0] || data.columns[1];
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey={pieCol}
            nameKey={xColumn}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={(entry) => entry[xColumn]}
          >
            {chartData.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const ChartComponent =
    chartType === 'line'
      ? LineChart
      : chartType === 'area'
        ? AreaChart
        : BarChart;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ChartComponent data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xColumn} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {yColumns.map((col, idx) => {
          if (chartType === 'line') {
            return (
              <Line
                key={col}
                type="monotone"
                dataKey={col}
                stroke={COLORS[idx % COLORS.length]}
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
                fill={COLORS[idx % COLORS.length]}
                stroke={COLORS[idx % COLORS.length]}
                fillOpacity={0.3}
              />
            );
          }
          return (
            <Bar
              key={col}
              dataKey={col}
              fill={COLORS[idx % COLORS.length]}
            />
          );
        })}
      </ChartComponent>
    </ResponsiveContainer>
  );
}
