# Deploy Kestra on Heroku + Supabase

Use **Heroku credits** for the Kestra engine and **Supabase** for Postgres + auth.

| Layer | Host | Cost |
|-------|------|------|
| Vercel demo | `demo-beta-topaz.vercel.app` | Free tier |
| **Kestra** | **Heroku** (`lighthouse-kestra`) | Student credits / ~$25 Standard-1X |
| **Postgres** | **Supabase** (`qtvlohzprhrworvhlchk`) | Free tier |
| LiteLLM / models | *Not on Heroku* | **BYOK** — users set keys/models in demo Settings; forwarded per Kestra execution |

## Prerequisites

```bash
heroku login
supabase login
supabase link --project-ref qtvlohzprhrworvhlchk
```

## 1. Supabase — pipeline tables (`lh.*`)

```bash
./scripts/repair-supabase-migrations.sh   # if db push complains about history
# or
./scripts/deploy-supabase-backend.sh
```

Password: Supabase Dashboard → **Settings → Database**.

## 2. Heroku — Kestra container

```bash
export SUPABASE_DB_PASSWORD='...'
./scripts/deploy-kestra-heroku.sh
```

Do **not** set `LITELLM_*`, `OPENAI_*`, or model names on Heroku — the demo forwards BYOK on each brief run.
Optional: set `EXA_API_KEY` on Heroku only if you want **scheduled** ingest crons to use Exa without a user in the dashboard.

Creates app `lighthouse-kestra` (override with `HEROKU_APP_NAME`).

After deploy:

- API: `https://lighthouse-kestra.herokuapp.com`
- UI: `https://lighthouse-kestra.herokuapp.com/ui`

**Dyno sizing:** script tries `standard-1x` (2GB). If credits are tight it falls back to `basic` (512MB) — may OOM on heavy briefs.

**No Docker socket on Heroku** — the Heroku image swaps Script tasks to **Process** runner (see `infra/Dockerfile.kestra-heroku`).

## 3. Vercel — point demo at Heroku + Supabase

```bash
cd demo
vercel env add KESTRA_PUBLIC_URL production
# https://lighthouse-kestra.herokuapp.com

vercel env add NOTIFY_SECRET production
# same value as DEMO_NOTIFY_SECRET on Heroku

vercel env add DATABASE_URL production
# postgresql://postgres:PASSWORD@db.qtvlohzprhrworvhlchk.supabase.co:5432/postgres?sslmode=require

vercel --prod
```

## 4. Verify

1. Dashboard → Engine pill **live**
2. Run sample brief → Kestra executions for `exa_search`, `classify`, `cluster_summarize`
3. `lh.briefs` row in Supabase SQL editor
4. Delivery via `deliver.brief` → Vercel `/api/notify`

## Student credits

Check: Heroku Dashboard → **Account settings → Billing → Platform credits**.

Credits typically do not roll over month to month.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `H10 App crashed` | `heroku logs --tail -a lighthouse-kestra` — often bad `SUPABASE_DB_PASSWORD` or OOM |
| Brief 503 on Vercel | `KESTRA_PUBLIC_URL` missing or Heroku app sleeping (use Standard, not Eco sleep) |
| Flow script fails | Process runner lacks Playwright — `web_articles` deep extract may skip; Exa/classify/summarize work |
| Migration drift | `./scripts/repair-supabase-migrations.sh` |

## Architecture

```
Vercel demo  ──POST executions──►  Heroku Kestra
       │                              │
       │ DATABASE_URL                 │ JDBC (SUPABASE_DB_*)
       ▼                              ▼
              Supabase Postgres (lh.* + public.*)
```

See also [`DEPLOY_SUPABASE.md`](./DEPLOY_SUPABASE.md) for local `docker-compose.supabase.yml` dev.
