# Backend Dockerfile for UniFlow Finance
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies required for native sqlite3 compilation on alpine
RUN apk add --no-cache python3 make g++

COPY package*.json ./

# Clean install dependencies
RUN npm install

COPY . .

# Final runtime image
FROM node:20-alpine

WORKDIR /app

# SQLite runtime libraries
RUN apk add --no-cache sqlite-libs

COPY --from=builder /app /app

# Create directory for persistent SQLite database
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=5000
ENV DB_STORAGE=/app/data/database.sqlite

EXPOSE 5000

CMD ["node", "index.js"]
