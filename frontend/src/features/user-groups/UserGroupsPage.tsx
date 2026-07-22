import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Users2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { EmptyState, LoadingSpinner, PageHeader } from '@/components/ui';

import {
  deleteUserGroup,
  fetchUserGroups,
  type UserGroup,
} from './api';
import { UserGroupFormModal } from './UserGroupFormModal';

export function UserGroupsPage() {
  const [formGroup, setFormGroup] = useState<UserGroup | null | undefined>(
    undefined,
  );
  const queryClient = useQueryClient();

  const { data: groups, isLoading, error } = useQuery({
    queryKey: ['user-groups'],
    queryFn: fetchUserGroups,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUserGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      toast.success('User group deleted');
    },
  });

  return (
    <div>
      <PageHeader
        title="User Groups"
        description="Manage groups and their members"
        actions={
          <button className="btn-primary" onClick={() => setFormGroup(null)}>
            <Plus className="mr-2 h-4 w-4" /> Add Group
          </button>
        }
      />

      {isLoading && <LoadingSpinner size="lg" className="mt-12" />}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Failed to load.
        </div>
      )}

      {!isLoading && !error && (!groups || groups.length === 0) && (
        <EmptyState
          title="No user groups"
          icon={<Users2 className="h-12 w-12" />}
        />
      )}

      {groups && groups.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div
              key={g.id}
              className="card cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setFormGroup(g)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-50 p-2">
                    <Users2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{g.name}</h3>
                    {g.description && (
                      <p className="text-sm text-gray-500">{g.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${g.name}"?`))
                      deleteMutation.mutate(g.id);
                  }}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex gap-3 text-xs text-gray-500">
                <span>{g.memberCount} members</span>
                {g.roleNames.length > 0 && (
                  <>
                    <span>•</span>
                    <span>{g.roleNames.join(', ')}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {formGroup !== undefined && (
        <UserGroupFormModal
          group={formGroup}
          onClose={() => setFormGroup(undefined)}
        />
      )}
    </div>
  );
}
