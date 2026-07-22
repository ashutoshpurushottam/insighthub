import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { createSmtpServer, updateSmtpServer, type SmtpServer } from './api';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  server: z.string().min(1, 'Server host is required').max(200),
  port: z.coerce.number().min(1, 'Port is required').max(65535),
  useStarttls: z.boolean(),
  useAuth: z.boolean(),
  username: z.string().max(200).optional(),
  password: z.string().max(500).optional(),
  fromAddress: z.string().max(200).optional(),
  active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  smtpServer?: SmtpServer | null;
  onClose: () => void;
}

export function SmtpServerFormModal({ smtpServer, onClose }: Props) {
  const isEdit = !!smtpServer;
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? {
          name: smtpServer.name,
          server: smtpServer.server,
          port: smtpServer.port,
          useStarttls: smtpServer.useStarttls,
          useAuth: smtpServer.useAuth,
          username: smtpServer.username ?? '',
          password: '',
          fromAddress: smtpServer.fromAddress ?? '',
          active: smtpServer.active,
        }
      : {
          port: 587,
          useStarttls: false,
          useAuth: false,
          active: true,
        },
  });

  const useAuth = watch('useAuth');

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      if (isEdit) {
        return updateSmtpServer(smtpServer.id, data);
      }
      return createSmtpServer(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smtp-servers'] });
      toast.success(isEdit ? 'SMTP server updated' : 'SMTP server created');
      onClose();
    },
    onError: () => toast.error('Failed to save SMTP server'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit SMTP Server' : 'Add SMTP Server'}
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
              placeholder="e.g. Production Mail Server"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Server Host</label>
              <input
                className="input-field"
                {...register('server')}
                placeholder="smtp.example.com"
              />
              {errors.server && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.server.message}
                </p>
              )}
            </div>
            <div>
              <label className="label">Port</label>
              <input
                type="number"
                className="input-field"
                {...register('port')}
                placeholder="587"
              />
              {errors.port && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.port.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useStarttls"
                {...register('useStarttls')}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="useStarttls" className="text-sm text-gray-700">
                Use StartTLS
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useAuth"
                {...register('useAuth')}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="useAuth" className="text-sm text-gray-700">
                Authentication
              </label>
            </div>
          </div>

          {useAuth && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Username</label>
                <input className="input-field" {...register('username')} />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input-field"
                  {...register('password')}
                  placeholder={isEdit ? '(unchanged)' : ''}
                />
              </div>
            </div>
          )}

          <div>
            <label className="label">From Address</label>
            <input
              className="input-field"
              {...register('fromAddress')}
              placeholder="noreply@example.com"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              {...register('active')}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="active" className="text-sm text-gray-700">
              Active
            </label>
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
