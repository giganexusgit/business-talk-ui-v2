# ─── Build Stage ─────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install all dependencies for build
RUN npm ci

# Copy application source
COPY . .

# Build Next.js application
RUN npm run build

# ─── Production Stage ────────────────────────────────────────────────────────
FROM node:18-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=4001

# Copy package definitions and install production-only dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built assets and configuration from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

# Expose UI application port
EXPOSE 4001

# Start the Next.js server
CMD ["npm", "start"]
