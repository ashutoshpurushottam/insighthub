# Requirements Document

## Introduction

This feature provides a turnkey demo environment for InsightHub using the publicly available "Olist Brazilian E-commerce Public Dataset." The demo environment uses MySQL as the database backend (both for InsightHub metadata and the Olist dataset), runs via Docker Compose for easy one-command setup, and pre-configures multiple divisions, report groups, user groups, users, datasources, and sample reports to showcase the full capabilities of the reporting platform with realistic e-commerce data.

## Glossary

- **Demo_System**: The Docker Compose-based demo environment consisting of a MySQL container, the InsightHub backend container, and the InsightHub frontend container
- **Olist_Database**: A MySQL database containing the Olist Brazilian E-commerce Public Dataset tables (orders, customers, products, sellers, reviews, order_items, order_payments, geolocation, product_category_name_translation)
- **InsightHub_Database**: The MySQL database used by InsightHub for its internal metadata (users, reports, datasources, report_groups, etc.)
- **Demo_Datasource**: A datasource configuration in InsightHub pointing to the Olist_Database for running e-commerce reports
- **Division**: An organizational unit within InsightHub used to segment users and reports by business area (note: this concept must be introduced for the demo)
- **Report_Group**: A named category used to organize reports by functional area (e.g., Sales Analytics, Customer Intelligence)
- **User_Group**: A named collection of users sharing common access rights
- **Demo_Profile**: A Spring Boot profile (`demo`) that configures the application to run against the MySQL-based demo environment
- **Data_Loader**: A SQL initialization script that imports the Olist CSV dataset into the MySQL Olist_Database tables
- **Demo_Compose_File**: The Docker Compose configuration file (`docker/docker-compose.demo.yml`) that orchestrates the demo environment

## Requirements

### Requirement 1: MySQL Database Containers

**User Story:** As a demo user, I want the demo environment to use MySQL as the database engine, so that I can experience InsightHub running on a production-grade RDBMS.

#### Acceptance Criteria

1. WHEN the Demo_System starts, THE Demo_Compose_File SHALL provision a MySQL 8.0 container for the InsightHub_Database with a configured database name, root password, and application user credentials provided via environment variables
2. WHEN the Demo_System starts, THE Demo_Compose_File SHALL provision a separate MySQL 8.0 container for the Olist_Database with a configured database name, root password, and application user credentials provided via environment variables
3. THE InsightHub_Database container SHALL use a named Docker volume for data persistence across restarts
4. THE Olist_Database container SHALL use a named Docker volume for data persistence across restarts
5. WHEN the MySQL containers start, THE Demo_System SHALL use a health check command (mysqladmin ping) with an interval of no more than 10 seconds, a timeout of no more than 5 seconds, and a retry count of at least 3 to determine readiness before starting the backend service
6. THE Demo_Compose_File SHALL expose the InsightHub_Database on host port 3307 and the Olist_Database on host port 3308 for external tool access
7. IF a MySQL container fails its health check after the maximum number of retries, THEN THE Demo_System SHALL prevent dependent services from starting

### Requirement 2: Olist Dataset Loading

**User Story:** As a demo user, I want the Olist Brazilian E-commerce dataset pre-loaded in the database, so that I have realistic data for running reports immediately after setup.

#### Acceptance Criteria

1. WHEN the Olist_Database container starts for the first time, THE Data_Loader SHALL create tables matching the Olist dataset schema (olist_orders, olist_order_items, olist_order_payments, olist_order_reviews, olist_customers, olist_products, olist_sellers, olist_geolocation, product_category_name_translation)
2. WHEN the Olist_Database tables are created, THE Data_Loader SHALL load the Olist CSV data files bundled within the container image into the corresponding tables
3. THE Data_Loader SHALL create indexes on foreign key columns and the following frequently queried columns: order_id, customer_id, product_id, seller_id, order_status, and order_purchase_timestamp
4. WHEN data loading completes, THE Olist_Database SHALL contain at least 99,000 orders, 96,000 customers, 32,000 products, and 3,000 sellers
5. IF the Olist_Database volume already contains data as determined by the existence of the olist_orders table, THEN THE Data_Loader SHALL skip the initialization to avoid duplicate loading
6. IF the Data_Loader encounters an error while loading a CSV file, THEN THE Data_Loader SHALL terminate the initialization process and output an error message indicating the failed table name
7. WHEN data loading completes successfully, THE Data_Loader SHALL complete the full initialization within 300 seconds of the Olist_Database container reaching a healthy state

### Requirement 3: Spring Boot MySQL Demo Profile

**User Story:** As a developer, I want a dedicated Spring Boot profile for the MySQL demo setup, so that the application connects to the correct MySQL databases when running in demo mode.

#### Acceptance Criteria

1. THE Demo_Profile SHALL configure the InsightHub_Database connection to use the MySQL JDBC driver (`com.mysql.cj.jdbc.Driver`) with URL `jdbc:mysql://insighthub-demo-mysql:3306/insighthub`, username `insighthub`, and password sourced from the environment variable `MYSQL_PASSWORD` with a default value of `insighthub`
2. THE Demo_Profile SHALL set the Hibernate dialect to `org.hibernate.dialect.MySQLDialect` and set `spring.jpa.hibernate.ddl-auto` to `validate`
3. THE Demo_Profile SHALL disable the H2 console by setting `spring.h2.console.enabled` to `false`
4. WHEN the backend starts with the `demo` profile active, THE Demo_System SHALL apply all Flyway migrations with `baseline-on-migrate` enabled to the InsightHub_Database
5. THE Demo_Profile SHALL configure Flyway migration locations to include both `classpath:db/migration` for standard schema migrations and `classpath:db/demo` for demo-specific seed data

### Requirement 4: Demo Divisions

**User Story:** As a demo user, I want to see multiple organizational divisions in the system, so that I can understand how InsightHub supports multi-division enterprises.

#### Acceptance Criteria

1. WHEN the Demo_System completes initialization, THE InsightHub_Database SHALL contain at least 4 divisions: "Executive", "Sales & Marketing", "Operations & Logistics", and "Customer Success"
2. THE Demo_System SHALL assign each demo user to exactly one division, and each division SHALL have at least 1 demo user assigned
3. THE Demo_System SHALL associate each report group with exactly one division such that every division has at least 1 report group assigned
4. IF a division has no demo users assigned or no report groups associated after initialization, THEN THE Demo_System SHALL treat initialization as failed and log an error message indicating the misconfigured division

### Requirement 5: Demo Report Groups

**User Story:** As a demo user, I want to see multiple report groups organized by business function, so that I can understand how reports are categorized in InsightHub.

#### Acceptance Criteria

1. WHEN the Demo_System completes initialization, THE InsightHub_Database SHALL contain at least 8 report groups: "Executive Dashboard", "Sales Analytics", "Revenue & Payments", "Customer Intelligence", "Product Performance", "Seller Analytics", "Logistics & Delivery", and "Review Sentiment"
2. THE Demo_System SHALL assign each report group to a division using the following mapping: "Executive Dashboard" to "Executive"; "Sales Analytics" and "Revenue & Payments" to "Sales & Marketing"; "Product Performance" and "Seller Analytics" to "Operations & Logistics"; "Customer Intelligence", "Logistics & Delivery", and "Review Sentiment" to "Customer Success"
3. EACH report group SHALL contain at least 2 pre-configured reports that reference the "Olist E-commerce" datasource and contain SQL queries that execute without error against the Olist_Database and return at least one row of results
4. EACH report group SHALL have a description of no more than 200 characters summarizing the business function it covers

### Requirement 6: Demo User Groups

**User Story:** As a demo user, I want to see multiple user groups with different access levels, so that I can understand how InsightHub implements role-based access control.

#### Acceptance Criteria

1. WHEN the Demo_System completes initialization, THE InsightHub_Database SHALL contain at least 5 user groups: "Executive Team", "Sales Managers", "Operations Team", "Customer Support", and "Data Analysts"
2. WHEN the Demo_System completes initialization, THE Demo_System SHALL assign roles to each user group granting the following permissions: "Executive Team" receives view_reports, view_analytics, view_jobs, and view_logs; "Sales Managers" receives view_reports and schedule_jobs; "Operations Team" receives view_reports, view_jobs, and configure_jobs; "Customer Support" receives view_reports; "Data Analysts" receives view_reports and self_service_reports
3. WHEN the Demo_System completes initialization, THE Demo_System SHALL assign user-group-to-report-group access rights so that each user group has visibility to at least 1 report group
4. WHEN the Demo_System completes initialization, THE Demo_System SHALL assign at least 2 user groups to different, non-overlapping sets of report groups so that the demo user can observe differentiated access

### Requirement 7: Demo Users

**User Story:** As a demo user, I want multiple pre-configured user accounts with different roles, so that I can log in as different personas and experience the access control features.

#### Acceptance Criteria

1. WHEN the Demo_System completes initialization, THE InsightHub_Database SHALL contain at least 6 demo users: "admin" (Super Admin), "ceo" (Executive), "sales_mgr" (Sales Manager), "ops_lead" (Operations Lead), "support_agent" (Customer Support), and "analyst" (Data Analyst)
2. EACH demo user SHALL have its password stored as a BCrypt-encoded hash of the username, and SHALL have the active flag set to true, enabling immediate login using the username as both the username and password
3. THE Demo_System SHALL assign each demo user to a user group as follows: "admin" to no additional group (Super Admin bypasses access checks), "ceo" to "Executive Team", "sales_mgr" to "Sales Managers", "ops_lead" to "Operations Team", "support_agent" to "Customer Support", and "analyst" to "Data Analysts"
4. THE Demo_System SHALL assign each demo user an access_level corresponding to their role (admin=100, ceo=80, sales_mgr=40, ops_lead=10, support_agent=5, analyst=0)
5. EACH demo user SHALL have a full_name and email field populated (e.g., full_name "CEO User" and email "ceo@insighthub.local") so that user profile displays are complete

### Requirement 8: Demo Datasource Configuration

**User Story:** As a demo user, I want a pre-configured datasource pointing to the Olist database, so that reports can execute SQL queries against the e-commerce data.

#### Acceptance Criteria

1. WHEN the Demo_System completes initialization, THE InsightHub_Database SHALL contain a datasource named "Olist E-commerce" configured with database_type "MySQL", driver "com.mysql.cj.jdbc.Driver", URL pointing to the Olist_Database container on port 3306, and valid credentials (username and password) matching the Olist_Database MySQL user
2. WHEN the Demo_System completes initialization, THE Demo_Datasource SHALL be marked as active with test_sql set to "SELECT 1"
3. WHEN the backend starts, THE Demo_System SHALL verify connectivity to the Olist_Database datasource by executing the test_sql query, retrying up to 3 attempts at 5-second intervals within 30 seconds
4. IF the Demo_System fails to verify connectivity to the Olist_Database after 3 attempts, THEN THE Demo_System SHALL log an error message indicating the datasource is unreachable and fail startup

### Requirement 9: Demo Reports with SQL Queries

**User Story:** As a demo user, I want pre-built reports with meaningful SQL queries against the Olist data, so that I can immediately see InsightHub's reporting capabilities in action.

#### Acceptance Criteria

1. WHEN the Demo_System completes initialization, THE InsightHub_Database SHALL contain at least 16 reports distributed across the 8 report groups (minimum 2 per group)
2. EACH demo report SHALL reference the "Olist E-commerce" datasource
3. EACH demo report SHALL contain a valid SQL query that executes without error against the Olist_Database and returns at least one row of results
4. THE Demo_System SHALL include at least 8 tabular reports (report_type=0) and at least 4 reports with report_type=1 suitable for chart visualization
5. EACH demo report SHALL have a name of no more than 100 characters and a short_description of no more than 254 characters explaining the business insight it provides

### Requirement 10: Docker Compose Demo Orchestration

**User Story:** As a developer or evaluator, I want a single command to start the complete demo environment, so that I can experience InsightHub with realistic data without manual setup.

#### Acceptance Criteria

1. THE Demo_Compose_File SHALL orchestrate all services (2 MySQL containers, backend, frontend) with dependency ordering such that each service starts only after its declared dependencies report healthy via their configured health checks
2. WHEN a user runs `docker compose -f docker/docker-compose.demo.yml up`, THE Demo_System SHALL reach a state where all containers report healthy and both HTTP endpoints return responses within 5 minutes of command execution
3. WHEN all Demo_System containers report healthy, THE Demo_System SHALL respond with HTTP 200 status at http://localhost:3000 (frontend) and HTTP 200 status at http://localhost:8080/insighthub (backend API)
4. WHEN a user runs `docker compose -f docker/docker-compose.demo.yml down -v`, THE Demo_System SHALL remove all project containers, named volumes, and default networks so that no resources from the demo compose project remain
5. THE Demo_Compose_File SHALL include a `DEMO_DATA_VERSION` environment variable on the database initialization service such that changing its value causes the database volume to be recreated and demo data to be reloaded on the next `up` command
6. IF any service fails to reach healthy state within 5 minutes of running `docker compose -f docker/docker-compose.demo.yml up`, THEN THE Demo_System SHALL exit with a non-zero status code and display container logs indicating which service failed its health check
7. IF the demo data loading process fails during startup, THEN THE Demo_System SHALL mark the database initialization container as unhealthy and prevent dependent services from starting

### Requirement 11: Makefile Integration

**User Story:** As a developer, I want Makefile targets for the demo environment, so that I can start, stop, and reset the demo with simple commands.

#### Acceptance Criteria

1. THE Makefile SHALL include a `demo-up` target that runs `docker compose -f docker/docker-compose.demo.yml up -d` to start the demo environment in detached mode
2. THE Makefile SHALL include a `demo-down` target that runs `docker compose -f docker/docker-compose.demo.yml down` to stop and remove demo containers
3. THE Makefile SHALL include a `demo-reset` target that runs `docker compose -f docker/docker-compose.demo.yml down -v` followed by `docker compose -f docker/docker-compose.demo.yml up -d` to remove volumes and restart from scratch
4. THE Makefile SHALL include a `demo-logs` target that runs `docker compose -f docker/docker-compose.demo.yml logs -f` to stream logs from all demo containers
5. EACH demo Makefile target SHALL be declared in the `.PHONY` list to ensure they always execute regardless of file system state

### Requirement 12: Demo Dashboards

**User Story:** As a demo user, I want pre-configured dashboards combining multiple reports, so that I can see InsightHub's dashboard functionality with real data.

#### Acceptance Criteria

1. WHEN the Demo_System completes initialization, THE InsightHub_Database SHALL contain at least 3 dashboards: "Executive Overview", "Sales Performance", and "Operations Monitor", each with active status set to true
2. EACH demo dashboard SHALL contain at least 3 dashboard items, where each item references an existing active demo report and has a unique position value within its dashboard
3. THE "Executive Overview" dashboard SHALL contain dashboard items referencing reports from at least 2 distinct report groups
4. IF a demo dashboard item references a report that does not exist in the InsightHub_Database, THEN THE Demo_System SHALL skip that dashboard item and log a warning indicating the missing report reference

### Requirement 13: Olist CSV Data Packaging

**User Story:** As a developer, I want the Olist dataset CSV files included in the repository in a manageable way, so that the demo can be built without external downloads.

#### Acceptance Criteria

1. THE Demo_System SHALL include a `demo/data/` directory with a placeholder file (e.g., `.gitkeep`) so that the directory structure is committed to the repository, while the CSV files themselves are obtained via the download script
2. THE Demo_System SHALL include an executable download script (`demo/download-olist-data.sh`) that fetches the Olist dataset from the Kaggle source and places the following 9 CSV files into the `demo/data/` directory: `olist_orders_dataset.csv`, `olist_order_items_dataset.csv`, `olist_order_payments_dataset.csv`, `olist_order_reviews_dataset.csv`, `olist_customers_dataset.csv`, `olist_products_dataset.csv`, `olist_sellers_dataset.csv`, `olist_geolocation_dataset.csv`, and `product_category_name_translation.csv`
3. IF the download script fails to fetch the dataset due to network error or authentication failure, THEN THE download script SHALL exit with a non-zero exit code and print an error message indicating the failure reason
4. IF any of the 9 required CSV files are not present in `demo/data/` when the Data_Loader runs, THEN THE Data_Loader SHALL log an error message that names the missing file(s) and references the `demo/download-olist-data.sh` script as the resolution step
5. THE Demo_System SHALL include a `.gitignore` entry for `demo/data/*.csv` to avoid committing large data files to the repository
