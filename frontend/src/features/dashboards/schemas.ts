import { z } from 'zod';

export const dashboardItemSchema = z.object({
  reportId: z.coerce.number().min(1, 'Report is required'),
  title: z.string().max(200).optional().default(''),
  position: z.coerce.number().min(0).default(0),
  colSpan: z.coerce.number().min(1).max(12).optional().default(1),
});

export const dashboardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().default(''),
  columnsCount: z.coerce.number().min(1).max(6).default(2),
  items: z.array(dashboardItemSchema).default([]),
});

export type DashboardFormData = z.infer<typeof dashboardSchema>;
export type DashboardItemFormData = z.infer<typeof dashboardItemSchema>;

/**
 * Compute CSS grid-template-columns for a dashboard layout.
 */
export function buildDashboardGridTemplate(columnsCount: number): string {
  const cols = Math.max(1, Math.min(6, columnsCount || 1));
  return `repeat(${cols}, minmax(0, 1fr))`;
}

/**
 * Clamp colSpan so it never exceeds the available column count.
 */
export function clampColSpan(colSpan: number, columnsCount: number): number {
  const cols = Math.max(1, columnsCount || 1);
  const span = Math.max(1, colSpan || 1);
  return Math.min(span, cols);
}

/**
 * Sort dashboard items by position ascending.
 */
export function sortDashboardItems<T extends { position: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position);
}

/**
 * Re-index item positions after add/remove/reorder.
 */
export function reindexDashboardItems<T extends { position: number }>(items: T[]): T[] {
  return items.map((item, index) => ({ ...item, position: index }));
}
