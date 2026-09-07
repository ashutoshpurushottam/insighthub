import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { createRule, updateRule, type Rule } from './api';
import { ruleSchema, type RuleFormData } from './schemas';

type FormData = RuleFormData;

interface Props {
  rule?: Rule | null;
  onClose: () => void;
}

export function RuleFormModal({ rule, onClose }: Props) {
  const isEdit = !!rule;
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(ruleSchema),
    defaultValues: isEdit
      ? {
          name: rule.name,
          description: rule.description ?? '',
        }
      : {},
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      if (isEdit) {
        return updateRule(rule.id, data);
      }
      return createRule(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      toast.success(isEdit ? 'Rule updated' : 'Rule created');
      onClose();
    },
    onError: () => toast.error('Failed to save rule'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Rule' : 'Create Rule'}
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
              {...register('name')}
              placeholder="e.g. GeoArea"
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
              className="input-field"
              rows={3}
              {...register('description')}
              placeholder="Optional description of what this rule filters"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-600">
                {errors.description.message}
              </p>
            )}
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
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
