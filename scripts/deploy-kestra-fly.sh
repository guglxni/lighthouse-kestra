#!/usr/bin/env bash
# Deploy Kestra engine to Fly.io (compute) using Supabase Postgres (data).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v fly >/dev/null 2>&1; then
  echo "Install flyctl: https://fly.io/docs/hands-on/install-flyctl/"
  exit 1
fi

APP="${FLY_APP_NAME:-lighthouse-kestra}"

if ! fly apps list 2>/dev/null | grep -q "$APP"; then
  echo "==> Creating Fly app $APP"
  fly apps create "$APP" --org personal 2>/dev/null || fly apps create "$APP"
fi

echo "==> Set secrets on Fly (prompts if missing from env)"
read -rsp "SUPABASE_DB_PASSWORD: " SUPABASE_DB_PASSWORD
echo
export SUPABASE_DB_PASSWORD

fly secrets set -a "$APP" \
  SUPABASE_DB_HOST="${SUPABASE_DB_HOST:-db.qtvlohzprhrworvhlchk.supabase.co}" \
  SUPABASE_DB_PASSWORD="$SUPABASE_DB_PASSWORD" \
  DEMO_NOTIFY_URL="${DEMO_NOTIFY_URL:-https://demo-beta-topaz.vercel.app}" \
  DEMO_NOTIFY_SECRET="${DEMO_NOTIFY_SECRET:-}" \
  EXA_API_KEY="${EXA_API_KEY:-}" \
  LITELLM_API_KEY="${LITELLM_API_KEY:-}" \
  LITELLM_BASE_URL="${LITELLM_BASE_URL:-}" \
  OPENAI_API_KEY="${OPENAI_API_KEY:-}" \
  --stage

echo "==> Deploying Kestra image"
fly deploy -a "$APP" --remote-only

KESTRA_URL="https://${APP}.fly.dev"
echo "==> Kestra URL: $KESTRA_URL"
fly secrets set -a "$APP" KESTRA_PUBLIC_URL="$KESTRA_URL" --stage
fly deploy -a "$APP" --remote-only

echo ""
echo "Wire Vercel:"
echo "  cd demo && vercel env add KESTRA_PUBLIC_URL production"
echo "  # value: $KESTRA_URL"
