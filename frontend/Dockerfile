# Build stage
FROM node:18-alpine AS builder

WORKDIR /app/frontend

COPY frontend/package*.json .
RUN npm install

COPY frontend/ .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app/frontend

# Install serve to run the production build
RUN npm install -g serve

# Copy built app from builder
COPY --from=builder /app/frontend/dist ./dist

EXPOSE 5173

# Serve the built application
CMD ["serve", "-s", "dist", "-l", "5173"]
