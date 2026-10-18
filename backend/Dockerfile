# syntax=docker/dockerfile:1.4
# Backend Dockerfile for UniFlow Finance
FROM node:20-alpine AS builder

WORKDIR /app

# Install native compilation dependencies for sqlite3 on Alpine
RUN apk add --no-cache python3 make g++

COPY package*.json ./

# Leverage Docker cache mount for npm cache
RUN --mount=type=cache,target=/root/.npm \
    npm install --omit=dev --no-audit

# Stage 2: Minimal Runtime Image on Alpine
FROM node:20-alpine

WORKDIR /app

# SQLite runtime libraries
RUN apk add --no-cache sqlite-libs

# Copy built node_modules with Alpine-matched native bindings
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY index.js ./
COPY models ./models
COPY routes ./routes
COPY services ./services
COPY utils ./utils

# Directory for SQLite persistent volume
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=5000
ENV DB_STORAGE=/app/data/database.sqlite

EXPOSE 5000

CMD ["node", "index.js"]
