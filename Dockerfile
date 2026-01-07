# Multi-stage build for React frontend (Next.js static export)
# Build arguments
ARG NODE_VERSION=20
ARG NEXT_PUBLIC_API_URL=/api

# Stage 1: Build
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps --ignore-scripts && \
    npm cache clean --force

# Copy source code (excluding node_modules thanks to .dockerignore)
COPY . .

# Build the app with environment variables (Next.js static export)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Run Next.js build (produces 'out' folder)
RUN node ./node_modules/next/dist/bin/next build

# Stage 2: Production with Nginx
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built assets from builder (Next.js outputs to 'out' folder)
COPY --from=builder /app/out /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
