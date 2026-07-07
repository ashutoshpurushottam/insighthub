# Implementation Plan: Report Engine

## Overview

The Report Engine implementation is organized into 10 logical phases: database migration, backend execution engine, parameter enhancements, drill-down/clone, export services, and 5 frontend phases (builder, runner, drill-down, export toolbar, guardrails admin). Each phase builds incrementally on previous work, with backend foundations established before frontend consumers.

## Tasks

- [x] 1. Database migration and entity layer
  - [x] 1.1 Create V8 Flyway migration script with parameter enhancements, drill-down tables, and guardrails table
    - Add columns to `parameters` table: `lov_type`, `lov_query`, `lov_static_values`, `parent_param_id`, `multi_value`, `date_range_pair`
    - Create `drill_down_links` table with FK constraints to reports
    - Create `drill_down_param_mappings` table with FK to drill_down_links
    - Create `guardrails_config` table with global/per-report support (report_id UNIQUE nullable)
    - _Requirements: 3.1, 3.2, 4.1, 5.1, 6.1, 7.1, 8.1, 8.2, 10.1_

  - [x] 1.2 Create/enhance JPA entity classes for new and modified tables
    - Enhance `ParameterEntity.java` with new LOV, cascading, multi-value, and date_range_pair fields
    - Create `DrillDownLinkEntity.java` with parent/child report references and trigger_column
    - Create `DrillDownParamMappingEntity.java` with column-to-param mappings
    - Create `GuardrailsConfigEntity.java` with all limit fields and optional report_id
    - _Requirements: 3.2, 4.1, 5.1, 6.1, 8.2, 10.1, 10.2_

  - [x] 1.3 Create Spring Data JPA repositories for new entities
    - Create `DrillDownRepository.java` with findByParentReportId query method
    - Create `GuardrailsRepository.java` with findByReportId and findGlobal (where report_id IS NULL) queries
    - _Requirements: 8.1, 10.2, 10.3_

  - [x]* 1.4 Write unit tests for entity mappings and repository queries
    - Test GuardrailsRepository global vs per-report lookup
    - Test DrillDownRepository cascade delete behavior
    - _Requirements: 10.2, 10.3, 8.5_

- [x] 2. Backend execution engine — guardrails, concurrency, streaming
  - [x] 2.1 Implement `GuardrailsService.java` with global/per-report resolution logic
    - Implement getEffectiveGuardrails(reportId) returning merged config (per-report override > global default)
    - Implement CRUD for global guardrails and per-report overrides
    - Validate that all guardrail values are positive integers/longs
    - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.6_

  - [x] 2.2 Implement `GuardrailsController.java` REST endpoints
    - GET `/api/guardrails` — return global config
    - PUT `/api/guardrails` — update global config (Admin only)
    - PUT `/api/reports/{id}/guardrails` — set per-report override (Admin only)
    - _Requirements: 10.4, 10.5, 10.6_

  - [x] 2.3 Implement `ConcurrencyLimiter.java` using ConcurrentHashMap
    - tryAcquire(userId) returns true if under limit, false otherwise
    - release(userId) decrements counter (never below 0)
    - Use AtomicInteger per user with computeIfAbsent pattern
    - _Requirements: 19.1, 19.2, 19.3_

  - [x] 2.4 Implement `ExecutionGuard.java` — pre-execution guardrail checks
    - Check date range pair parameters against max_date_range_days
    - Identify date range pairs by `date_range_pair` column ('FROM'/'TO') or suffix convention
    - Return descriptive error messages for each guardrail violation
    - _Requirements: 20.1, 20.2, 20.3_

  - [x] 2.5 Implement `StreamingResultSetHandler.java` — cursor-based streaming
    - Configure Statement with fetchSize and queryTimeout from guardrails
    - Use forward-only, read-only ResultSet
    - Extract page of rows (LIMIT/OFFSET or cursor skip) without buffering full result
    - Track estimated byte size for result-size-limit enforcement
    - Release JDBC resources in finally block
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 18.1, 21.1, 21.2, 21.3_

  - [x] 2.6 Implement `ReportExecutionService.java` — main 7-step orchestrator
    - Step 1: RBAC check via existing access rights service
    - Step 2: Parameter resolution (expressions, LOVs, validation)
    - Step 3: Guardrails check (concurrency, date range)
    - Step 4: SQL construction (parameter substitution with escaping, ORDER BY, LIMIT/OFFSET)
    - Step 5: Streaming execution via StreamingResultSetHandler
    - Step 6: Result assembly into PaginatedResult DTO
    - Step 7: Resource cleanup + concurrency counter release in finally
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 13.1, 13.4, 13.5, 17.4, 19.3, 22.1, 22.2, 22.3, 22.4, 23.1, 23.2, 23.3, 23.4, 23.5, 24.1, 24.2, 24.3, 24.4_

  - [x] 2.7 Create `PaginatedResult.java`, `PaginationMeta.java`, `DrillDownInfo.java` DTOs and `ExecuteReportRequest.java`
    - Include columns, rows, pagination metadata, executionMs, truncated flag, truncationReason, drillDownLinks
    - _Requirements: 22.3, 23.4, 26.2, 26.3_

  - [x] 2.8 Add execute endpoint to `ReportController.java`: POST `/api/reports/{id}/execute`
    - Accept ExecuteReportRequest body (params, page, pageSize, sortColumn, sortDirection)
    - Delegate to ReportExecutionService
    - Return PaginatedResult
    - _Requirements: 22.2, 22.3, 23.1_

  - [x]* 2.9 Write property test for concurrency counter balance (Property 6)
    - **Property 6: Concurrency Counter Balance**
    - Run M concurrent acquire/release calls with random simulated failures
    - Assert counter always returns to 0 after all operations complete
    - **Validates: Requirements 19.1, 19.2, 19.3**

  - [x]* 2.10 Write unit tests for ExecutionGuard and StreamingResultSetHandler
    - Test date range calculation and max-days rejection
    - Test timeout enforcement and resource cleanup
    - Test truncation when max rows exceeded
    - **Validates: Requirements 17.3, 18.2, 20.2, 21.2**

- [x] 3. Checkpoint — Backend execution core
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Backend parameter enhancements — LOV, cascading, multi-value, expressions
  - [x] 4.1 Implement `ExpressionResolver.java` — resolve 6 expression keywords
    - Resolve `CURDATE()` and `CURRENT_DATE` to yyyy-MM-dd
    - Resolve `NOW()` to yyyy-MM-dd HH:mm:ss
    - Resolve `CURRENT_USER` to authenticated username from SecurityContext
    - Resolve `FIRST_DAY_OF_MONTH` and `LAST_DAY_OF_MONTH`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 3.5, 3.6_

  - [x] 4.2 Implement `ParameterValidator.java` — type and required validation
    - Validate required parameters have non-empty values
    - Validate DATE/DATETIME parameters are parseable
    - Validate NUMBER parameters are numeric literals
    - Return structured validation errors with field names
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [x] 4.3 Enhance `ParameterService.java` with LOV resolution endpoint
    - Implement dynamic LOV: execute lov_query against report datasource, return id/label pairs
    - Implement static LOV: return stored JSON value/label pairs
    - Support cascading: accept parentValue parameter, bind to child LOV query
    - Handle LOV query failure gracefully (empty list + error flag)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.2, 5.3, 6.2, 16.1, 16.2_

  - [x] 4.4 Enhance `ParameterController.java` with GET `/api/parameters/{id}/lov` endpoint
    - Accept optional `parentValue` query param for cascading
    - Return list of {value, label} objects
    - _Requirements: 4.2, 6.2, 16.2_

  - [x] 4.5 Implement multi-value parameter expansion in SQL substitution
    - Expand `:paramName` to comma-separated quoted list for multi-value params
    - Single value: `'val1'`; multiple: `'val1','val2','val3'`
    - Escape single quotes in values (`'` → `''`)
    - _Requirements: 7.2, 15.1, 15.2, 15.3, 22.1_

  - [x]* 4.6 Write unit tests for ExpressionResolver and ParameterValidator
    - Test all 6 expression keywords resolve correctly
    - Test required/type validation rejects invalid input
    - Test multi-value expansion with edge cases (empty, single, many)
    - **Validates: Requirements 14.1–14.6, 13.1–13.4, 15.1–15.3**

- [x] 5. Backend drill-down and clone
  - [x] 5.1 Implement `DrillDownService.java` — CRUD for drill-down links
    - Create drill-down link with parent/child report IDs, trigger column, position
    - Store parameter mappings (parent column → child param name)
    - Validate child report exists and mapped params are defined on child
    - Delete drill-down link (cascades to mappings via FK)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 5.2 Implement `DrillDownController.java` REST endpoints
    - GET `/api/reports/{id}/drill-downs` — return configured drill-down links with mappings
    - POST `/api/reports/{id}/drill-downs` — create new drill-down link (Admin)
    - DELETE `/api/drill-downs/{id}` — remove drill-down link (Admin)
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 5.3 Implement report clone endpoint in `ReportController.java`
    - POST `/api/reports/{id}/clone` — deep copy report with params, append " (Copy)" to name
    - Assign new ID, set creator to current user
    - Do NOT copy drill-down links or access rights
    - _Requirements: 2.1, 2.2, 2.3_

  - [x]* 5.4 Write unit tests for DrillDownService and clone logic
    - Test parameter mapping validation rejects invalid param names
    - Test clone creates independent copy with new ID
    - Test cascade delete removes child mappings
    - **Validates: Requirements 8.4, 2.2, 2.3**

- [x] 6. Backend export — CSV, XLSX, PDF streaming
  - [x] 6.1 Add Apache POI and OpenPDF dependencies to pom.xml
    - poi-ooxml 5.2.5
    - openpdf 1.3.35
    - _Requirements: 29.5, 30.5_

  - [x] 6.2 Implement `CsvExportService.java` — streaming CSV export
    - Use PrintWriter to write header + rows directly to OutputStream
    - Stream rows from cursor with configured fetchSize
    - Apply RFC 4180 quoting rules (commas, newlines, double quotes)
    - Enforce max export rows guardrail, stop and log when exceeded
    - _Requirements: 28.1, 28.2, 28.3, 28.5, 31.1, 31.2, 31.3, 32.1, 32.4_

  - [x] 6.3 Implement `ExcelExportService.java` — streaming XLSX with SXSSFWorkbook
    - Use SXSSFWorkbook with 100-row memory window
    - Write bold header row, auto-size columns
    - Stream rows from cursor, flush to disk periodically
    - Enforce max export rows guardrail
    - _Requirements: 29.1, 29.2, 29.3, 29.5, 31.1, 31.2, 31.3, 32.2, 32.4_

  - [x] 6.4 Implement `PdfExportService.java` — streaming PDF with OpenPDF
    - Create Document with report name as title
    - Create PdfPTable with column headers repeated on each page
    - Stream rows from cursor, add to table incrementally
    - Write pages to response OutputStream
    - Enforce max export rows guardrail
    - _Requirements: 30.1, 30.2, 30.3, 30.5, 31.1, 31.2, 31.3, 32.3, 32.4_

  - [x] 6.5 Implement `ExportController.java` with streaming response endpoints
    - POST `/api/reports/{id}/export/csv` — Content-Type: text/csv
    - POST `/api/reports/{id}/export/xlsx` — Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
    - POST `/api/reports/{id}/export/pdf` — Content-Type: application/pdf
    - Set Content-Disposition with report name as filename
    - Enforce RBAC before export
    - _Requirements: 28.4, 29.4, 30.4, 12.1_

  - [x]* 6.6 Write unit tests for export services
    - Test CSV quoting of special characters
    - Test XLSX header formatting
    - Test export truncation when guardrail exceeded
    - **Validates: Requirements 28.3, 29.2, 31.2**

- [x] 7. Checkpoint — Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Frontend Report Builder page (tabbed form)
  - [x] 8.1 Set up frontend feature directory structure and TypeScript interfaces
    - Create `features/report-engine/` directory with pages/, components/, hooks/, types.ts
    - Define TypeScript interfaces: Report, Parameter, DrillDownLink, GuardrailsConfig, PaginatedResult, ExecuteReportRequest, LovOption
    - Add `file-saver` and `@types/file-saver` to package.json
    - _Requirements: 1.1, 3.1_

  - [x] 8.2 Implement `SqlEditor.tsx` component
    - Monospace font textarea with line numbers
    - Controlled component with value/onChange props
    - _Requirements: 1.6_

  - [x] 8.3 Implement `ParameterManager.tsx` component
    - CRUD table for parameter definitions (name, label, type, default, required, position)
    - Support all 6 parameter types: TEXT, NUMBER, DATE, DATETIME, BOOLEAN, DROPDOWN
    - LOV configuration section (type selector: dynamic/static, query input, static values editor)
    - Cascading parent selection dropdown
    - Multi-value toggle
    - Drag-to-reorder or position input
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 4.1, 5.1, 5.3, 6.1, 7.1_

  - [x] 8.4 Implement `DrillDownManager.tsx` component
    - List existing drill-down links for the report
    - Add form: select child report, trigger column, parameter mappings
    - Delete button with confirmation
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 8.5 Implement `ReportBuilderPage.tsx` with tabbed layout
    - Tab 1 — General: name, description, contact person, report group, datasource, SQL editor, report type, active toggle, default format
    - Tab 2 — Parameters: ParameterManager component
    - Tab 3 — Drill-Downs: DrillDownManager component
    - Tab 4 — Guardrails: per-report override form (max rows, timeout, etc.)
    - Save/Update button persisting all tabs
    - Clone button triggering POST clone endpoint
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7, 2.2, 10.2, 11.1, 11.2, 11.3_

  - [x]* 8.6 Write unit tests for ParameterManager and ReportBuilderPage
    - Test parameter type selector renders correct options
    - Test form validation rejects empty name
    - Test tab navigation renders correct content
    - **Validates: Requirements 1.5, 3.1, 3.2**

- [x] 9. Frontend Report Runner page (parameter form + results table)
  - [x] 9.1 Implement `ParameterForm.tsx` — runtime parameter input form
    - Render each parameter type with appropriate control (text input, number input, date picker, datetime picker, toggle, select)
    - Required indicator (asterisk) for required params
    - Pre-populate defaults (resolved expressions from backend)
    - Multi-value renders as multi-select
    - Disable child dropdowns when parent has no selection
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6, 27.7, 27.8, 6.3, 7.3_

  - [x] 9.2 Implement `LovDropdown.tsx` — dynamic/static LOV select with cascading
    - Fetch LOV options from GET `/api/parameters/{id}/lov?parentValue=x`
    - Refresh when parent value changes
    - Show loading state while fetching
    - Show "No options available" when empty
    - Clear child selection when parent changes
    - _Requirements: 4.2, 4.4, 5.2, 6.2, 6.3, 6.4, 16.1_

  - [x] 9.3 Implement `useParameterLov.ts` hook — cascading LOV fetcher with TanStack Query
    - Query key includes parameter ID + parent value
    - Refetch on parent value change
    - Handle error state gracefully
    - _Requirements: 6.2, 16.1, 16.2, 16.3_

  - [x] 9.4 Implement `ResultsTable.tsx` — sortable paginated table
    - Render column headers from response columns array
    - Render data rows from response rows array
    - Clickable column headers toggle sort (none → ASC → DESC → none)
    - Display sort direction indicator on active column
    - _Requirements: 26.1, 26.6, 24.1, 24.2, 24.3_

  - [x] 9.5 Implement `PaginationControls.tsx` — page navigation + size selector
    - First, Previous, Next, Last buttons
    - Page number input for direct navigation
    - Page size selector: 10, 25, 50, 100
    - Display total rows and current page info
    - _Requirements: 23.2, 26.4, 26.5_

  - [x] 9.6 Implement `useReportExecution.ts` hook — TanStack mutation for report execution
    - POST to `/api/reports/{id}/execute` with params, page, pageSize, sortColumn, sortDirection
    - Handle loading, error, success states
    - Reset to page 1 on sort change
    - _Requirements: 22.2, 23.1, 24.4_

  - [x] 9.7 Implement `ReportRunnerPage.tsx` — full report execution + viewer page
    - Load report metadata and parameter definitions on mount
    - Show ParameterForm, Run button
    - On execute: show loading spinner, then ResultsTable + PaginationControls
    - Display execution time and total row count metadata
    - Show truncation warning banner if result was truncated
    - Chart/table toggle placeholder
    - _Requirements: 22.2, 22.3, 26.1, 26.2, 26.3, 26.7, 23.1_

  - [x]* 9.8 Write unit tests for ParameterForm, ResultsTable, and LovDropdown
    - Test ParameterForm renders correct controls per type
    - Test ResultsTable sort toggle behavior
    - Test LovDropdown cascading refresh on parent change
    - **Validates: Requirements 27.1–27.8, 26.6, 6.2**

- [x] 10. Checkpoint — Frontend runner functional
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Frontend drill-down navigation
  - [x] 11.1 Implement `DrillDownCell.tsx` — clickable cell with → icon
    - Render cell value with drill-down arrow icon when column has a configured drill-down link
    - On click: navigate to child report runner with mapped params as URL query parameters
    - _Requirements: 25.1, 25.2, 25.3_

  - [x] 11.2 Integrate DrillDownCell into ResultsTable
    - Check PaginatedResult.drillDownLinks for columns with configured drill-downs
    - Render DrillDownCell for matching columns, regular cell otherwise
    - _Requirements: 25.1_

  - [x] 11.3 Implement drill-down navigation with breadcrumb in ReportRunnerPage
    - Parse pre-filled params from URL query params when navigated via drill-down
    - Display breadcrumb trail showing parent report with back-navigation link
    - Preserve parent page position in URL state for back-navigation
    - Show remaining unfilled params in ParameterForm for user input
    - _Requirements: 25.2, 25.3, 25.4, 25.5_

  - [ ]* 11.4 Write unit tests for DrillDownCell and drill-down navigation
    - Test DrillDownCell renders icon only for drill-down columns
    - Test navigation constructs correct URL with mapped params
    - **Validates: Requirements 25.1, 25.2, 25.3**

- [x] 12. Frontend export toolbar
  - [x] 12.1 Implement `useExport.ts` hook — file download trigger
    - POST to export endpoints with current params
    - Use file-saver saveAs() to trigger browser download
    - Handle loading state per format
    - _Requirements: 28.1, 29.1, 30.1_

  - [x] 12.2 Implement `ExportToolbar.tsx` — CSV/XLSX/PDF buttons
    - Three buttons: CSV, XLSX, PDF
    - Disabled until report has been executed at least once
    - Show loading spinner on active export button
    - _Requirements: 28.1, 29.1, 30.1_

  - [x] 12.3 Integrate ExportToolbar into ReportRunnerPage
    - Place toolbar above or beside ResultsTable
    - Pass current execution params to export hooks
    - _Requirements: 28.1, 29.1, 30.1_

  - [ ]* 12.4 Write unit tests for ExportToolbar
    - Test buttons disabled before execution
    - Test correct endpoint called per format
    - **Validates: Requirements 28.4, 29.4, 30.4**

- [x] 13. Frontend guardrails admin page
  - [x] 13.1 Implement `GuardrailsSettingsPage.tsx` — admin settings form
    - Load current global guardrails on mount via GET `/api/guardrails`
    - Form fields: max rows, max export rows, max date range days, execution timeout seconds, max concurrent per user, max result size bytes
    - Validation: all fields must be positive integers
    - Save button: PUT `/api/guardrails`
    - _Requirements: 10.1, 10.4, 10.5, 10.6_

  - [ ]* 13.2 Write unit tests for GuardrailsSettingsPage
    - Test form loads current values
    - Test validation rejects non-positive values
    - **Validates: Requirements 10.4, 10.5**

- [x] 14. Final checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design
- Unit tests validate specific examples and edge cases
- Backend (Java/Spring Boot) tasks should be completed before frontend (React/TypeScript) tasks that depend on the APIs
- The project uses existing RBAC infrastructure — execution service integrates with it rather than reimplementing

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "6.1", "8.1"] },
    { "id": 2, "tasks": ["1.3", "1.4", "2.7"] },
    { "id": 3, "tasks": ["2.1", "2.3", "2.4"] },
    { "id": 4, "tasks": ["2.2", "2.5", "4.1", "4.2"] },
    { "id": 5, "tasks": ["2.6", "4.3", "4.5"] },
    { "id": 6, "tasks": ["2.8", "4.4", "4.6", "2.9", "2.10"] },
    { "id": 7, "tasks": ["5.1", "5.3"] },
    { "id": 8, "tasks": ["5.2", "5.4"] },
    { "id": 9, "tasks": ["6.2", "6.3", "6.4"] },
    { "id": 10, "tasks": ["6.5", "6.6"] },
    { "id": 11, "tasks": ["8.2", "8.3", "8.4"] },
    { "id": 12, "tasks": ["8.5", "8.6"] },
    { "id": 13, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5"] },
    { "id": 14, "tasks": ["9.6", "9.7", "9.8"] },
    { "id": 15, "tasks": ["11.1", "12.1"] },
    { "id": 16, "tasks": ["11.2", "11.3", "12.2"] },
    { "id": 17, "tasks": ["11.4", "12.3", "12.4"] },
    { "id": 18, "tasks": ["13.1", "13.2"] }
  ]
}
```
