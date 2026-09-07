import { apiClient } from '@/lib/api-client';
import type { User } from '@/types';

export async function fetchUsers(): Promise<User[]> {
  const { data } = await apiClient.get('/users');
  return data;
}
