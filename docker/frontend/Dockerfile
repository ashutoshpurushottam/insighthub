# Stage 1: Build the frontend
FROM node:18-alpine AS build

WORKDIR /app

# Enable corepack and install pnpm
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

# Copy package manifests first for layer caching
COPY frontend/package.json frontend/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY frontend/ .

# Build the production bundle
RUN pnpm build

# Stage 2: Serve with Nginx
FROM nginx:alpine AS runtime

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx config template
COPY docker/frontend/nginx.conf /etc/nginx/templates/default.conf.template

# Copy build output from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Set default backend host
ENV BACKEND_HOST=backend:8080

# Expose port 80
EXPOSE 80

# Use envsubst to inject BACKEND_HOST at container startup
CMD ["/bin/sh", "-c", "envsubst '${BACKEND_HOST}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
