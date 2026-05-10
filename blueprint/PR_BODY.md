# Add `lighthouse-research-quickstart` blueprint

## Summary

Adds a single-file blueprint that pulls today's RSS + arxiv items for a
single topic, embeds them in pgvector, classifies + summarises with Gemini,
and posts a daily brief to Notion. It's the slimmed entrypoint to the full
[Lighthouse research OS](https://github.com/guglxni/lighthouse-kestra) — same
patterns, fewer moving parts, runs on a stock Kestra + Postgres-pgvector
docker-compose with three secrets (`OPENAI_API_KEY`, `GEMINI_API_KEY`,
`NOTION_API_KEY`).

The blueprint demonstrates:

- **Schedule triggers** for a daily brief at 08:00.
- **`io.kestra.plugin.scripts.python.Script`** with the Docker task runner
  for a portable `feedparser + arxiv` ingest step.
- **`io.kestra.plugin.jdbc.postgresql.Queries`** for idempotent schema
  bootstrap and `ON CONFLICT … DO NOTHING` upserts (one `lh.documents`
  table, one `lh.embeddings` table with `vector(1536)` + HNSW).
- **`io.kestra.plugin.ai.completion.Classification`** + **`ChatCompletion`**
  for relevance scoring and brief assembly.
- **`io.kestra.plugin.notion.blocks.CreatePage`** for delivery.
- Standard `retry.constant` and `runIf` gating for the embed/insert steps.

The full Lighthouse repo extends this with seven source types (RSS via
Miniflux webhooks, arxiv, GitHub trending, HN/Reddit, transcribed YouTube/
podcasts, web articles with a Trafilatura → Jina → Playwright fallback),
the multi-LLM fallback chain from your May 7 production-AI blog, three
Kestra Apps (dashboard, chat-the-brief, on-demand deep-dive), and a
single-pager `monitors.alerts` flow listening across `lighthouse.*`.

## Why this blueprint

- Most users discovering Kestra via the AI-workflows lane want the smallest
  possible "brief in my Notion every morning" pipeline. This is that.
- It mirrors the shape of the existing `ai-notion-summary-perplexity`
  blueprint but adds **vector storage + dedup** (a request that came up
  multiple times in the community).
- It's a clean upsell to the full [Lighthouse repo](https://github.com/guglxni/lighthouse-kestra)
  for users who want multi-source / multi-LLM / multi-channel.

## How to test

```bash
# starting from a fresh Postgres + pgvector + Kestra:
psql -c "CREATE EXTENSION IF NOT EXISTS vector;"
# Drop the YAML into Kestra (Flows → Create), set the three secrets, set
# inputs.notion_page_id to a Notion page you've shared with your bot, hit
# Execute. The brief lands in Notion within 1–2 minutes.
```

## Notes

- All task FQNs are stable Kestra plugins; no plugin install gymnastics.
- The Docker task-runner image is `python:3.11-slim` so cold-start is fast.
- Idempotent end-to-end: re-running the same day is a no-op except for the
  Notion post (which is intentional — re-running republishes).

## Author

Built as part of the #KestraAcademy contest entry. Repo:
`github.com/aaryanguglani/lighthouse`. Blog post:
`lighthouse-orchestrating-research-with-kestra.md` in the same repo.

Happy to iterate on naming, default secrets shape, or category tagging if
this needs to fit a particular section of the blueprints catalog.
