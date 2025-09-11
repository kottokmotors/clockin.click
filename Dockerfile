# 1️⃣ Builder stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the Next.js app
RUN npm run build

# 2️⃣ Runtime stage
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Copy built app and package.json
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

# Expose default Next.js port
EXPOSE 3000

# Start the app in production mode
ENV NODE_ENV=production
CMD ["npm", "start"]
