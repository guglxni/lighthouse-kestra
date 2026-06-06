#!/usr/bin/env bash
# Deploy Kestra to Heroku (Container stack) + Supabase Postgres.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APP="${HEROKU_APP_NAME:-lighthouse-kestra}"
SUPABASE_HOST="${SUPABASE_DB_HOST:-db.qtvlohzprhrworvhlchk.supabase.co}"
DEMO_URL="${DEMO_NOTIFY_URL:-https://demo-beta-topaz.vercel.app}"

if ! command -v heroku >/dev/null 2>&1; then
  echo "Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli"
  exit 1
fi

echo "==> Heroku login (skip if already authed)"
heroku auth:whoami 2>/dev/null || heroku login

if ! heroku apps:info -a "$APP" >/dev/null 2>&1; then
  echo "==> Creating app $APP"
  heroku apps:create "$APP" --stack container
else
  echo "==> Using existing app $APP"
  heroku stack:set container -a "$APP" 2>/dev/null || true
fi

# Standard-1X minimum for Kestra JVM + Python scripts (~$25/mo; student credits apply).
echo "==> Dyno type (use basic if credits are tight — may OOM on heavy flows)"
heroku ps:type standard-1x -a "$APP" 2>/dev/null || heroku ps:type basic -a "$APP" || true

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  read -rsp "SUPABASE_DB_PASSWORD (Supabase → Settings → Database): " SUPABASE_DB_PASSWORD
  echo
fi

if [[ -z "${DEMO_NOTIFY_SECRET:-}" ]]; then
  DEMO_NOTIFY_SECRET="$(openssl rand -hex 32)"
  echo "Generated DEMO_NOTIFY_SECRET=$DEMO_NOTIFY_SECRET"
fi

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  read -rsp "OPENAI_API_KEY (or set LITELLM_* for another provider): " OPENAI_API_KEY
  echo
fi

heroku config:set -a "$APP" \
  SUPABASE_DB_HOST="$SUPABASE_HOST" \
  SUPABASE_DB_PASSWORD="$SUPABASE_DB_PASSWORD" \
  SUPABASE_DB_PORT="5432" \
  SUPABASE_DB_NAME="postgres" \
  SUPABASE_DB_USER="postgres" \
  DEMO_NOTIFY_URL="$DEMO_URL" \
  DEMO_NOTIFY_SECRET="$DEMO_NOTIFY_SECRET" \
  LITELLM_BASE_URL="${LITELLM_BASE_URL:-https://api.openai.com/v1}" \
  LITELLM_API_KEY="${LITELLM_API_KEY:-$OPENAI_API_KEY}" \
  LITELLM_MODEL_PRIMARY="${LITELLM_MODEL_PRIMARY:-gpt-4o}" \
  LITELLM_MODEL_FALLBACK="${LITELLM_MODEL_FALLBACK:-gpt-4o-mini}" \
  OPENAI_API_KEY="${OPENAI_API_KEY:-}" \
  EXA_API_KEY="${EXA_API_KEY:-}" \
  KESTRA_WORKER_THREADS="2"

echo "==> Deploying container (heroku.yml → infra/Dockerfile.kestra-heroku)"
heroku container:login
heroku container:push web -a "$APP"
heroku container:release web -a "$APP"

KESTRA_URL="https://${APP}.herokuapp.com"
heroku config:set -a "$APP" KESTRA_PUBLIC_URL="$KESTRA_URL"

echo ""
echo "✓ Kestra: $KESTRA_URL"
echo "✓ UI:     $KESTRA_URL/ui"
echo ""
echo "── Wire Vercel demo ──"
echo "cd demo"
echo "vercel env add KESTRA_PUBLIC_URL production   # $KESTRA_URL"
echo "vercel env add NOTIFY_SECRET production       # $DEMO_NOTIFY_SECRET"
echo "vercel env add DATABASE_URL production        # postgresql://postgres:<pw>@$SUPABASE_HOST:5432/postgres?sslmode=require"
echo "vercel --prod"
echo ""
echo "── Push Supabase lh schema (if not done) ──"
echo "./scripts/deploy-supabase-backend.sh"
