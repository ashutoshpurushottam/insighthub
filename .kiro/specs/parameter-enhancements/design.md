# Technical Design — Parameter Enhancements

## Overview

This phase enhances the InsightHub parameter system with 7 features: hidden parameters, date range picker, allow-null support, date arithmetic expressions, prepared statement binding, fixed parameter values per user, and x-parameter definitions. These improvements bring InsightHub closer to ART feature parity while improving SQL injection protection.

## Architecture

The enhancements are layered on top of the existing parameter infrastructure:

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  ParameterForm (enhanced) │ DateRangePicker (NEW)               │
│  NullCheckbox (NEW) │ FixedValueBadge (NEW)                     │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP/JSON
┌─────────────────────────────┴───────────────────────────────────┐
│                      BACKEND (Spring Boot 3)                     │
│                                                                  │
│  ┌──────────────────┐  ┌─────────────────────────────────────┐  │
│  │ Parameter Layer  │  │ Execution Pipeline (enhanced)       │  │
│  │ (enhanced entity,│  │                                     │  │
│  │  DTO, service)   │  │  ExpressionResolver (enhanced)      │  │
│  └────────┬─────────┘  │  XParameterProcessor (NEW)          │  │
│           │             │  SqlParameterBinder (NEW)           │  │
│           │             │  FixedValueResolver (NEW)           │  │
│           │             └──────────────┬──────────────────────┘  │
│  ┌────────┴─────────────────────────────┴──────────────────────┐ │
│  │               JDBC / PreparedStatement Layer                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Execution Pipeline (Updated — 9 steps)

1. **RBAC Check** — Verify user has access
2. **Fixed Value Resolution** — Override params with user-specific fixed values (NEW)
3. **Parameter Resolution** — Resolve expression defaults for missing params
4. **Parameter Validation** — Validate required, type, null state
5. **Guardrails Check** — Date range, concurrency
6. **X-Parameter Processing** — Replace `$x{...}` blocks with SQL fragments (NEW)
7. **SQL Construction** — Prepared statement binding OR string substitution
8. **Streaming Execution** — Execute PreparedStatement against datasource
9. **Result Assembly + Cleanup**

---

## Components and Interfaces

### Database Schema Changes

```sql
-- Add hidden and allowNull columns to parameters table
ALTER TABLE parameters ADD COLUMN hidden BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE parameters ADD COLUMN allow_null BOOLEAN DEFAULT FALSE NOT NULL;

-- Add date range configuration columns
ALTER TABLE parameters ADD COLUMN from_parameter_name VARCHAR(100);
ALTER TABLE parameters ADD COLUMN to_parameter_name VARCHAR(100);

-- Add prepared statement toggle to reports
ALTER TABLE reports ADD COLUMN use_prepared_statements BOOLEAN DEFAULT TRUE NOT NULL;

-- Fixed parameter values table
CREATE TABLE fixed_parameter_values (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT NOT NULL,
    parameter_id     BIGINT NOT NULL,
    fixed_value      VARCHAR(500) NOT NULL,
    CONSTRAINT fk_fpv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_fpv_param FOREIGN KEY (parameter_id) REFERENCES parameters(id) ON DELETE CASCADE,
    CONSTRAINT uq_fpv_user_param UNIQUE (user_id, parameter_id)
);
```

### Backend Package Structure (New/Modified)

```
com.insighthub/
├── parameter/
│   ├── ParameterEntity.java          (MODIFIED: add hidden, allowNull, fromParameterName, toParameterName)
│   ├── ParameterRequest.java         (MODIFIED: add hidden, allowNull, fromParameterName, toParameterName)
│   ├── ParameterDto.java             (MODIFIED: add hidden, allowNull, fromParameterName, toParameterName)
│   ├── ParameterService.java         (MODIFIED: handle new fields in create/update/toDto)
│   ├── ExpressionResolver.java       (MODIFIED: add date arithmetic, firstday/lastday)
│   └── ParameterValidator.java       (MODIFIED: skip validation for null-marked params)
├── fixedvalue/
│   ├── FixedParameterValueEntity.java    (NEW)
│   ├── FixedParameterValueRepository.java (NEW)
│   ├── FixedParameterValueService.java   (NEW)
│   ├── FixedParameterValueController.java (NEW)
│   └── FixedParameterValueDto.java       (NEW)
├── execution/
│   ├── ReportExecutionService.java   (MODIFIED: integrate fixed values + x-params + binder)
│   ├── XParameterProcessor.java      (NEW: $x{...} syntax parser and SQL generator)
│   ├── SqlParameterBinder.java       (NEW: PreparedStatement binding)
│   ├── SqlParameterSubstitutor.java  (EXISTING: retained as fallback)
│   └── StreamingResultSetHandler.java (MODIFIED: accept PreparedStatement)
├── report/
│   ├── ReportEntity.java            (MODIFIED: add usePreparedStatements field)
│   ├── CreateReportRequest.java     (MODIFIED: add usePreparedStatements)
│   └── ReportDto.java               (MODIFIED: add usePreparedStatements)
```

### Frontend Changes

```
features/report-engine/
├── components/
│   ├── ParameterForm.tsx        (MODIFIED: skip hidden params, render null checkbox, render date range)
│   ├── ParameterManager.tsx     (MODIFIED: show hidden/allowNull columns, new fields in form)
│   ├── DateRangePicker.tsx      (NEW: from/to date picker with preset ranges)
│   └── NullCheckbox.tsx         (NEW: checkbox to set param value to NULL)
├── types.ts                     (MODIFIED: add hidden, allowNull, fromParameterName, toParameterName)
```

---

## Key DTOs

### Updated ParameterRequest (additions)

```java
// Added to existing ParameterRequest
private boolean hidden;
private boolean allowNull;
private String fromParameterName;   // For DATERANGE type: which param gets the from-date
private String toParameterName;     // For DATERANGE type: which param gets the to-date
```

### Updated ParameterDto (additions)

```java
// Added to existing ParameterDto
private boolean hidden;
private boolean allowNull;
private String fromParameterName;
private String toParameterName;
```

### FixedParameterValueDto

```java
record FixedParameterValueDto(
    Long id,
    Long userId,
    String username,
    Long parameterId,
    String parameterName,
    String fixedValue
) {}
```

### Updated ExecuteReportRequest (additions)

```java
// Added to existing ExecuteReportRequest
private List<String> nullParams;  // List of parameter names that should be treated as NULL
```

---

## ExpressionResolver Enhancements

The `resolve()` method will be enhanced to handle:

```
Input                    → Output
─────────────────────────────────────────────────
"CURDATE()"              → "2026-07-01"           (existing)
"NOW()"                  → "2026-07-01 14:30:00"  (existing)
"CURRENT_USER"           → "admin"                (existing)
"FIRST_DAY_OF_MONTH"    → "2026-07-01"           (existing)
"LAST_DAY_OF_MONTH"     → "2026-07-31"           (existing)
"today"                  → "2026-07-01"           (NEW)
"now"                    → "2026-07-01 14:30:00"  (NEW)
"add days 1"             → "2026-07-02"           (NEW)
"add days -1"            → "2026-06-30"           (NEW)
"add months -1"          → "2026-06-01"           (NEW)
"add weeks 2"            → "2026-07-15"           (NEW)
"add years -1"           → "2025-07-01"           (NEW)
"firstday month"         → "2026-07-01"           (NEW)
"firstday month -1"      → "2026-06-01"           (NEW)
"firstday month +1"      → "2026-08-01"           (NEW)
"firstday year"          → "2026-01-01"           (NEW)
"lastday month"          → "2026-07-31"           (NEW)
"lastday month -1"       → "2026-06-30"           (NEW)
"lastday year"           → "2026-12-31"           (NEW)
```

---

## X-Parameter Processing

The `XParameterProcessor` transforms `$x{...}` blocks into SQL + parameter bindings:

```
Input SQL:
  SELECT * FROM orders WHERE $x{in,product_name,products} AND $x{equal,region,region_param}

With params: products=["A","B","C"], region_param="NORTH"
Output SQL:
  SELECT * FROM orders WHERE product_name IN (?,?,?) AND region = ?
Bindings: ["A", "B", "C", "NORTH"]

With params: products=["A","B","C"], region_param=NULL
Output SQL:
  SELECT * FROM orders WHERE product_name IN (?,?,?) AND region IS NULL
Bindings: ["A", "B", "C"]
```

---

## Prepared Statement Binding Flow

```
1. Start with parameterized SQL: "SELECT * FROM t WHERE col = :name AND dt > :start_date"
2. XParameterProcessor handles $x{...} blocks first (if any)
3. SqlParameterBinder:
   a. Finds all :paramName placeholders
   b. Replaces each with ? (multi-value expands to ?,?,?)
   c. Builds ordered list of values to bind
   d. Returns BindResult { sql: String, bindings: List<BindValue> }
4. StreamingResultSetHandler.execute() uses PreparedStatement:
   - connection.prepareStatement(sql)
   - for each binding: stmt.setXxx(index, value) based on declared param type
   - stmt.executeQuery()
```

Fallback: If `report.usePreparedStatements == false`, the existing `SqlParameterSubstitutor` string-substitution path is used (for dynamic SQL, Groovy, XML-tag reports).

---

## API Endpoints (New)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/parameters/{paramId}/fixed-values` | List fixed values for a parameter |
| POST | `/api/parameters/{paramId}/fixed-values` | Set fixed value for a user |
| DELETE | `/api/fixed-values/{id}` | Remove a fixed value |
| GET | `/api/users/{userId}/fixed-values` | List all fixed values for a user |

---

## Error Handling

| Scenario | HTTP Status | Response |
|----------|-------------|----------|
| X-parameter references unknown param | 400 | `{"message": "$x references unknown parameter 'xyz'"}` |
| Fixed value expression fails to resolve | 400 | `{"message": "Fixed value expression error: ..."}` |
| DATERANGE missing from/to parameter names | 400 | `{"message": "DATERANGE parameter requires fromParameterName and toParameterName"}` |
| Prepared statement binding type mismatch | 400 | `{"message": "Cannot bind value 'abc' as NUMBER for parameter 'amount'"}` |

---

## Testing Strategy

### Unit Tests
- `ExpressionResolverTest` — all new date arithmetic expressions resolve correctly
- `XParameterProcessorTest` — IN, NOT IN, EQUAL, NOT EQUAL, NULL handling, empty list
- `SqlParameterBinderTest` — placeholder replacement, multi-value expansion, type mapping
- `FixedParameterValueServiceTest` — CRUD, override logic

### Integration Tests
- `ReportExecutionServiceIT` — full pipeline with prepared statements, x-params, fixed values
- `ParameterFormIT` (frontend) — hidden params not rendered, null checkbox, date range picker

---

## Dependencies

No new dependencies required. The date range picker on the frontend will be built using native `<input type="date">` controls with preset buttons (avoiding additional library dependencies).
