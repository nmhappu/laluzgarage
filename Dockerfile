# Stage 1: Build the Vite React application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies based on package-lock.json
COPY package*.json ./
RUN npm ci

# Copy full application code and build
COPY . .
RUN npm run build

# Stage 2: Serve with lightweight NGINX web server
FROM nginx:alpine

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom NGINX configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 1002

CMD ["nginx", "-g", "daemon off;"]
