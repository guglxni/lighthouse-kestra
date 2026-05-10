# Lighthouse

Multi-source **research OS** orchestrated with [**Kestra**](https://kestra.io): scheduled ingest, pgvector embeddings, LiteLLM **BYOK** (single- or multi-model), optional Exa enrichment, and briefing delivery.

## Quickstart

1. Copy env template: `cp .env.example .env`
2. Set **at minimum** `OPENAI_API_KEY` (for LiteLLM upstream) and choose `LITELLM_API_KEY` (proxy master key).
3. `docker compose -f infra/docker-compose.yml up -d`
4. Open Kestra at `http://localhost:8080`, sync `flows/`, run an ingest flow (ex: `company.team.lighthouse.ingest.rss`).

See `CONVENTIONS.md` for namespaces, secrets, and LiteLLM modes.

## LiteLLM BYOK

- Flows call **`http://litellm:4000/v1`** with `secret('LITELLM_API_KEY')` and model names from `LITELLM_MODEL_*` — not raw provider keys inside YAML.
- **`LITELLM_MODE=single`**: one logical model per step.
- **`LITELLM_MODE=multi`**: extend `infra/litellm/config.yaml` with router/fallbacks; optionally set flow input `use_multi_llm: true` to exercise Kestra-side `runIf` fallbacks documented in `flows/process/classify.yaml`.

## Stack (docker compose)

| Service | Role |
| --- | --- |
| Postgres + pgvector | App schema `lh` + Kestra + Miniflux DB |
| Kestra | Orchestration, Apps, AI + JDBC plugins |
| LiteLLM | OpenAI-compatible proxy / router |
| Miniflux | RSS aggregation + webhooks |
| SearxNG | Self-hosted meta search |
| worker image | yt-dlp, Whisper, trafilatura, research helpers |

## Key paths

- `flows/` — production-shaped flows (`ingest`, `process`, `deliver`, `serve`, `monitors`, `apps`)
- `infra/docker-compose.yml` — stack definition
- `infra/litellm/config.yaml` — LiteLLM routes / placeholders
- `sql/` — pgvector + `lh` schema
- `topics/` — topic profiles (mirrored under `flows/_namespace_files/topics/` for Git sync)
- `tests/flow_tests/` — structural YAML tests
- `.github/workflows/validate-flows.yml` — CI YAML validation

## Optional: Exa + Slack

- `EXA_API_KEY` enables `flows/ingest/exa_search.yaml` (HTTP to Exa; `allowFailure: true`).
- `SLACK_WEBHOOK_URL` feeds `flows/monitors/alerts.yaml`.

## Authoring with Kestra MCP

Use [`https://api.kestra.io/v1/mcp`](https://api.kestra.io/v1/mcp) (`task_schema`, `plugin_tasks`, …) so plugin YAML stays valid.

## License

See `LICENSE`.
