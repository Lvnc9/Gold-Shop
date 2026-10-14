# syntax=docker/dockerfile:1
FROM python:3.13-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
RUN useradd --system --uid 10001 solenne && mkdir -p /app/staticfiles && chown solenne /app/staticfiles
USER solenne
EXPOSE 8000
# gthread workers: requests mostly wait on Postgres/Redis; 2 processes × 4 threads per replica.
CMD ["gunicorn", "solenne.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--threads", "4", \
     "--worker-class", "gthread", "--timeout", "30", "--graceful-timeout", "20", "--keep-alive", "75", \
     "--max-requests", "2000", "--max-requests-jitter", "200", "--access-logfile", "-", \
     "--access-logformat", "{\"time\":\"%(t)s\",\"request_id\":\"%({x-request-id}i)s\",\"method\":\"%(m)s\",\"path\":\"%(U)s\",\"status\":%(s)s,\"duration_ms\":%(M)s}"]

FROM base AS dev
USER root
COPY requirements-dev.txt .
RUN pip install -r requirements-dev.txt
USER solenne
CMD ["pytest"]
