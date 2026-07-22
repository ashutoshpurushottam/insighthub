# Implementation Plan: Olist Demo Setup

## Overview

This plan implements a turnkey demo environment for InsightHub using Docker Compose with the Olist Brazilian E-commerce dataset. The implementation proceeds in layers: schema changes first (Division entity + migration), then infrastructure (Docker, Spring profile), then data seeding (Flyway demo migration), then orchestration (Docker Compose, Makefile), and finally validation (smoke tests).

## Tasks

- [x] 1. Add Division entity and Flyway migration
  - [x] 1.1 Create Flyway migration `V12__divisions.sql` to add `divisions` table and FK columns to `report_groups` and `users`
    - Create `backend/src/main/resources/db/migration/V12__divisions.sql`
    - Add `CREATE TABLE divisions` with id, name (VARCHAR 100 UNIQUE NOT NULL), description (VARCHAR 200), created_at, updated_at
    - Add `ALTER TABLE report_groups ADD COLUMN division_id BIGINT` with FK constraint to divisions
    - Add `ALTER TABLE users ADD COLUMN division_id BIGINT` with FK constraint to divisions
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 1.2 Create `DivisionEntity.java` JPA entity class
    - Create `backend/src/main/java/com/insighthub/division/DivisionEntity.java`
    - Use `@Entity`, `@Table(name = "divisions")`, Lombok annotations (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`)
    - Fields: id (Long, auto-generated), name (String, max 100, unique), description (String, max 200), createdAt, updatedAt with Hibernate timestamps
    - _Requirements: 4.1_

  - [x] 1.3 Update `ReportGroupEntity.java` to add division relationship
    - Add `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "division_id") private DivisionEntity division;` field
    - _Requirements: 4.3, 5.2_

  - [x] 1.4 Update `UserEntity.java` to add division relationship
    - Add `@ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "division_id") private DivisionEntity division;` field
    - _Requirements: 4.2_

- [x] 2. Checkpoint - Verify schema changes compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Create Spring Boot demo profile configuration
  - [x] 3.1 Create `application-demo.yml` for the demo Spring profile
    - Create `backend/src/main/resources/application-demo.yml`
    - Configure MySQL datasource: `jdbc:mysql://insighthub-demo-mysql:3306/insighthub`, username `insighthub`, password from `${MYSQL_PASSWORD:insighthub}`
    - Set `spring.jpa.hibernate.ddl-auto=validate`, dialect `MySQLDialect`
    - Disable H2 console: `spring.h2.console.enabled=false`
    - Set Flyway locations: `classpath:db/migration,classpath:db/demo`
    - Enable `baseline-on-migrate: true`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Add Flyway MySQL dependency to `pom.xml`
    - Add `org.flywaydb:flyway-mysql` dependency for MySQL Flyway support
    - _Requirements: 3.4_

- [x] 4. Create Olist database Docker image files
  - [x] 4.1 Create `demo/olist-db/Dockerfile` for custom MySQL image with CSV data
    - Extend `FROM mysql:8.0`
    - `COPY` CSV files from `demo/data/` into `/data/` inside the image
    - `COPY` SQL init scripts into `/docker-entrypoint-initdb.d/`
    - _Requirements: 2.1, 2.2, 13.1_

  - [x] 4.2 Create `demo/olist-db/01-schema.sql` to define Olist tables
    - Create tables: olist_orders, olist_order_items, olist_order_payments, olist_order_reviews, olist_customers, olist_products, olist_sellers, olist_geolocation, product_category_name_translation
    - Add indexes on: order_id, customer_id, product_id, seller_id, order_status, order_purchase_timestamp
    - Use `SET sql_mode = 'STRICT_ALL_TABLES'` for error safety
    - _Requirements: 2.1, 2.3_

  - [x] 4.3 Create `demo/olist-db/02-load-data.sql` to bulk-import CSVs
    - Use `LOAD DATA LOCAL INFILE` for each of the 9 CSV files
    - Load from `/data/` path inside the container
    - _Requirements: 2.2, 2.6_

- [x] 5. Create Flyway demo seed migration
  - [x] 5.1 Create `backend/src/main/resources/db/demo/V100__demo_seed_data.sql`
    - Create the `db/demo/` directory
    - Insert 4 divisions: Executive, Sales & Marketing, Operations & Logistics, Customer Success
    - Insert 8 report groups mapped to divisions per Req 5.2
    - Insert 5 user groups with role assignments per Req 6.2
    - Insert 6 demo users with BCrypt-hashed passwords (username=password), access levels, full names, emails, division assignments per Req 7.1-7.5
    - Insert 1 datasource "Olist E-commerce" pointing to olist-mysql:3306
    - Insert 16+ reports with valid SQL queries distributed across 8 report groups (min 2 per group, mix of type=0 tabular and type=1 chart)
    - Insert 3 dashboards (Executive Overview, Sales Performance, Operations Monitor) with ≥3 items each
    - Insert user_group_report_group_rights ensuring differentiated access per Req 6.3, 6.4
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 9.1, 9.2, 9.3, 9.4, 9.5, 12.1, 12.2, 12.3_

- [x] 6. Checkpoint - Verify Flyway migration syntax
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Create Docker Compose demo file
  - [x] 7.1 Create `docker/docker-compose.demo.yml`
    - Define `insighthub-demo-mysql` service: MySQL 8.0, port 3307:3306, named volume, health check (`mysqladmin ping`, interval 10s, timeout 5s, retries 3), env vars for DB name/user/password
    - Define `olist-mysql` service: builds from `demo/olist-db/Dockerfile`, port 3308:3306, named volume, health check, `DEMO_DATA_VERSION` env var
    - Define `backend` service: Spring Boot app with `SPRING_PROFILES_ACTIVE=demo`, depends_on both MySQL services (condition: service_healthy), port 8080:8080
    - Define `frontend` service: React/Nginx, port 3000:80, depends_on backend
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 8. Create Olist CSV download script and data directory
  - [x] 8.1 Create `demo/data/.gitkeep` and add `.gitignore` for CSV files
    - Create `demo/data/.gitkeep` placeholder
    - Create `demo/.gitignore` with `data/*.csv` entry
    - _Requirements: 13.1, 13.5_

  - [x] 8.2 Create `demo/download-olist-data.sh` script
    - Make script executable
    - Download Olist dataset from Kaggle (with instructions for API key setup)
    - Extract and place 9 CSV files into `demo/data/`
    - Validate all 9 files exist, exit non-zero on failure
    - Print clear error messages on network or auth failure
    - _Requirements: 13.2, 13.3, 13.4_

- [x] 9. Add Makefile targets for demo lifecycle
  - [x] 9.1 Add `demo-up`, `demo-down`, `demo-reset`, `demo-logs` targets to `Makefile`
    - `demo-up`: `docker compose -f docker/docker-compose.demo.yml up -d`
    - `demo-down`: `docker compose -f docker/docker-compose.demo.yml down`
    - `demo-reset`: `docker compose -f docker/docker-compose.demo.yml down -v` then `up -d`
    - `demo-logs`: `docker compose -f docker/docker-compose.demo.yml logs -f`
    - Add all targets to `.PHONY` list
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 10. Create smoke test script
  - [x] 10.1 Create `demo/smoke-test.sh` to validate the running demo environment
    - Check frontend responds HTTP 200 at localhost:3000
    - Check backend responds HTTP 200 at localhost:8080/insighthub
    - Check MySQL ports 3307 and 3308 are accessible
    - Verify division count ≥ 4 via API or direct DB query
    - Verify report group count ≥ 8
    - Verify user group count ≥ 5
    - Verify demo user login (POST to auth endpoint with username=password)
    - Exit non-zero on any failure with descriptive messages
    - _Requirements: 10.2, 10.3, 1.6, 4.1, 5.1, 6.1, 7.2_

- [x] 11. Final checkpoint - Verify full build and all artifacts
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP — none in this plan since property-based tests don't apply to this infrastructure-focused feature
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The design explicitly states property-based testing does NOT apply to this feature (Docker/Flyway/shell scripts are infrastructure code, not pure functions)
- Correctness is validated via integration smoke tests in task 10.1
- SQL queries in the seed migration should be tested manually against an Olist dataset before committing

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4"] },
    { "id": 2, "tasks": ["3.1", "3.2", "4.1", "4.2", "8.1"] },
    { "id": 3, "tasks": ["4.3", "8.2"] },
    { "id": 4, "tasks": ["5.1"] },
    { "id": 5, "tasks": ["7.1", "9.1"] },
    { "id": 6, "tasks": ["10.1"] }
  ]
}
```
