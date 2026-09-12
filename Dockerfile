# Stage 1: Build the Vite React application
FROM node:20-alpine AS builder

WORKDIR /app

# Optional build-time arguments (for baking into bundle if desired)
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
ARG VITE_FIREBASE_FIRESTORE_DATABASE_ID

# Pass build-time args to environment during build
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_FIREBASE_FIRESTORE_DATABASE_ID=$VITE_FIREBASE_FIRESTORE_DATABASE_ID

# Install dependencies based on package-lock.json
COPY package*.json ./
RUN npm ci

# Copy application source code and build
COPY . .
RUN npm run build

# Stage 2: Serve with lightweight NGINX Alpine
FROM nginx:alpine

# Install wget for healthcheck (standard in alpine, ensures availability)
RUN apk add --no-cache wget

# Default environment configuration
ENV PORT=2266 \
    SERVER_NAME=localhost

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy Nginx configuration template for dynamic envsubst on container startup
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template

# Copy dynamic runtime environment generator script into entrypoint hooks
COPY docker/40-generate-env.sh /docker-entrypoint.d/40-generate-env.sh
RUN chmod +x /docker-entrypoint.d/40-generate-env.sh

# Expose default port
EXPOSE 2266

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/" || exit 1

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
