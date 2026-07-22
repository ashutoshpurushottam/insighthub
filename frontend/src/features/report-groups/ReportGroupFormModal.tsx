import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { createReportGroup, updateReportGroup, type ReportGroup } from './api';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(200).optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  group?: ReportGroup | null;
  onClose: () => void;
}

export function ReportGroupFormModal({ group, onClose }: Props) {
  const isEdit = !!group;
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? { name: group.name, description: group.description ?? '' }
      : {},
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      isEdit ? updateReportGroup(group.id, data) : createReportGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-groups'] });
      toast.success(isEdit ? 'Group updated' : 'Group created');
      onClose();
    },
    onError: () => toast.error('Failed to save report group'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Report Group' : 'Create Report Group'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="space-y-4"
        >
          <div>
            <label className="label">Name</label>
            <input
              className="input-field"
              placeholder="e.g. Sales Reports"
              {...register('name')}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              rows={3}
              className="input-field"
              placeholder="Optional description..."
              {...register('description')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn-primary"
            >
              {mutation.isPending
                ? 'Saving...'
                : isEdit
                  ? 'Update'
                  : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
