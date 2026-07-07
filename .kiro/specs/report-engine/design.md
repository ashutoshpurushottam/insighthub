# Technical Design — Report Engine

## Overview

The Report Engine is the core InsightHub subsystem that orchestrates SQL-based report creation, parameterized execution with safety guardrails, paginated/sorted result display with drill-down navigation, and streaming multi-format export. It is organized into 4 layers: Configuration, Execution, Viewer, and Export.

## Architecture

The Report Engine follows a layered architecture aligned with the 4-part requirements:

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  ReportBuilderPage │ ReportRunnerPage │ GuardrailsSettingsPage  │
│  ParameterForm │ ResultsTable │ ExportToolbar │ DrillDownCell   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP/JSON (JWT Auth)
┌─────────────────────────────┴───────────────────────────────────┐
│                      BACKEND (Spring Boot 3)                     │
│                                                                  │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │ Report       │  │ Execution      │  │ Export             │  │
│  │ Configuration│  │ Engine         │  │ Engine             │  │
│  │ Layer        │  │ (Orchestrator) │  │ (Streaming)        │  │
│  └──────┬───────┘  └───────┬────────┘  └────────┬───────────┘  │
│         │                   │                     │              │
│  ┌──────┴───────────────────┴─────────────────────┴───────────┐ │
│  │                    Guardrails / RBAC Layer                   │ │
│  └─────────────────────────────┬───────────────────────────────┘ │
│                                │                                  │
│  ┌─────────────────────────────┴───────────────────────────────┐ │
│  │                    JDBC / Datasource Layer                   │ │
│  │         (Cursor-based streaming, fetch size control)         │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴──────────┐
                    │   Target Databases  │
                    │ (MySQL, PG, Oracle) │
                    └────────────────────┘
```

### Execution Pipeline (7 steps)

1. **RBAC Check** — Verify user has access to the report
2. **Parameter Resolution** — Resolve expressions, load LOVs, validate inputs
3. **Guardrails Check** — Enforce date range, concurrency, max rows
4. **SQL Construction** — Substitute parameters, wrap with ORDER BY + LIMIT/OFFSET
5. **Streaming Execution** — Cursor-based query with timeout and fetch size
6. **Result Assembly** — Build paginated response with metadata
7. **Resource Cleanup** — Release JDBC resources, decrement concurrency counter

---

## Components and Interfaces

### Backend Package Structure

```
com.insighthub/
├── report/
│   ├── ReportEntity.java              (existing, enhanced)
│   ├── ReportController.java          (enhanced: clone endpoint)
│   ├── ReportService.java             (enhanced: clone logic)
│   ├── CreateReportRequest.java       (existing)
│   └── ReportDto.java                 (enhanced: drillDownLinks field)
├── parameter/
│   ├── ParameterEntity.java           (enhanced: LOV, cascading, multi-value columns)
│   ├── ParameterService.java          (enhanced: LOV resolution endpoint)
│   ├── ParameterController.java       (enhanced: GET /lov endpoint)
│   ├── ExpressionResolver.java        (NEW)
│   └── ParameterValidator.java        (NEW)
├── drilldown/
│   ├── DrillDownLinkEntity.java       (NEW)
│   ├── DrillDownParamMappingEntity.java (NEW)
│   ├── DrillDownRepository.java       (NEW)
│   ├── DrillDownService.java          (NEW)
│   └── DrillDownController.java       (NEW)
├── guardrails/
│   ├── GuardrailsConfigEntity.java    (NEW)
│   ├── GuardrailsRepository.java      (NEW)
│   ├── GuardrailsService.java         (NEW)
│   └── GuardrailsController.java      (NEW)
├── execution/
│   ├── ReportExecutionService.java    (NEW — main orchestrator)
│   ├── ConcurrencyLimiter.java        (NEW — ConcurrentHashMap-based)
│   ├── StreamingResultSetHandler.java (NEW — cursor streaming)
│   ├── ExecutionGuard.java            (NEW — enforces all guardrails)
│   └── PaginatedResult.java           (NEW — result DTO)
├── export/
│   ├── ExportController.java          (NEW)
│   ├── CsvExportService.java          (NEW — PrintWriter streaming)
│   ├── ExcelExportService.java        (NEW — SXSSFWorkbook)
│   └── PdfExportService.java          (NEW — OpenPDF)
```

### API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/reports/{id}/execute` | Execute report with params + pagination | User (RBAC) |
| POST | `/api/reports/{id}/clone` | Clone report | Admin |
| GET | `/api/parameters/{id}/lov?parentValue=x` | Get LOV options | User |
| GET | `/api/reports/{id}/drill-downs` | Get drill-down config | User |
| POST | `/api/reports/{id}/drill-downs` | Create drill-down link | Admin |
| DELETE | `/api/drill-downs/{id}` | Delete drill-down | Admin |
| GET | `/api/guardrails` | Get global guardrails | Admin |
| PUT | `/api/guardrails` | Update global guardrails | Admin |
| PUT | `/api/reports/{id}/guardrails` | Set per-report override | Admin |
| POST | `/api/reports/{id}/export/csv` | Stream CSV export | User (RBAC) |
| POST | `/api/reports/{id}/export/xlsx` | Stream XLSX export | User (RBAC) |
| POST | `/api/reports/{id}/export/pdf` | Stream PDF export | User (RBAC) |

### Frontend Component Tree

```
features/report-engine/
├── pages/
│   ├── ReportBuilderPage.tsx    — Tabbed form (General / Parameters / Drill-Downs / Guardrails)
│   ├── ReportRunnerPage.tsx     — Full-page report execution + viewer
│   └── GuardrailsSettingsPage.tsx
├── components/
│   ├── SqlEditor.tsx            — Monospace editor with line numbers
│   ├── ParameterManager.tsx     — CRUD table for param definitions
│   ├── ParameterForm.tsx        — Runtime input form with LOV support
│   ├── LovDropdown.tsx          — Dynamic/static select with cascading
│   ├── DrillDownManager.tsx     — Config drill-down links
│   ├── ResultsTable.tsx         — Sortable paginated table
│   ├── PaginationControls.tsx   — Page nav + size selector
│   ├── ExportToolbar.tsx        — CSV/XLSX/PDF buttons
│   └── DrillDownCell.tsx        — Clickable cell with → icon
├── hooks/
│   ├── useReportExecution.ts    — TanStack mutation
│   ├── useParameterLov.ts       — Cascading LOV fetcher
│   └── useExport.ts             — File download trigger
└── types.ts                     — All TypeScript interfaces
```

---

## Data Models

### New/Modified Database Tables

```sql
-- Enhanced parameters table
ALTER TABLE parameters ADD COLUMN lov_type VARCHAR(10);            -- 'DYNAMIC' | 'STATIC' | NULL
ALTER TABLE parameters ADD COLUMN lov_query TEXT;                   -- SQL for dynamic LOV
ALTER TABLE parameters ADD COLUMN lov_static_values TEXT;          -- JSON: [{"value":"x","label":"Y"}]
ALTER TABLE parameters ADD COLUMN parent_param_id BIGINT;          -- FK self-ref for cascading
ALTER TABLE parameters ADD COLUMN multi_value BOOLEAN DEFAULT FALSE;
ALTER TABLE parameters ADD COLUMN date_range_pair VARCHAR(10);     -- 'FROM' | 'TO' | NULL

-- Drill-down links
CREATE TABLE drill_down_links (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    parent_report_id BIGINT NOT NULL,
    child_report_id  BIGINT NOT NULL,
    trigger_column   VARCHAR(100) NOT NULL,
    position         INT DEFAULT 0,
    CONSTRAINT fk_ddl_parent FOREIGN KEY (parent_report_id) REFERENCES reports(id) ON DELETE CASCADE,
    CONSTRAINT fk_ddl_child FOREIGN KEY (child_report_id) REFERENCES reports(id)
);

-- Drill-down parameter mappings (column → child param)
CREATE TABLE drill_down_param_mappings (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    drill_down_link_id BIGINT NOT NULL,
    parent_column_name VARCHAR(100) NOT NULL,
    child_param_name   VARCHAR(100) NOT NULL,
    CONSTRAINT fk_ddpm_link FOREIGN KEY (drill_down_link_id) REFERENCES drill_down_links(id) ON DELETE CASCADE
);

-- Guardrails configuration
CREATE TABLE guardrails_config (
    id                        BIGINT AUTO_INCREMENT PRIMARY KEY,
    report_id                 BIGINT UNIQUE,             -- NULL = global, non-NULL = per-report
    max_rows                  INT DEFAULT 10000,
    max_export_rows           INT DEFAULT 100000,
    max_date_range_days       INT DEFAULT 365,
    execution_timeout_seconds INT DEFAULT 60,
    max_concurrent_per_user   INT DEFAULT 3,
    max_result_size_bytes     BIGINT DEFAULT 52428800,   -- 50MB
    CONSTRAINT fk_gc_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);
```

### Key DTOs

```java
// Execution Request
record ExecuteReportRequest(
    Map<String, Object> params,   // param name → value (String or List<String> for multi)
    int page,                     // 1-based
    int pageSize,                 // 10, 25, 50, 100
    String sortColumn,            // nullable
    String sortDirection          // "ASC" or "DESC", nullable
) {}

// Execution Response
record PaginatedResult(
    List<String> columns,
    List<Map<String, Object>> rows,
    PaginationMeta pagination,
    long executionMs,
    boolean truncated,
    String truncationReason,
    List<DrillDownInfo> drillDownLinks
) {}

record PaginationMeta(int page, int pageSize, long totalRows, int totalPages) {}
record DrillDownInfo(String column, Long childReportId, String childReportName) {}
```

---

## Correctness Properties

### Property 1: RBAC Soundness
For all execution requests, if the user lacks access rights to the report (directly or via group membership), the system returns HTTP 403 without executing any SQL statement.

### Property 2: Memory Bounded Execution
For all report executions, the number of rows held in JVM heap memory at any point is bounded by max(pageSize, fetchSize). No unbounded List or array accumulation occurs.

### Property 3: Timeout Guarantee
For all report executions, if the query running time exceeds the configured timeout (global or per-report), the JDBC Statement.cancel() is invoked and all resources are released.

### Property 4: Parameter Safety
All `:paramName` placeholder substitutions escape single quotes (`'` → `''`) before insertion into SQL. No raw user input is concatenated without escaping.

### Property 5: Export Streaming Invariant
For all export operations (CSV, XLSX, PDF), JVM heap usage remains O(fetchSize) regardless of the total row count in the result set.

### Property 6: Concurrency Counter Balance
The active execution count per user is always ≥ 0 and is always decremented on execution completion, including exception paths (enforced via try/finally).

### Property 7: Guardrail Precedence
The effective guardrail value for a report equals the per-report override if defined, otherwise the global default. Per-report values are never ignored when present.

---

## Error Handling

| Scenario | HTTP Status | Response |
|----------|-------------|----------|
| User lacks RBAC access | 403 | `{"message": "Access denied to report"}` |
| Required parameter missing | 400 | `{"message": "Parameter 'x' is required", "field": "x"}` |
| Date range exceeds limit | 400 | `{"message": "Date range exceeds maximum of N days"}` |
| Concurrent limit reached | 429 | `{"message": "Too many concurrent executions"}` |
| Query timeout | 504 | `{"message": "Query execution timed out after N seconds"}` |
| Result size exceeded | 200 | Response with `truncated: true, truncationReason: "max_rows"` |
| SQL syntax error | 400 | `{"message": "SQL error: <db message>"}` |
| Datasource unavailable | 503 | `{"message": "Datasource connection failed"}` |
| LOV query failed | 200 | Empty options with error flag in LOV response |

---

## Testing Strategy

### Unit Tests
- `ExpressionResolverTest` — all 6 expression keywords resolve correctly
- `ParameterValidatorTest` — required/type/date-range validation
- `ConcurrencyLimiterTest` — acquire/release/overflow behavior
- `ExecutionGuardTest` — guardrail enforcement (date range, max rows)

### Integration Tests
- `ReportExecutionServiceIT` — full pipeline with H2, verifies pagination, sorting, truncation
- `ExportServiceIT` — CSV/XLSX/PDF generation with streaming verification (memory profiling)
- `DrillDownServiceIT` — create link, execute parent, verify child params

### Property-Based Tests
- **P2 verification**: Execute N reports with random page sizes → assert heap never exceeds threshold
- **P6 verification**: Run M concurrent requests with random failures → assert counter always returns to 0

### Frontend Tests
- `ParameterForm.test.tsx` — renders correct controls per type, validates required
- `ResultsTable.test.tsx` — pagination navigation, sort toggle behavior
- `LovDropdown.test.tsx` — loads options, cascading refresh on parent change

---

## Dependencies (New)

### Backend (pom.xml)
```xml
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>5.2.5</version>
</dependency>
<dependency>
    <groupId>com.github.librepdf</groupId>
    <artifactId>openpdf</artifactId>
    <version>1.3.35</version>
</dependency>
```

### Frontend (package.json)
```json
"file-saver": "^2.0.5",
"@types/file-saver": "^2.0.7"
```
