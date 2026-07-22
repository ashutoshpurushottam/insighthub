import { apiClient } from '@/lib/api-client';

export interface Datasource {
  id: number;
  name: string;
  description?: string;
  datasourceType?: string;
  databaseType?: string;
  driver?: string;
  url?: string;
  username?: string;
  active: boolean;
  testSql?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateDatasourcePayload {
  name: string;
  description?: string;
  datasourceType?: string;
  databaseType: string;
  driver?: string;
  url: string;
  username?: string;
  password?: string;
  testSql?: string;
  active: boolean;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  elapsedMs: number;
}

export async function fetchDatasources(): Promise<Datasource[]> {
  const { data } = await apiClient.get('/datasources');
  return data;
}

export async function createDatasource(
  payload: CreateDatasourcePayload,
): Promise<Datasource> {
  const { data } = await apiClient.post('/datasources', payload);
  return data;
}

export async function updateDatasource(
  id: number,
  payload: Partial<CreateDatasourcePayload>,
): Promise<Datasource> {
  const { data } = await apiClient.put(`/datasources/${id}`, payload);
  return data;
}

export async function deleteDatasource(id: number): Promise<void> {
  await apiClient.delete(`/datasources/${id}`);
}

export async function testDatasourceConnection(
  id: number,
): Promise<TestConnectionResult> {
  const { data } = await apiClient.post(`/datasources/${id}/test`);
  return data;
}

export async function testConnectionDirect(payload: {
  url: string;
  username?: string;
  password?: string;
  driver?: string;
  testSql?: string;
}): Promise<TestConnectionResult> {
  const { data } = await apiClient.post('/datasources/test', payload);
  return data;
}
