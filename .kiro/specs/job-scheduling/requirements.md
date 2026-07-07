# Requirements — Job Scheduling Engine

## Introduction

The Job Scheduling Engine enables automated report execution on defined schedules. Reports can be emailed, published to files, triggered conditionally, or burst into per-group files. This brings InsightHub to feature parity with ART's job system using Quartz Scheduler.

## Requirements

### Requirement 1: Job Definition & CRUD

**User Story:** As an admin, I want to create, edit, and delete scheduled jobs for reports, so that reports run automatically at configured times.

#### Acceptance Criteria

1. A job has: name, description, report reference, job type, output format, active flag, schedule definition
2. Jobs can be created from the Reports page (Schedule action) or from a dedicated Jobs Configuration page
3. Jobs can be edited, cloned, activated/deactivated, and deleted
4. A job is owned by the user who created it
5. Only users with `schedule_jobs` or `configure_jobs` permission can manage jobs

---

### Requirement 2: Cron-based Scheduling with Quartz

**User Story:** As an admin, I want to define job schedules using cron expressions, so that jobs run at precise recurring intervals.

#### Acceptance Criteria

1. Jobs use Quartz Scheduler for execution timing
2. Schedule is defined via individual fields: second, minute, hour, day, month, weekDay, year
3. A cron expression is generated from the individual fields
4. A "Schedule" helper dropdown pre-fills common schedules (Daily, Weekly, Monthly, Hourly)
5. Start Date and End Date fields control when a job begins and stops running
6. Time Zone can be specified per job
7. Manual jobs (no automatic schedule) can be triggered on-demand via a "Run Now" button
8. Extra Schedules field allows additional cron expressions (one per line)

---

### Requirement 3: Job Types — Email (Attachment)

**User Story:** As an admin, I want to email report output as an attachment, so that stakeholders receive reports in their inbox automatically.

#### Acceptance Criteria

1. Job type "Email (Attachment)" executes the report and emails the output file as an attachment
2. To, Cc, Bcc email fields support multiple addresses (comma-separated)
3. Subject and Message (body) fields are available
4. Reply-To field can be configured
5. From field overrides the default SMTP From address
6. The attachment format is controlled by the Output Format field (CSV, XLSX, PDF)
7. If the report has parameters, parameter values used during execution are the job's configured defaults

---

### Requirement 4: Job Types — Email (Inline)

**User Story:** As an admin, I want to email report output in the email body, so that recipients see results without opening an attachment.

#### Acceptance Criteria

1. Job type "Email (Inline)" renders the report results as an HTML table in the email body
2. Same email configuration fields as Email (Attachment)
3. The output is formatted as a simple HTML table with column headers and data rows

---

### Requirement 5: Job Types — Publish

**User Story:** As an admin, I want to save report output to a file and optionally notify users, so that scheduled reports are available for download.

#### Acceptance Criteria

1. Job type "Publish" generates the report output and saves it as a file on the server
2. Published files are accessible from the Jobs page under a "View Output" action
3. A notification email is sent to recipients in the To field (if configured)
4. The Number of Runs to Archive field controls how many past outputs are retained
5. Published files are stored in a configurable export directory

---

### Requirement 6: Job Types — Alert

**User Story:** As an admin, I want to send an email alert when a report query returns a non-zero value, so that stakeholders are notified of business conditions.

#### Acceptance Criteria

1. Job type "Alert" executes the report SQL
2. If the first column of the first row has a value > 0, an email is sent to the configured recipients
3. If the value is 0 or the result set is empty, no email is sent
4. The email subject and message body are configurable

---

### Requirement 7: Job Types — Conditional Email/Publish

**User Story:** As an admin, I want to only send/publish output when the report has results, so that empty reports don't generate unnecessary notifications.

#### Acceptance Criteria

1. "Conditional Email (Attachment)" — only sends email if the result has rows
2. "Conditional Email (Inline)" — only sends inline email if the result has rows
3. "Conditional Publish" — only publishes file if the result has rows
4. If no rows are returned, no email is sent and no file is generated

---

### Requirement 8: Job Types — Burst

**User Story:** As an admin, I want to generate separate report files for each distinct value in a column, so that different groups receive only their relevant data.

#### Acceptance Criteria

1. Job type "Burst" requires the SQL to be ordered by the first column (the burst-id column)
2. When the value of the first column changes, a new output file is generated
3. Each generated file has the burst-id in its filename
4. Burst works with Tabular reports only
5. Files are stored in the export directory

---

### Requirement 9: Job Archives & Shared Jobs

**User Story:** As a user, I want to access past job outputs and share them with other users.

#### Acceptance Criteria

1. The "Number of Runs to Archive" field retains N past outputs for viewing
2. Archived files are accessible from a View | Archives page
3. "Allow Sharing" enables other users (with access granted via Access Rights) to view the job output
4. "Allow Splitting" applies rule values for shared users so each gets different output

---

### Requirement 10: SMTP Server Management

**User Story:** As an admin, I want to configure multiple SMTP servers, so that different jobs can use different email servers.

#### Acceptance Criteria

1. SMTP servers are a configurable entity (CRUD): name, server host, port, use StartTLS, authentication, username, password, from address
2. A job can optionally select a specific SMTP server (overriding the global default)
3. If an SMTP server is inactive, jobs using it skip email sending
4. The Settings page has a default SMTP configuration used when no specific server is selected

---

### Requirement 11: Dynamic Recipients

**User Story:** As an admin, I want to email report results to a list of recipients determined by a database query, so that the recipient list is always up-to-date.

#### Acceptance Criteria

1. A Dynamic Recipients report returns email addresses from a database query
2. The job's "Dynamic Recipients" field references this report
3. Personalization: additional columns from the recipients query can be used as `#column_name#` placeholders in the email subject/body
4. Filtering: `recipient_column` and `recipient_id` columns enable per-recipient data filtering using the `#recipient#` placeholder in the main report SQL

---

### Requirement 12: Job Execution & Monitoring

**User Story:** As an admin, I want to monitor running jobs and get notified of failures.

#### Acceptance Criteria

1. A "Running Jobs" page shows currently executing jobs
2. Jobs can be cancelled from the running jobs page
3. An "Error Notification Email" field per job sends failure notifications
4. Job execution logs are stored with start time, end time, status, and error details
5. A job history page shows past executions with their status

---

### Requirement 13: Pre/Post Run Reports & Batch Files

**User Story:** As an admin, I want to execute setup/teardown actions before and after a job runs.

#### Acceptance Criteria

1. "Pre Run Report" field specifies report IDs (Update Statement type) to run before the job
2. "Post Run Report" field specifies report IDs to run after the job completes
3. "Batch File" field specifies a script to execute after job completion, with the output filename passed as the first argument
4. Multiple report IDs can be specified (comma-separated)

---

## Glossary

| Term | Definition |
|------|-----------|
| Job | A scheduled report execution with defined output handling |
| Cron Expression | A Quartz-format schedule definition (second minute hour day month weekday year) |
| Burst | Splitting output into separate files based on the first column value |
| Dynamic Recipients | Email addresses derived from a database query at execution time |
| Archive | A retained copy of a past job output |
| SMTP Server | An email server configuration used for sending job output |
