import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { fetchUsers } from '@/features/users/api';
import { fetchRoles } from '@/features/roles/api';

import {
  addMembers,
  assignRolesToGroup,
  createUserGroup,
  updateUserGroup,
  type UserGroup,
} from './api';

interface Props {
  group?: UserGroup | null;
  onClose: () => void;
}

export function UserGroupFormModal({ group, onClose }: Props) {
  const isEdit = !!group;
  const queryClient = useQueryClient();

  const [name, setName] = useState(group?.name ?? '');
  const [description, setDescription] = useState(group?.description ?? '');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: fetchRoles });

  const saveMutation = useMutation({
    mutationFn: async () => {
      let savedGroup: UserGroup;
      if (isEdit) {
        savedGroup = await updateUserGroup(group.id, { name, description });
      } else {
        savedGroup = await createUserGroup({ name, description });
      }

      // Assign members and roles if selected
      if (selectedUsers.length > 0) {
        await addMembers(savedGroup.id, selectedUsers);
      }
      if (selectedRoles.length > 0) {
        await assignRolesToGroup(savedGroup.id, selectedRoles);
      }

      return savedGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] });
      toast.success(isEdit ? 'Group updated' : 'Group created');
      onClose();
    },
    onError: () => toast.error('Failed to save'),
  });

  const toggleUser = (id: number) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id],
    );
  };

  const toggleRole = (id: number) => {
    setSelectedRoles((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit User Group' : 'Create User Group'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input-field" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Members */}
          <div>
            <label className="label">Members</label>
            <div className="max-h-32 overflow-y-auto rounded-md border border-gray-200 p-2">
              {users?.map((u) => (
                <label key={u.id} className="flex items-center gap-2 py-0.5 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={() => toggleUser(u.id)}
                    className="rounded border-gray-300 text-primary-600"
                  />
                  {u.fullName || u.username}
                </label>
              ))}
            </div>
          </div>

          {/* Roles */}
          <div>
            <label className="label">Assign Roles</label>
            <div className="max-h-32 overflow-y-auto rounded-md border border-gray-200 p-2">
              {roles?.map((r) => (
                <label key={r.id} className="flex items-center gap-2 py-0.5 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(r.id)}
                    onChange={() => toggleRole(r.id)}
                    className="rounded border-gray-300 text-primary-600"
                  />
                  {r.name}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={!name || saveMutation.isPending}
              className="btn-primary"
            >
              {saveMutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
