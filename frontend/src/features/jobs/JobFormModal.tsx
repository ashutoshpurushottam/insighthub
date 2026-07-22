import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { fetchReports } from '@/features/reports/api';

import {
  createJob,
  fetchSchedules,
  JOB_TYPES,
  updateJob,
  type Job,
} from './api';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  reportId: z.coerce.number().min(1, 'Report is required'),
  scheduleId: z.coerce.number().nullable().optional(),
  jobType: z.string().min(1),
  outputFormat: z.string().optional(),
  recipients: z.string().max(1000).optional(),
  active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  job?: Job | null;
  onClose: () => void;
}

export function JobFormModal({ job, onClose }: Props) {
  const isEdit = !!job;
  const queryClient = useQueryClient();

  const { data: reports } = useQuery({
    queryKey: ['reports'],
    queryFn: fetchReports,
  });
  const { data: schedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: fetchSchedules,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: isEdit
      ? {
          name: job.name,
          description: job.description ?? '',
          reportId: job.reportId ?? 0,
          scheduleId: job.scheduleId ?? null,
          jobType: job.jobType,
          outputFormat: job.outputFormat ?? 'PDF',
          recipients: job.recipients ?? '',
          active: job.active,
        }
      : { active: true, jobType: 'PUBLISH', outputFormat: 'PDF' },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = { ...data, scheduleId: data.scheduleId || null };
      return isEdit ? updateJob(job.id, payload) : createJob(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(isEdit ? 'Job updated' : 'Job created');
      onClose();
    },
    onError: () => toast.error('Failed to save job'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Job' : 'Create Job'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Job Name</label>
            <input className="input-field" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="label">Report</label>
            <select className="input-field" {...register('reportId')}>
              <option value="">Select report...</option>
              {reports?.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            {errors.reportId && <p className="mt-1 text-xs text-red-600">{errors.reportId.message}</p>}
          </div>

          <div>
            <label className="label">Schedule</label>
            <select className="input-field" {...register('scheduleId')}>
              <option value="">No schedule (manual only)</option>
              {schedules?.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {s.cronExpression}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Job Type</label>
              <select className="input-field" {...register('jobType')}>
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Output Format</label>
              <select className="input-field" {...register('outputFormat')}>
                <option value="PDF">PDF</option>
                <option value="XLSX">Excel (XLSX)</option>
                <option value="CSV">CSV</option>
                <option value="HTML">HTML</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Recipients (emails, comma-separated)</label>
            <input className="input-field" placeholder="user@example.com" {...register('recipients')} />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea rows={2} className="input-field" {...register('description')} />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="jobActive" {...register('active')} className="rounded border-gray-300 text-primary-600" />
            <label htmlFor="jobActive" className="text-sm text-gray-700">Active</label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
