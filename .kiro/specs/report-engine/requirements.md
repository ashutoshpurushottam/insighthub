# Requirements Document

## Introduction

The Report Engine is the core feature of InsightHub — a reporting and BI platform. It provides a comprehensive system for creating, configuring, parameterizing, executing, and exporting SQL-based reports. The architecture is organized into four parts: (1) Report Configuration — defining reports, parameters, LOVs, drill-downs, and access rights; (2) Report Execution — controlled query execution with guardrails, parameter validation, and expression resolution; (3) Report Viewer — paginated display with sorting, drill-down navigation, and metadata; (4) Export — multi-format streaming export respecting guardrails.

## Glossary

- **Report_Engine**: The InsightHub subsystem responsible for report creation, configuration, execution, and export.
- **Report**: A named entity containing SQL source, metadata, parameter definitions, and configuration for generating tabular data.
- **Parameter**: A user-supplied input value injected into a report's SQL query at execution time via named `:paramName` placeholders.
- **LOV (List of Values)**: A set of selectable options for a DROPDOWN parameter, populated either by a SQL query (dynamic LOV) or a fixed list (static LOV).
- **Parameter_Expression**: A predefined keyword (e.g., `CURDATE()`, `NOW()`, `CURRENT_USER`) resolved at execution time to produce a default value.
- **Cascading_Parameter**: A parameter whose available options depend on the selected value of a parent parameter.
- **Multi_Value_Parameter**: A parameter that accepts multiple selected values, substituted into the SQL as an IN-clause list.
- **Datasource**: A configured JDBC connection used to execute report SQL.
- **Report_Group**: A logical category for organizing reports.
- **Drill_Down_Link**: A parent-child relationship between two reports where clicking a cell or row in the parent report navigates to the child report with context parameters passed automatically.
- **Guardrails_Configuration**: A global settings entity defining execution safety limits (max rows, max date range, timeout, concurrency, result size) with per-report override capability.
- **RBAC (Role-Based Access Control)**: The access rights system controlling which users and user groups can access which reports and report groups.
- **Controlled_Execution**: A query execution strategy using cursor-based streaming and memory limits to prevent out-of-memory conditions.
- **Page**: A subset of query results returned by the server, defined by a page number and page size.
- **Execution_Result**: The response from running a report, containing columns, rows, row count, execution time, and pagination metadata.
- **Report_Format**: The output file type used for export (CSV, XLSX, PDF).
- **Parameter_Form**: The UI presented to users before report execution, displaying input fields for each defined parameter.

---

## Part 1: Report Configuration

### Requirement 1: Report Creation and Editing

**User Story:** As an administrator, I want to create and edit reports with full metadata and SQL configuration, so that I can define data queries for end users to execute.

#### Acceptance Criteria

1. THE Report_Engine SHALL provide a dedicated report creation page with fields for: name, description, contact person, report group, datasource, SQL source, report type, active/inactive status, and default report format.
2. WHEN an administrator submits the report creation form with a valid name and SQL source, THE Report_Engine SHALL persist the report and return the created report with a unique identifier.
3. WHEN an administrator opens an existing report for editing, THE Report_Engine SHALL populate all form fields with the current stored values.
4. WHEN an administrator updates a report, THE Report_Engine SHALL persist the changes and record the updater username and timestamp.
5. IF a report creation or update request is submitted without a name, THEN THE Report_Engine SHALL reject the request with a validation error indicating the name is required.
6. THE Report_Engine SHALL provide a SQL source editor with monospace font rendering for the query input field.
7. WHEN an administrator toggles the active/inactive status, THE Report_Engine SHALL persist the status change immediately.

### Requirement 2: Report Deletion and Cloning

**User Story:** As an administrator, I want to delete reports I no longer need and clone existing reports, so that I can manage the report catalog efficiently.

#### Acceptance Criteria

1. WHEN an administrator requests deletion of a report, THE Report_Engine SHALL remove the report and all associated parameters, drill-down links, and access rights from persistent storage.
2. WHEN an administrator requests cloning of a report, THE Report_Engine SHALL create a new report with identical SQL source, parameters, and configuration, appended with a " (Copy)" suffix in the name.
3. WHEN a report is cloned, THE Report_Engine SHALL assign a new unique identifier to the cloned report and set the creator to the current user.

### Requirement 3: Parameter Definition and Metadata

**User Story:** As an administrator, I want to define parameters on a report with types, labels, defaults, and ordering, so that users can supply inputs before running the report.

#### Acceptance Criteria

1. THE Report_Engine SHALL support the following parameter types: TEXT, NUMBER, DATE, DATETIME, BOOLEAN, and DROPDOWN.
2. WHEN an administrator adds a parameter to a report, THE Report_Engine SHALL store the parameter with name, label, type, default value, placeholder, required flag, and display position.
3. WHEN an administrator reorders parameters, THE Report_Engine SHALL update the position values and display parameters in the specified order.
4. WHEN an administrator marks a parameter as required, THE Report_Engine SHALL enforce that a value is provided before allowing report execution.
5. THE Report_Engine SHALL allow administrators to define default values for parameters, including expression keywords: `CURDATE()`, `NOW()`, `CURRENT_USER`, `CURRENT_DATE`, `FIRST_DAY_OF_MONTH`, and `LAST_DAY_OF_MONTH`.
6. WHEN a parameter default value contains a recognized expression keyword, THE Report_Engine SHALL resolve the expression to its computed value at execution time.

### Requirement 4: Dynamic LOV (List of Values) for Dropdown Parameters

**User Story:** As an administrator, I want to populate dropdown parameters from a SQL query, so that users see up-to-date selectable options sourced from the database.

#### Acceptance Criteria

1. WHEN an administrator configures a DROPDOWN parameter with a LOV query, THE Report_Engine SHALL store the SQL query that returns id and label columns.
2. WHEN a user opens the parameter form for a report with a dynamic LOV parameter, THE Report_Engine SHALL execute the LOV query against the report datasource and return the id/label result set as dropdown options.
3. IF the LOV query execution fails, THEN THE Report_Engine SHALL display an error message to the user and prevent selection from the dropdown.
4. WHEN the LOV query returns zero rows, THE Report_Engine SHALL display the dropdown with an empty option list and a "No options available" placeholder.

### Requirement 5: Static LOV for Dropdown Parameters

**User Story:** As an administrator, I want to define fixed option lists for dropdown parameters, so that I can provide controlled value sets without a database query.

#### Acceptance Criteria

1. WHEN an administrator configures a DROPDOWN parameter with static values, THE Report_Engine SHALL store the list of value/label pairs.
2. WHEN a user opens the parameter form for a report with a static LOV parameter, THE Report_Engine SHALL display the stored value/label pairs as dropdown options.
3. THE Report_Engine SHALL allow administrators to define static LOV entries with distinct value and display label fields.

### Requirement 6: Cascading (Chained) Parameters

**User Story:** As an administrator, I want to link parameters in a parent-child relationship, so that selecting a value in one dropdown filters the available options in another.

#### Acceptance Criteria

1. WHEN an administrator configures a cascading relationship between two DROPDOWN parameters, THE Report_Engine SHALL store the parent parameter reference on the child parameter.
2. WHEN a user selects a value in a parent parameter, THE Report_Engine SHALL re-execute the child parameter LOV query with the parent value as a bind variable and refresh the child dropdown options.
3. WHILE a parent parameter has no selected value, THE Report_Engine SHALL disable the dependent child parameter and display a prompt indicating the parent selection is required.
4. WHEN a parent parameter value changes, THE Report_Engine SHALL clear the current child parameter selection.

### Requirement 7: Multi-Value Parameters

**User Story:** As an administrator, I want to allow users to select multiple values for a parameter, so that the report SQL can filter using an IN clause.

#### Acceptance Criteria

1. WHEN an administrator enables multi-value on a DROPDOWN parameter, THE Report_Engine SHALL allow users to select more than one option.
2. WHEN a multi-value parameter is substituted into the SQL query, THE Report_Engine SHALL expand the placeholder into a comma-separated list suitable for an SQL IN clause (e.g., `:status` becomes `'Active','Closed'`).
3. THE Report_Engine SHALL display multi-value parameters as a multi-select control in the parameter form.

### Requirement 8: Drill-Down Report Definitions

**User Story:** As an administrator, I want to link a parent report to child reports with parameter mappings, so that users can navigate from summary data to detailed data by clicking a row or cell.

#### Acceptance Criteria

1. THE Report_Engine SHALL allow administrators to define one or more drill-down links on a parent report, each referencing a target child report.
2. WHEN an administrator creates a drill-down link, THE Report_Engine SHALL store the parent report identifier, child report identifier, and a set of parameter mappings (parent column name to child parameter name).
3. THE Report_Engine SHALL allow administrators to specify which column in the parent report triggers the drill-down navigation.
4. WHEN a drill-down link is configured, THE Report_Engine SHALL validate that the target child report exists and that mapped parameter names correspond to defined parameters on the child report.
5. IF a parent report is deleted, THEN THE Report_Engine SHALL remove all drill-down links where the report is the parent.

### Requirement 9: RBAC — Report Access Rights Configuration

**User Story:** As an administrator, I want to assign report access rights to users and user groups, so that only authorized personnel can view and execute specific reports.

#### Acceptance Criteria

1. THE Report_Engine SHALL support assigning access rights at four levels: user-to-report, user-to-report-group, user-group-to-report, and user-group-to-report-group.
2. WHEN an administrator assigns a user to a report, THE Report_Engine SHALL persist the user-report access mapping.
3. WHEN an administrator assigns a user group to a report group, THE Report_Engine SHALL grant access to all reports within that group for all members of the user group.
4. THE Report_Engine SHALL provide an administration interface displaying current access assignments for a given report or user.
5. WHEN access rights for a user are revoked, THE Report_Engine SHALL immediately prevent the user from executing or viewing the affected report.

### Requirement 10: Guardrails Configuration

**User Story:** As an administrator, I want to configure global execution safety limits with per-report overrides, so that runaway queries cannot exhaust system resources.

#### Acceptance Criteria

1. THE Report_Engine SHALL provide a Guardrails_Configuration entity storing global defaults for: max rows returned, max date range (in days), execution timeout (in seconds), concurrent execution limit per user, and result set size limit (in bytes).
2. THE Report_Engine SHALL allow administrators to override any global guardrail value at the individual report level.
3. WHEN no per-report override is defined for a guardrail, THE Report_Engine SHALL apply the global default value.
4. THE Report_Engine SHALL provide an administration page for viewing and editing global guardrail settings.
5. WHEN an administrator sets a guardrail value, THE Report_Engine SHALL validate that the value is a positive integer (or positive long for byte limits).
6. THE Report_Engine SHALL persist guardrail configuration changes immediately upon save.

### Requirement 11: Report Version Tracking

**User Story:** As an administrator, I want to know who created and last modified a report, so that I can audit changes and contact the responsible person.

#### Acceptance Criteria

1. WHEN a report is created, THE Report_Engine SHALL store the creator username and creation timestamp.
2. WHEN a report is updated, THE Report_Engine SHALL store the updater username and update timestamp.
3. THE Report_Engine SHALL expose creation and update metadata (username, timestamp) in the report detail response.

---

## Part 2: Report Execution

### Requirement 12: RBAC Enforcement on Execution

**User Story:** As a user, I want the system to check my access rights before running a report, so that unauthorized users cannot execute restricted reports.

#### Acceptance Criteria

1. WHEN a user requests execution of a report, THE Report_Engine SHALL verify that the user has access rights (directly or via group membership) before proceeding.
2. IF a user does not have access rights to the requested report, THEN THE Report_Engine SHALL reject the execution request with an HTTP 403 response and a message indicating insufficient permissions.
3. WHEN a report belongs to a report group, THE Report_Engine SHALL grant access if the user has rights to that report group (directly or via user group membership).
4. THE Report_Engine SHALL evaluate access rights using the union of all four assignment levels (user-report, user-report-group, user-group-report, user-group-report-group).

### Requirement 13: Parameter Validation Before Execution

**User Story:** As a user, I want the system to validate my parameter inputs before executing the query, so that invalid or missing values are caught early.

#### Acceptance Criteria

1. WHEN a user submits the parameter form, THE Report_Engine SHALL validate that all required parameters have non-empty values.
2. WHEN a DATE or DATETIME parameter value is submitted, THE Report_Engine SHALL validate that the value is a parseable date in the expected format.
3. WHEN a NUMBER parameter value is submitted, THE Report_Engine SHALL validate that the value is a valid numeric literal.
4. IF a required parameter is missing from the execution request, THEN THE Report_Engine SHALL reject the request with a validation error identifying the missing parameter.
5. WHILE a report is inactive, THE Report_Engine SHALL reject execution requests with a message indicating the report is disabled.

### Requirement 14: Expression Resolution

**User Story:** As a user, I want default parameter values like CURDATE() and CURRENT_USER to be resolved automatically, so that I do not need to manually enter common dynamic values.

#### Acceptance Criteria

1. WHEN a parameter default value contains `CURDATE()` or `CURRENT_DATE`, THE Report_Engine SHALL resolve it to the current date in `yyyy-MM-dd` format.
2. WHEN a parameter default value contains `NOW()`, THE Report_Engine SHALL resolve it to the current date-time in `yyyy-MM-dd HH:mm:ss` format.
3. WHEN a parameter default value contains `CURRENT_USER`, THE Report_Engine SHALL resolve it to the authenticated username of the requesting user.
4. WHEN a parameter default value contains `FIRST_DAY_OF_MONTH`, THE Report_Engine SHALL resolve it to the first day of the current month.
5. WHEN a parameter default value contains `LAST_DAY_OF_MONTH`, THE Report_Engine SHALL resolve it to the last day of the current month.
6. THE Report_Engine SHALL resolve expressions before substituting parameter values into the SQL query.

### Requirement 15: Multi-Value Parameter Expansion

**User Story:** As a user, I want multi-select parameter values to be correctly expanded into SQL IN clauses, so that the query filters on all selected values.

#### Acceptance Criteria

1. WHEN a multi-value parameter is submitted with selected values, THE Report_Engine SHALL expand the `:paramName` placeholder into a comma-separated, single-quoted list (e.g., `'val1','val2','val3'`).
2. WHEN a multi-value parameter has exactly one selected value, THE Report_Engine SHALL expand it as a single quoted value (e.g., `'val1'`).
3. IF a multi-value parameter is submitted with no selected values and is required, THEN THE Report_Engine SHALL reject the request with a validation error.

### Requirement 16: Cascading Parameter Resolution

**User Story:** As a user, I want dependent parameters to refresh when I change a parent value, so that I always see valid options for chained dropdowns.

#### Acceptance Criteria

1. WHEN a user changes a parent parameter value, THE Report_Engine SHALL accept the new parent value and return refreshed LOV options for all dependent child parameters.
2. THE Report_Engine SHALL provide an API endpoint that accepts a parameter identifier and parent value, and returns the filtered child LOV result set.
3. WHEN cascading parameters have multiple levels (grandparent → parent → child), THE Report_Engine SHALL resolve each level sequentially.

### Requirement 17: Controlled Execution — Streaming and Memory Safety

**User Story:** As a system operator, I want report queries to execute using cursor-based streaming with memory limits, so that large result sets do not cause out-of-memory failures.

#### Acceptance Criteria

1. WHEN executing a report query, THE Report_Engine SHALL use a cursor-based (forward-only, read-only) ResultSet with a configured fetch size to stream rows incrementally.
2. THE Report_Engine SHALL limit in-memory row accumulation to the configured page size during paginated execution.
3. IF the total result set exceeds the configured max rows guardrail, THEN THE Report_Engine SHALL stop fetching additional rows and return the results up to the limit with a truncation indicator.
4. THE Report_Engine SHALL release JDBC resources (ResultSet, Statement, Connection) immediately after page extraction or upon error.

### Requirement 18: Execution Timeout Enforcement

**User Story:** As a system operator, I want queries that run too long to be automatically killed, so that a single runaway query cannot block database resources indefinitely.

#### Acceptance Criteria

1. WHEN executing a report query, THE Report_Engine SHALL set the JDBC Statement query timeout to the configured timeout value (global default or per-report override) in seconds.
2. IF the query execution exceeds the configured timeout, THEN THE Report_Engine SHALL cancel the query and return an error response indicating the execution timed out.
3. THE Report_Engine SHALL log timed-out query executions with the report identifier, user, and elapsed time.

### Requirement 19: Concurrent Execution Limit

**User Story:** As a system operator, I want to limit how many reports a single user can run simultaneously, so that one user cannot monopolize database connections.

#### Acceptance Criteria

1. WHEN a user submits a report execution request, THE Report_Engine SHALL check the number of currently active executions for that user.
2. IF the number of active executions for the user equals or exceeds the configured concurrent execution limit, THEN THE Report_Engine SHALL reject the request with an HTTP 429 response and a message indicating the concurrency limit has been reached.
3. WHEN a report execution completes (success or failure), THE Report_Engine SHALL decrement the active execution count for that user.

### Requirement 20: Date Range Guardrail

**User Story:** As a system operator, I want to prevent users from querying excessively large date ranges, so that expensive full-table scans are avoided.

#### Acceptance Criteria

1. WHEN a report has two DATE parameters identified as a date range (start date and end date), THE Report_Engine SHALL calculate the difference in days between the two values.
2. IF the date range exceeds the configured max date range guardrail (global or per-report override), THEN THE Report_Engine SHALL reject the execution with a validation error indicating the maximum allowed date range.
3. THE Report_Engine SHALL identify date range pairs by convention: parameters named with suffixes `_from`/`_to`, `_start`/`_end`, or configured explicitly via a date-range-pair flag on the parameter.

### Requirement 21: Result Set Size Limit

**User Story:** As a system operator, I want to cap the total byte size of result sets, so that extremely wide or large results do not consume excessive memory or bandwidth.

#### Acceptance Criteria

1. WHILE accumulating result rows, THE Report_Engine SHALL estimate the byte size of the accumulated result data.
2. IF the estimated result size exceeds the configured result set size limit (in bytes), THEN THE Report_Engine SHALL stop fetching additional rows and return the partial result with a size-limit-exceeded indicator.
3. THE Report_Engine SHALL include the actual result byte size and the configured limit in the truncation response metadata.

### Requirement 22: Report Execution with Parameter Substitution

**User Story:** As a user, I want to run a report by filling in parameters and viewing results in a table, so that I can access the data I need.

#### Acceptance Criteria

1. WHEN a user submits the parameter form, THE Report_Engine SHALL substitute all `:paramName` placeholders in the SQL with the user-supplied values using safe string escaping (single quotes escaped).
2. WHEN all required parameters are provided and all guardrails pass, THE Report_Engine SHALL run the SQL against the configured datasource and return the result set.
3. THE Report_Engine SHALL return execution results containing: column names, row data, total row count, execution duration in milliseconds, and pagination metadata.
4. IF the SQL execution fails, THEN THE Report_Engine SHALL return an error response containing the database error message without exposing internal stack traces.

---

## Part 3: Report Viewer

### Requirement 23: Server-Side Pagination

**User Story:** As a user, I want report results to be paginated on the server, so that large result sets load quickly and do not overwhelm the browser.

#### Acceptance Criteria

1. WHEN a user executes a report, THE Report_Engine SHALL return the first page of results with the configured default page size.
2. THE Report_Engine SHALL support configurable page sizes of 10, 25, 50, and 100 rows per page.
3. WHEN a user requests a specific page number, THE Report_Engine SHALL return the corresponding subset of rows from the result set.
4. THE Report_Engine SHALL include pagination metadata in the response: current page number, page size, total row count, and total page count.
5. WHEN a user requests a page number beyond the total page count, THE Report_Engine SHALL return an empty row set with correct pagination metadata.

### Requirement 24: Column Sorting

**User Story:** As a user, I want to sort report results by clicking column headers, so that I can analyze data in a meaningful order.

#### Acceptance Criteria

1. WHEN a user requests sorting by a column name and direction (ASC or DESC), THE Report_Engine SHALL return results ordered by the specified column.
2. THE Report_Engine SHALL support sorting on any column present in the result set.
3. WHEN no sort is specified, THE Report_Engine SHALL return results in the order produced by the SQL query.
4. WHEN a user changes the sort column or direction, THE Report_Engine SHALL reset the current page to page one.

### Requirement 25: Drill-Down Navigation

**User Story:** As a user, I want to click a cell or row in a report and navigate to a linked child report with context parameters filled in, so that I can explore detailed data from a summary view.

#### Acceptance Criteria

1. WHEN a report has drill-down links configured, THE Report_Engine SHALL display clickable indicators on the designated drill-down column cells.
2. WHEN a user clicks a drill-down cell, THE Report_Engine SHALL navigate to the child report viewer with parameter values pre-populated from the parent row data according to the configured parameter mappings.
3. THE Report_Engine SHALL pass the mapped column values from the clicked row as query parameters to the child report execution request.
4. WHEN a child report is opened via drill-down, THE Report_Engine SHALL display a breadcrumb or back-navigation link to return to the parent report at the same page position.
5. IF the child report requires additional parameters beyond those mapped from the parent, THEN THE Report_Engine SHALL display the parameter form with the mapped values pre-filled and remaining parameters empty for user input.

### Requirement 26: Results Display and Metadata

**User Story:** As a user, I want report results displayed in a clear paginated table with metadata, so that I can browse large datasets comfortably.

#### Acceptance Criteria

1. THE Report_Engine SHALL display execution results in a tabular format with column headers and data rows.
2. THE Report_Engine SHALL display the total row count above or below the results table.
3. THE Report_Engine SHALL display the query execution time in milliseconds.
4. THE Report_Engine SHALL provide page navigation controls (first, previous, next, last, and page number input).
5. THE Report_Engine SHALL provide a page size selector with options: 10, 25, 50, 100.
6. WHEN column headers are clicked, THE Report_Engine SHALL toggle sort direction for that column (none → ASC → DESC → none).
7. THE Report_Engine SHALL provide a chart/table toggle allowing users to switch between tabular and chart visualization of the results.

### Requirement 27: Parameter Form UI

**User Story:** As a user, I want a clear parameter input form before running a report, so that I can supply the correct inputs with appropriate controls for each type.

#### Acceptance Criteria

1. THE Report_Engine SHALL render TEXT parameters as a single-line text input.
2. THE Report_Engine SHALL render NUMBER parameters as a numeric input with increment/decrement controls.
3. THE Report_Engine SHALL render DATE parameters as a date picker control.
4. THE Report_Engine SHALL render DATETIME parameters as a date-time picker control.
5. THE Report_Engine SHALL render BOOLEAN parameters as a toggle switch or checkbox.
6. THE Report_Engine SHALL render DROPDOWN parameters as a select control populated with LOV options.
7. WHEN a parameter is marked as required, THE Report_Engine SHALL display a visual indicator (asterisk) next to the parameter label.
8. WHEN a parameter has a resolved default value, THE Report_Engine SHALL pre-populate the input control with the default value.

---

## Part 4: Export

### Requirement 28: CSV Export

**User Story:** As a user, I want to export report results to CSV format, so that I can open data in spreadsheet applications or process it programmatically.

#### Acceptance Criteria

1. WHEN a user requests CSV export of a report, THE Report_Engine SHALL execute the report SQL with the current parameters and stream all result rows (not just the current page) into a CSV file.
2. THE Report_Engine SHALL include a header row with column names as the first line of the CSV file.
3. THE Report_Engine SHALL use comma as the field delimiter and enclose fields containing commas, newlines, or double quotes in double quotes.
4. THE Report_Engine SHALL set the HTTP response Content-Type to `text/csv` and Content-Disposition to attachment with the report name as filename.
5. THE Report_Engine SHALL stream CSV output directly to the HTTP response to prevent accumulating the full result set in memory.

### Requirement 29: Excel (XLSX) Export

**User Story:** As a user, I want to export report results to Excel format, so that I can use spreadsheet features like filtering, formulas, and formatting.

#### Acceptance Criteria

1. WHEN a user requests XLSX export of a report, THE Report_Engine SHALL execute the report SQL with the current parameters and generate an XLSX workbook containing all result rows.
2. THE Report_Engine SHALL create a header row in the worksheet with column names formatted in bold.
3. THE Report_Engine SHALL auto-size column widths based on content length.
4. THE Report_Engine SHALL set the HTTP response Content-Type to `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` and Content-Disposition to attachment with the report name as filename.
5. THE Report_Engine SHALL use streaming XLSX generation (SXSSFWorkbook or equivalent) to prevent out-of-memory conditions on large exports.

### Requirement 30: PDF Export

**User Story:** As a user, I want to export report results to PDF format, so that I can share formatted reports for printing or archival.

#### Acceptance Criteria

1. WHEN a user requests PDF export of a report, THE Report_Engine SHALL execute the report SQL with the current parameters and generate a PDF document containing all result rows in a tabular layout.
2. THE Report_Engine SHALL include the report name as a title at the top of the PDF document.
3. THE Report_Engine SHALL include column headers on each page of the PDF when the table spans multiple pages.
4. THE Report_Engine SHALL set the HTTP response Content-Type to `application/pdf` and Content-Disposition to attachment with the report name as filename.
5. THE Report_Engine SHALL stream PDF generation to the response output to avoid holding the entire document in memory.

### Requirement 31: Export Guardrails

**User Story:** As a system operator, I want export operations to respect configured row and size limits, so that exporting millions of rows does not crash the server.

#### Acceptance Criteria

1. THE Report_Engine SHALL enforce a configurable max export rows limit (global default with per-report override) separate from the display max rows guardrail.
2. IF an export operation reaches the max export rows limit, THEN THE Report_Engine SHALL stop writing additional rows and append a footer or metadata note indicating the export was truncated.
3. THE Report_Engine SHALL stream export data row-by-row from the database cursor to the HTTP response, maintaining constant memory usage regardless of total row count.
4. WHEN the export guardrail is exceeded, THE Report_Engine SHALL log the event with the report identifier, user, and row count reached.

### Requirement 32: Export Streams Data to Prevent OOM

**User Story:** As a system operator, I want all export formats to use streaming output, so that exporting large datasets does not cause out-of-memory failures.

#### Acceptance Criteria

1. WHEN generating a CSV export, THE Report_Engine SHALL write rows to the output stream as they are fetched from the database cursor without buffering the full result set.
2. WHEN generating an XLSX export, THE Report_Engine SHALL use a streaming workbook implementation that flushes rows to disk after a configurable window (e.g., 100 rows in memory).
3. WHEN generating a PDF export, THE Report_Engine SHALL write pages incrementally to the output stream as table rows are processed.
4. THE Report_Engine SHALL configure the JDBC fetch size for export queries to limit the number of rows held in the JDBC driver memory at any time.
