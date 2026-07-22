-- InsightHub Initial Schema
-- V1: Core tables for users, reports, datasources, report_groups

-- Users
CREATE TABLE users (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    username        VARCHAR(50)  NOT NULL UNIQUE,
    password        VARCHAR(200) NOT NULL,
    full_name       VARCHAR(100),
    email           VARCHAR(100),
    description     VARCHAR(500),
    access_level    INT          NOT NULL DEFAULT 0,
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    public_user     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by      VARCHAR(50),
    updated_by      VARCHAR(50)
);

-- Report Groups
CREATE TABLE report_groups (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     VARCHAR(200),
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Datasources
CREATE TABLE datasources (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(50)  NOT NULL UNIQUE,
    description     VARCHAR(200),
    datasource_type VARCHAR(20),
    database_type   VARCHAR(100),
    driver          VARCHAR(200),
    url             VARCHAR(2000),
    username        VARCHAR(100),
    password        VARCHAR(200),
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    test_sql        VARCHAR(60),
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by      VARCHAR(50),
    updated_by      VARCHAR(50)
);

-- Reports
CREATE TABLE reports (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    name                  VARCHAR(100) NOT NULL,
    short_description     VARCHAR(254),
    description           VARCHAR(2000),
    report_type           INT          NOT NULL DEFAULT 0,
    report_group_id       BIGINT,
    datasource_id         BIGINT,
    contact_person        VARCHAR(100),
    active                BOOLEAN      NOT NULL DEFAULT TRUE,
    hidden                BOOLEAN      NOT NULL DEFAULT FALSE,
    report_source         TEXT,
    default_report_format VARCHAR(50),
    created_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    created_by            VARCHAR(50),
    updated_by            VARCHAR(50),
    CONSTRAINT fk_report_group FOREIGN KEY (report_group_id) REFERENCES report_groups(id),
    CONSTRAINT fk_report_datasource FOREIGN KEY (datasource_id) REFERENCES datasources(id)
);

-- Indexes
CREATE INDEX idx_reports_active ON reports(active);
CREATE INDEX idx_reports_group ON reports(report_group_id);
CREATE INDEX idx_users_active ON users(active);
-- V3: Roles, Permissions, User Groups, and mapping tables

-- Permissions
CREATE TABLE permissions (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(200)
);

-- Roles
CREATE TABLE roles (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission mapping
CREATE TABLE role_permissions (
    role_id       BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- User Groups
CREATE TABLE user_groups (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Role mapping
CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- User-UserGroup mapping
CREATE TABLE user_group_members (
    user_id       BIGINT NOT NULL,
    user_group_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, user_group_id),
    CONSTRAINT fk_ugm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ugm_group FOREIGN KEY (user_group_id) REFERENCES user_groups(id) ON DELETE CASCADE
);

-- UserGroup-Role mapping
CREATE TABLE user_group_roles (
    user_group_id BIGINT NOT NULL,
    role_id       BIGINT NOT NULL,
    PRIMARY KEY (user_group_id, role_id),
    CONSTRAINT fk_ugr_group FOREIGN KEY (user_group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_ugr_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Seed permissions
INSERT INTO permissions (name, description) VALUES ('view_reports', 'View and run reports');
INSERT INTO permissions (name, description) VALUES ('view_analytics', 'Access OLAP/analytics');
INSERT INTO permissions (name, description) VALUES ('view_jobs', 'View scheduled jobs');
INSERT INTO permissions (name, description) VALUES ('view_logs', 'View application logs');
INSERT INTO permissions (name, description) VALUES ('schedule_jobs', 'Schedule report jobs');
INSERT INTO permissions (name, description) VALUES ('configure_jobs', 'Full job management');
INSERT INTO permissions (name, description) VALUES ('configure_reports', 'Create/edit/delete reports');
INSERT INTO permissions (name, description) VALUES ('configure_datasources', 'Manage datasources');
INSERT INTO permissions (name, description) VALUES ('configure_users', 'Manage users');
INSERT INTO permissions (name, description) VALUES ('configure_user_groups', 'Manage user groups');
INSERT INTO permissions (name, description) VALUES ('configure_report_groups', 'Manage report groups');
INSERT INTO permissions (name, description) VALUES ('configure_roles', 'Manage roles');
INSERT INTO permissions (name, description) VALUES ('configure_permissions', 'Manage permissions');
INSERT INTO permissions (name, description) VALUES ('configure_schedules', 'Manage schedules');
INSERT INTO permissions (name, description) VALUES ('configure_holidays', 'Manage holidays');
INSERT INTO permissions (name, description) VALUES ('configure_destinations', 'Manage destinations');
INSERT INTO permissions (name, description) VALUES ('configure_smtp_servers', 'Manage SMTP servers');
INSERT INTO permissions (name, description) VALUES ('configure_encryptors', 'Manage encryptors');
INSERT INTO permissions (name, description) VALUES ('configure_pipelines', 'Manage pipelines');
INSERT INTO permissions (name, description) VALUES ('configure_start_conditions', 'Manage start conditions');
INSERT INTO permissions (name, description) VALUES ('configure_art_database', 'Configure application database');
INSERT INTO permissions (name, description) VALUES ('configure_settings', 'Configure app settings');
INSERT INTO permissions (name, description) VALUES ('configure_access_rights', 'Manage access rights');
INSERT INTO permissions (name, description) VALUES ('configure_admin_rights', 'Manage admin rights');
INSERT INTO permissions (name, description) VALUES ('configure_caches', 'Manage caches');
INSERT INTO permissions (name, description) VALUES ('configure_connections', 'Monitor connections');
INSERT INTO permissions (name, description) VALUES ('configure_loggers', 'Configure log levels');
INSERT INTO permissions (name, description) VALUES ('configure_report_group_membership', 'Report group membership');
INSERT INTO permissions (name, description) VALUES ('configure_user_group_membership', 'User group membership');
INSERT INTO permissions (name, description) VALUES ('self_service_dashboards', 'Create personal dashboards');
INSERT INTO permissions (name, description) VALUES ('self_service_reports', 'Create ad-hoc reports');
INSERT INTO permissions (name, description) VALUES ('use_api', 'Access REST API');
INSERT INTO permissions (name, description) VALUES ('migrate_records', 'Import/export records');

-- Seed roles
INSERT INTO roles (name, description) VALUES ('Super Admin', 'Full system access');
INSERT INTO roles (name, description) VALUES ('Admin', 'Standard administration');
INSERT INTO roles (name, description) VALUES ('Report Creator', 'Can create and manage reports');
INSERT INTO roles (name, description) VALUES ('Scheduler', 'Can schedule jobs');
INSERT INTO roles (name, description) VALUES ('Viewer', 'Can view reports only');

-- Assign all permissions to Super Admin (role_id=1)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Assign viewer permissions to Viewer role (role_id=5)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions WHERE name IN ('view_reports', 'view_jobs');

-- V4: Report Parameters

CREATE TABLE parameters (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    report_id       BIGINT NOT NULL,
    name            VARCHAR(100) NOT NULL,
    label           VARCHAR(100),
    param_type      VARCHAR(30) NOT NULL DEFAULT 'TEXT',
    default_value   VARCHAR(500),
    placeholder     VARCHAR(200),
    required        BOOLEAN NOT NULL DEFAULT FALSE,
    position        INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_param_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE INDEX idx_params_report ON parameters(report_id);

-- V5: Schedules and Jobs

-- Schedules define when jobs run (cron expressions)
CREATE TABLE schedules (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(200),
    cron_expression VARCHAR(100) NOT NULL,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jobs link a report to a schedule with delivery config
CREATE TABLE jobs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     VARCHAR(500),
    report_id       BIGINT NOT NULL,
    schedule_id     BIGINT,
    job_type        VARCHAR(30) NOT NULL DEFAULT 'PUBLISH',
    output_format   VARCHAR(30) DEFAULT 'PDF',
    recipients      VARCHAR(1000),
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    last_run_at     TIMESTAMP,
    last_run_status VARCHAR(20),
    last_run_message VARCHAR(1000),
    next_run_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by      VARCHAR(50),
    updated_by      VARCHAR(50),
    CONSTRAINT fk_job_report FOREIGN KEY (report_id) REFERENCES reports(id),
    CONSTRAINT fk_job_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id)
);

CREATE INDEX idx_jobs_active ON jobs(active);
CREATE INDEX idx_jobs_report ON jobs(report_id);

-- V6: Dashboards

CREATE TABLE dashboards (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    layout_type VARCHAR(20) NOT NULL DEFAULT 'GRID',
    columns_count INT NOT NULL DEFAULT 2,
    auto_refresh_seconds INT DEFAULT 0,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by  VARCHAR(50),
    updated_by  VARCHAR(50)
);

CREATE TABLE dashboard_items (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    dashboard_id BIGINT NOT NULL,
    report_id    BIGINT NOT NULL,
    title        VARCHAR(100),
    position     INT NOT NULL DEFAULT 0,
    col_span     INT NOT NULL DEFAULT 1,
    row_span     INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_di_dashboard FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE,
    CONSTRAINT fk_di_report FOREIGN KEY (report_id) REFERENCES reports(id)
);

CREATE INDEX idx_di_dashboard ON dashboard_items(dashboard_id);

-- V7: Access Rights - who can see which reports/report groups

-- User access to specific reports
CREATE TABLE user_report_rights (
    user_id    BIGINT NOT NULL,
    report_id  BIGINT NOT NULL,
    PRIMARY KEY (user_id, report_id),
    CONSTRAINT fk_urr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_urr_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- User access to report groups (grants access to all reports in group)
CREATE TABLE user_report_group_rights (
    user_id         BIGINT NOT NULL,
    report_group_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, report_group_id),
    CONSTRAINT fk_urgr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_urgr_group FOREIGN KEY (report_group_id) REFERENCES report_groups(id) ON DELETE CASCADE
);

-- User group access to specific reports
CREATE TABLE user_group_report_rights (
    user_group_id BIGINT NOT NULL,
    report_id     BIGINT NOT NULL,
    PRIMARY KEY (user_group_id, report_id),
    CONSTRAINT fk_ugrr_group FOREIGN KEY (user_group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_ugrr_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- User group access to report groups
CREATE TABLE user_group_report_group_rights (
    user_group_id   BIGINT NOT NULL,
    report_group_id BIGINT NOT NULL,
    PRIMARY KEY (user_group_id, report_group_id),
    CONSTRAINT fk_ugrgr_group FOREIGN KEY (user_group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_ugrgr_rgroup FOREIGN KEY (report_group_id) REFERENCES report_groups(id) ON DELETE CASCADE
);
-- V8: Report Engine Enhancements
-- Adds LOV/cascading/multi-value columns to parameters,
-- drill-down link tables, and guardrails configuration table.

-- ============================================================
-- 1. Enhance parameters table with LOV, cascading, multi-value
-- ============================================================

ALTER TABLE parameters ADD COLUMN lov_type VARCHAR(10);
-- 'DYNAMIC' | 'STATIC' | NULL

ALTER TABLE parameters ADD COLUMN lov_query TEXT;
-- SQL query for dynamic LOV resolution

ALTER TABLE parameters ADD COLUMN lov_static_values TEXT;
-- JSON array: [{"value":"x","label":"Y"}]

ALTER TABLE parameters ADD COLUMN parent_param_id BIGINT;
-- Self-referencing FK for cascading parameters

ALTER TABLE parameters ADD COLUMN multi_value BOOLEAN DEFAULT FALSE;
-- Whether the parameter accepts multiple values

ALTER TABLE parameters ADD COLUMN date_range_pair VARCHAR(10);
-- 'FROM' | 'TO' | NULL — links two date params as a range pair

ALTER TABLE parameters ADD CONSTRAINT fk_param_parent
    FOREIGN KEY (parent_param_id) REFERENCES parameters(id);

-- ============================================================
-- 2. Drill-down links (parent report → child report navigation)
-- ============================================================

CREATE TABLE drill_down_links (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    parent_report_id BIGINT NOT NULL,
    child_report_id  BIGINT NOT NULL,
    trigger_column   VARCHAR(100) NOT NULL,
    position         INT DEFAULT 0,
    CONSTRAINT fk_ddl_parent FOREIGN KEY (parent_report_id) REFERENCES reports(id) ON DELETE CASCADE,
    CONSTRAINT fk_ddl_child FOREIGN KEY (child_report_id) REFERENCES reports(id)
);

CREATE INDEX idx_ddl_parent_report ON drill_down_links(parent_report_id);

-- ============================================================
-- 3. Drill-down parameter mappings (column → child param)
-- ============================================================

CREATE TABLE drill_down_param_mappings (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    drill_down_link_id BIGINT NOT NULL,
    parent_column_name VARCHAR(100) NOT NULL,
    child_param_name   VARCHAR(100) NOT NULL,
    CONSTRAINT fk_ddpm_link FOREIGN KEY (drill_down_link_id) REFERENCES drill_down_links(id) ON DELETE CASCADE
);

CREATE INDEX idx_ddpm_link ON drill_down_param_mappings(drill_down_link_id);

-- ============================================================
-- 4. Guardrails configuration (global + per-report overrides)
-- ============================================================

CREATE TABLE guardrails_config (
    id                        BIGINT AUTO_INCREMENT PRIMARY KEY,
    report_id                 BIGINT UNIQUE,
    -- NULL = global default, non-NULL = per-report override
    max_rows                  INT DEFAULT 10000,
    max_export_rows           INT DEFAULT 100000,
    max_date_range_days       INT DEFAULT 365,
    execution_timeout_seconds INT DEFAULT 60,
    max_concurrent_per_user   INT DEFAULT 3,
    max_result_size_bytes     BIGINT DEFAULT 52428800,
    -- 50 MB default
    CONSTRAINT fk_gc_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Seed global guardrails row (report_id = NULL)
INSERT INTO guardrails_config (report_id, max_rows, max_export_rows, max_date_range_days, execution_timeout_seconds, max_concurrent_per_user, max_result_size_bytes)
VALUES (NULL, 10000, 100000, 1095, 60, 3, 52428800);
-- V9: Parameter Enhancements
-- Adds hidden/allow-null/date-range columns to parameters,
-- prepared statement toggle to reports,
-- and fixed parameter values table.

-- ============================================================
-- 1. Add hidden and allow_null columns to parameters
-- ============================================================

ALTER TABLE parameters ADD COLUMN hidden BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE parameters ADD COLUMN allow_null BOOLEAN DEFAULT FALSE NOT NULL;

-- ============================================================
-- 2. Add date range configuration columns to parameters
-- ============================================================

ALTER TABLE parameters ADD COLUMN from_parameter_name VARCHAR(100);

ALTER TABLE parameters ADD COLUMN to_parameter_name VARCHAR(100);

-- ============================================================
-- 3. Add prepared statement toggle to reports
-- ============================================================

ALTER TABLE reports ADD COLUMN use_prepared_statements BOOLEAN DEFAULT TRUE NOT NULL;

-- ============================================================
-- 4. Fixed parameter values (per-user overrides)
-- ============================================================

CREATE TABLE fixed_parameter_values (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT NOT NULL,
    parameter_id     BIGINT NOT NULL,
    fixed_value      VARCHAR(500) NOT NULL,
    CONSTRAINT fk_fpv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_fpv_param FOREIGN KEY (parameter_id) REFERENCES parameters(id) ON DELETE CASCADE,
    CONSTRAINT uq_fpv_user_param UNIQUE (user_id, parameter_id)
);
-- V10: Job Scheduling Engine
-- Replaces the basic V5 jobs/schedules tables with the full scheduling engine schema.
-- Adds SMTP servers, enhanced jobs, job execution history, job archives, and Quartz tables.

-- ============================================================
-- Drop old V5 tables (basic job/schedule structure)
-- ============================================================
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS schedules;

-- ============================================================
-- SMTP Servers
-- ============================================================
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

-- ============================================================
-- Jobs (enhanced schema with full scheduling support)
-- ============================================================
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

CREATE INDEX idx_jobs_active ON jobs(active);
CREATE INDEX idx_jobs_report ON jobs(report_id);
CREATE INDEX idx_jobs_owner ON jobs(owner_user_id);

-- ============================================================
-- Job Execution History
-- ============================================================
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

CREATE INDEX idx_je_job ON job_executions(job_id);
CREATE INDEX idx_je_status ON job_executions(status);

-- ============================================================
-- Job Archives (retained outputs)
-- ============================================================
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

CREATE INDEX idx_ja_job ON job_archives(job_id);

-- ============================================================
-- Quartz Scheduler Tables (H2 variant)
-- Required for Quartz JDBC JobStore persistence
-- ============================================================

CREATE TABLE QRTZ_CALENDARS (
    SCHED_NAME VARCHAR(120) NOT NULL,
    CALENDAR_NAME VARCHAR(200) NOT NULL,
    CALENDAR BLOB NOT NULL
);

CREATE TABLE QRTZ_CRON_TRIGGERS (
    SCHED_NAME VARCHAR(120) NOT NULL,
    TRIGGER_NAME VARCHAR(200) NOT NULL,
    TRIGGER_GROUP VARCHAR(200) NOT NULL,
    CRON_EXPRESSION VARCHAR(120) NOT NULL,
    TIME_ZONE_ID VARCHAR(80)
);

CREATE TABLE QRTZ_FIRED_TRIGGERS (
    SCHED_NAME VARCHAR(120) NOT NULL,
    ENTRY_ID VARCHAR(95) NOT NULL,
    TRIGGER_NAME VARCHAR(200) NOT NULL,
    TRIGGER_GROUP VARCHAR(200) NOT NULL,
    INSTANCE_NAME VARCHAR(200) NOT NULL,
    FIRED_TIME BIGINT NOT NULL,
    SCHED_TIME BIGINT NOT NULL,
    PRIORITY INTEGER NOT NULL,
    STATE VARCHAR(16) NOT NULL,
    JOB_NAME VARCHAR(200) NULL,
    JOB_GROUP VARCHAR(200) NULL,
    IS_NONCONCURRENT BOOLEAN NULL,
    REQUESTS_RECOVERY BOOLEAN NULL
);

CREATE TABLE QRTZ_PAUSED_TRIGGER_GRPS (
    SCHED_NAME VARCHAR(120) NOT NULL,
    TRIGGER_GROUP VARCHAR(200) NOT NULL
);

CREATE TABLE QRTZ_SCHEDULER_STATE (
    SCHED_NAME VARCHAR(120) NOT NULL,
    INSTANCE_NAME VARCHAR(200) NOT NULL,
    LAST_CHECKIN_TIME BIGINT NOT NULL,
    CHECKIN_INTERVAL BIGINT NOT NULL
);

CREATE TABLE QRTZ_LOCKS (
    SCHED_NAME VARCHAR(120) NOT NULL,
    LOCK_NAME VARCHAR(40) NOT NULL
);

CREATE TABLE QRTZ_JOB_DETAILS (
    SCHED_NAME VARCHAR(120) NOT NULL,
    JOB_NAME VARCHAR(200) NOT NULL,
    JOB_GROUP VARCHAR(200) NOT NULL,
    DESCRIPTION VARCHAR(250) NULL,
    JOB_CLASS_NAME VARCHAR(250) NOT NULL,
    IS_DURABLE BOOLEAN NOT NULL,
    IS_NONCONCURRENT BOOLEAN NOT NULL,
    IS_UPDATE_DATA BOOLEAN NOT NULL,
    REQUESTS_RECOVERY BOOLEAN NOT NULL,
    JOB_DATA BLOB NULL
);

CREATE TABLE QRTZ_SIMPLE_TRIGGERS (
    SCHED_NAME VARCHAR(120) NOT NULL,
    TRIGGER_NAME VARCHAR(200) NOT NULL,
    TRIGGER_GROUP VARCHAR(200) NOT NULL,
    REPEAT_COUNT BIGINT NOT NULL,
    REPEAT_INTERVAL BIGINT NOT NULL,
    TIMES_TRIGGERED BIGINT NOT NULL
);

CREATE TABLE QRTZ_SIMPROP_TRIGGERS (
    SCHED_NAME VARCHAR(120) NOT NULL,
    TRIGGER_NAME VARCHAR(200) NOT NULL,
    TRIGGER_GROUP VARCHAR(200) NOT NULL,
    STR_PROP_1 VARCHAR(512) NULL,
    STR_PROP_2 VARCHAR(512) NULL,
    STR_PROP_3 VARCHAR(512) NULL,
    INT_PROP_1 INTEGER NULL,
    INT_PROP_2 INTEGER NULL,
    LONG_PROP_1 BIGINT NULL,
    LONG_PROP_2 BIGINT NULL,
    DEC_PROP_1 NUMERIC(13,4) NULL,
    DEC_PROP_2 NUMERIC(13,4) NULL,
    BOOL_PROP_1 BOOLEAN NULL,
    BOOL_PROP_2 BOOLEAN NULL
);

CREATE TABLE QRTZ_BLOB_TRIGGERS (
    SCHED_NAME VARCHAR(120) NOT NULL,
    TRIGGER_NAME VARCHAR(200) NOT NULL,
    TRIGGER_GROUP VARCHAR(200) NOT NULL,
    BLOB_DATA BLOB NULL
);

CREATE TABLE QRTZ_TRIGGERS (
    SCHED_NAME VARCHAR(120) NOT NULL,
    TRIGGER_NAME VARCHAR(200) NOT NULL,
    TRIGGER_GROUP VARCHAR(200) NOT NULL,
    JOB_NAME VARCHAR(200) NOT NULL,
    JOB_GROUP VARCHAR(200) NOT NULL,
    DESCRIPTION VARCHAR(250) NULL,
    NEXT_FIRE_TIME BIGINT NULL,
    PREV_FIRE_TIME BIGINT NULL,
    PRIORITY INTEGER NULL,
    TRIGGER_STATE VARCHAR(16) NOT NULL,
    TRIGGER_TYPE VARCHAR(8) NOT NULL,
    START_TIME BIGINT NOT NULL,
    END_TIME BIGINT NULL,
    CALENDAR_NAME VARCHAR(200) NULL,
    MISFIRE_INSTR SMALLINT NULL,
    JOB_DATA BLOB NULL
);

-- Quartz Primary Keys
ALTER TABLE QRTZ_CALENDARS ADD CONSTRAINT PK_QRTZ_CALENDARS PRIMARY KEY (SCHED_NAME, CALENDAR_NAME);
ALTER TABLE QRTZ_CRON_TRIGGERS ADD CONSTRAINT PK_QRTZ_CRON_TRIGGERS PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP);
ALTER TABLE QRTZ_FIRED_TRIGGERS ADD CONSTRAINT PK_QRTZ_FIRED_TRIGGERS PRIMARY KEY (SCHED_NAME, ENTRY_ID);
ALTER TABLE QRTZ_PAUSED_TRIGGER_GRPS ADD CONSTRAINT PK_QRTZ_PAUSED_TRIGGER_GRPS PRIMARY KEY (SCHED_NAME, TRIGGER_GROUP);
ALTER TABLE QRTZ_SCHEDULER_STATE ADD CONSTRAINT PK_QRTZ_SCHEDULER_STATE PRIMARY KEY (SCHED_NAME, INSTANCE_NAME);
ALTER TABLE QRTZ_LOCKS ADD CONSTRAINT PK_QRTZ_LOCKS PRIMARY KEY (SCHED_NAME, LOCK_NAME);
ALTER TABLE QRTZ_JOB_DETAILS ADD CONSTRAINT PK_QRTZ_JOB_DETAILS PRIMARY KEY (SCHED_NAME, JOB_NAME, JOB_GROUP);
ALTER TABLE QRTZ_SIMPLE_TRIGGERS ADD CONSTRAINT PK_QRTZ_SIMPLE_TRIGGERS PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP);
ALTER TABLE QRTZ_SIMPROP_TRIGGERS ADD CONSTRAINT PK_QRTZ_SIMPROP_TRIGGERS PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP);
ALTER TABLE QRTZ_TRIGGERS ADD CONSTRAINT PK_QRTZ_TRIGGERS PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP);
ALTER TABLE QRTZ_BLOB_TRIGGERS ADD CONSTRAINT PK_QRTZ_BLOB_TRIGGERS PRIMARY KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP);

-- Quartz Foreign Keys
ALTER TABLE QRTZ_CRON_TRIGGERS ADD CONSTRAINT FK_QRTZ_CRON_TRIGGERS_QRTZ_TRIGGERS
    FOREIGN KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
    REFERENCES QRTZ_TRIGGERS (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP) ON DELETE CASCADE;

ALTER TABLE QRTZ_SIMPLE_TRIGGERS ADD CONSTRAINT FK_QRTZ_SIMPLE_TRIGGERS_QRTZ_TRIGGERS
    FOREIGN KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
    REFERENCES QRTZ_TRIGGERS (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP) ON DELETE CASCADE;

ALTER TABLE QRTZ_SIMPROP_TRIGGERS ADD CONSTRAINT FK_QRTZ_SIMPROP_TRIGGERS_QRTZ_TRIGGERS
    FOREIGN KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
    REFERENCES QRTZ_TRIGGERS (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP) ON DELETE CASCADE;

ALTER TABLE QRTZ_BLOB_TRIGGERS ADD CONSTRAINT FK_QRTZ_BLOB_TRIGGERS_QRTZ_TRIGGERS
    FOREIGN KEY (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP)
    REFERENCES QRTZ_TRIGGERS (SCHED_NAME, TRIGGER_NAME, TRIGGER_GROUP) ON DELETE CASCADE;

ALTER TABLE QRTZ_TRIGGERS ADD CONSTRAINT FK_QRTZ_TRIGGERS_QRTZ_JOB_DETAILS
    FOREIGN KEY (SCHED_NAME, JOB_NAME, JOB_GROUP)
    REFERENCES QRTZ_JOB_DETAILS (SCHED_NAME, JOB_NAME, JOB_GROUP);
-- V11: Rules & Row-Level Security
-- Adds rule definitions, report-rule mappings, user/group rule values,
-- and the uses_rules flag on reports for automatic SQL filtering.

-- ============================================================
-- Rule Definitions
-- ============================================================
CREATE TABLE rules (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Report-Rule Associations
-- Maps a rule to a report with the column name the rule filters on
-- ============================================================
CREATE TABLE report_rules (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    report_id   BIGINT NOT NULL,
    rule_id     BIGINT NOT NULL,
    column_name VARCHAR(200) NOT NULL,
    CONSTRAINT fk_rr_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    CONSTRAINT fk_rr_rule FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE,
    CONSTRAINT uq_rr UNIQUE (report_id, rule_id)
);

CREATE INDEX idx_rr_report ON report_rules(report_id);
CREATE INDEX idx_rr_rule ON report_rules(rule_id);

-- ============================================================
-- Rule Values per User
-- ============================================================
CREATE TABLE user_rule_values (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    rule_id     BIGINT NOT NULL,
    rule_value  VARCHAR(500) NOT NULL,
    CONSTRAINT fk_urv_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_urv_rule FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE
);

CREATE INDEX idx_urv_user ON user_rule_values(user_id);
CREATE INDEX idx_urv_rule ON user_rule_values(rule_id);

-- ============================================================
-- Rule Values per User Group
-- ============================================================
CREATE TABLE user_group_rule_values (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_group_id   BIGINT NOT NULL,
    rule_id         BIGINT NOT NULL,
    rule_value      VARCHAR(500) NOT NULL,
    CONSTRAINT fk_ugrv_group FOREIGN KEY (user_group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_ugrv_rule FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE
);

CREATE INDEX idx_ugrv_group ON user_group_rule_values(user_group_id);
CREATE INDEX idx_ugrv_rule ON user_group_rule_values(rule_id);

-- ============================================================
-- Add uses_rules flag to reports table
-- ============================================================
ALTER TABLE reports ADD COLUMN uses_rules BOOLEAN DEFAULT FALSE NOT NULL;
-- V12: Divisions
-- Adds divisions table and division_id foreign key to report_groups and users.

-- ============================================================
-- Divisions Table
-- ============================================================
CREATE TABLE divisions (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(200),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Add division_id FK to report_groups
-- ============================================================
ALTER TABLE report_groups ADD COLUMN division_id BIGINT;
ALTER TABLE report_groups ADD CONSTRAINT fk_rg_division
    FOREIGN KEY (division_id) REFERENCES divisions(id);

-- ============================================================
-- Add division_id FK to users
-- ============================================================
ALTER TABLE users ADD COLUMN division_id BIGINT;
ALTER TABLE users ADD CONSTRAINT fk_user_division
    FOREIGN KEY (division_id) REFERENCES divisions(id);
