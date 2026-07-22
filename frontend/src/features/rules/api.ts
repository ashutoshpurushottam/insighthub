import { apiClient } from '@/lib/api-client';

// ===== Types =====

export interface Rule {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface CreateRulePayload {
  name: string;
  description?: string;
}

export interface UpdateRulePayload {
  name: string;
  description?: string;
}

// ===== Rules CRUD (named exports for RuleFormModal) =====

export async function fetchRules(): Promise<Rule[]> {
  const { data } = await apiClient.get('/rules');
  return data;
}

export async function createRule(payload: CreateRulePayload): Promise<Rule> {
  const { data } = await apiClient.post('/rules', payload);
  return data;
}

export async function updateRule(
  id: number,
  payload: UpdateRulePayload,
): Promise<Rule> {
  const { data } = await apiClient.put(`/rules/${id}`, payload);
  return data;
}

export async function deleteRule(id: number): Promise<void> {
  await apiClient.delete(`/rules/${id}`);
}

/** Object-style API used by RulesPage */
export const rulesApi = {
  getAll: fetchRules,
  create: createRule,
  update: updateRule,
  delete: deleteRule,
};

// ===== Rule Value type (for RuleValuesPage) =====

export interface RuleValue {
  id: number;
  ruleId: number;
  ruleName?: string;
  userId?: number;
  userName?: string;
  userGroupId?: number;
  userGroupName?: string;
  ruleValue: string;
}

export interface AssignRuleValuePayload {
  ruleId: number;
  userId?: number;
  userGroupId?: number;
  ruleValue: string;
}

/** Get all values for a given rule */
export async function fetchRuleValues(ruleId: number): Promise<RuleValue[]> {
  const { data } = await apiClient.get(`/rules/${ruleId}/values`);
  return data;
}

/** Assign a value to a user or group for a rule */
export async function assignRuleValue(payload: AssignRuleValuePayload): Promise<RuleValue> {
  const { data } = await apiClient.post(`/rules/${payload.ruleId}/values`, payload);
  return data;
}

/** Remove a rule value assignment by ID */
export async function removeRuleValue(ruleId: number, valueId: number): Promise<void> {
  await apiClient.delete(`/rules/${ruleId}/values/${valueId}`);
}

// ===== Rule Values — Users =====

export async function fetchUserRuleValues(
  ruleId: number,
  userId: number,
): Promise<string[]> {
  const { data } = await apiClient.get(
    `/rules/${ruleId}/values/users/${userId}`,
  );
  return data;
}

export async function assignUserRuleValue(
  ruleId: number,
  userId: number,
  value: string,
): Promise<void> {
  await apiClient.post(`/rules/${ruleId}/values/users/${userId}`, { value });
}

export async function removeUserRuleValue(
  ruleId: number,
  userId: number,
  value: string,
): Promise<void> {
  await apiClient.delete(
    `/rules/${ruleId}/values/users/${userId}/${encodeURIComponent(value)}`,
  );
}

// ===== Rule Values — Groups =====

export async function fetchGroupRuleValues(
  ruleId: number,
  groupId: number,
): Promise<string[]> {
  const { data } = await apiClient.get(
    `/rules/${ruleId}/values/groups/${groupId}`,
  );
  return data;
}

export async function assignGroupRuleValue(
  ruleId: number,
  groupId: number,
  value: string,
): Promise<void> {
  await apiClient.post(`/rules/${ruleId}/values/groups/${groupId}`, { value });
}

export async function removeGroupRuleValue(
  ruleId: number,
  groupId: number,
  value: string,
): Promise<void> {
  await apiClient.delete(
    `/rules/${ruleId}/values/groups/${groupId}/${encodeURIComponent(value)}`,
  );
}
