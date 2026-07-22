# Technical Design — Job Scheduling Engine

## Overview

The Job Scheduling Engine adds automated report execution to InsightHub using Quartz Scheduler. Jobs can email results (attachment/inline), publish files, trigger alerts, burst into per-group files, or conditionally execute based on query results.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│  JobsPage │ JobFormPage │ JobHistoryPage │ RunningJobsPage       │
│  SmtpServersPage                                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTP/JSON (JWT Auth)
┌─────────────────────────────┴───────────────────────────────────┐
│                      BACKEND (Spring Boot 3)                     │
│                                                                  │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────────┐  │
│  │ Job CRUD     │  │ Quartz         │  │ Job Execution      │  │
│  │ Layer        │  │ Scheduler      │  │ Engine             │  │
│  │ (Controller, │  │ (Triggers,     │  │ (ReportJobRunner)  │  │
│  │  Service)    │  │  CronJobs)     │  │                    │  │
│  └──────┬───────┘  └───────┬────────┘  └────────┬───────────┘  │
│         │                   │                     │              │
│  ┌──────┴───────────────────┴─────────────────────┴───────────┐ │
│  │                    Output Handlers                           │ │
│  │  EmailHandler │ PublishHandler │ AlertHandler │ BurstHandler │ │
│  └─────────────────────────────┬───────────────────────────────┘ │
│                                │                                  │
│  ┌─────────────────────────────┴───────────────────────────────┐ │
│  │         Existing Report Execution Service                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```sql
-- SMTP Servers
CREATE TABLE smtp_servers (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     VARCHAR(500),
    active          BOOLEAN DEFAULT TRUE NOT NULL,
    server          VARCHAR(200) NOT NULL,
    port            INT DEFAULT 587,
    use_starttls    BOOLEAN DEFAULT FALSE,
    use_auth        BOOLEAN DEFAULT FALSE,
    username        VARCHAR(200),
    password        VARCHAR(500),
    from_address    VARCHAR(200),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jobs
CREATE TABLE jobs (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    name                    VARCHAR(200) NOT NULL,
    description             VARCHAR(2000),
    report_id               BIGINT NOT NULL,
    job_type                VARCHAR(50) NOT NULL,
    output_format           VARCHAR(20) DEFAULT 'CSV',
    active                  BOOLEAN DEFAULT TRUE NOT NULL,
    owner_user_id           BIGINT NOT NULL,
    
    -- Schedule fields
    cron_second             VARCHAR(20) DEFAULT '0',
    cron_minute             VARCHAR(20),
    cron_hour               VARCHAR(20),
    cron_day                VARCHAR(20) DEFAULT '?',
    cron_month              VARCHAR(20) DEFAULT '*',
    cron_weekday            VARCHAR(20) DEFAULT '*',
    cron_year               VARCHAR(20) DEFAULT '*',
    time_zone               VARCHAR(50),
    start_date              TIMESTAMP,
    end_date                TIMESTAMP,
    extra_schedules         TEXT,
    manual                  BOOLEAN DEFAULT FALSE,
    
    -- Email fields
    email_to                VARCHAR(2000),
    email_cc                VARCHAR(2000),
    email_bcc               VARCHAR(2000),
    email_reply_to          VARCHAR(500),
    email_from              VARCHAR(200),
    email_subject           VARCHAR(500),
    email_message           TEXT,
    smtp_server_id          BIGINT,
    dynamic_recipients_report_id BIGINT,
    
    -- Publish/Archive fields
    runs_to_archive         INT DEFAULT 0,
    allow_sharing           BOOLEAN DEFAULT FALSE,
    allow_splitting         BOOLEAN DEFAULT FALSE,
    fixed_file_name         VARCHAR(200),
    sub_directory           VARCHAR(200),
    
    -- Pre/Post actions
    pre_run_report_ids      VARCHAR(500),
    post_run_report_ids     VARCHAR(500),
    batch_file              VARCHAR(200),
    
    -- Error handling
    error_notification_email VARCHAR(500),
    
    -- Parameters (JSON)
    parameter_values        TEXT,
    
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_job_report FOREIGN KEY (report_id) REFERENCES reports(id),
    CONSTRAINT fk_job_owner FOREIGN KEY (owner_user_id) REFERENCES users(id),
    CONSTRAINT fk_job_smtp FOREIGN KEY (smtp_server_id) REFERENCES smtp_servers(id)
);

-- Job execution history
CREATE TABLE job_executions (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id          BIGINT NOT NULL,
    start_time      TIMESTAMP NOT NULL,
    end_time        TIMESTAMP,
    status          VARCHAR(20) NOT NULL,
    error_message   TEXT,
    output_file     VARCHAR(500),
    rows_generated  BIGINT DEFAULT 0,
    CONSTRAINT fk_je_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Job archives (retained outputs)
CREATE TABLE job_archives (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id          BIGINT NOT NULL,
    execution_id    BIGINT NOT NULL,
    file_path       VARCHAR(500) NOT NULL,
    file_name       VARCHAR(200) NOT NULL,
    file_size       BIGINT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ja_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_ja_exec FOREIGN KEY (execution_id) REFERENCES job_executions(id) ON DELETE CASCADE
);
```

---

## Backend Package Structure

```
com.insighthub/
├── job/
│   ├── JobEntity.java
│   ├── JobRepository.java
│   ├── JobService.java
│   ├── JobController.java
│   ├── JobDto.java
│   ├── CreateJobRequest.java
│   ├── JobType.java                    (enum: EMAIL_ATTACHMENT, EMAIL_INLINE, PUBLISH, ALERT, BURST, CONDITIONAL_EMAIL_ATTACHMENT, CONDITIONAL_EMAIL_INLINE, CONDITIONAL_PUBLISH)
│   ├── JobExecutionEntity.java
│   ├── JobExecutionRepository.java
│   ├── JobArchiveEntity.java
│   ├── JobArchiveRepository.java
│   └── scheduler/
│       ├── QuartzConfig.java           (Quartz scheduler bean config)
│       ├── JobSchedulerService.java    (schedule/unschedule/reschedule)
│       ├── ReportJobRunner.java        (Quartz Job implementation)
│       └── JobOutputHandler.java       (interface for output handling)
├── job/handlers/
│   ├── EmailAttachmentHandler.java
│   ├── EmailInlineHandler.java
│   ├── PublishHandler.java
│   ├── AlertHandler.java
│   ├── BurstHandler.java
│   ├── ConditionalEmailHandler.java
│   └── ConditionalPublishHandler.java
├── smtp/
│   ├── SmtpServerEntity.java
│   ├── SmtpServerRepository.java
│   ├── SmtpServerService.java
│   ├── SmtpServerController.java
│   ├── SmtpServerDto.java
│   └── EmailSender.java               (JavaMail integration)
```

---

## Job Execution Flow

```
1. Quartz triggers ReportJobRunner.execute(JobExecutionContext)
2. Load JobEntity from DB
3. Check: job.active? report.active?
4. Create JobExecutionEntity (status=RUNNING)
5. Resolve parameters: job.parameterValues + expression defaults
6. Execute report via ReportExecutionService (or direct SQL for Alert)
7. Delegate to appropriate JobOutputHandler based on job.jobType
8. Handler produces output (file, email, etc.)
9. Update JobExecutionEntity (status=SUCCESS or FAILED)
10. If archive configured: create JobArchiveEntity, prune old archives
11. If error: send error notification email
```

---

## Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| JobsPage | `/jobs` | List all jobs for current user with status, last run, actions |
| JobFormPage | `/jobs/new`, `/jobs/:id/edit` | Create/edit job with all fields |
| JobHistoryPage | `/jobs/:id/history` | Execution history for a specific job |
| RunningJobsPage | `/jobs/running` | Currently executing jobs with cancel action |
| SmtpServersPage | `/smtp-servers` | CRUD for SMTP server configurations |
| JobArchivesPage | `/jobs/:id/archives` | View archived outputs |

---

## Dependencies (New)

### Backend (pom.xml)
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-quartz</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>
```

### Quartz Tables
Quartz requires its own database tables for job persistence. Use the provided DDL script for the target database (H2/MySQL/PostgreSQL) from the `database/quartz/` directory already present in the project.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/jobs` | List jobs for current user |
| GET | `/api/jobs/{id}` | Get job details |
| POST | `/api/jobs` | Create job |
| PUT | `/api/jobs/{id}` | Update job |
| DELETE | `/api/jobs/{id}` | Delete job |
| POST | `/api/jobs/{id}/run` | Run job immediately |
| POST | `/api/jobs/{id}/cancel` | Cancel running job |
| GET | `/api/jobs/{id}/history` | Get execution history |
| GET | `/api/jobs/{id}/archives` | Get archived outputs |
| GET | `/api/jobs/{id}/archives/{archiveId}/download` | Download archive file |
| GET | `/api/jobs/running` | List running jobs |
| GET | `/api/smtp-servers` | List SMTP servers |
| POST | `/api/smtp-servers` | Create SMTP server |
| PUT | `/api/smtp-servers/{id}` | Update SMTP server |
| DELETE | `/api/smtp-servers/{id}` | Delete SMTP server |
