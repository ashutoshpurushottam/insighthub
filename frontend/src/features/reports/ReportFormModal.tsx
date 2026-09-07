import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { fetchDatasources } from '@/features/datasources/api';
import { fetchReportGroups } from '@/features/report-groups/api';

import { createReport, updateReport, type Report } from './api';
import { reportSchema, type ReportFormData } from './schemas';
import { SqlEditorPanel } from './sql-editor/SqlEditorPanel';

type FormData = ReportFormData;

interface Props {
  report?: Report | null;
  onClose: () => void;
}

export function ReportFormModal({ report, onClose }: Props) {
  const isEdit = !!report;
  const queryClient = useQueryClient();

  const { data: datasources } = useQuery({
    queryKey: ['datasources'],
    queryFn: fetchDatasources,
  });

  const { data: reportGroups } = useQuery({
    queryKey: ['report-groups'],
    queryFn: fetchReportGroups,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: isEdit
      ? {
          name: report.name,
          shortDescription: report.shortDescription ?? '',
          reportGroupId: report.reportGroupId ?? null,
          datasourceId: report.datasourceId ?? null,
          reportSource: report.reportSource ?? '',
          active: report.active,
        }
      : { active: true },
  });

  const watchedDatasourceId = watch('datasourceId') ?? null;

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        reportType: 0,
        reportGroupId: data.reportGroupId || null,
        datasourceId: data.datasourceId || null,
      };
      return isEdit ? updateReport(report.id, payload) : createReport(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(isEdit ? 'Report updated' : 'Report created');
      onClose();
    },
    onError: () => toast.error('Failed to save report'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Report' : 'Create Report'}
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
            <label className="label">Report Name</label>
            <input className="input-field" {...register('name')} />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="label">Description</label>
            <input
              className="input-field"
              placeholder="Short description..."
              {...register('shortDescription')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Report Group</label>
              <select className="input-field" {...register('reportGroupId')}>
                <option value="">None</option>
                {reportGroups?.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Datasource</label>
              <select className="input-field" {...register('datasourceId')}>
                <option value="">None</option>
                {datasources?.map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">SQL Source</label>
            <SqlEditorPanel
              control={control}
              name="reportSource"
              datasourceId={watchedDatasourceId as number | null}
              reportId={report?.id}
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
