// ===== User & Auth Types =====

export interface User {
  id: number;
  username: string;
  fullName?: string;
  email?: string;
  description?: string;
  accessLevel: number;
  active: boolean;
  publicUser: boolean;
  roles?: string[];
  permissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ===== Report Types =====

export interface Report {
  id: number;
  name: string;
  shortDescription?: string;
  description?: string;
  reportType: number;
  reportGroupId?: number;
  reportGroupName?: string;
  datasourceId?: number;
  datasourceName?: string;
  contactPerson?: string;
  active: boolean;
  hidden: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportGroup {
  reportGroupId: number;
  name: string;
  description?: string;
  creationDate?: string;
  updateDate?: string;
}

// ===== Datasource Types =====

export interface Datasource {
  datasourceId: number;
  name: string;
  description?: string;
  datasourceType?: string;
  databaseType?: string;
  driver?: string;
  url?: string;
  username?: string;
  active: boolean;
  creationDate?: string;
  updateDate?: string;
}

// ===== Job Types =====

export interface Job {
  jobId: number;
  name: string;
  description?: string;
  jobType?: string;
  active: boolean;
  nextRunDate?: string;
  lastRunDate?: string;
  lastRunDetails?: string;
  creationDate?: string;
  updateDate?: string;
}

// ===== Schedule Types =====

export interface Schedule {
  scheduleId: number;
  name: string;
  description?: string;
  minute?: string;
  hour?: string;
  day?: string;
  month?: string;
  weekday?: string;
  creationDate?: string;
  updateDate?: string;
}

// ===== Common Types =====

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface SelectOption {
  value: string | number;
  label: string;
}

export type AccessLevel = 'VIEW' | 'EDIT' | 'ADMIN';

export type JobStatus =
  | 'SUCCESS'
  | 'FAILED'
  | 'RUNNING'
  | 'CANCELLED'
  | 'SKIPPED'
  | 'PENDING';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json' | 'xml' | 'html';

export type ChartType =
  | 'bar'
  | 'stacked-bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'heatmap';

// ===== Dashboard Types =====

export interface DashboardItem {
  id: number;
  reportId: number;
  reportName?: string;
  title?: string;
  position: number;
  colSpan: number;
  rowSpan: number;
}

export interface Dashboard {
  id: number;
  name: string;
  description?: string;
  layoutType: string;
  columnsCount: number;
  autoRefreshSeconds: number;
  active: boolean;
  items: DashboardItem[];
  createdAt?: string;
  updatedAt?: string;
}

// ===== Rules / RLS Types =====

export interface Rule {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RuleValue {
  id: number;
  ruleId: number;
  userId?: number;
  userGroupId?: number;
  ruleValue: string;
  username?: string;
  userGroupName?: string;
}

// ===== SMTP Types =====

export interface SmtpServer {
  id: number;
  name: string;
  server: string;
  port: number;
  useStarttls: boolean;
  useAuth: boolean;
  username?: string;
  fromAddress?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ===== User Group Types =====

export interface UserGroup {
  id: number;
  name: string;
  description?: string;
  memberCount?: number;
  roleNames?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// ===== Access Rights Types =====

export interface AccessRightAssignment {
  subjectType: 'user' | 'userGroup';
  subjectId: number;
  reportIds: number[];
  reportGroupIds: number[];
}

// ===== Report Execution Types =====

export interface ReportRunResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionMs: number;
  truncated?: boolean;
  truncationReason?: string;
}

export interface ReportParameter {
  id: number;
  reportId: number;
  name: string;
  label?: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  multiValue?: boolean;
  hidden?: boolean;
  allowNull?: boolean;
  position?: number;
}

export interface ChartConfig {
  chartType: ChartType;
  xAxis?: string;
  yAxis?: string[];
  title?: string;
  showLegend?: boolean;
  showSummary?: boolean;
}

export interface ExportRequest {
  reportId: number;
  format: ExportFormat;
  params?: Record<string, string | string[]>;
  reportName?: string;
}

// ===== Job Execution Types =====

export interface JobExecutionSummary {
  id: number;
  jobId: number;
  jobName?: string;
  startTime: string;
  endTime?: string;
  status: JobStatus | string;
  errorMessage?: string;
  outputFile?: string;
  rowsGenerated?: number;
}

export interface JobHistoryStats {
  total: number;
  success: number;
  failed: number;
  running: number;
  cancelled: number;
  skipped: number;
  successRate: number;
  averageDurationMs: number | null;
}

// ===== UI State Helpers =====

export interface ListPageState<T> {
  items: T[];
  search: string;
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  loading: boolean;
  error?: string | null;
}

export interface FormModalState<T> {
  open: boolean;
  editing: T | null;
  saving: boolean;
  error?: string | null;
}

