# syntax=docker/dockerfile:1.4
# Multi-stage optimized Dockerfile for React Frontend
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

# Leverage Docker cache mount for npm cache
RUN --mount=type=cache,target=/root/.npm \
    npm install --prefer-offline --no-audit

COPY . .

# Build production bundle with optimized source maps disabled for production speed
ENV GENERATE_SOURCEMAP=false
ENV REACT_APP_API_URL=/api/finance
RUN npm run build

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine

# Remove default nginx boilerplate
RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
