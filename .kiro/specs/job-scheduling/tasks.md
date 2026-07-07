# Implementation Plan: Job Scheduling Engine

## Overview

Implements automated report scheduling with Quartz, email delivery (attachment/inline), file publishing, alerts, burst, conditional execution, archives, SMTP management, and dynamic recipients.

## Tasks

- [x] 1. Database schema and dependencies
  - [x] 1.1 Add Quartz and Spring Mail dependencies to pom.xml
    - spring-boot-starter-quartz
    - spring-boot-starter-mail
    - _Requirements: 2_

  - [x] 1.2 Create Flyway migration for SMTP servers, jobs, job_executions, job_archives tables
    - See design.md for full DDL
    - Include Quartz tables DDL from database/quartz/ directory (use H2 variant for dev)
    - _Requirements: 1, 2, 10, 12_

  - [x] 1.3 Create JPA entities: SmtpServerEntity, JobEntity, JobExecutionEntity, JobArchiveEntity
    - Include all fields from schema with proper JPA annotations
    - JobEntity has @Enumerated JobType field
    - _Requirements: 1, 10, 12_

  - [x] 1.4 Create repositories for all new entities
    - SmtpServerRepository, JobRepository (with findByOwnerUserId, findByActive)
    - JobExecutionRepository (with findByJobIdOrderByStartTimeDesc)
    - JobArchiveRepository (with findByJobIdOrderByCreatedAtDesc)
    - _Requirements: 1, 12_

  - [x] 1.5 Create JobType enum
    - EMAIL_ATTACHMENT, EMAIL_INLINE, PUBLISH, ALERT, BURST, CONDITIONAL_EMAIL_ATTACHMENT, CONDITIONAL_EMAIL_INLINE, CONDITIONAL_PUBLISH, JUST_RUN_IT
    - _Requirements: 3, 4, 5, 6, 7, 8_

- [x] 2. SMTP Server management
  - [x] 2.1 Create SmtpServerService with CRUD operations
    - getAllActive(), getById(), create(), update(), delete()
    - _Requirements: 10_

  - [x] 2.2 Create SmtpServerController with REST endpoints
    - GET/POST/PUT/DELETE for /api/smtp-servers
    - Admin-only access (configure_settings permission)
    - _Requirements: 10_

  - [x] 2.3 Create EmailSender utility class
    - Build JavaMailSender from SmtpServerEntity configuration
    - sendEmail(SmtpServerEntity smtp, String to, String cc, String bcc, String subject, String body, String from, String replyTo, List<Attachment> attachments)
    - Support HTML body for inline reports
    - _Requirements: 3, 4, 10_

- [x] 3. Job CRUD layer
  - [x] 3.1 Create JobDto and CreateJobRequest DTOs
    - Full field coverage matching JobEntity
    - parameterValues as Map<String, Object>
    - _Requirements: 1_

  - [x] 3.2 Create JobService with CRUD operations
    - getAllJobsForUser(), getById(), createJob(), updateJob(), deleteJob()
    - Validate: report exists, owner is current user (or admin), SMTP server exists if specified
    - _Requirements: 1_

  - [x] 3.3 Create JobController with REST endpoints
    - Standard CRUD + runNow + cancel + history + archives
    - Permission check: schedule_jobs or configure_jobs
    - _Requirements: 1, 12_

- [x] 4. Quartz Scheduler integration
  - [x] 4.1 Create QuartzConfig — configure Quartz with JDBC job store
    - Use Spring Boot auto-configuration for Quartz
    - Configure to use the application datasource for Quartz tables
    - Set thread pool size from properties
    - _Requirements: 2_

  - [x] 4.2 Create JobSchedulerService — schedule/unschedule/reschedule
    - scheduleJob(JobEntity) — build cron trigger from job fields, register with Quartz
    - unscheduleJob(Long jobId) — remove trigger and job from Quartz
    - rescheduleJob(JobEntity) — update existing trigger
    - buildCronExpression(JobEntity) — construct cron from individual fields
    - Handle extra schedules (additional triggers)
    - _Requirements: 2_

  - [x] 4.3 Integrate scheduling into JobService
    - On create: if active && !manual, schedule via JobSchedulerService
    - On update: reschedule if schedule changed
    - On delete: unschedule
    - On activate/deactivate: schedule/unschedule
    - _Requirements: 2_

  - [x] 4.4 Create ReportJobRunner implements org.quartz.Job
    - execute(JobExecutionContext) — main entry point called by Quartz
    - Load job from DB, validate, create execution record, delegate to handler
    - Handle errors: update execution status, send error notification
    - _Requirements: 2, 12_

- [x] 5. Job output handlers
  - [x] 5.1 Create JobOutputHandler interface
    - handle(JobEntity job, JobExecutionEntity execution, ReportResult result)
    - Return JobHandlerResult (success/failure, output file path)
    - _Requirements: 3, 4, 5, 6, 7, 8_

  - [x] 5.2 Implement EmailAttachmentHandler
    - Execute report → generate file (CSV/XLSX/PDF) → attach to email → send
    - Use EmailSender with job's SMTP server (or global default)
    - _Requirements: 3_

  - [x] 5.3 Implement EmailInlineHandler
    - Execute report → render as HTML table → set as email body → send
    - _Requirements: 4_

  - [x] 5.4 Implement PublishHandler
    - Execute report → save file to export directory → create archive record
    - Send notification email if To field is configured
    - Prune old archives based on runsToArchive setting
    - _Requirements: 5, 9_

  - [x] 5.5 Implement AlertHandler
    - Execute report SQL → check first column of first row > 0
    - If true: send alert email; if false: no action
    - _Requirements: 6_

  - [x] 5.6 Implement BurstHandler
    - Execute report SQL ordered by first column
    - On column value change: close current file, start new file with burst-id in name
    - Store all generated files in export directory
    - _Requirements: 8_

  - [x] 5.7 Implement ConditionalEmailHandler and ConditionalPublishHandler
    - Check if result has rows before proceeding
    - If empty: skip output, mark execution as "skipped" (no error)
    - If has rows: delegate to EmailAttachmentHandler or PublishHandler respectively
    - _Requirements: 7_

- [x] 6. Advanced job features
  - [x] 6.1 Implement Pre/Post Run Reports
    - Before execution: run each report ID in pre_run_report_ids (Update Statement type)
    - After execution: run each report ID in post_run_report_ids
    - _Requirements: 13_

  - [x] 6.2 Implement Dynamic Recipients
    - Execute the dynamic_recipients_report SQL
    - Extract email addresses from first column
    - Support personalization: replace #column_name# in subject/body with recipient row values
    - Support filtering: if recipient_column and recipient_id columns exist, inject WHERE clause
    - _Requirements: 11_

  - [x] 6.3 Implement Job Archives management
    - On publish: save file reference to job_archives table
    - Prune: after saving new archive, delete oldest entries beyond runsToArchive limit
    - Download endpoint: stream file from export directory
    - _Requirements: 9_

  - [x] 6.4 Implement Shared Jobs
    - If allowSharing=true: users with access rights to the job can view its output
    - If allowSplitting=true: apply rule values per shared user (requires Rules feature — stub for now)
    - _Requirements: 9_

  - [x] 6.5 Implement Run Now (manual trigger)
    - POST /api/jobs/{id}/run — immediately trigger job execution outside Quartz schedule
    - Create execution record, run in async thread
    - _Requirements: 2_

  - [x] 6.6 Implement Cancel Running Job
    - POST /api/jobs/{id}/cancel — interrupt the running thread
    - Update execution status to CANCELLED
    - _Requirements: 12_

  - [x] 6.7 Implement Error Notification
    - On job failure: if error_notification_email is set, send failure email with error details
    - _Requirements: 12_

- [x] 7. Frontend — SMTP Servers page
  - [x] 7.1 Create SmtpServersPage with CRUD table
    - List servers, Add/Edit/Delete with modal form
    - Fields: name, server, port, startTLS, auth, username, password, from
    - _Requirements: 10_

- [x] 8. Frontend — Jobs pages
  - [x] 8.1 Create JobsPage — list all jobs with status, last run, actions
    - Table with: name, report, type, schedule, active, last status, actions (edit, run, history, delete)
    - _Requirements: 1_

  - [x] 8.2 Create JobFormPage — create/edit job
    - Tabbed form: General, Schedule, Email, Output, Advanced
    - General: name, description, report selector, job type, output format, active
    - Schedule: cron fields, time zone, start/end date, manual toggle
    - Email: to, cc, bcc, from, reply-to, subject, message, SMTP server, dynamic recipients
    - Output: runs to archive, allow sharing, fixed file name, sub-directory
    - Advanced: pre/post run reports, batch file, error notification email
    - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 13_

  - [x] 8.3 Create JobHistoryPage — execution history table
    - Show: start time, end time, duration, status, rows generated, error message
    - Link to download output file if available
    - _Requirements: 12_

  - [x] 8.4 Create RunningJobsPage — currently executing jobs
    - Table with: job name, started at, duration, cancel button
    - Auto-refresh every 10 seconds
    - _Requirements: 12_

  - [x] 8.5 Add routes for all new pages
    - /smtp-servers, /jobs/new, /jobs/:id/edit, /jobs/:id/history, /jobs/running
    - _Requirements: 1_

- [x] 9. Integration checkpoint
  - Verify: create job → schedule fires → report executes → email sent / file published
  - Verify: job history shows execution records
  - Verify: archives retained and downloadable

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 3, "tasks": ["3.1", "3.2"] },
    { "id": 4, "tasks": ["3.3", "4.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "4.4"] },
    { "id": 6, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 7, "tasks": ["5.4", "5.5", "5.6", "5.7"] },
    { "id": 8, "tasks": ["6.1", "6.2", "6.3", "6.4", "6.5"] },
    { "id": 9, "tasks": ["6.6", "6.7", "7.1"] },
    { "id": 10, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 11, "tasks": ["8.4", "8.5"] },
    { "id": 12, "tasks": ["9"] }
  ]
}
```

## Notes

- Quartz requires its own tables. The DDL scripts already exist in `database/quartz/` — use the appropriate one for your DB.
- The `parameter_values` field on JobEntity stores the parameter defaults as JSON (Map<String, Object>).
- Dynamic Recipients with filtering (`#recipient#`) requires the report to use that placeholder in its SQL.
- Burst jobs require the report query to be ORDER BY the first column.
- The export directory defaults to a configurable path (application.properties: `insighthub.export.directory`).
- Shared Jobs + Splitting depends on the Rules feature (Phase 3). Implement the sharing UI but stub the splitting logic.
