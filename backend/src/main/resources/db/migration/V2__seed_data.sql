-- Seed data for development
-- Default credentials: admin/admin and user/user
-- Passwords are BCrypt encoded

-- admin/admin (BCrypt hash)
INSERT INTO users (username, password, full_name, email, access_level, active, created_by)
VALUES ('admin', '$2a$10$txDoVxSih6EjpJQ.w55vyOomMGhOkNMpLCKUMFyQPvbwxpkssg2lG', 'Administrator', 'admin@insighthub.local', 100, TRUE, 'system');

-- user/user (BCrypt hash)
INSERT INTO users (username, password, full_name, email, access_level, active, created_by)
VALUES ('user', '$2a$10$nidV1pjzAugDzsHYhYd.seCoyan2Zg5.nCMI2bVEo58hV8tmEWyjW', 'Normal User', 'user@insighthub.local', 0, TRUE, 'system');

-- Sample report groups
INSERT INTO report_groups (name, description) VALUES ('General', 'General reports');
INSERT INTO report_groups (name, description) VALUES ('Sales', 'Sales and revenue reports');
INSERT INTO report_groups (name, description) VALUES ('HR', 'Human resources reports');

-- Sample datasource (H2 embedded)
INSERT INTO datasources (name, description, database_type, driver, url, username, password, active, test_sql, created_by)
VALUES ('Demo H2', 'Built-in H2 demo database', 'H2', 'org.h2.Driver', 'jdbc:h2:mem:insighthub', 'sa', '', TRUE, 'SELECT 1', 'system');

-- Sample reports
INSERT INTO reports (name, short_description, report_type, report_group_id, datasource_id, active, report_source, created_by)
VALUES ('User List', 'List of all system users', 0, 1, 1, TRUE, 'SELECT username, full_name, email, active FROM users', 'system');

INSERT INTO reports (name, short_description, report_type, report_group_id, datasource_id, active, report_source, created_by)
VALUES ('Active Reports', 'All active reports in the system', 0, 1, 1, TRUE, 'SELECT name, short_description, active FROM reports WHERE active = TRUE', 'system');
