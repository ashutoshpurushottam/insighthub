# Requirements Document

## Introduction

This feature adds containerization and orchestration support to InsightHub, enabling production-ready deployment via Docker and Kubernetes. It also transitions the application's primary database from H2 (embedded, development-only) to PostgreSQL for production use. The backend (Spring Boot 3.3 / Java 17) and frontend (React 18 / Vite / pnpm) will each have dedicated Dockerfiles, a Docker Compose setup for local development, and Kubernetes manifests for cluster deployment.

## Glossary

- **Backend**: The Spring Boot 3.3 Java 17 application serving the InsightHub REST API
- **Frontend**: The React 18 TypeScript application built with Vite and served via Nginx
- **Backend_Dockerfile**: The Dockerfile that builds and packages the Backend into a container image
- **Frontend_Dockerfile**: The Dockerfile that builds and packages the Frontend into a container image
- **Compose_Stack**: The Docker Compose configuration that orchestrates all InsightHub services for local development
- **K8s_Manifests**: The set of Kubernetes resource definitions for deploying InsightHub to a cluster
- **PostgreSQL_Database**: The PostgreSQL relational database instance used as the primary data store
- **Health_Check_Endpoint**: The Spring Boot Actuator endpoint at `/actuator/health` reporting application readiness
- **Flyway**: The database migration tool already integrated in the Backend for schema versioning
- **ConfigMap**: A Kubernetes resource for storing non-sensitive configuration data
- **Secret**: A Kubernetes resource for storing sensitive data such as database credentials

## Requirements

### Requirement 1: Backend Docker Image

**User Story:** As a DevOps engineer, I want to build the Backend into a Docker container image, so that I can deploy it consistently across environments.

#### Acceptance Criteria

1. THE Backend_Dockerfile SHALL produce a container image that runs the Backend on a Java 17 JRE base image
2. THE Backend_Dockerfile SHALL use a multi-stage build to separate the Maven build stage from the runtime stage
3. WHEN the Backend container starts, THE Backend SHALL respond to HTTP requests on port 8080 within 30 seconds of container start
4. THE Backend_Dockerfile SHALL result in a final image size of less than 400 MB
5. THE Backend_Dockerfile SHALL not include source code, build tools, or the Maven local repository in the final runtime stage
6. IF the Maven build stage fails, THEN THE Backend_Dockerfile SHALL terminate the image build with a non-zero exit code
7. WHEN the Backend container is running, THE Backend SHALL respond with HTTP 200 on the health endpoint to indicate readiness

### Requirement 2: Frontend Docker Image

**User Story:** As a DevOps engineer, I want to build the Frontend into a Docker container image, so that I can serve the static UI assets via a production-grade web server.

#### Acceptance Criteria

1. THE Frontend_Dockerfile SHALL produce a container image that serves the Frontend static build output using Nginx Alpine
2. THE Frontend_Dockerfile SHALL use a multi-stage build with a Node 18 build stage using pnpm to install dependencies and produce the production bundle, and an Nginx Alpine runtime stage
3. WHEN the Frontend container starts, THE Frontend SHALL respond to HTTP requests on port 80 and return a 200 status for the root path
4. THE Frontend_Dockerfile SHALL include Nginx configuration that proxies requests matching the `/api` path prefix to the Backend, where the Backend host is configurable via an environment variable
5. THE Frontend_Dockerfile SHALL result in a final image size of less than 100 MB
6. THE Frontend_Dockerfile SHALL not include node_modules or source code in the final runtime stage
7. THE Frontend_Dockerfile SHALL include Nginx configuration that returns the `index.html` file for any request path that does not match a static file, enabling client-side routing
8. IF a proxied API request to the Backend fails due to the Backend being unreachable, THEN THE Frontend SHALL return an HTTP 502 response to the client

### Requirement 3: Docker Compose Local Development Stack

**User Story:** As a developer, I want to start the entire InsightHub stack locally with a single command, so that I can develop and test with production-like infrastructure.

#### Acceptance Criteria

1. THE Compose_Stack SHALL define services for the Backend, Frontend, and PostgreSQL_Database
2. WHEN a developer runs `docker compose up`, THE Compose_Stack SHALL start all services such that the Frontend can reach the Backend and the Backend can reach the PostgreSQL_Database using Docker service names as hostnames
3. THE Compose_Stack SHALL configure the Backend to connect to the PostgreSQL_Database using environment variables for host, port, database name, username, and password
4. THE Compose_Stack SHALL persist PostgreSQL_Database data using a named Docker volume so that data survives container restarts
5. THE Compose_Stack SHALL expose the Frontend on host port 3000 and the Backend on host port 8080
6. THE Compose_Stack SHALL define a health check for the PostgreSQL_Database service and configure the Backend service to depend on the PostgreSQL_Database being healthy before starting
7. IF a service exits with a non-zero exit code during `docker compose up`, THEN THE Compose_Stack SHALL stop dependent services and report the failing service name in the compose output

### Requirement 4: PostgreSQL Database Migration

**User Story:** As a developer, I want the Backend to use PostgreSQL as its primary database, so that the application has a production-grade data store with full SQL compliance.

#### Acceptance Criteria

1. WHEN the Backend starts with the postgres profile active, THE Backend SHALL establish a connection to the PostgreSQL_Database within 30 seconds
2. WHEN the Backend starts with the postgres profile active, THE Backend SHALL use Flyway to apply all pending migration scripts from `classpath:db/migration` against the PostgreSQL_Database before serving requests
3. IF a Flyway migration fails, THEN THE Backend SHALL terminate startup and output the migration error details including the failed script name to standard output
4. WHILE the default Spring profile is active and no postgres profile is specified, THE Backend SHALL use the H2 file-based database as its data store
5. THE Backend SHALL externalize database connection parameters as environment variables including: JDBC URL, username, password, minimum pool size, and maximum pool size, with defaults of `jdbc:postgresql://localhost:5432/insighthub`, `insighthub`, `insighthub`, `5`, and `20` respectively
6. WHILE the postgres profile is active, THE Backend SHALL configure a connection pool with a minimum of 5 and a maximum of 20 connections
7. IF the PostgreSQL_Database is unreachable at startup, THEN THE Backend SHALL retry the connection up to 3 times at 5-second intervals before failing to start with an error message indicating the database is unavailable

### Requirement 5: Kubernetes Deployment Manifests

**User Story:** As a DevOps engineer, I want Kubernetes manifests for InsightHub, so that I can deploy the application to a Kubernetes cluster with proper resource management.

#### Acceptance Criteria

1. THE K8s_Manifests SHALL include a Deployment resource for the Backend with a configurable replica count defaulting to 2
2. THE K8s_Manifests SHALL include a Deployment resource for the Frontend with a configurable replica count defaulting to 2
3. THE K8s_Manifests SHALL include a StatefulSet resource for the PostgreSQL_Database with a PersistentVolumeClaim requesting 10Gi of storage
4. THE K8s_Manifests SHALL include a ClusterIP Service resource for each component to enable internal cluster communication
5. THE K8s_Manifests SHALL include an Ingress resource that routes requests with path prefix `/api` to the Backend Service and all other requests to the Frontend Service
6. THE K8s_Manifests SHALL organize all resources under a dedicated `insighthub` namespace defined in a Namespace manifest

### Requirement 6: Kubernetes Configuration Management

**User Story:** As a DevOps engineer, I want to manage application configuration and secrets separately from deployment manifests, so that I can update settings without rebuilding images.

#### Acceptance Criteria

1. THE K8s_Manifests SHALL include a ConfigMap containing the following non-sensitive Backend configuration keys: Spring active profile, server port, Flyway enabled flag, Flyway migration locations, and Flyway baseline-on-migrate setting
2. THE K8s_Manifests SHALL include a Secret containing the following sensitive data keys: database URL, database username, database password, and JWT secret key, with values base64-encoded as required by Kubernetes
3. WHEN the Backend Pod starts, THE Backend Deployment SHALL inject all ConfigMap entries and Secret entries as environment variables into the Backend container using envFrom references
4. THE K8s_Manifests SHALL contain only placeholder values in the Secret resource, and SHALL not contain actual production credentials in the committed manifest files
5. IF the Backend Pod starts and a required environment variable from the ConfigMap or Secret is missing, THEN THE Backend SHALL fail to start and log an error message indicating the missing configuration key

### Requirement 7: Kubernetes Health and Readiness Probes

**User Story:** As a DevOps engineer, I want Kubernetes to monitor application health, so that unhealthy instances are automatically restarted and traffic is routed only to ready instances.

#### Acceptance Criteria

1. THE K8s_Manifests SHALL configure a liveness probe on the Backend Deployment as an HTTP GET request to the Health_Check_Endpoint on port 8080 with a timeout of 5 seconds and a failure threshold of 3 consecutive failures
2. THE K8s_Manifests SHALL configure a readiness probe on the Backend Deployment as an HTTP GET request to the Health_Check_Endpoint on port 8080 with a timeout of 5 seconds and a failure threshold of 3 consecutive failures
3. THE K8s_Manifests SHALL configure the readiness probe with an initial delay of 30 seconds and a period of 10 seconds to allow application startup
4. THE K8s_Manifests SHALL configure the liveness probe with an initial delay of 60 seconds and a period of 15 seconds
5. WHEN the Backend readiness probe records 3 consecutive failures, THE Backend Service SHALL stop routing traffic to the failing Pod until the probe records 1 consecutive success

### Requirement 8: Resource Limits and Scaling

**User Story:** As a DevOps engineer, I want to define resource limits and scaling policies, so that the cluster resources are used efficiently and the application can handle load spikes.

#### Acceptance Criteria

1. THE K8s_Manifests SHALL set Backend Deployment resource requests to 256m CPU and 512Mi memory, and resource limits to 1000m CPU and 1024Mi memory
2. THE K8s_Manifests SHALL set Frontend Deployment resource requests to 64m CPU and 64Mi memory, and resource limits to 256m CPU and 128Mi memory
3. THE K8s_Manifests SHALL set PostgreSQL_Database StatefulSet resource requests to 256m CPU and 256Mi memory, and resource limits to 1000m CPU and 1024Mi memory
4. THE K8s_Manifests SHALL include a HorizontalPodAutoscaler for the Backend that scales between 2 and 5 replicas based on average CPU utilization exceeding 70 percent, with a scale-down stabilization window of 300 seconds
5. IF a Pod exceeds its defined memory limit, THEN THE K8s_Manifests SHALL rely on the default Kubernetes OOMKill behavior to terminate and restart the Pod
