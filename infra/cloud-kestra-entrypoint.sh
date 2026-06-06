#!/bin/sh
# Kestra on PaaS (Heroku / Fly) — Supabase Postgres, Process script runner, dynamic PORT.
# LLM + Exa: BYOK only — demo forwards per-execution inputs; engine secrets stay empty.
set -eu

: "${SUPABASE_DB_HOST:?SUPABASE_DB_HOST required}"
: "${SUPABASE_DB_PASSWORD:?SUPABASE_DB_PASSWORD required}"

PORT="${PORT:-8080}"
DB_HOST="${SUPABASE_DB_HOST}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
KESTRA_URL="${KESTRA_PUBLIC_URL:-http://localhost:${PORT}}"

export KESTRA_CONFIGURATION="datasources:
  postgres:
    url: jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require
    driverClassName: org.postgresql.Driver
    username: ${DB_USER}
    password: ${SUPABASE_DB_PASSWORD}
kestra:
  server:
    basic-auth:
      enabled: ${KESTRA_BASIC_AUTH_ENABLED:-false}
  repository:
    type: postgres
  storage:
    type: local
    local:
      base-path: /app/storage
  queue:
    type: postgres
  tasks:
    tmp-dir:
      path: /tmp/kestra-wd/tmp
  url: ${KESTRA_URL}/
micronaut:
  server:
    port: ${PORT}"

export SECRET_POSTGRES_HOST="${DB_HOST}"
export SECRET_POSTGRES_PORT="${DB_PORT}"
export SECRET_POSTGRES_DB="${DB_NAME}"
export SECRET_POSTGRES_USER="${DB_USER}"
export SECRET_POSTGRES_PASSWORD="${SUPABASE_DB_PASSWORD}"
# Empty unless operator opts in for unattended cron (BYOK default = per-execution inputs).
export SECRET_LITELLM_BASE_URL="${LITELLM_BASE_URL:-}"
export SECRET_LITELLM_API_KEY="${LITELLM_API_KEY:-}"
export SECRET_LITELLM_MODEL_PRIMARY="${LITELLM_MODEL_PRIMARY:-}"
export SECRET_LITELLM_MODEL_FALLBACK="${LITELLM_MODEL_FALLBACK:-}"
export SECRET_EXA_API_KEY="${EXA_API_KEY:-}"
export SECRET_EXA_API_BASE="${EXA_API_BASE:-https://api.exa.ai}"
export SECRET_DEMO_NOTIFY_URL="${DEMO_NOTIFY_URL:-https://demo-beta-topaz.vercel.app}"
export SECRET_DEMO_NOTIFY_SECRET="${DEMO_NOTIFY_SECRET:-}"
export SECRET_KESTRA_PUBLIC_URL="${KESTRA_URL}"

THREADS="${KESTRA_WORKER_THREADS:-2}"
if [ -x /docker-entrypoint.sh ]; then
  exec /docker-entrypoint.sh server standalone --worker-thread="${THREADS}"
fi
exec server standalone --worker-thread="${THREADS}"
