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
