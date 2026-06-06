#!/usr/bin/env bash
# Push lh pipeline schema to Supabase + print env for Kestra/Vercel.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Supabase project (must be linked: supabase link --project-ref qtvlohzprhrworvhlchk)"
supabase projects list 2>/dev/null | grep -E '●|LINKED' || true

echo "==> Pushing migrations (lh.* schema + existing public tables)"
supabase db push

echo "==> Fetch DB host from linked project"
DB_HOST="$(supabase status -o json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('DB_HOST',''))" 2>/dev/null || true)"
if [[ -z "$DB_HOST" ]]; then
  DB_HOST="db.qtvlohzprhrworvhlchk.supabase.co"
fi

cat <<EOF

── Add to repo root .env (Kestra engine) ──
SUPABASE_DB_HOST=${DB_HOST}
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=<from Supabase Dashboard → Settings → Database>

DATABASE_URL=postgresql://postgres:<password>@${DB_HOST}:5432/postgres?sslmode=require

DEMO_NOTIFY_URL=https://demo-beta-topaz.vercel.app
DEMO_NOTIFY_SECRET=<openssl rand -hex 32>
EXA_API_KEY=<optional>
LITELLM_API_KEY=<sk-...>
OPENAI_API_KEY=<optional>

── Start engine locally (Supabase DB) ──
export \$(grep -v '^#' .env | xargs)
docker compose -f infra/docker-compose.supabase.yml up -d

── Deploy Kestra to Heroku (student credits) ──
./scripts/deploy-kestra-heroku.sh

── Vercel demo env (after Kestra is reachable) ──
cd demo && vercel env add KESTRA_PUBLIC_URL production   # Fly URL or https://your-host:8080
cd demo && vercel env add DATABASE_URL production       # Supabase connection string
cd demo && vercel env add NOTIFY_SECRET production      # same as DEMO_NOTIFY_SECRET

EOF
