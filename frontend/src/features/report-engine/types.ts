/**
 * TypeScript interfaces for the Report Engine feature.
 * These types mirror the backend DTOs and entity models.
 */

// === Core Entities ===

export interface Report {
  id: number;
  name: string;
  shortDescription?: string;
  description?: string;
  contactPerson?: string;
  reportGroupId?: number;
  datasourceId: number;
  reportSource: string;
  reportType?: number;
  active: boolean;
  usesRules: boolean;
  defaultReportFormat?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export type ParameterType =
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'DATETIME'
  | 'BOOLEAN'
  | 'DROPDOWN'
  | 'DATERANGE';

export type LovType = 'DYNAMIC' | 'STATIC';

export type DateRangePair = 'FROM' | 'TO';

export interface LovOption {
  value: string;
  label: string;
}

export interface Parameter {
  id: number;
  reportId: number;
  name: string;
  label: string;
  type: ParameterType;
  defaultValue?: string;
  placeholder?: string;
  required: boolean;
  position: number;
  lovType?: LovType;
  lovQuery?: string;
  lovStaticValues?: LovOption[];
  parentParamId?: number;
  multiValue: boolean;
  dateRangePair?: DateRangePair;
  hidden: boolean;
  allowNull: boolean;
  fromParameterName?: string;
  toParameterName?: string;
}

// === Drill-Down ===

export interface DrillDownParamMapping {
  id?: number;
  parentColumnName: string;
  childParamName: string;
}

export interface DrillDownLink {
  id: number;
  parentReportId: number;
  childReportId: number;
  childReportName?: string;
  triggerColumn: string;
  position: number;
  paramMappings: DrillDownParamMapping[];
}

// === Guardrails ===

export interface GuardrailsConfig {
  id?: number;
  reportId?: number;
  maxRows: number;
  maxExportRows: number;
  maxDateRangeDays: number;
  executionTimeoutSeconds: number;
  maxConcurrentPerUser: number;
  maxResultSizeBytes: number;
}

// === Execution ===

export type SortDirection = 'ASC' | 'DESC';

export interface ExecuteReportRequest {
  params: Record<string, string | string[]>;
  nullParams?: string[];
  page: number;
  pageSize: number;
  sortColumn?: string;
  sortDirection?: SortDirection;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
}

export interface DrillDownInfo {
  column: string;
  childReportId: number;
  childReportName: string;
}

export interface PaginatedResult {
  columns: string[];
  rows: Record<string, unknown>[];
  pagination: PaginationMeta;
  executionMs: number;
  truncated: boolean;
  truncationReason?: string;
  drillDownLinks: DrillDownInfo[];
}
