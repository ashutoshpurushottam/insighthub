import { apiClient } from '@/lib/api-client';

export interface Role {
  id: number;
  name: string;
  description?: string;
}

export async function fetchRoles(): Promise<Role[]> {
  const { data } = await apiClient.get('/roles');
  return data;
}
