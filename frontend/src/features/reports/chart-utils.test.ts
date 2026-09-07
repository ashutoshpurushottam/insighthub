import { describe, it, expect } from 'vitest';

import {
  aggregatePieSlices,
  buildCartesianChartData,
  buildHeatmapCells,
  buildScatterPoints,
  chartColorAt,
  CHART_COLORS,
  CHART_TYPE_OPTIONS,
  detectXColumn,
  detectYColumns,
  isCartesianChart,
  isNumericValue,
  isStackedChart,
  prepareChartData,
  summarizeNumericColumns,
  toNumber,
} from './chart-utils';

describe('chart-utils', () => {
  const data = {
    columns: ['region', 'sales', 'profit'],
    rows: [
      { region: 'West', sales: 100, profit: 20 },
      { region: 'East', sales: '50', profit: 10 },
    ],
  };

  it('detects numeric values and converts numbers', () => {
    expect(isNumericValue(10)).toBe(true);
    expect(isNumericValue('12.5')).toBe(true);
    expect(isNumericValue('abc')).toBe(false);
    expect(toNumber('3')).toBe(3);
    expect(toNumber('x', 9)).toBe(9);
  });

  it('detects X and Y columns', () => {
    expect(detectXColumn(data)).toBe('region');
    expect(detectYColumns(data, 'region')).toEqual(['sales', 'profit']);
    expect(detectYColumns(data, 'region', ['profit'])).toEqual(['profit']);
  });

  it('builds cartesian, scatter, and heatmap structures', () => {
    const cartesian = buildCartesianChartData(data, 'region', ['sales']);
    expect(cartesian[0]).toEqual({ region: 'West', sales: 100 });

    const scatter = buildScatterPoints(data, 'sales', ['profit']);
    expect(scatter[0]).toMatchObject({ x: 100, y: 20 });

    const heat = buildHeatmapCells(data, 'region', ['sales']);
    expect(heat[0]).toEqual({ x: 'West', y: 'sales', value: 100 });
  });

  it('prepares chart data and aggregates pie slices', () => {
    const prepared = prepareChartData(data);
    expect(prepared.xColumn).toBe('region');
    expect(prepared.yColumns).toContain('sales');

    const slices = aggregatePieSlices(prepared.chartData, 'region', 'sales');
    expect(slices.find((s) => s.name === 'West')?.value).toBe(100);
  });

  it('classifies chart types and colors', () => {
    expect(isCartesianChart('bar')).toBe(true);
    expect(isCartesianChart('pie')).toBe(false);
    expect(isStackedChart('stacked-bar')).toBe(true);
    expect(chartColorAt(0)).toMatch(/^#/);
  });

  it('summarizes numeric columns', () => {
    const summary = summarizeNumericColumns(data, ['sales']);
    expect(summary[0].min).toBe(50);
    expect(summary[0].max).toBe(100);
    expect(summary[0].sum).toBe(150);
    expect(summary[0].avg).toBe(75);
  });

  it('exposes chart type options and color palette', () => {
    expect(CHART_TYPE_OPTIONS.map((o) => o.value)).toContain('bar');
    expect(CHART_TYPE_OPTIONS.map((o) => o.value)).toContain('heatmap');
    expect(CHART_COLORS.length).toBeGreaterThanOrEqual(8);
    expect(CHART_COLORS[0]).toMatch(/^#/);
  });
});
