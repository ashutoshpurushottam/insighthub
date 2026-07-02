import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { LoadingSpinner } from '@/components/ui';
import { fetchReports } from '@/features/reports/api';
import { fetchSmtpServers } from '@/features/smtp-servers/api';
import { apiClient } from '@/lib/api-client';

// --- Constants ---

const JOB_TYPES = [
  'EMAIL_ATTACHMENT',
  'EMAIL_INLINE',
  'PUBLISH',
  'ALERT',
  'BURST',
  'CONDITIONAL_EMAIL_ATTACHMENT',
  'CONDITIONAL_EMAIL_INLINE',
  'CONDITIONAL_PUBLISH',
  'JUST_RUN_IT',
] as const;

const OUTPUT_FORMATS = ['CSV', 'XLSX', 'PDF', 'HTML'] as const;

const TABS = ['General', 'Schedule', 'Email', 'Output', 'Advanced'] as const;
type Tab = (typeof TABS)[number];

// --- Zod Schema ---

const jobFormSchema = z.object({
  // General
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional().default(''),
  reportId: z.coerce.number().min(1, 'Report is required'),
  jobType: z.enum(JOB_TYPES),
  outputFormat: z.string().max(20).optional().default('CSV'),
  active: z.boolean().default(true),

  // Schedule
  cronSecond: z.string().max(20).optional().default('0'),
  cronMinute: z.string().max(20).optional().default(''),
  cronHour: z.string().max(20).optional().default(''),
  cronDay: z.string().max(20).optional().default('?'),
  cronMonth: z.string().max(20).optional().default('*'),
  cronWeekday: z.string().max(20).optional().default('*'),
  cronYear: z.string().max(20).optional().default('*'),
  timeZone: z.string().max(50).optional().default(''),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
  extraSchedules: z.string().optional().default(''),
  manual: z.boolean().default(false),

  // Email
  emailTo: z.string().max(2000).optional().default(''),
  emailCc: z.string().max(2000).optional().default(''),
  emailBcc: z.string().max(2000).optional().default(''),
  emailReplyTo: z.string().max(500).optional().default(''),
  emailFrom: z.string().max(200).optional().default(''),
  emailSubject: z.string().max(500).optional().default(''),
  emailMessage: z.string().optional().default(''),
  smtpServerId: z.coerce.number().optional().nullable(),
  dynamicRecipientsReportId: z.coerce.number().optional().nullable(),

  // Output
  runsToArchive: z.coerce.number().min(0).optional().default(0),
  allowSharing: z.boolean().default(false),
  allowSplitting: z.boolean().default(false),
  fixedFileName: z.string().max(200).optional().default(''),
  subDirectory: z.string().max(200).optional().default(''),

  // Advanced
  preRunReportIds: z.string().max(500).optional().default(''),
  postRunReportIds: z.string().max(500).optional().default(''),
  batchFile: z.string().max(200).optional().default(''),
  errorNotificationEmail: z.string().max(500).optional().default(''),
});

type JobFormData = z.infer<typeof jobFormSchema>;

// --- API helpers ---

interface JobDto {
  id: number;
  name: string;
  description?: string;
  reportId?: number;
  reportName?: string;
  jobType: string;
  outputFormat?: string;
  active: boolean;
  cronSecond?: string;
  cronMinute?: string;
  cronHour?: string;
  cronDay?: string;
  cronMonth?: string;
  cronWeekday?: string;
  cronYear?: string;
  timeZone?: string;
  startDate?: string;
  endDate?: string;
  extraSchedules?: string;
  manual?: boolean;
  emailTo?: string;
  emailCc?: string;
  emailBcc?: string;
  emailReplyTo?: string;
  emailFrom?: string;
  emailSubject?: string;
  emailMessage?: string;
  smtpServerId?: number | null;
  dynamicRecipientsReportId?: number | null;
  runsToArchive?: number;
  allowSharing?: boolean;
  allowSplitting?: boolean;
  fixedFileName?: string;
  subDirectory?: string;
  preRunReportIds?: string;
  postRunReportIds?: string;
  batchFile?: string;
  errorNotificationEmail?: string;
}

async function fetchJobById(id: number): Promise<JobDto> {
  const { data } = await apiClient.get(`/jobs/${id}`);
  return data;
}

async function createJobApi(payload: JobFormData): Promise<JobDto> {
  const body = buildRequestBody(payload);
  const { data } = await apiClient.post('/jobs', body);
  return data;
}

async function updateJobApi(id: number, payload: JobFormData): Promise<JobDto> {
  const body = buildRequestBody(payload);
  const { data } = await apiClient.put(`/jobs/${id}`, body);
  return data;
}

function buildRequestBody(data: JobFormData): Record<string, unknown> {
  return {
    name: data.name,
    description: data.description || undefined,
    reportId: data.reportId,
    jobType: data.jobType,
    outputFormat: data.outputFormat || 'CSV',
    active: data.active,
    cronSecond: data.cronSecond || '0',
    cronMinute: data.cronMinute || undefined,
    cronHour: data.cronHour || undefined,
    cronDay: data.cronDay || '?',
    cronMonth: data.cronMonth || '*',
    cronWeekday: data.cronWeekday || '*',
    cronYear: data.cronYear || '*',
    timeZone: data.timeZone || undefined,
    startDate: data.startDate || undefined,
    endDate: data.endDate || undefined,
    extraSchedules: data.extraSchedules || undefined,
    manual: data.manual,
    emailTo: data.emailTo || undefined,
    emailCc: data.emailCc || undefined,
    emailBcc: data.emailBcc || undefined,
    emailReplyTo: data.emailReplyTo || undefined,
    emailFrom: data.emailFrom || undefined,
    emailSubject: data.emailSubject || undefined,
    emailMessage: data.emailMessage || undefined,
    smtpServerId: data.smtpServerId || undefined,
    dynamicRecipientsReportId: data.dynamicRecipientsReportId || undefined,
    runsToArchive: data.runsToArchive ?? 0,
    allowSharing: data.allowSharing,
    allowSplitting: data.allowSplitting,
    fixedFileName: data.fixedFileName || undefined,
    subDirectory: data.subDirectory || undefined,
    preRunReportIds: data.preRunReportIds || undefined,
    postRunReportIds: data.postRunReportIds || undefined,
    batchFile: data.batchFile || undefined,
    errorNotificationEmail: data.errorNotificationEmail || undefined,
  };
}

// --- Component ---

export function JobFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const jobId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('General');

  // Load existing job for edit mode
  const { data: existingJob, isLoading: jobLoading } = useQuery({
    queryKey: ['jobs', jobId],
    queryFn: () => fetchJobById(jobId!),
    enabled: isEdit,
  });

  // Load reports for selector
  const { data: reports } = useQuery({
    queryKey: ['reports'],
    queryFn: fetchReports,
  });

  // Load SMTP servers for selector
  const { data: smtpServers } = useQuery({
    queryKey: ['smtp-servers'],
    queryFn: fetchSmtpServers,
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    values: isEdit && existingJob
      ? {
          name: existingJob.name ?? '',
          description: existingJob.description ?? '',
          reportId: existingJob.reportId ?? 0,
          jobType: (existingJob.jobType as JobFormData['jobType']) ?? 'PUBLISH',
          outputFormat: existingJob.outputFormat ?? 'CSV',
          active: existingJob.active ?? true,
          cronSecond: existingJob.cronSecond ?? '0',
          cronMinute: existingJob.cronMinute ?? '',
          cronHour: existingJob.cronHour ?? '',
          cronDay: existingJob.cronDay ?? '?',
          cronMonth: existingJob.cronMonth ?? '*',
          cronWeekday: existingJob.cronWeekday ?? '*',
          cronYear: existingJob.cronYear ?? '*',
          timeZone: existingJob.timeZone ?? '',
          startDate: existingJob.startDate ?? '',
          endDate: existingJob.endDate ?? '',
          extraSchedules: existingJob.extraSchedules ?? '',
          manual: existingJob.manual ?? false,
          emailTo: existingJob.emailTo ?? '',
          emailCc: existingJob.emailCc ?? '',
          emailBcc: existingJob.emailBcc ?? '',
          emailReplyTo: existingJob.emailReplyTo ?? '',
          emailFrom: existingJob.emailFrom ?? '',
          emailSubject: existingJob.emailSubject ?? '',
          emailMessage: existingJob.emailMessage ?? '',
          smtpServerId: existingJob.smtpServerId ?? null,
          dynamicRecipientsReportId: existingJob.dynamicRecipientsReportId ?? null,
          runsToArchive: existingJob.runsToArchive ?? 0,
          allowSharing: existingJob.allowSharing ?? false,
          allowSplitting: existingJob.allowSplitting ?? false,
          fixedFileName: existingJob.fixedFileName ?? '',
          subDirectory: existingJob.subDirectory ?? '',
          preRunReportIds: existingJob.preRunReportIds ?? '',
          postRunReportIds: existingJob.postRunReportIds ?? '',
          batchFile: existingJob.batchFile ?? '',
          errorNotificationEmail: existingJob.errorNotificationEmail ?? '',
        }
      : undefined,
    defaultValues: {
      name: '',
      description: '',
      reportId: 0,
      jobType: 'PUBLISH',
      outputFormat: 'CSV',
      active: true,
      cronSecond: '0',
      cronMinute: '',
      cronHour: '',
      cronDay: '?',
      cronMonth: '*',
      cronWeekday: '*',
      cronYear: '*',
      timeZone: '',
      startDate: '',
      endDate: '',
      extraSchedules: '',
      manual: false,
      emailTo: '',
      emailCc: '',
      emailBcc: '',
      emailReplyTo: '',
      emailFrom: '',
      emailSubject: '',
      emailMessage: '',
      smtpServerId: null,
      dynamicRecipientsReportId: null,
      runsToArchive: 0,
      allowSharing: false,
      allowSplitting: false,
      fixedFileName: '',
      subDirectory: '',
      preRunReportIds: '',
      postRunReportIds: '',
      batchFile: '',
      errorNotificationEmail: '',
    },
  });

  const isManual = watch('manual');

  const mutation = useMutation({
    mutationFn: (data: JobFormData) =>
      isEdit ? updateJobApi(jobId!, data) : createJobApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(isEdit ? 'Job updated' : 'Job created');
      navigate('/jobs');
    },
    onError: () => toast.error('Failed to save job'),
  });

  if (isEdit && jobLoading) {
    return <LoadingSpinner size="lg" className="mt-12" />;
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/jobs')}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? 'Edit Job' : 'Create Job'}
        </h1>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        {/* General Tab */}
        {activeTab === 'General' && (
          <div className="card space-y-4 p-6">
            <div>
              <label className="label">Job Name *</label>
              <input className="input-field" {...register('name')} placeholder="e.g. Daily Sales Report" />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <label className="label">Description</label>
              <textarea rows={3} className="input-field" {...register('description')} placeholder="Optional description of this job" />
            </div>

            <div>
              <label className="label">Report *</label>
              <select className="input-field" {...register('reportId')}>
                <option value="">Select a report...</option>
                {reports?.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {errors.reportId && <p className="mt-1 text-xs text-red-600">{errors.reportId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Job Type *</label>
                <select className="input-field" {...register('jobType')}>
                  {JOB_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                {errors.jobType && <p className="mt-1 text-xs text-red-600">{errors.jobType.message}</p>}
              </div>
              <div>
                <label className="label">Output Format</label>
                <select className="input-field" {...register('outputFormat')}>
                  {OUTPUT_FORMATS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                {...register('active')}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="active" className="text-sm text-gray-700">Active</label>
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'Schedule' && (
          <div className="card space-y-4 p-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="manual"
                {...register('manual')}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="manual" className="text-sm text-gray-700">
                Manual only (no automatic schedule)
              </label>
            </div>

            {!isManual && (
              <>
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-7">
                  <div>
                    <label className="label">Second</label>
                    <input className="input-field" {...register('cronSecond')} placeholder="0" />
                  </div>
                  <div>
                    <label className="label">Minute</label>
                    <input className="input-field" {...register('cronMinute')} placeholder="0" />
                  </div>
                  <div>
                    <label className="label">Hour</label>
                    <input className="input-field" {...register('cronHour')} placeholder="8" />
                  </div>
                  <div>
                    <label className="label">Day</label>
                    <input className="input-field" {...register('cronDay')} placeholder="?" />
                  </div>
                  <div>
                    <label className="label">Month</label>
                    <input className="input-field" {...register('cronMonth')} placeholder="*" />
                  </div>
                  <div>
                    <label className="label">Weekday</label>
                    <input className="input-field" {...register('cronWeekday')} placeholder="MON-FRI" />
                  </div>
                  <div>
                    <label className="label">Year</label>
                    <input className="input-field" {...register('cronYear')} placeholder="*" />
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  Use Quartz cron syntax. Example: second=0, minute=0, hour=8, day=?, month=*, weekday=MON-FRI → 8AM weekdays.
                </p>

                <div>
                  <label className="label">Extra Schedules</label>
                  <textarea
                    rows={3}
                    className="input-field"
                    {...register('extraSchedules')}
                    placeholder="Additional cron expressions, one per line"
                  />
                </div>
              </>
            )}

            <div>
              <label className="label">Time Zone</label>
              <input className="input-field" {...register('timeZone')} placeholder="e.g. America/New_York" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Start Date</label>
                <input type="datetime-local" className="input-field" {...register('startDate')} />
              </div>
              <div>
                <label className="label">End Date</label>
                <input type="datetime-local" className="input-field" {...register('endDate')} />
              </div>
            </div>
          </div>
        )}

        {/* Email Tab */}
        {activeTab === 'Email' && (
          <div className="card space-y-4 p-6">
            <div>
              <label className="label">To (comma-separated)</label>
              <input className="input-field" {...register('emailTo')} placeholder="user@example.com, manager@example.com" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Cc</label>
                <input className="input-field" {...register('emailCc')} />
              </div>
              <div>
                <label className="label">Bcc</label>
                <input className="input-field" {...register('emailBcc')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">From (override)</label>
                <input className="input-field" {...register('emailFrom')} placeholder="Optional override" />
              </div>
              <div>
                <label className="label">Reply-To</label>
                <input className="input-field" {...register('emailReplyTo')} />
              </div>
            </div>

            <div>
              <label className="label">Subject</label>
              <input className="input-field" {...register('emailSubject')} placeholder="Report: ${name}" />
            </div>

            <div>
              <label className="label">Message Body</label>
              <textarea rows={4} className="input-field" {...register('emailMessage')} placeholder="Email message body (plain text or HTML)" />
            </div>

            <div>
              <label className="label">SMTP Server</label>
              <select className="input-field" {...register('smtpServerId')}>
                <option value="">Default (global settings)</option>
                {smtpServers?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.server})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Dynamic Recipients Report</label>
              <select className="input-field" {...register('dynamicRecipientsReportId')}>
                <option value="">None</option>
                {reports?.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Report that returns email addresses. Supports #column_name# placeholders.
              </p>
            </div>
          </div>
        )}

        {/* Output Tab */}
        {activeTab === 'Output' && (
          <div className="card space-y-4 p-6">
            <div>
              <label className="label">Runs to Archive</label>
              <input
                type="number"
                min={0}
                className="input-field"
                {...register('runsToArchive')}
                placeholder="0 = no archiving"
              />
              <p className="mt-1 text-xs text-gray-500">Number of past outputs to retain for viewing.</p>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowSharing"
                  {...register('allowSharing')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="allowSharing" className="text-sm text-gray-700">Allow Sharing</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowSplitting"
                  {...register('allowSplitting')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="allowSplitting" className="text-sm text-gray-700">Allow Splitting</label>
              </div>
            </div>

            <div>
              <label className="label">Fixed File Name</label>
              <input className="input-field" {...register('fixedFileName')} placeholder="Optional fixed filename for output" />
            </div>

            <div>
              <label className="label">Sub-Directory</label>
              <input className="input-field" {...register('subDirectory')} placeholder="Optional subdirectory in export path" />
            </div>
          </div>
        )}

        {/* Advanced Tab */}
        {activeTab === 'Advanced' && (
          <div className="card space-y-4 p-6">
            <div>
              <label className="label">Pre-Run Report IDs</label>
              <input className="input-field" {...register('preRunReportIds')} placeholder="e.g. 5,12 (comma-separated report IDs)" />
              <p className="mt-1 text-xs text-gray-500">Update Statement reports to run before this job.</p>
            </div>

            <div>
              <label className="label">Post-Run Report IDs</label>
              <input className="input-field" {...register('postRunReportIds')} placeholder="e.g. 6,13 (comma-separated report IDs)" />
              <p className="mt-1 text-xs text-gray-500">Reports to run after this job completes.</p>
            </div>

            <div>
              <label className="label">Batch File</label>
              <input className="input-field" {...register('batchFile')} placeholder="Path to script to execute after completion" />
              <p className="mt-1 text-xs text-gray-500">Output filename passed as first argument.</p>
            </div>

            <div>
              <label className="label">Error Notification Email</label>
              <input className="input-field" {...register('errorNotificationEmail')} placeholder="admin@example.com" />
              <p className="mt-1 text-xs text-gray-500">Email address to notify on job failure.</p>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/jobs')} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            <Save className="mr-2 h-4 w-4" />
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Job' : 'Create Job'}
          </button>
        </div>
      </form>
    </div>
  );
}
