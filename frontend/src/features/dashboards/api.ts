import { apiClient } from '@/lib/api-client';

export interface DashboardItem {
  id: number;
  reportId: number;
  reportName: string;
  title?: string;
  position: number;
  colSpan: number;
  rowSpan: number;
}

export interface Dashboard {
  id: number;
  name: string;
  description?: string;
  layoutType: string;
  columnsCount: number;
  autoRefreshSeconds: number;
  active: boolean;
  items: DashboardItem[];
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchDashboards(): Promise<Dashboard[]> {
  const { data } = await apiClient.get('/dashboards');
  return data;
}

export async function fetchDashboardById(id: number): Promise<Dashboard> {
  const { data } = await apiClient.get(`/dashboards/${id}`);
  return data;
}

export async function createDashboard(payload: {
  name: string;
  description?: string;
  layoutType?: string;
  columnsCount?: number;
  autoRefreshSeconds?: number;
  items?: { reportId: number; title?: string; position: number; colSpan?: number; rowSpan?: number }[];
}): Promise<Dashboard> {
  const { data } = await apiClient.post('/dashboards', payload);
  return data;
}

export async function updateDashboard(
  id: number,
  payload: Parameters<typeof createDashboard>[0],
): Promise<Dashboard> {
  const { data } = await apiClient.put(`/dashboards/${id}`, payload);
  return data;
}

export async function deleteDashboard(id: number): Promise<void> {
  await apiClient.delete(`/dashboards/${id}`);
}
