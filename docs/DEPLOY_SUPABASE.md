# Supabase (data plane)

Supabase hosts **auth**, **user settings**, and **`lh.*` pipeline tables**. Kestra runs on **Heroku** (see [`DEPLOY_HEROKU.md`](./DEPLOY_HEROKU.md)).

## Push schema

```bash
supabase link --project-ref qtvlohzprhrworvhlchk
./scripts/deploy-supabase-backend.sh
```

If migration history is out of sync:

```bash
./scripts/repair-supabase-migrations.sh
```

## Local dev against cloud Supabase

```bash
# .env
SUPABASE_DB_HOST=db.qtvlohzprhrworvhlchk.supabase.co
SUPABASE_DB_PASSWORD=...

docker compose -f infra/docker-compose.supabase.yml up -d
```

Full Docker script runner (needs local Docker socket).

## Connection string for Vercel `DATABASE_URL`

```
postgresql://postgres:PASSWORD@db.qtvlohzprhrworvhlchk.supabase.co:5432/postgres?sslmode=require
```

Pooler (optional for serverless): use Supabase **Transaction pooler** port `6543` if you hit connection limits.
