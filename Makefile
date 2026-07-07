# InsightHub - Development Commands

.PHONY: help dev backend frontend build clean docker-build docker-up docker-down k8s-apply k8s-delete demo-up demo-down demo-reset demo-logs

JAVA_HOME ?= /Library/Java/JavaVirtualMachines/temurin-17.jdk/Contents/Home

help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

backend: ## Run backend (Spring Boot)
	cd backend && JAVA_HOME=$(JAVA_HOME) mvn spring-boot:run

frontend: ## Run frontend (Vite dev server)
	cd frontend && pnpm dev

install: ## Install frontend dependencies
	cd frontend && pnpm install

build-backend: ## Build backend JAR
	cd backend && JAVA_HOME=$(JAVA_HOME) mvn clean package -DskipTests

build-frontend: ## Build frontend for production
	cd frontend && pnpm build

build: build-backend build-frontend ## Build both

clean: ## Clean build artifacts
	cd backend && mvn clean
	cd frontend && rm -rf dist node_modules/.vite

lint: ## Lint frontend code
	cd frontend && pnpm lint

test-backend: ## Run backend tests
	cd backend && JAVA_HOME=$(JAVA_HOME) mvn test

test-frontend: ## Run frontend tests
	cd frontend && pnpm test

## Docker targets

docker-build: ## Build Docker images
	docker compose -f docker/docker-compose.yml build

docker-up: ## Start Docker Compose stack
	docker compose -f docker/docker-compose.yml up -d

docker-down: ## Stop Docker Compose stack
	docker compose -f docker/docker-compose.yml down

## Kubernetes targets

k8s-apply: ## Apply all Kubernetes manifests
	kubectl apply -f k8s/

k8s-delete: ## Delete insighthub namespace (removes all K8s resources)
	kubectl delete namespace insighthub

## Demo targets

demo-up: ## Start demo environment
	docker compose -f docker/docker-compose.demo.yml up -d

demo-down: ## Stop demo environment
	docker compose -f docker/docker-compose.demo.yml down

demo-reset: ## Reset demo (destroy volumes and restart)
	docker compose -f docker/docker-compose.demo.yml down -v
	docker compose -f docker/docker-compose.demo.yml up -d

demo-logs: ## Stream demo container logs
	docker compose -f docker/docker-compose.demo.yml logs -f
