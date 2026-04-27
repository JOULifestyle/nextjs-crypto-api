# Use Node.js 20 LTS Alpine for smaller image size
FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Change ownership of the app directory to nodejs user
RUN chown -R nestjs:nodejs /app

# Copy package files with proper ownership
COPY --chown=nestjs:nodejs package*.json ./

# Switch to non-root user
USER nestjs

# Install dependencies
RUN npm ci --only=production

# Copy source code with proper ownership
COPY --chown=nestjs:nodejs . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]