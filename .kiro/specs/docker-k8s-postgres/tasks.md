# Implementation Plan: Docker, Kubernetes & PostgreSQL

## Overview

This plan implements containerization, orchestration, and PostgreSQL production database support for InsightHub. Tasks are structured to build incrementally: first the Dockerfiles, then Docker Compose orchestration, then PostgreSQL profile enhancement with retry logic, and finally Kubernetes manifests. Each step integrates with previous work so there is no orphaned configuration.

## Tasks

- [x] 1. Create Backend Dockerfile with multi-stage build
  - [x] 1.1 Create the Backend Dockerfile at `docker/backend/Dockerfile`
    - Use `eclipse-temurin:17-jdk` as the build stage base image
    - Copy `pom.xml` and Maven wrapper first for dependency layer caching
    - Run `./mvnw package -DskipTests` to produce the fat JAR
    - Use `eclipse-temurin:17-jre-alpine` as the runtime stage
    - Create a non-root `appuser` and run the JAR as that user
    - Expose port 8080
    - Set `JAVA_OPTS` environment variable for JVM tuning
    - Add a HEALTHCHECK instruction using `curl` to `/insighthub/actuator/health`
    - Ensure final image excludes source code, build tools, and Maven local repository
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Create Frontend Dockerfile and Nginx configuration
  - [x] 2.1 Create the Nginx configuration file at `docker/frontend/nginx.conf`
    - Configure upstream `backend` using `${BACKEND_HOST}` variable
    - Add `location /api/` block with `proxy_pass` to backend
    - Add `location /` block with `try_files $uri $uri/ /index.html` for SPA routing
    - Enable gzip compression for CSS, JS, JSON, and SVG
    - Set appropriate proxy headers (Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto)
    - Configure proxy timeouts (connect 5s, read 30s)
    - _Requirements: 2.4, 2.7, 2.8_

  - [x] 2.2 Create the Frontend Dockerfile at `docker/frontend/Dockerfile`
    - Use `node:18-alpine` as the build stage base image
    - Enable corepack and install pnpm
    - Copy `package.json` and `pnpm-lock.yaml` first for layer caching
    - Run `pnpm install --frozen-lockfile && pnpm build`
    - Use `nginx:alpine` as the runtime stage
    - Copy build output to `/usr/share/nginx/html`
    - Copy `nginx.conf` template and use `envsubst` at container startup to inject `BACKEND_HOST`
    - Expose port 80
    - Ensure final image excludes `node_modules` and source code
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6_

- [x] 3. Create Docker Compose configuration
  - [x] 3.1 Create Docker Compose file at `docker/docker-compose.yml`
    - Define `postgres` service using `postgres:16-alpine` with health check (`pg_isready`) and named volume `pgdata`
    - Define `backend` service built from `docker/backend/Dockerfile` with context as project root
    - Configure Backend environment: `SPRING_PROFILES_ACTIVE=postgres`, datasource URL, username, password
    - Set Backend `depends_on` postgres with condition `service_healthy`
    - Define `frontend` service built from `docker/frontend/Dockerfile` with context as project root
    - Set Frontend `BACKEND_HOST=backend:8080` and `depends_on` backend
    - Map ports: Frontend `3000:80`, Backend `8080:8080`, PostgreSQL `5432:5432`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 4. Checkpoint - Verify Docker builds
  - Ensure all Docker images build successfully, ask the user if questions arise.

- [x] 5. Enhance PostgreSQL Spring profile with connection pooling and retry logic
  - [x] 5.1 Update `backend/src/main/resources/application-postgres.yml` with environment variable placeholders and HikariCP settings
    - Add `${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/insighthub}` for URL
    - Add `${SPRING_DATASOURCE_USERNAME:insighthub}` for username
    - Add `${SPRING_DATASOURCE_PASSWORD:insighthub}` for password
    - Configure HikariCP: `minimum-idle: ${DB_POOL_MIN:5}`, `maximum-pool-size: ${DB_POOL_MAX:20}`
    - Set `connection-timeout: 30000` and `initialization-fail-timeout: 30000`
    - Disable H2 console
    - Set Hibernate dialect to `org.hibernate.dialect.PostgreSQLDialect`
    - _Requirements: 4.1, 4.4, 4.5, 4.6_

  - [x] 5.2 Create a database connection retry bean in the Backend
    - Create `DatabaseConnectionVerifier.java` in `com.insighthub.config`
    - Implement as an `ApplicationRunner` bean active only with the `postgres` profile (`@Profile("postgres")`)
    - Attempt to verify database connectivity via `DataSource.getConnection()`
    - Retry up to 3 times with 5-second intervals between attempts
    - If all retries fail, log an error message indicating the database is unavailable and throw an exception to halt startup
    - _Requirements: 4.7_

  - [x] 5.3 Write integration test for PostgreSQL connection retry logic
    - Use Testcontainers to start a PostgreSQL instance
    - Verify Flyway applies all 11 migrations successfully
    - Verify application starts with postgres profile active
    - Test retry logic with a delayed/unavailable database scenario
    - _Requirements: 4.1, 4.2, 4.3, 4.7_

- [x] 6. Create Kubernetes namespace, ConfigMap, and Secret
  - [x] 6.1 Create Kubernetes namespace manifest at `k8s/namespace.yaml`
    - Define namespace `insighthub`
    - _Requirements: 5.6_

  - [x] 6.2 Create ConfigMap at `k8s/configmap.yaml`
    - Namespace: `insighthub`
    - Keys: `SPRING_PROFILES_ACTIVE: postgres`, `SERVER_PORT: "8080"`, `SPRING_FLYWAY_ENABLED: "true"`, `SPRING_FLYWAY_LOCATIONS: classpath:db/migration`, `SPRING_FLYWAY_BASELINE_ON_MIGRATE: "true"`
    - _Requirements: 6.1_

  - [x] 6.3 Create Secret at `k8s/secret.yaml`
    - Namespace: `insighthub`
    - Type: `Opaque`
    - Keys (base64-encoded placeholders): `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `APP_JWT_SECRET`
    - Add comments indicating these are placeholder values
    - _Requirements: 6.2, 6.4_

- [x] 7. Create Kubernetes PostgreSQL StatefulSet and Service
  - [x] 7.1 Create PostgreSQL StatefulSet at `k8s/postgres-statefulset.yaml`
    - Namespace: `insighthub`
    - Image: `postgres:16-alpine`, replicas: 1
    - PVC: 10Gi `ReadWriteOnce`
    - Resource requests: 256m CPU, 256Mi memory
    - Resource limits: 1000m CPU, 1024Mi memory
    - Liveness probe: `pg_isready`
    - Environment variables for POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD from Secret
    - _Requirements: 5.3, 8.3_

  - [x] 7.2 Create PostgreSQL Service at `k8s/postgres-service.yaml`
    - Namespace: `insighthub`
    - Type: ClusterIP, port 5432
    - Selector matching the PostgreSQL StatefulSet pods
    - _Requirements: 5.4_

- [x] 8. Create Kubernetes Backend Deployment, Service, and HPA
  - [x] 8.1 Create Backend Deployment at `k8s/backend-deployment.yaml`
    - Namespace: `insighthub`
    - Replicas: 2
    - `envFrom` referencing ConfigMap and Secret
    - Resource requests: 256m CPU, 512Mi memory
    - Resource limits: 1000m CPU, 1024Mi memory
    - Liveness probe: HTTP GET `/insighthub/actuator/health`, initial delay 60s, period 15s, timeout 5s, failure threshold 3
    - Readiness probe: HTTP GET `/insighthub/actuator/health`, initial delay 30s, period 10s, timeout 5s, failure threshold 3
    - _Requirements: 5.1, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5, 8.1_

  - [x] 8.2 Create Backend Service at `k8s/backend-service.yaml`
    - Namespace: `insighthub`
    - Type: ClusterIP, port 8080
    - Selector matching Backend Deployment pods
    - _Requirements: 5.4_

  - [x] 8.3 Create Backend HPA at `k8s/backend-hpa.yaml`
    - Namespace: `insighthub`
    - Target: Backend Deployment
    - Min replicas: 2, Max replicas: 5
    - Metric: CPU utilization > 70%
    - Scale-down stabilization: 300 seconds
    - _Requirements: 8.4, 8.5_

- [x] 9. Create Kubernetes Frontend Deployment, Service, and Ingress
  - [x] 9.1 Create Frontend Deployment at `k8s/frontend-deployment.yaml`
    - Namespace: `insighthub`
    - Replicas: 2
    - Environment variable: `BACKEND_HOST=backend-service:8080`
    - Resource requests: 64m CPU, 64Mi memory
    - Resource limits: 256m CPU, 128Mi memory
    - _Requirements: 5.2, 8.2_

  - [x] 9.2 Create Frontend Service at `k8s/frontend-service.yaml`
    - Namespace: `insighthub`
    - Type: ClusterIP, port 80
    - Selector matching Frontend Deployment pods
    - _Requirements: 5.4_

  - [x] 9.3 Create Ingress at `k8s/ingress.yaml`
    - Namespace: `insighthub`
    - Annotations for nginx ingress controller
    - Path `/api` → `backend-service:8080`
    - Path `/` → `frontend-service:80`
    - _Requirements: 5.5_

- [x] 10. Update Makefile with Docker and Kubernetes commands
  - [x] 10.1 Add Docker and Kubernetes convenience targets to the root `Makefile`
    - Add `docker-build` target to build both images
    - Add `docker-up` target to run `docker compose -f docker/docker-compose.yml up -d`
    - Add `docker-down` target to stop the compose stack
    - Add `k8s-apply` target to apply all Kubernetes manifests
    - Add `k8s-delete` target to delete the insighthub namespace
    - _Requirements: 3.2_

- [x] 11. Final checkpoint - Verify complete setup
  - Ensure all Docker images build successfully, Docker Compose stack starts, and Kubernetes manifests pass dry-run validation. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests are not applicable to this feature (declarative config and infrastructure wiring)
- The existing Flyway migrations (V1–V11) are expected to be PostgreSQL-compatible standard SQL
- Kubernetes Secret values are placeholders only — actual credentials should be managed via external secret management in production
- The `envsubst` approach for Nginx allows the same Frontend image to work in both Docker Compose and Kubernetes environments

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "6.1"] },
    { "id": 1, "tasks": ["2.2", "5.1", "6.2", "6.3"] },
    { "id": 2, "tasks": ["3.1", "5.2", "7.1", "7.2"] },
    { "id": 3, "tasks": ["5.3", "8.1", "8.2", "9.1", "9.2"] },
    { "id": 4, "tasks": ["8.3", "9.3", "10.1"] }
  ]
}
```
