# Lighthouse — live demo

A friendly, opinionated front door to the Lighthouse research OS. Built for the everyday user, not the operator. Tries to answer one question well:

> _“What happened today in the things I care about?”_

## What you actually see

- **Hero** — plain-English pitch, no jargon.
- **Live status** — three pills (Engine / Library / AI router) wired to real probes.
- **Try a brief** — pick a topic, ask a question, get a Markdown brief generated with **your own** API key. Key lives in your browser; we never store or proxy it.
- **Settings** — Supabase-backed account where you save model names, base URL, Exa key (optional), and Slack/Discord/Notion/email destinations.
- **Topic gallery** — the preset profiles shipped in `flows/_namespace_files/topics/`.

Auth is email + password via Supabase. Account isn’t needed to read the page — it _is_ needed to save settings and run a brief with your key.

## Stack

- Next.js 15 App Router · server loaders + JSON route
- [`@floating-ui/react`](https://github.com/floating-ui/floating-ui) for tooltips and the topic picker
- [`@supabase/ssr`](https://supabase.com/docs/guides/auth/server-side/nextjs) for auth + per-user settings
- [`react-markdown`](https://github.com/remarkjs/react-markdown) for the sample brief renderer
- Tailwind CSS, with a brand palette tuned for low-attention reading

## Quick start

```bash
# 1) Stand up the backing services
cd /path/to/lighthouse
docker compose -f infra/docker-compose.yml -f infra/docker-compose.override.yml \
  up -d postgres litellm kestra

# 2) Apply the Supabase migration once (sets up user_settings + sample_briefs + RLS)
supabase login                                            # one-time
supabase link --project-ref qtvlohzprhrworvhlchk          # in repo root
supabase db push                                          # applies supabase/migrations/*.sql

# 3) Run the demo
cd demo
cp -n .env.example .env.local
npm install
npm run dev
# → http://localhost:3010
```

If `supabase db push` asks for the database password, get it from the Supabase dashboard → **Project Settings → Database → Connection string**.

## Environment

| Variable                              | Purpose                                                                            | Default                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`            | Supabase project URL                                                               | (required)                                               |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`| Supabase publishable key (safe in browser)                                         | (required)                                               |
| `NEXT_PUBLIC_SITE_URL`                | Site origin, used for auth redirects                                               | `http://localhost:3010`                                  |
| `KESTRA_PUBLIC_URL`                   | Kestra OSS API base                                                                | `http://127.0.0.1:8090`                                  |
| `KESTRA_TENANT`                       | Kestra tenant slug                                                                 | `main`                                                   |
| `KESTRA_API_TOKEN` / `BASIC_AUTH_*`   | Optional auth when Kestra is exposed                                               | unset                                                    |
| `DATABASE_URL`                        | Postgres reachable from the demo (reads `lh.*` for the Library pill)               | local Compose                                            |
| `LITELLM_BASE_URL` / `LITELLM_API_KEY`| Optional — turns on the AI router pill                                             | unset (BYOK still works fine)                            |

## BYOK design

API keys never touch the database. The Settings form writes:

- **API keys** → `localStorage` on the user’s device
- **Non-secret prefs** (base URL, model names, webhook URLs, email-to) → `public.user_settings` via Supabase (RLS: each user reads/writes only their own row)

When you click **Run a sample brief**, the browser POSTs `{ topicId, prompt, byok }` to `/api/try-brief`. The server forwards the request to your provider and never logs the key. The generated Markdown _is_ stored in `public.sample_briefs` so you have history.

## What Supabase Pro unlocks here (besides auth)

- **Postgres + RLS** for `user_settings`, `sample_briefs`, and future per-user state (no separate auth/db plumbing).
- **Realtime** — `public.sample_briefs` is RLS-scoped, so we can stream new briefs into the dashboard with `supabase.channel('sample_briefs')`.
- **Storage** — attach a Notion export / PDF to a topic and persist it without a separate bucket.
- **Edge Functions** — host a lightweight `digest-cron` outside Kestra for users who don’t want the full Compose stack.
- **Auth providers** — flip on magic links / OAuth from the dashboard without code changes.

## Hosting

This is a Next.js app with server routes; it needs a Node host (Vercel, Fly, Railway, Heroku). GitHub Pages is static-only and won’t run `/api/*`. If you do want a static landing page on Pages, host the demo backend on Vercel and link out — keep AI keys out of the static page.

## JSON feed

`GET /api/dashboard` returns the same payload that powers the page — useful for CI smoke checks.
