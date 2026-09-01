# Build and run the School Admin backend API

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source code
COPY src ./src

# Create data directory for SQLite
RUN mkdir -p data

# Expose API port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (res) => { if (res.statusCode !== 200) throw new Error(res.statusCode) })"

# Start the server
CMD ["node", "src/server.js"]
