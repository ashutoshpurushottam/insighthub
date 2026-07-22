import { apiClient } from '@/lib/api-client';

// User -> Reports
export async function getUserReportRights(userId: number): Promise<number[]> {
  const { data } = await apiClient.get(`/access-rights/users/${userId}/reports`);
  return data;
}

export async function setUserReportRights(
  userId: number,
  reportIds: number[],
): Promise<void> {
  await apiClient.put(`/access-rights/users/${userId}/reports`, reportIds);
}

// User -> Report Groups
export async function getUserReportGroupRights(
  userId: number,
): Promise<number[]> {
  const { data } = await apiClient.get(
    `/access-rights/users/${userId}/report-groups`,
  );
  return data;
}

export async function setUserReportGroupRights(
  userId: number,
  groupIds: number[],
): Promise<void> {
  await apiClient.put(
    `/access-rights/users/${userId}/report-groups`,
    groupIds,
  );
}

// UserGroup -> Reports
export async function getUserGroupReportRights(
  groupId: number,
): Promise<number[]> {
  const { data } = await apiClient.get(
    `/access-rights/user-groups/${groupId}/reports`,
  );
  return data;
}

export async function setUserGroupReportRights(
  groupId: number,
  reportIds: number[],
): Promise<void> {
  await apiClient.put(
    `/access-rights/user-groups/${groupId}/reports`,
    reportIds,
  );
}

// UserGroup -> Report Groups
export async function getUserGroupReportGroupRights(
  groupId: number,
): Promise<number[]> {
  const { data } = await apiClient.get(
    `/access-rights/user-groups/${groupId}/report-groups`,
  );
  return data;
}

export async function setUserGroupReportGroupRights(
  groupId: number,
  reportGroupIds: number[],
): Promise<void> {
  await apiClient.put(
    `/access-rights/user-groups/${groupId}/report-groups`,
    reportGroupIds,
  );
}
