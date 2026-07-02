import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { EmptyState, LoadingSpinner, PageHeader } from '@/components/ui';

import { deleteSmtpServer, fetchSmtpServers, type SmtpServer } from './api';
import { SmtpServerFormModal } from './SmtpServerFormModal';

export function SmtpServersPage() {
  const [modalServer, setModalServer] = useState<
    SmtpServer | null | undefined
  >(undefined);
  const queryClient = useQueryClient();

  const {
    data: smtpServers,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['smtp-servers'],
    queryFn: fetchSmtpServers,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSmtpServer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smtp-servers'] });
      toast.success('SMTP server deleted');
    },
    onError: () => toast.error('Failed to delete SMTP server'),
  });

  const handleDelete = (server: SmtpServer) => {
    if (confirm(`Delete SMTP server "${server.name}"?`)) {
      deleteMutation.mutate(server.id);
    }
  };

  return (
    <div>
      <PageHeader
        title="SMTP Servers"
        description="Manage email server configurations for job notifications"
        actions={
          <button
            className="btn-primary"
            onClick={() => setModalServer(null)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add SMTP Server
          </button>
        }
      />

      {isLoading && <LoadingSpinner size="lg" className="mt-12" />}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Failed to load SMTP servers.
        </div>
      )}

      {!isLoading && !error && (!smtpServers || smtpServers.length === 0) && (
        <EmptyState
          title="No SMTP servers configured"
          description="Add an email server to enable job email notifications."
          icon={<Mail className="h-12 w-12" />}
          action={
            <button
              className="btn-primary"
              onClick={() => setModalServer(null)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add SMTP Server
            </button>
          }
        />
      )}

      {smtpServers && smtpServers.length > 0 && (
        <div className="card overflow-hidden p-0">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Server
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Port
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  StartTLS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Auth
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {smtpServers.map((server) => (
                <tr key={server.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      {server.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {server.server}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {server.port}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        server.useStarttls
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {server.useStarttls ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        server.useAuth
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {server.useAuth ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        server.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {server.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => setModalServer(server)}
                      className="mr-2 text-primary-600 hover:text-primary-800"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(server)}
                      className="text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalServer !== undefined && (
        <SmtpServerFormModal
          smtpServer={modalServer}
          onClose={() => setModalServer(undefined)}
        />
      )}
    </div>
  );
}
