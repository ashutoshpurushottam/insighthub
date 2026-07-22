# InsightHub

A modern Reporting & Business Intelligence platform — React + TypeScript frontend with a Spring Boot 3 backend.

![Java](https://img.shields.io/badge/Java-17-orange?logo=java)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3-brightgreen?logo=springboot)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)
![License](https://img.shields.io/badge/License-GPLv3-blue)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Running the Demo](#running-the-demo)
- [Local Development](#local-development)
- [Default Credentials](#default-credentials)
- [Key URLs](#key-urls)
- [Environment Variables](#environment-variables)
- [License](#license)

---

## Features

### 1. User & Access Management
- Create, edit, enable/disable users
- Role-based access control (RBAC) — Super Admin, Standard Admin, Junior Admin, Scheduler, Viewer
- Granular permission system covering reports, datasources, jobs, schedules, dashboards, admin functions, API access, and more
- User Groups for bulk permission assignment
- Access Rights — control which users/groups can see which reports or report groups
- Admin Rights delegation
- JWT-based authentication with configurable token expiry
- Secure password storage with BCrypt hashing

### 2. Datasource Management
- Define and manage JDBC datasource connections
- Connection pool management (HikariCP) with configurable min/max pool size
- Live connection testing from the UI
- Support for: PostgreSQL, MySQL, MariaDB, Oracle, SQL Server, DB2, SQLite, H2, HSQLDB, Informix, Firebird, BigQuery, SAP, Sybase, CUBRID, Cloudscape
- JNDI datasource support
- Datasource-level options (custom JDBC properties)

### 3. Report Groups
- Organize reports into hierarchical groups
- Group-level access rights
- i18n support for group names

### 4. Report Management
- Full CRUD for reports with SQL editor (query panel)
- Run reports directly in the UI with live result preview
- Column-level formatting (number formats, date formats, null display)
- Report options: hidden columns, total columns, locale, auto-refresh
- Report tags for categorization
- Enable/disable individual reports
- Export report results (CSV, JSON, XML, PDF, XLSX)
- Multiple SQL statements per report
- Drill-down links — click summary rows to open detail reports
- Dynamic SQL generation via Groovy scripting and conditional XML tags
- Field expressions — inject `{username}`, `{date}`, `{time}` into queries
- Report Rules (row-level security) — automatically filter data per user

### 5. Report Parameters
- User-selectable parameters: text, number, date, dropdown, checkbox, radio, file upload, textarea
- Chained (cascading) parameters — dependent dropdowns
- Multi-value parameters (`IN` clause support)
- Direct substitution parameters (string interpolation in SQL)
- Fixed (pre-set) parameter values per report
- Dynamic List-of-Values (LOV) from SQL queries
- Static LOV from configured value lists

### 6. Scheduling & Jobs
- Schedule reports to run on a cron-based timetable
- Job types: Email (attachment), Email (inline), Publish, Alert, Just Run It, Conditional Email, Conditional Publish, Cache ResultSet, Print, Burst
- Multiple schedules per job
- Holiday calendar — skip jobs on defined dates
- Pipeline chaining — run Job A then B then C in sequence
- Start conditions — pre-check before execution (e.g. verify ETL is complete)
- Dynamic recipients — email list from SQL query
- Per-recipient personalized/filtered report output (burst mode)
- Job error notification emails
- Job execution archives — browse historical outputs

### 7. Dashboards
- Column-based dashboard layout with report portlets
- Gridstack dashboards — drag-and-drop, resizable grid
- Tabbed dashboards — multiple tabs with different report sets
- Live stats on the main dashboard page (report count, datasource count, job count, user count)
- Recent activity feed

### 8. Charts & Visualizations
- Recharts-powered interactive charts rendered in-browser
- Chart types: Bar, Stacked Bar, Line, Area, Pie, Donut, Scatter/XY, Time Series, Bubble, Heatmap, Speedometer/Gauge
- External library support: C3.js, Plotly.js, Chart.js, ApexCharts, jqPlot, Dygraphs
- Maps: Datamaps (choropleth), Leaflet, OpenLayers
- Org Charts: from database, JSON, list, or Ajax source
- Self-service charts — users build custom visualizations ad-hoc

### 9. Self-Service
- Self-service reports — users build ad-hoc queries (select columns, define conditions) without SQL knowledge
- Self-service dashboards — users compose and arrange their own personal dashboards
- Self-service charts — users create custom chart views

### 10. SMTP / Email
- Multiple SMTP server configurations
- Gmail OAuth support
- Email with file attachments
- Inline HTML email bodies
- Conditional emails (send only when query returns data)
- Dynamic recipients resolved from SQL at send time
- Application error and job failure notification emails

### 11. Security & Encryption
- PGP and AES encryption for report output files
- Password-protected PDF and Excel exports
- Dynamic per-recipient passwords (from SQL)
- CSRF protection
- OWASP XSS encoding
- Encryption key management (update/rotate keys)
- Row-level security via Rules engine (filter data per user automatically)

### 12. Guardrails
- Query guardrails — enforce safe SQL patterns, block dangerous statements
- Resource limits per user/role
- Running queries monitor — view currently executing database queries

### 13. REST API
- Full REST API for all major resources
- JWT Bearer token and Basic authentication
- Endpoints: Authentication, Users, User Groups, Roles, Permissions, Reports, Report Groups, Datasources, Dashboards, Jobs, Parameters, Rules, Access Rights, SMTP Servers
- Swagger / OpenAPI 3 documentation at `/swagger-ui.html`
- CORS enabled

### 14. Administration
- Global application settings
- Cache management — view and clear application caches
- Active database connections monitor
- Runtime log-level configuration
- Application log viewer
- Import/Export configuration records between instances
- H2 console for local development

### 15. Internationalization (i18n)
- Internationalized UI via `react-i18next`
- 15+ language support
- Per-user language preference
- Cookie-based locale persistence
- i18n for report group names and parameter labels

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI framework |
| TypeScript | 5.5 | Type safety |
| Vite | 5.4 | Build tool & dev server |
| Tailwind CSS | 3.4 | Styling |
| React Router | v6 | Client-side routing |
| TanStack Query | v5 | Server state & caching |
| TanStack Table | v8 | Data tables |
| Zustand | 4.5 | Client state management |
| React Hook Form + Zod | — | Form validation |
| Recharts | 2.12 | Charts |
| i18next | 23 | Internationalization |
| Axios | 1.7 | HTTP client |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Spring Boot | 3.3 | Application framework |
| Java | 17 | Runtime |
| Spring Security | — | Auth & authorization |
| JJWT | — | JWT token handling |
| Spring Data JPA + Hibernate | — | ORM |
| Flyway | — | Database migrations |
| Quartz Scheduler | — | Job scheduling |
| HikariCP | — | Connection pooling |
| H2 | — | Dev/test database |
| PostgreSQL | 16 | Production database |
| MySQL | 8 | Demo database |
| SpringDoc OpenAPI | — | API documentation |

---

## Project Structure

```
insighthub/
├── frontend/               # React 18 + TypeScript + Vite + Tailwind
│   ├── src/
│   │   ├── features/       # Feature modules (auth, users, reports, …)
│   │   ├── pages/          # Page-level components
│   │   ├── components/     # Shared UI components
│   │   └── lib/            # API client, hooks, utilities
│   └── public/
├── backend/                # Spring Boot 3 + Java 17
│   └── src/main/java/com/insighthub/
│       ├── auth/           # JWT authentication
│       ├── user/           # User management
│       ├── usergroup/      # User groups
│       ├── role/           # Roles
│       ├── permission/     # Permissions
│       ├── accessright/    # Access rights
│       ├── datasource/     # Datasource management
│       ├── report/         # Report management & execution
│       ├── reportgroup/    # Report groups
│       ├── parameter/      # Report parameters
│       ├── rule/           # Row-level security rules
│       ├── drilldown/      # Drill-down links
│       ├── job/            # Scheduling & jobs
│       ├── dashboard/      # Dashboards
│       ├── smtp/           # SMTP server config
│       ├── export/         # Export engine
│       ├── guardrails/     # Query safety guardrails
│       └── execution/      # Query execution engine
├── docker/                 # Docker & Compose configs
│   ├── docker-compose.yml          # PostgreSQL stack
│   └── docker-compose.demo.yml     # Full demo stack (MySQL + Olist data)
├── k8s/                    # Kubernetes manifests
├── demo/                   # Demo seed data & Dockerfiles
├── Makefile                # Dev convenience commands
└── README.md
```

---

## Running the Demo

The fastest way to see InsightHub running end-to-end is with Docker. The demo stack includes:
- InsightHub backend + frontend
- MySQL database pre-loaded with the **Olist Brazilian E-Commerce** dataset (real-world sample data for exploring reports)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose v2)

### Start the demo

```bash
# Clone the repo (if you haven't already)
git clone https://github.com/your-org/insighthub.git
cd insighthub

# Start the full demo stack (builds images on first run, ~2–3 minutes)
make demo-up
# or directly:
docker compose -f docker/docker-compose.demo.yml up -d
```

Once all containers are healthy, open your browser:

| Service | URL |
|---|---|
| InsightHub UI | http://localhost:3000 |
| Backend API | http://localhost:8080/insighthub/api |
| Swagger UI | http://localhost:8080/insighthub/swagger-ui.html |

Log in with the default credentials:

| Username | Password | Role |
|---|---|---|
| `admin` | `admin` | Super Admin |
| `user` | `user` | Viewer |

### Other demo commands

```bash
# View live logs
make demo-logs

# Reset demo (wipes all data and restarts fresh)
make demo-reset

# Stop the demo
make demo-down
```

---

## Local Development

### Prerequisites

- **Backend**: Java 17 (`temurin-17`), Maven 3.9+
- **Frontend**: Node.js 18+, pnpm 9+

### Run backend (H2 in-memory, zero config)

```bash
cd backend
export JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home
mvn spring-boot:run
# or from repo root:
make backend
```

Starts at `http://localhost:8080/insighthub`

### Run frontend

```bash
cd frontend
pnpm install
pnpm dev
# or from repo root:
make install && make frontend
```

Starts at `http://localhost:3000` — API calls are proxied to the backend automatically.

### Run with PostgreSQL (production-like)

```bash
# Start Postgres only
docker compose -f docker/docker-compose.yml up postgres -d

# Run backend with postgres profile
cd backend
SPRING_PROFILES_ACTIVE=postgres mvn spring-boot:run
```

### Run full Docker stack (PostgreSQL)

```bash
make docker-build   # Build images
make docker-up      # Start stack
make docker-down    # Stop stack
```

### Useful make targets

```bash
make help           # List all targets
make backend        # Run Spring Boot dev server
make frontend       # Run Vite dev server
make build          # Build both backend JAR and frontend bundle
make test-backend   # Run backend tests
make test-frontend  # Run frontend tests
make lint           # Lint frontend code
make clean          # Clean build artifacts
```

---

## Default Credentials

| Username | Password | Role |
|---|---|---|
| `admin` | `admin` | Super Admin |
| `user` | `user` | Viewer |

> **Note:** Change these in production by updating the Flyway seed migration or via the Users admin page after first login.

---

## Key URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080/insighthub/api |
| Swagger UI | http://localhost:8080/insighthub/swagger-ui.html |
| H2 Console (dev only) | http://localhost:8080/insighthub/h2-console |
| Health check | http://localhost:8080/insighthub/actuator/health |

---

## Environment Variables

### Backend

| Variable | Default | Description |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | *(H2 default)* | Set to `postgres` for PostgreSQL or `demo` for demo stack |
| `SPRING_DATASOURCE_URL` | `jdbc:h2:file:./data/insighthub` | JDBC connection URL |
| `SPRING_DATASOURCE_USERNAME` | `sa` | Database username |
| `SPRING_DATASOURCE_PASSWORD` | *(empty)* | Database password |
| `DB_POOL_MIN` | `5` | HikariCP minimum idle connections |
| `DB_POOL_MAX` | `20` | HikariCP maximum pool size |
| `JWT_SECRET` | *(see application.yml)* | JWT signing secret — **change in production** |

### Frontend

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080/insighthub/api` | Backend API base URL |
| `VITE_APP_ENV` | `development` | App environment |

Copy `frontend/.env.example` to `frontend/.env` and adjust as needed.

---

## Development Workflow

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Develop backend + frontend together
3. Run both servers and test end-to-end
4. Commit with conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`
5. Push and open a PR into `dev`
6. Releases are merged from `dev` → `main`

---

## License

[GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html)
