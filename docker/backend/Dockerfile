# ============================================================
# Stage 1: Build
# ============================================================
FROM eclipse-temurin:17-jdk AS build

WORKDIR /app

# Install Maven for building (mvnw will be generated)
RUN apt-get update && \
    apt-get install -y --no-install-recommends maven && \
    rm -rf /var/lib/apt/lists/*

# Copy pom.xml and Maven wrapper config first for dependency layer caching
COPY backend/pom.xml ./pom.xml
COPY backend/.mvn ./.mvn

# Generate Maven wrapper and download dependencies (cached layer)
RUN mvn wrapper:wrapper -Dmaven=3.9.9 && \
    chmod +x mvnw && \
    ./mvnw dependency:go-offline -B

# Copy source code
COPY backend/src ./src

# Build the fat JAR, skipping tests
RUN ./mvnw package -DskipTests -B && \
    mv target/*.jar target/app.jar

# ============================================================
# Stage 2: Runtime
# ============================================================
FROM eclipse-temurin:17-jre-jammy AS runtime

# Install curl for health checks
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

WORKDIR /app

# Copy only the fat JAR from the build stage
COPY --from=build /app/target/app.jar ./app.jar

# Set ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose application port
EXPOSE 8080

# JVM tuning environment variable
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC"

# Health check using Spring Boot Actuator endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8080/insighthub/actuator/health || exit 1

# Run the application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
