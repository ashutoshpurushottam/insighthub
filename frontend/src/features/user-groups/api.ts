import { apiClient } from '@/lib/api-client';

export interface UserGroup {
  id: number;
  name: string;
  description?: string;
  memberCount: number;
  roleNames: string[];
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchUserGroups(): Promise<UserGroup[]> {
  const { data } = await apiClient.get('/user-groups');
  return data;
}

export async function createUserGroup(payload: {
  name: string;
  description?: string;
}): Promise<UserGroup> {
  const { data } = await apiClient.post('/user-groups', payload);
  return data;
}

export async function updateUserGroup(
  id: number,
  payload: { name: string; description?: string },
): Promise<UserGroup> {
  const { data } = await apiClient.put(`/user-groups/${id}`, payload);
  return data;
}

export async function deleteUserGroup(id: number): Promise<void> {
  await apiClient.delete(`/user-groups/${id}`);
}

export async function addMembers(
  groupId: number,
  userIds: number[],
): Promise<UserGroup> {
  const { data } = await apiClient.post(
    `/user-groups/${groupId}/members`,
    userIds,
  );
  return data;
}

export async function removeMembers(
  groupId: number,
  userIds: number[],
): Promise<UserGroup> {
  const { data } = await apiClient.delete(`/user-groups/${groupId}/members`, {
    data: userIds,
  });
  return data;
}

export async function assignRolesToGroup(
  groupId: number,
  roleIds: number[],
): Promise<UserGroup> {
  const { data } = await apiClient.put(
    `/user-groups/${groupId}/roles`,
    roleIds,
  );
  return data;
}
