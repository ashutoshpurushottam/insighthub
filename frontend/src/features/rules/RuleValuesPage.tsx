import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import {
  assignGroupRuleValue,
  assignUserRuleValue,
  fetchGroupRuleValues,
  fetchRules,
  fetchUserRuleValues,
  removeGroupRuleValue,
  removeUserRuleValue,
} from './api';

import { EmptyState, LoadingSpinner, PageHeader } from '@/components/ui';
import { fetchUserGroups } from '@/features/user-groups/api';
import { fetchUsers } from '@/features/users/api';

type Tab = 'users' | 'groups';

/**
 * RuleValuesPage — Assign rule values to users and user groups per rule.
 * Provides a rule selector, user/group tabs, chip-based value display,
 * and inline add/remove controls.
 */
export function RuleValuesPage() {
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [newValue, setNewValue] = useState('');

  const queryClient = useQueryClient();

  // Fetch rules list
  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['rules'],
    queryFn: fetchRules,
  });

  // Fetch users list
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  // Fetch user groups list
  const { data: userGroups } = useQuery({
    queryKey: ['user-groups'],
    queryFn: fetchUserGroups,
  });

  // Fetch values for selected user + rule
  const { data: userValues, isLoading: userValuesLoading } = useQuery({
    queryKey: ['rule-values', 'user', selectedRuleId, selectedUserId],
    queryFn: () => fetchUserRuleValues(selectedRuleId!, selectedUserId!),
    enabled: !!selectedRuleId && !!selectedUserId,
  });

  // Fetch values for selected group + rule
  const { data: groupValues, isLoading: groupValuesLoading } = useQuery({
    queryKey: ['rule-values', 'group', selectedRuleId, selectedGroupId],
    queryFn: () => fetchGroupRuleValues(selectedRuleId!, selectedGroupId!),
    enabled: !!selectedRuleId && !!selectedGroupId,
  });

  // Assign value mutations
  const assignUserMutation = useMutation({
    mutationFn: (value: string) =>
      assignUserRuleValue(selectedRuleId!, selectedUserId!, value),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['rule-values', 'user', selectedRuleId, selectedUserId],
      });
      setNewValue('');
      toast.success('Value assigned');
    },
    onError: () => toast.error('Failed to assign value'),
  });

  const assignGroupMutation = useMutation({
    mutationFn: (value: string) =>
      assignGroupRuleValue(selectedRuleId!, selectedGroupId!, value),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['rule-values', 'group', selectedRuleId, selectedGroupId],
      });
      setNewValue('');
      toast.success('Value assigned');
    },
    onError: () => toast.error('Failed to assign value'),
  });

  // Remove value mutations
  const removeUserValueMutation = useMutation({
    mutationFn: (value: string) =>
      removeUserRuleValue(selectedRuleId!, selectedUserId!, value),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['rule-values', 'user', selectedRuleId, selectedUserId],
      });
      toast.success('Value removed');
    },
    onError: () => toast.error('Failed to remove value'),
  });

  const removeGroupValueMutation = useMutation({
    mutationFn: (value: string) =>
      removeGroupRuleValue(selectedRuleId!, selectedGroupId!, value),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['rule-values', 'group', selectedRuleId, selectedGroupId],
      });
      toast.success('Value removed');
    },
    onError: () => toast.error('Failed to remove value'),
  });

  const handleAddValue = () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;

    if (activeTab === 'users') {
      if (!selectedUserId) {
        toast.error('Select a user first');
        return;
      }
      assignUserMutation.mutate(trimmed);
    } else {
      if (!selectedGroupId) {
        toast.error('Select a group first');
        return;
      }
      assignGroupMutation.mutate(trimmed);
    }
  };

  const handleRemoveValue = (value: string) => {
    if (activeTab === 'users') {
      removeUserValueMutation.mutate(value);
    } else {
      removeGroupValueMutation.mutate(value);
    }
  };

  const currentValues = activeTab === 'users' ? userValues : groupValues;
  const valuesLoading =
    activeTab === 'users' ? userValuesLoading : groupValuesLoading;
  const hasSelection =
    activeTab === 'users'
      ? !!selectedRuleId && !!selectedUserId
      : !!selectedRuleId && !!selectedGroupId;

  if (rulesLoading) {
    return <LoadingSpinner size="lg" className="mt-12" />;
  }

  return (
    <div>
      <PageHeader
        title="Rule Values"
        description="Assign rule values to users and groups for row-level security filtering"
      />

      {/* Rule Selector */}
      <div className="card mb-6">
        <label htmlFor="rule-select" className="label">
          Select Rule
        </label>
        <select
          id="rule-select"
          className="input-field max-w-md"
          value={selectedRuleId ?? ''}
          onChange={(e) => {
            const val = e.target.value ? Number(e.target.value) : null;
            setSelectedRuleId(val);
            setSelectedUserId(null);
            setSelectedGroupId(null);
          }}
        >
          <option value="">— Choose a rule —</option>
          {rules?.map((rule) => (
            <option key={rule.id} value={rule.id}>
              {rule.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedRuleId && (
        <EmptyState
          title="No rule selected"
          description="Select a rule above to manage its values for users and groups."
        />
      )}

      {selectedRuleId && (
        <>
          {/* Tabs */}
          <div className="mb-4 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
                  activeTab === 'users'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('users')}
              >
                Users
              </button>
              <button
                className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
                  activeTab === 'groups'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('groups')}
              >
                Groups
              </button>
            </nav>
          </div>

          <div className="card">
            {/* Entity selector (user or group) */}
            <div className="mb-6">
              {activeTab === 'users' ? (
                <>
                  <label htmlFor="user-select" className="label">
                    Select User
                  </label>
                  <select
                    id="user-select"
                    className="input-field max-w-md"
                    value={selectedUserId ?? ''}
                    onChange={(e) =>
                      setSelectedUserId(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  >
                    <option value="">— Choose a user —</option>
                    {users?.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                        {user.fullName ? ` (${user.fullName})` : ''}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label htmlFor="group-select" className="label">
                    Select Group
                  </label>
                  <select
                    id="group-select"
                    className="input-field max-w-md"
                    value={selectedGroupId ?? ''}
                    onChange={(e) =>
                      setSelectedGroupId(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  >
                    <option value="">— Choose a group —</option>
                    {userGroups?.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {/* Values section */}
            {hasSelection && (
              <>
                {/* Existing values as chips */}
                <div className="mb-4">
                  <h3 className="label">Current Values</h3>
                  {valuesLoading && (
                    <LoadingSpinner size="sm" className="my-2" />
                  )}
                  {!valuesLoading &&
                    (!currentValues || currentValues.length === 0) && (
                      <p className="text-sm text-gray-500">
                        No values assigned yet.
                      </p>
                    )}
                  {!valuesLoading &&
                    currentValues &&
                    currentValues.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {currentValues.map((val) => (
                          <span
                            key={val}
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                              val === 'ALL_ITEMS'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-primary-50 text-primary-700'
                            }`}
                          >
                            {val}
                            <button
                              onClick={() => handleRemoveValue(val)}
                              className="ml-1 rounded-full p-0.5 hover:bg-primary-100 hover:text-primary-800"
                              title={`Remove "${val}"`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                </div>

                {/* Add new value */}
                <div className="flex items-end gap-3">
                  <div className="max-w-sm flex-1">
                    <label htmlFor="new-value" className="label">
                      New Value
                    </label>
                    <input
                      id="new-value"
                      type="text"
                      className="input-field"
                      placeholder="e.g. NORTH, ALL_ITEMS"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddValue();
                        }
                      }}
                    />
                  </div>
                  <button
                    className="btn-primary"
                    onClick={handleAddValue}
                    disabled={
                      !newValue.trim() ||
                      assignUserMutation.isPending ||
                      assignGroupMutation.isPending
                    }
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add
                  </button>
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  Use <code className="rounded bg-gray-100 px-1">ALL_ITEMS</code> to disable
                  filtering for this user/group on the selected rule.
                </p>
              </>
            )}

            {!hasSelection && (
              <p className="text-sm text-gray-500">
                {activeTab === 'users'
                  ? 'Select a user to view and manage their rule values.'
                  : 'Select a group to view and manage its rule values.'}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
