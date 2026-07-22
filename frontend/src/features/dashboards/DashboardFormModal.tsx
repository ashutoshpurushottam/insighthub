import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { fetchReports } from '@/features/reports/api';

import { createDashboard, updateDashboard, type Dashboard } from './api';

interface Props {
  dashboard?: Dashboard | null;
  onClose: () => void;
}

export function DashboardFormModal({ dashboard, onClose }: Props) {
  const isEdit = !!dashboard;
  const queryClient = useQueryClient();

  const [name, setName] = useState(dashboard?.name ?? '');
  const [description, setDescription] = useState(dashboard?.description ?? '');
  const [columns, setColumns] = useState(dashboard?.columnsCount ?? 2);
  const [items, setItems] = useState<{ reportId: number; title: string; position: number }[]>(
    dashboard?.items.map((i) => ({ reportId: i.reportId, title: i.title ?? '', position: i.position })) ?? []
  );

  const { data: reports } = useQuery({ queryKey: ['reports'], queryFn: fetchReports });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { name, description, columnsCount: columns, items };
      return isEdit ? updateDashboard(dashboard.id, payload) : createDashboard(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] });
      toast.success(isEdit ? 'Updated' : 'Created');
      onClose();
    },
    onError: () => toast.error('Failed to save'),
  });

  const addItem = () => {
    setItems([...items, { reportId: 0, title: '', position: items.length }]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{isEdit ? 'Edit Dashboard' : 'New Dashboard'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
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
          <div>
            <label className="label">Columns</label>
            <select className="input-field" value={columns} onChange={(e) => setColumns(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label mb-0">Reports</label>
              <button type="button" onClick={addItem} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="mb-2 flex gap-2">
                <select
                  className="input-field flex-1"
                  value={item.reportId}
                  onChange={(e) => { const copy = [...items]; copy[idx].reportId = Number(e.target.value); setItems(copy); }}
                >
                  <option value={0}>Select report...</option>
                  {reports?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={!name || mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
