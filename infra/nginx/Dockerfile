# syntax=docker/dockerfile:1
# Build context: repository root (see docker-compose.yml).
FROM node:22-alpine AS spa
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
RUN npm run build:api

FROM nginx:1.29-alpine
RUN rm /etc/nginx/conf.d/default.conf && mkdir -p /var/log/nginx /var/www/static
COPY infra/nginx/nginx.conf /etc/nginx/nginx.conf
COPY infra/nginx/solenne.conf /etc/nginx/conf.d/solenne.conf
COPY infra/nginx/errors /etc/nginx/errors
COPY --from=spa /src/dist-api /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/api/v1/health/ >/dev/null || exit 1
