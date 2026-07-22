import type { ReactNode } from 'react';
import type { Control } from 'react-hook-form';

// Re-export RunReportResult from the existing API types
export type { RunReportResult } from '../api';

// --- Token types for syntax highlighting ---

export type TokenType = 'keyword' | 'string' | 'number' | 'comment' | 'default';

export interface Token {
  type: TokenType;
  value: string;
}

// --- Validation types ---

export type ValidationErrorType =
  | 'empty'
  | 'unbalanced-parentheses'
  | 'unclosed-string';

export interface ValidationError {
  type: ValidationErrorType;
  message: string;
}

// --- Form integration types ---

/**
 * Matches the form schema used by ReportFormModal.
 * Kept minimal to represent the shape needed by the SQL editor panel.
 */
export interface ReportFormData {
  name: string;
  shortDescription?: string;
  reportGroupId?: number | null;
  datasourceId?: number | null;
  reportSource?: string;
  active: boolean;
}

// --- Component prop interfaces ---

export interface SqlEditorPanelProps {
  /** React Hook Form control object */
  control: Control<ReportFormData>;
  /** Name of the form field (always 'reportSource') */
  name: 'reportSource';
  /** Selected datasource ID from the form */
  datasourceId: number | null;
  /** Report ID (for saved reports, enables runReport API) */
  reportId?: number;
}

export interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  'aria-label'?: string;
  onExecute?: () => void;
}

export interface SplitPanelProps {
  topContent: ReactNode;
  bottomContent: ReactNode;
  /** Default 0.6 (60% editor, 40% results) */
  initialTopRatio?: number;
  /** Default 200px */
  minTopHeight?: number;
  /** Default 100px */
  minBottomHeight?: number;
}

export interface ResultPaneProps {
  isLoading: boolean;
  result: import('../api').RunReportResult | null;
  error: string | null;
}

export interface ErrorDisplayProps {
  message: string;
  type: 'validation' | 'execution';
}

// --- Editor state (Zustand store shape) ---

export interface SqlEditorState {
  isExecuting: boolean;
  result: import('../api').RunReportResult | null;
  error: string | null;
  validationErrors: ValidationError[];
  execute: (sql: string, datasourceId: number, reportId?: number) => Promise<void>;
  setValidationErrors: (errors: ValidationError[]) => void;
  clearResults: () => void;
}

// --- Editor configuration ---

export interface SqlEditorConfig {
  keywords: Set<string>;
  maxHighlightLength: number;
  tabSize: number;
  minHeight: number;
  maxUndoHistory: number;
  maxErrorDisplayLength: number;
  cellTruncateLength: number;
}

/** SQL keywords recognized by the syntax highlighter (case-insensitive matching) */
export const SQL_KEYWORDS: Set<string> = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'JOIN',
  'INSERT',
  'UPDATE',
  'DELETE',
  'CREATE',
  'DROP',
  'ALTER',
  'GROUP',
  'BY',
  'ORDER',
  'HAVING',
  'UNION',
  'LIMIT',
  'OFFSET',
  'AND',
  'OR',
  'NOT',
  'IN',
  'BETWEEN',
  'LIKE',
  'IS',
  'NULL',
  'AS',
  'ON',
  'SET',
  'VALUES',
  'INTO',
  'DISTINCT',
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
]);

/** Default editor configuration constants */
export const DEFAULT_SQL_EDITOR_CONFIG: SqlEditorConfig = {
  keywords: SQL_KEYWORDS,
  maxHighlightLength: 5000,
  tabSize: 2,
  minHeight: 200,
  maxUndoHistory: 50,
  maxErrorDisplayLength: 500,
  cellTruncateLength: 200,
};
