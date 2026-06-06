#!/usr/bin/env bash
# Deploy Kestra to Heroku (Container stack) + Supabase Postgres.
# LLM + Exa credentials are BYOK — forwarded from the Vercel demo per execution, not set here.
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

echo "==> Dyno type"
heroku ps:type standard-1x -a "$APP" 2>/dev/null || heroku ps:type basic -a "$APP" || true

if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  read -rsp "SUPABASE_DB_PASSWORD (Supabase → Settings → Database): " SUPABASE_DB_PASSWORD
  echo
fi

if [[ -z "${DEMO_NOTIFY_SECRET:-}" ]]; then
  DEMO_NOTIFY_SECRET="$(openssl rand -hex 32)"
  echo "Generated DEMO_NOTIFY_SECRET (also set NOTIFY_SECRET on Vercel)"
fi

# Engine infra only — no LITELLM_*, OPENAI_*, EXA_*, or model names (BYOK from dashboard).
heroku config:set -a "$APP" \
  SUPABASE_DB_HOST="$SUPABASE_HOST" \
  SUPABASE_DB_PASSWORD="$SUPABASE_DB_PASSWORD" \
  SUPABASE_DB_PORT="5432" \
  SUPABASE_DB_NAME="postgres" \
  SUPABASE_DB_USER="postgres" \
  DEMO_NOTIFY_URL="$DEMO_URL" \
  DEMO_NOTIFY_SECRET="$DEMO_NOTIFY_SECRET" \
  KESTRA_WORKER_THREADS="2"

# Remove any previously hardcoded provider keys/models from an earlier deploy.
heroku config:unset -a "$APP" \
  LITELLM_BASE_URL LITELLM_API_KEY LITELLM_MODEL_PRIMARY LITELLM_MODEL_FALLBACK \
  OPENAI_API_KEY EXA_API_KEY 2>/dev/null || true

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
echo "BYOK: Users configure LLM + Exa in the demo Settings UI. Each brief execution"
echo "      forwards keys/models to Kestra flow inputs — nothing stored on Heroku."
echo ""
echo "── Wire Vercel demo ──"
echo "cd demo"
echo "vercel env add KESTRA_PUBLIC_URL production   # $KESTRA_URL"
echo "vercel env add NOTIFY_SECRET production       # (same as DEMO_NOTIFY_SECRET above)"
echo "vercel env add DATABASE_URL production        # postgresql://postgres:<pw>@$SUPABASE_HOST:5432/postgres?sslmode=require"
echo "vercel --prod"
