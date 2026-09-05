# InsightHub Backend

Spring Boot 3 REST API backend for InsightHub — a reporting and business intelligence platform.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Spring Boot 3.3 |
| Language | Java 17 |
| Security | Spring Security + JWT (jjwt) |
| Database | H2 (dev) / PostgreSQL (prod) |
| ORM | Spring Data JPA / Hibernate |
| Migrations | Flyway |
| API Docs | SpringDoc OpenAPI 3 (Swagger UI) |
| Build | Maven |

## Getting Started

```bash
# Build the project
mvn clean package -DskipTests

# Run with H2 in-memory database (default)
mvn spring-boot:run

# Run with PostgreSQL
mvn spring-boot:run -Dspring-boot.run.profiles=postgres
```

The server starts at `http://localhost:8080/insighthub`.

## Default Credentials

| Username | Password | Access Level |
|----------|----------|-------------|
| `admin` | `admin` | 100 (Super Admin) |
| `user` | `user` | 0 (Normal User) |

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Authenticate and receive JWT |

### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/{id}` | Get user by ID |
| POST | `/api/users` | Create new user |
| PUT | `/api/users/{id}` | Update user |
| DELETE | `/api/users/{id}` | Delete user |

### Reports
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports` | List all reports |
| GET | `/api/reports/{id}` | Get report by ID |
| DELETE | `/api/reports/{id}` | Delete report |

### Datasources
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/datasources` | List all datasources |
| GET | `/api/datasources/{id}` | Get datasource by ID |

## Swagger UI

Available at: `http://localhost:8080/insighthub/swagger-ui.html`

## H2 Console (Dev only)

Available at: `http://localhost:8080/insighthub/h2-console`
- JDBC URL: `jdbc:h2:mem:insighthub`
- Username: `sa`
- Password: (empty)

## Project Structure

```
src/main/java/com/insighthub/
├── InsightHubApplication.java      # Entry point
├── auth/                           # Authentication (login, JWT)
├── config/                         # Security, OpenAPI, CORS
├── security/                       # JWT filter, service, UserDetails
├── common/exception/               # Global error handling
├── user/                           # User CRUD
├── report/                         # Report management
├── reportgroup/                    # Report group management
└── datasource/                     # Datasource management
```

## Development Workflow

### Commit Convention
```
feat: add schedule management API
fix: handle null datasource in report DTO
refactor: extract base entity class
chore: update Spring Boot to 3.3.3
```

### Adding a new domain module
1. Create entity in `com.insighthub.{module}/`
2. Add Flyway migration in `src/main/resources/db/migration/`
3. Create Repository, Service, DTO, Controller
4. Test with Swagger UI

## License

GNU General Public License v3.0
