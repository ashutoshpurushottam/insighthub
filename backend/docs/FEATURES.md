# InsightHub (ART) — Complete Feature Catalog

Comprehensive list of all functionalities extracted from the ART documentation and codebase, organized by domain.

---

## 1. Report Management

### 1.1 Report Types (60+)

#### Tabular Reports
- **Tabular** — Standard SQL result table with formatting
- **Tabular (HTML only)** — HTML-only tabular output
- **Crosstab** — Pivot-style crosstab reports
- **Crosstab (HTML only)** — HTML-only crosstab
- **Tabular Heatmap** — Table cells colored by value intensity
- **DataTables** — Interactive tables with sorting/filtering/pagination
- **DataTables: CSV Local** — DataTables from local CSV
- **DataTables: CSV Server** — DataTables from server-side CSV
- **Fixed Width** — Fixed-width text file output
- **CSV** — Comma-separated output
- **TSV** — Tab-separated output
- **XML** — XML format output
- **JSON** — JSON format output

#### Chart Reports
- **XY Charts** — Scatter/XY plots
- **Pie Charts** — Pie/donut charts
- **Bars/Stacked Bars/Line** — Bar and line charts
- **Time/Date Series** — Time series plots
- **Speedometer** — Gauge/speedometer charts
- **Bubble Charts** — Bubble plots
- **Heat Map** — Heatmap visualizations
- **C3.js** — D3-based charts via C3
- **Plotly.js** — Interactive Plotly charts
- **Chart.js** — Canvas-based Chart.js charts
- **ApexCharts.js** — Modern ApexCharts
- **AwesomeChartJs** — Additional JS charting
- **jqPlot** — jQuery-based plots
- **Dygraphs** — Time series interactive graphs
- **Dygraphs: CSV Local/Server** — Dygraphs from CSV files

#### Map Reports
- **Datamaps** — Geographic choropleth maps
- **Datamaps: File** — Maps from file data
- **Leaflet** — Interactive Leaflet maps
- **OpenLayers** — OpenLayers map integration

#### Dashboard Reports
- **Dashboard** — Multi-report single page
- **Dashboard: Gridstack** — Drag-and-drop grid dashboards
- **Tabbed Dashboards** — Multi-tab dashboard views

#### Template-based Reports
- **JasperReports: Template Query** — Pixel-perfect PDF/Excel via JasperReports
- **JasperReports: ART Query** — JasperReports with ART-managed queries
- **Jxls: Template Query** — Excel reports from Jxls templates
- **Jxls: ART Query** — Jxls with ART-managed queries
- **FreeMarker** — FreeMarker template reports
- **Velocity** — Apache Velocity template reports
- **Thymeleaf** — Thymeleaf template reports
- **XDocReport (6 variants)** — Docx/ODT/PPTX with FreeMarker or Velocity engines

#### OLAP/Analytics Reports
- **JPivot: Mondrian** — OLAP pivot via local Mondrian
- **JPivot: Mondrian XMLA** — OLAP via Mondrian XMLA
- **JPivot: Microsoft XMLA** — OLAP via SQL Server Analysis Services
- **Saiku: Connection** — Saiku OLAP connection
- **Saiku: Report** — Saved Saiku analysis
- **ReactPivot** — Client-side pivot tables
- **PivotTable.js** — Interactive pivot table
- **PivotTable.js: CSV Local/Server** — Pivot from CSV data

#### Organizational Charts
- **OrgChart: Database** — Org chart from DB
- **OrgChart: JSON** — Org chart from JSON
- **OrgChart: List** — Org chart from list
- **OrgChart: Ajax** — Dynamic org chart

#### Special Reports
- **Update Statement** — Execute DML (INSERT/UPDATE/DELETE)
- **Group** — Group multiple reports together
- **Text** — Plain text report output
- **ReportEngine** — ReportEngine-based reports
- **ReportEngine: File** — ReportEngine from file
- **MongoDB** — MongoDB query reports
- **View** — Render a view/page
- **File** — Serve a file
- **Link** — Redirect to a URL
- **LOV: Dynamic** — Dynamic list of values
- **LOV: Static** — Static list of values
- **Dynamic Job Recipients** — Report that returns email recipients

### 1.2 Report Formats (Output)
- HTML (interactive, in-browser)
- PDF (with password protection option)
- XLSX (Excel)
- XLS (Legacy Excel)
- ODS (OpenDocument Spreadsheet)
- ODT (OpenDocument Text)
- CSV
- TSV
- XML
- JSON
- Fixed-width text
- PNG/JPEG/SVG (charts)
- DOCX (Word)
- PPTX (PowerPoint)

### 1.3 Report Features
- **Parameterized reports** — User-selectable parameters (dropdown, date, checkbox, radio, file upload, text, number, textarea)
- **Chained parameters** — Cascading dependent parameter dropdowns
- **Multi-value parameters** — Select multiple values (IN clause)
- **Direct substitution parameters** — String interpolation in SQL
- **Dynamic SQL** — Conditional SQL via Groovy or XML tags
- **Dynamic datasources** — Choose database at runtime
- **Drill-down reports** — Click-through from summary to detail
- **Individualized reports (Rules)** — Filter data per user via rules
- **Report auto-refresh** — Periodic auto-reload
- **Running a report via URL** — Direct URL execution with parameters
- **Report options** — Column formats, number formats, date formats, null display, locale, hidden columns, total columns
- **Report tags** — Categorize reports with tags
- **Running queries monitor** — View currently executing queries

---

## 2. Scheduling & Jobs

### 2.1 Job Types
- **Email (Attachment)** — Send report as email attachment
- **Email (Inline)** — Embed report in email body
- **Publish** — Generate and save to filesystem/destinations
- **Alert** — Send email when condition is true
- **Just Run It** — Execute without output delivery
- **Conditional Email (Attachment)** — Send only if data exists
- **Conditional Email (Inline)** — Inline only if data exists
- **Conditional Publish** — Publish only if condition met
- **Cache ResultSet (Append)** — Cache results (append mode)
- **Cache ResultSet (Delete & Insert)** — Cache results (replace mode)
- **Print** — Send to printer
- **Burst** — Generate per-recipient personalized reports

### 2.2 Scheduling Features
- Cron-based scheduling (minute/hour/day/month/weekday)
- **Multiple schedules per job** — Complex schedule support
- **Holidays** — Skip jobs on defined holiday dates
- **Pipelines** — Chain jobs in sequence (run A → then B → then C)
- **Start conditions** — Pre-condition check before job execution (e.g., verify ETL complete)
- **Random start times** — Randomize job start within a window
- **Dynamic recipients** — SQL-driven email recipient lists
- **Dynamic recipients + personalization** — Different data per recipient
- **Dynamic recipients + filtering** — Filter report data per recipient
- **Job error notification** — Email alert on job failure
- **Job archives** — Historical job output access
- **Shared/Split jobs** — Reuse job definitions
- **Quartz properties** — Fine-tune Quartz scheduler behavior

---

## 3. Destinations (Report Delivery)

- **FTP** — Upload to FTP server
- **FTPS** — Upload via FTPS (TLS)
- **SFTP** — Upload via SSH FTP
- **Network Share** — Copy to SMB/CIFS share
- **Website** — HTTP POST upload
- **Amazon S3** — AWS SDK upload to S3

---

## 4. User & Access Management

### 4.1 Users
- Create/Edit/Delete users
- Enable/Disable users
- Public users (anonymous access)
- User access levels (0=Normal, 5=Schedule, 10=Junior Admin, 30=Mid Admin, 40=Standard Admin, 80=Senior Admin, 100=Super Admin)

### 4.2 User Groups
- Group users for bulk permission assignment
- User group membership management

### 4.3 Roles & Permissions
- Role-based access control (RBAC)
- Granular permissions:
  - `view_reports`, `view_analytics`, `view_jobs`, `view_logs`
  - `schedule_jobs`, `configure_jobs`
  - `configure_reports`, `configure_datasources`, `configure_users`
  - `configure_user_groups`, `configure_report_groups`
  - `configure_roles`, `configure_permissions`
  - `configure_schedules`, `configure_holidays`
  - `configure_destinations`, `configure_smtp_servers`
  - `configure_encryptors`, `configure_pipelines`
  - `configure_start_conditions`, `configure_art_database`
  - `configure_settings`, `configure_access_rights`
  - `configure_admin_rights`, `configure_caches`
  - `configure_connections`, `configure_loggers`
  - `configure_report_group_membership`
  - `configure_user_group_membership`
  - `self_service_dashboards`, `self_service_reports`
  - `use_api`, `migrate_records`
- Access rights (which users/groups can see which reports/groups)
- Admin rights (delegate admin capabilities)

### 4.4 Authentication Methods
- **Internal** — Username/password stored in ART database
- **LDAP** — LDAP/Active Directory authentication
- **Windows Domain** — NTLM/Kerberos authentication
- **Database** — Authenticate against external database
- **CAS** — Central Authentication Service (SSO)
- **HTTP Header** — Trust HTTP header from reverse proxy
- **OAuth** — Microsoft Azure, Google OAuth2
- **Auto (Integrated Windows Auth)** — SPNEGO/Kerberos SSO

---

## 5. Datasource Management

- JDBC datasource definitions
- JNDI datasource support
- Connection pooling (HikariCP)
- Connection testing (test SQL)
- Support for: MySQL, PostgreSQL, Oracle, SQL Server, DB2, SQLite, HSQLDB, MariaDB, H2, Informix, Firebird, Cloudscape, CUBRID, Sybase, SAP, BigQuery
- Datasource options (custom JDBC properties)
- Built-in JDBC drivers for common databases

---

## 6. Dashboards

### 6.1 Types
- **Regular dashboards** — Column-based layout with portlets
- **Gridstack dashboards** — Drag-and-drop resizable grid
- **Tabbed dashboards** — Multiple tabs with different content

### 6.2 Self-Service Dashboards
- Users create their own dashboards
- Select which reports to include
- Personal dashboard arrangement

---

## 7. Self-Service

- **Self-service reports** — Users build ad-hoc queries (select columns, define conditions)
- **Self-service dashboards** — Users compose personal dashboards
- **Self-service charts** — Users create custom visualizations

---

## 8. Security & Encryption

- **PGP encryption** — Encrypt report output with PGP
- **AES encryption** — Encrypt report output with AES
- **Password-protected PDF** — PDF open/modify passwords
- **Password-protected Excel** — Excel file passwords
- **Dynamic passwords** — Passwords from SQL (per-recipient)
- **CSRF protection** — Cross-site request forgery prevention
- **OWASP encoding** — XSS protection
- **Encryption key management** — Update/rotate encryption keys

---

## 9. Email / SMTP

- Multiple SMTP server configurations
- Gmail OAuth support
- Email with attachments
- Inline HTML email
- Conditional emails (send only when data exists)
- Dynamic recipients from SQL
- Application error notification emails
- Job error notification emails

---

## 10. Internationalization (i18n)

- Internationalized UI (15+ languages)
- Per-user language preference
- Report group name i18n
- Parameter label i18n
- Cookie-based locale persistence

---

## 11. API (REST)

### Endpoints
- **Authentication** — `POST /api/login` (JWT + Basic auth)
- **Users** — Full CRUD + enable/disable
- **Reports** — Full CRUD + enable/disable + run
- **User Groups** — Full CRUD
- **Jobs** — Full CRUD

### Features
- JWT Bearer token authentication
- Basic authentication support
- Swagger/OpenAPI documentation
- CORS enabled

---

## 12. Administration

- **ART Database configuration** — Setup/test internal database
- **Settings** — Global application settings
- **Caches** — View/clear application caches
- **Connections** — Monitor active database connections
- **Loggers** — Configure log levels at runtime
- **Logs** — View application logs
- **Import/Export records** — Migrate configurations between instances
- **Running queries** — Monitor active report executions

---

## 13. OLAP / Analytics

- Saiku embedded analytics
- JPivot MDX query interface
- Mondrian OLAP server (embedded)
- XMLA connectivity (Microsoft SSAS, Mondrian)
- Slice-and-dice, drill-down, pivot

---

## 14. Miscellaneous

- **RSS Feeds** — Expose report data as RSS
- **Groovy scripting** — Dynamic SQL generation, expressions
- **Field expressions** — Inject username, dates into queries
- **Multiple SQL statements** — Execute multiple statements per report
- **Cached results** — Pre-compute and cache report results
- **File parameters** — Upload files as report input
- **Report via URL** — Bookmark and share report URLs with parameters
- **Tomcat configuration** — Memory, Apache proxy, AJP
- **Customization** — Override JSP, Java, CSS via Ant/Maven builds

---

## Summary Statistics

| Category | Count |
|----------|-------|
| Report Types | 60+ |
| Output Formats | 15+ |
| Authentication Methods | 8 |
| Job Types | 12 |
| Destination Types | 6 |
| Supported Databases | 15+ |
| UI Languages | 15+ |
| Permissions | 30+ |
| Charting Libraries | 10+ |

---

*This document serves as the functional specification for the InsightHub migration. Each feature should be mapped to a user story/task for implementation in the new React + Spring Boot stack.*
