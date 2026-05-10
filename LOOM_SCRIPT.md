# 2-minute Loom script

1. **Hook** — “This is Lighthouse: research ingest + Kestra + LiteLLM BYOK.”
2. **Compose** — Show `infra/docker-compose.yml` services coming up; highlight LiteLLM + Kestra.
3. **Flow graph** — `ingest.rss` ➜ `process.embed_dedup` ➜ `classify` ➜ `cluster_summarize` ➜ `deliver.brief`.
4. **BYOK** — Open `.env.example`; explain `OPENAI_API_KEY` upstream vs `LITELLM_API_KEY` for the proxy.
5. **Outcome** — Show `lh.briefs` row / Discord webhook test; mention optional Exa + Exa flow.
6. **Close** — CTA: star repo, fork a `topics/*.yaml` profile.
