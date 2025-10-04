# --- Stage 1: Builder ---
FROM node:20-alpine AS builder

# Pass build argument from GitHub Actions
ARG SCHOOL_NAME
# Make it available inside the image
ENV SCHOOL_NAME=$SCHOOL_NAME

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source and build
COPY . .
RUN npm run build


# --- Stage 2: Runtime ---
FROM node:20-alpine AS runner

WORKDIR /app

# Copy the built app from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.* ./

# Environment configuration
ENV NODE_ENV=production
# Keep SCHOOL_NAME available at runtime too
ARG SCHOOL_NAME
ENV SCHOOL_NAME=$SCHOOL_NAME

# Expose default Next.js port
EXPOSE 3000

# Default command
CMD ["npm", "start"]
