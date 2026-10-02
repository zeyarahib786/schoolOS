# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_BASE_URL=http://localhost:4000/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- Production stage: static files served by nginx ----
FROM nginx:1.27-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:80 || exit 1
