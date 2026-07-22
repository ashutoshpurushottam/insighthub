import { apiClient } from '@/lib/api-client';

export interface ReportGroup {
  id: number;
  name: string;
  description?: string;
  reportCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchReportGroups(): Promise<ReportGroup[]> {
  const { data } = await apiClient.get('/report-groups');
  return data;
}

export async function createReportGroup(payload: {
  name: string;
  description?: string;
}): Promise<ReportGroup> {
  const { data } = await apiClient.post('/report-groups', payload);
  return data;
}

export async function updateReportGroup(
  id: number,
  payload: { name: string; description?: string },
): Promise<ReportGroup> {
  const { data } = await apiClient.put(`/report-groups/${id}`, payload);
  return data;
}

export async function deleteReportGroup(id: number): Promise<void> {
  await apiClient.delete(`/report-groups/${id}`);
}
