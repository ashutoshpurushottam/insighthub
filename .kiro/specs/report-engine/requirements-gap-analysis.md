# InsightHub Report Engine — Requirements & Gap Analysis

## Legend

| Status | Meaning |
|--------|---------|
| ✅ DONE | Implemented in InsightHub |
| ⚠️ PARTIAL | Partially implemented, needs enhancement |
| ❌ MISSING | Not yet implemented |
| 🔲 DECIDE | Needs your decision on whether to build |

---

## 1. Reports — Core CRUD & Configuration

| # | Requirement (from ART Manual) | Status | Notes |
|---|-------------------------------|--------|-------|
| 1.1 | Create report with Name, Description, Contact Person, Report Group, Datasource, SQL Source, Active toggle | ✅ DONE | ReportBuilderPage General tab |
| 1.2 | Report Type field (Tabular, Chart, etc.) | ⚠️ PARTIAL | Field exists as integer but ART has rich type system (Tabular, Pie, Bar, XY, Dashboard, JasperReports, FreeMarker, LOV, Update Statement). InsightHub only executes tabular. |
| 1.3 | Default Report Format per report | ✅ DONE | `defaultReportFormat` field |
| 1.4 | Active/Inactive toggle to disable reports | ✅ DONE | Checked during execution |
| 1.5 | Clone/copy a report | ✅ DONE | POST clone endpoint |
| 1.6 | Hidden report (not listed to users) | ❌ MISSING | ART has `hidden` field |Yes
| 1.7 | Report Code (alternative name for URL access) | ❌ MISSING | ART allows running report by code via URL |Yes
| 1.8 | Help Link per report | ❌ MISSING | ART shows Help button linking to external documentation |
| 1.9 | Max Running Reports / Max Running Reports Per User / Per Datasource (per-report concurrency) | ✅ DONE | Guardrails system |
| 1.10 | Fetch Size configuration per report | ❌ MISSING | ART allows per-report fetch size for memory control |
| 1.11 | Page Orientation for PDF output | ❌ MISSING | ART supports landscape/portrait for PDF |
| 1.12 | Run Immediately (skip parameter page) | ❌ MISSING | ART supports `runImmediately` option |Yes
| 1.13 | Running a report via URL (public access) | ❌ MISSING | ART supports `runReport?reportId=x&public=true&user=guest` |

---

## 2. Report Types

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 2.1 | Tabular report | ✅ DONE | Core execution engine |
| 2.2 | Chart reports (XY, Pie, Bar, Stacked Bar, Line, Time Series, Speedometer) | ❌ MISSING | ART has rich chart support using JFreeChart/Cewolf |Yes
| 2.3 | Update Statement (INSERT/UPDATE/DELETE) | ❌ MISSING | ART can execute DML statements |Yes
| 2.4 | Dashboard (multiple reports in single page) | 🔲 DECIDE | ART has XML-based dashboard definition with portlets |
| 2.5 | JasperReports integration (Template Query / ART Query) | ❌ MISSING | ART supports jrxml templates |
| 2.6 | FreeMarker template reports | ❌ MISSING | ART supports FreeMarker templating |
| 2.7 | LOV: Dynamic (SQL-based list of values) | ✅ DONE | Parameter LOV system |
| 2.8 | LOV: Static (fixed values) | ✅ DONE | Static LOV in parameter config |
| 2.9 | Dynamic Job Recipients report type | ❌ MISSING | Used for email job scheduling |Yes

---

## 3. Report Formats / Export

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 3.1 | CSV export | ✅ DONE | Streaming CSV export |
| 3.2 | XLSX (Excel) export | ✅ DONE | SXSSFWorkbook streaming |
| 3.3 | PDF export | ✅ DONE | OpenPDF streaming |
| 3.4 | HTML display in browser | ✅ DONE | ResultsTable component |
| 3.5 | TSV (tab-separated) export | ❌ MISSING | ART supports tsv, tsvZip, tsvGz |Yes
| 3.6 | PNG export (for charts) | ❌ MISSING | Only applicable if charts are implemented |Yes
| 3.7 | htmlDataTable format (paginated, sortable, filterable in browser) | ⚠️ PARTIAL | We have client-side sort; ART uses DataTables.js with server-side features |
| 3.8 | Compressed exports (zip/gz) | ❌ MISSING | ART supports csvZip, csvGz, tsvZip, tsvGz |Yes
| 3.9 | Configurable CSV delimiter, quote, extension | ❌ MISSING | ART supports per-report CSV options |Yes
| 3.10 | Excel options (autoWidth, autoFilter, fixedHeader, sheetName, columnWidths) | ❌ MISSING | ART has rich Excel configuration |
| 3.11 | Default Max Rows / Specific Max Rows per format | ✅ DONE | Guardrails maxRows / maxExportRows |

---

## 4. Parameters

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 4.1 | Single-value parameters (TEXT, NUMBER, DATE, DATETIME, BOOLEAN, DROPDOWN) | ✅ DONE | ParameterForm supports all types |
| 4.2 | Multi-value parameters (IN clause expansion) | ✅ DONE | Multi-value expansion in SQL |
| 4.3 | Parameter placeholder syntax (`:paramName` in SQL) | ✅ DONE | InsightHub uses `:paramName` |
| 4.4 | Dynamic LOV (SQL query for dropdown values) | ✅ DONE | LOV resolution endpoint |
| 4.5 | Static LOV (fixed value/label pairs) | ✅ DONE | Static LOV in parameter config |
| 4.6 | Cascading/Chained parameters (parent → child refresh) | ✅ DONE | `parentParamId` + LOV refresh |
| 4.7 | Default values for parameters | ✅ DONE | `defaultValue` field with expression resolution |
| 4.8 | Required parameter validation | ✅ DONE | ParameterValidator |
| 4.9 | Parameter position/ordering | ✅ DONE | Drag-to-reorder in ParameterManager |
| 4.10 | Hidden parameters | ❌ MISSING | ART has `hidden` field to not display in parameter form |Yes
| 4.11 | Date Range parameter type | ❌ MISSING | ART has DateRange control type with fromParameter/toParameter |Yes
| 4.12 | Fixed parameter values per user | ❌ MISSING | ART supports fixed values that override user input |
| 4.13 | Parameter default value from LOV report | ❌ MISSING | ART supports Default Value Report |Yes
| 4.14 | Allow Null checkbox for parameters | ❌ MISSING | ART supports passing NULL via checkbox |Yes
| 4.15 | X-Parameter definitions (`$x{in,...}`, `$x{equal,...}`) | ❌ MISSING | ART's alternative SQL syntax for comparisons |Yes
| 4.16 | ART's `#param_name#` syntax (prepared statement `?` binding) | ❌ MISSING | ART uses JDBC prepared statements; InsightHub uses string substitution with escaping |Yes

---

## 5. Expressions

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 5.1 | `CURDATE()` / `CURRENT_DATE` → today's date | ✅ DONE | ExpressionResolver |
| 5.2 | `NOW()` → current datetime | ✅ DONE | ExpressionResolver |
| 5.3 | `CURRENT_USER` → logged-in username | ✅ DONE | ExpressionResolver |
| 5.4 | `FIRST_DAY_OF_MONTH` / `LAST_DAY_OF_MONTH` | ✅ DONE | ExpressionResolver |
| 5.5 | ART field expressions `f[date]f`, `f[username]f`, `f[datetime]f` | ❌ MISSING | ART's expression syntax is different from InsightHub's |
| 5.6 | Date arithmetic (`add days 1`, `add months -1`, `firstday month`, `lastday year`) | ❌ MISSING | ART supports rich date arithmetic in default values |Yes
| 5.7 | Groovy expressions `g[...]g` | ❌ MISSING | ART supports Groovy-based dynamic content |

---

## 6. Dynamic SQL

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 6.1 | Dynamic SQL using Groovy | ❌ MISSING | ART can modify SQL structure based on parameter values |
| 6.2 | Dynamic SQL using XML tags (`<IF>`, `<EXP1>`, `<OP>`, `<TEXT>`, `<ELSETEXT>`) | ❌ MISSING | ART's XML-based conditional SQL |
| 6.3 | Multiple statements in single report source | ❌ MISSING | ART supports `;`-separated statements with Display Resultset selector |
| 6.4 | Dynamic Datasources (datasource as a parameter) | ❌ MISSING | ART allows switching datasource at runtime |

---

## 7. Drill Down Reports

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 7.1 | Configure drill-down links between reports | ✅ DONE | DrillDownManager + DrillDownCell |
| 7.2 | Parameter mapping from parent column to child parameter | ✅ DONE | DrillDownParamMapping entity |
| 7.3 | Navigate to child report with pre-filled params | ✅ DONE | URL query params + breadcrumb |
| 7.4 | Multiple drill-down links per report | ✅ DONE | Position-ordered links |
| 7.5 | Drill-down column index (value from result column N) | ❌ MISSING | ART uses column index/name on the parameter; InsightHub uses explicit mapping |Yes
| 7.6 | Pass parent report's parameters to drill-down (column index 0) | ❌ MISSING | ART passes main report params automatically |Yes

---

## 8. Access Rights & Security

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 8.1 | User → Report direct access | ✅ DONE | `user_report_rights` table |
| 8.2 | User → Report Group access | ✅ DONE | `user_report_group_rights` table |
| 8.3 | User Group → Report access | ✅ DONE | `user_group_report_rights` table |
| 8.4 | User Group → Report Group access | ✅ DONE | `user_group_report_group_rights` table |
| 8.5 | Admin bypass (configure_reports permission) | ✅ DONE | accessLevel >= 10 bypass |
| 8.6 | Public user (run reports without login) | ❌ MISSING | ART supports `publicUser` flag for URL-based access |Yes
| 8.7 | Permissions system (view_reports, schedule_jobs, configure_reports, etc.) | ⚠️ PARTIAL | InsightHub has roles/permissions but fewer granular permissions than ART |Yes

---

## 9. Users & User Groups

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 9.1 | User management (CRUD) | ✅ DONE | UsersPage |
| 9.2 | User Groups | ✅ DONE | UserGroupsPage |
| 9.3 | Roles & Permissions | ✅ DONE | RolesPage |
| 9.4 | Start Report (auto-run on login) | ❌ MISSING | ART allows configuring a report to run on user login |Yes
| 9.5 | Default Report Group per user | ❌ MISSING | ART pre-selects a report group on the reports page |Yes
| 9.6 | Can Change Password flag | ❌ MISSING | ART controls whether user can change password |Yes

---

## 10. Jobs (Scheduled Reports)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 10.1 | Schedule reports to run automatically | ❌ MISSING | ART has full Quartz-based scheduling |Yes
| 10.2 | Email (Attachment) — email report output as attachment | ❌ MISSING | |Yes
| 10.3 | Email (Inline) — email output in body | ❌ MISSING | |Yes
| 10.4 | Publish — save to file, notify users | ❌ MISSING | |Yes
| 10.5 | Alert — email if condition met | ❌ MISSING | |Yes
| 10.6 | Burst — generate per-group files | ❌ MISSING | |Yes
| 10.7 | Conditional jobs (only email/publish if results exist) | ❌ MISSING | |Yes
| 10.8 | Job archives (retain N past runs) | ❌ MISSING | |Yes
| 10.9 | Shared jobs (share output with other users) | ❌ MISSING | |
| 10.10 | Pre/Post run reports | ❌ MISSING | |Yes
| 10.11 | Batch file execution after job | ❌ MISSING | |Yes
| 10.12 | Dynamic recipients for jobs | ❌ MISSING | |Yes
| 10.13 | Cron expression scheduling | ❌ MISSING | InsightHub has a Jobs page but without ART's full scheduling engine |Yes

---

## 11. Dashboards

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 11.1 | Display multiple reports in single page | 🔲 DECIDE | InsightHub has a Dashboards feature (separate from report engine) |Yes
| 11.2 | XML-based dashboard definition with columns and portlets | ❌ MISSING | ART uses XML `<DASHBOARD><COLUMN><PORTLET>` syntax |Yes
| 11.3 | Auto-refresh portlets | ❌ MISSING | ART supports per-portlet refresh intervals |Yes
| 11.4 | Tabbed dashboards | ❌ MISSING | ART supports `<TABLIST>` for tabbed layout |Yes
| 11.5 | Embed external URLs in dashboard | ❌ MISSING | ART allows `<URL>` in portlets |Yes

---

## 12. Destinations

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 12.1 | FTP destination | ❌ MISSING | ART sends job output to FTP servers |
| 12.2 | SFTP destination | ❌ MISSING | |
| 12.3 | Network Share destination | ❌ MISSING | |
| 12.4 | Amazon S3 destination | ❌ MISSING | |

---

## 13. Rules (Row-Level Security)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 13.1 | Rules to filter report results per user | ❌ MISSING | ART injects `WHERE column IN (values)` based on user's rule values |Yes
| 13.2 | Rule values per user or user group | ❌ MISSING | |Yes
| 13.3 | ALL_ITEMS to bypass filtering | ❌ MISSING | |Yes

---

## 14. Guardrails & Settings

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 14.1 | Global guardrails (max rows, timeout, concurrency) | ✅ DONE | GuardrailsSettingsPage |
| 14.2 | Per-report guardrail overrides | ✅ DONE | Guardrails tab in builder |
| 14.3 | Date range max days enforcement | ✅ DONE | ExecutionGuard |
| 14.4 | Concurrency limiter per user | ✅ DONE | ConcurrencyLimiter |
| 14.5 | Query timeout with Statement.cancel() | ✅ DONE | StreamingResultSetHandler |
| 14.6 | Max result size bytes | ✅ DONE | Truncation in streaming |

---

## 15. Pipelines

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 15.1 | Define serial job execution order | ❌ MISSING | ART runs jobs in sequence |
| 15.2 | Parallel job execution | ❌ MISSING | ART runs multiple jobs concurrently |
| 15.3 | Continue on error option | ❌ MISSING | |
| 15.4 | Pipeline scheduling | ❌ MISSING | |

---

## 16. SMTP & Email

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 16.1 | SMTP server configuration | ❌ MISSING | ART configures SMTP for sending job emails |Yes
| 16.2 | Multiple SMTP servers for different jobs | ❌ MISSING | |Yes
| 16.3 | Email error notifications | ❌ MISSING | ART sends error emails to configured address |Yes

---

## 17. Internationalization (i18n)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 17.1 | Multi-language UI | ⚠️ PARTIAL | InsightHub has i18next configured but limited translations |
| 17.2 | Localized report names, descriptions, column names | ❌ MISSING | ART supports `i18n` JSON option per report |
| 17.3 | Localized parameter labels | ❌ MISSING | ART supports `i18n` in parameter options |

---

## 18. Miscellaneous

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 18.1 | Record Migration (Import/Export) | ❌ MISSING | ART exports/imports configuration records as JSON |Yes
| 18.2 | Running Queries monitoring | ❌ MISSING | ART shows currently executing queries with cancel option |Yes
| 18.3 | Application logs viewer | ❌ MISSING | ART has in-app log viewer |Yes
| 18.4 | Custom CSS in settings | ❌ MISSING | ART allows CSS override |Yes
| 18.5 | Encryption key management | ❌ MISSING | ART has key rotation for stored passwords |Yes

---

## Summary

| Category | Total | ✅ Done | ⚠️ Partial | ❌ Missing | 🔲 Decide |
|----------|-------|---------|-----------|-----------|----------|
| Reports Core | 13 | 5 | 1 | 7 | 0 |
| Report Types | 9 | 3 | 0 | 6 | 0 |
| Export Formats | 11 | 5 | 1 | 5 | 0 |
| Parameters | 16 | 9 | 0 | 7 | 0 |
| Expressions | 7 | 4 | 0 | 3 | 0 |
| Dynamic SQL | 4 | 0 | 0 | 4 | 0 |
| Drill Down | 6 | 4 | 0 | 2 | 0 |
| Access Rights | 7 | 5 | 1 | 1 | 0 |
| Users/Groups | 6 | 3 | 0 | 3 | 0 |
| Jobs/Scheduling | 13 | 0 | 0 | 13 | 0 |
| Dashboards | 5 | 0 | 0 | 4 | 1 |
| Destinations | 4 | 0 | 0 | 4 | 0 |
| Rules | 3 | 0 | 0 | 3 | 0 |
| Guardrails | 6 | 6 | 0 | 0 | 0 |
| Pipelines | 4 | 0 | 0 | 4 | 0 |
| SMTP/Email | 3 | 0 | 0 | 3 | 0 |
| i18n | 3 | 0 | 1 | 2 | 0 |
| Misc | 5 | 0 | 0 | 5 | 0 |
| **TOTAL** | **125** | **44** | **4** | **76** | **1** |

---

## Recommended Priority Tiers

### Tier 1 — High Value, Moderate Effort (Recommended Next)
- **4.16** Prepared statement binding (security improvement over string substitution)
- **5.6** Date arithmetic in default values (`add days -1`, `firstday month`)
- **1.6** Hidden reports
- **4.10** Hidden parameters
- **10.1-10.4** Basic job scheduling (Email + Publish)
- **13.1-13.3** Rules (row-level security)

### Tier 2 — Nice to Have, Medium Effort
- **6.2** Dynamic SQL with XML tags (conditional WHERE clauses)
- **2.4** Dashboard report type
- **3.5-3.8** Additional export formats (TSV, compressed)
- **4.11** Date Range parameter control
- **4.14** Allow Null for parameters
- **1.13** Run report via public URL
- **18.2** Running Queries monitoring

### Tier 3 — Advanced, High Effort
- **2.2** Chart reports (requires charting library integration)
- **2.5-2.6** JasperReports / FreeMarker integration
- **6.1** Groovy-based dynamic SQL
- **10.5-10.12** Advanced job types (Alert, Burst, Conditional, Dynamic Recipients)
- **12.1-12.4** Destinations (FTP, SFTP, S3)
- **15.1-15.4** Pipelines

### Tier 4 — Low Priority / Edge Cases
- **5.5** ART-specific `f[...]f` expression syntax
- **5.7** Groovy expressions
- **6.4** Dynamic Datasources
- **11.2-11.5** XML-based dashboard definition
- **16.1-16.3** SMTP server management
- **18.1** Record migration

---

*Review each section and mark which features you want to build. I'll then create implementation specs for the selected items.*
