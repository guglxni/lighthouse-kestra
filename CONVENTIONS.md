# Lighthouse Conventions

This file is the single source of truth for naming, schemas, secrets, and identifiers across all flows, scripts, and infra. Any deviation must update this file first.

## 1. Kestra namespaces

Kestra requires a `company.team`-shape top-level namespace; we anchor everything under `company.team` and use dotted sub-namespaces:

- `company.team.lighthouse.ingest` — source-specific fetchers
- `company.team.lighthouse.process` — embed / dedup / classify / cluster / summarize
- `company.team.lighthouse.deliver` — daily brief assembly + delivery
- `company.team.lighthouse.serve` — chat-the-brief + on-demand deep-dive
- `company.team.lighthouse.monitors` — single-pager alert flow
- `company.team.lighthouse.maintenance` — gc / archive + docs stubs (e.g. graphify refresh)

Flow IDs are short and lowercase (e.g. `rss`, `arxiv`, `embed_dedup`, `brief`). The fully-qualified flow name is `<namespace>.<id>`, e.g. `company.team.lighthouse.ingest.rss`.

> Note: Throughout docs we shorthand these as `lighthouse.ingest.rss` etc.; the actual namespace value in YAML is always the full `company.team.lighthouse.<sub>`.

## 2. Postgres schema

Database: `lighthouse` &nbsp;&nbsp; Schema: `lh`

| Table | Purpose | Key columns |
| --- | --- | --- |
| `lh.documents` | One row per fetched item | `id` (uuid pk), `topic_id`, `source`, `source_id`, `url`, `title`, `author`, `published_at`, `fetched_at`, `raw_text`, `language`, `metadata` jsonb |
| `lh.embeddings` | pgvector embeddings, 1536-d | `document_id` fk, `embedding vector(1536)`, `model`, `created_at` |
| `lh.classifications` | Per-document scoring | `document_id` fk, `topic_id`, `relevance` numeric, `category` text, `tags` text[], `model`, `created_at` |
| `lh.briefs` | Daily brief artifacts | `id` uuid pk, `topic_id`, `date`, `markdown`, `clusters` jsonb, `delivered_to` text[] |
| `lh.chat_history` | RAG chat transcripts | `session_id` text, `topic_id`, `role`, `content`, `created_at` |

Schema files: `sql/schema.sql` (tables + indices) and `sql/pgvector_init.sql` (extension + vector index).

Unique constraint: `lh.documents (topic_id, source, source_id)` — prevents source-level dupes before semantic dedup.

## 3. KV store keys

Kestra KV is namespaced per flow's namespace; we use these key shapes:

- `topic:<id>:watermark:<source>` — last-seen item id/timestamp per (topic, source). Value: ISO-8601 string or source-native cursor.
- `topic:<id>:profile` — cached topic profile blob (JSON).
- `topic:<id>:last_brief` — ISO date of last delivered brief.
- `chat:<session_id>:history` — last 20 chat turns (JSON array).
- `dedup:seen:<sha256>` — short-TTL marker for in-flight items (avoids race on parallel ingest).

## 4. Secrets

All referenced as `{{ secret('NAME') }}`:

| Secret | Purpose |
| --- | --- |
| `LITELLM_BASE_URL` | OpenAI-compatible root (`http://litellm:4000/v1` in compose) |
| `LITELLM_API_KEY` | LiteLLM master key (Bearer token for Kestra) |
| `LITELLM_MODEL_PRIMARY` | Required model id / router alias |
| `LITELLM_MODEL_FALLBACK` | Optional secondary model id (multi / `use_multi_llm`) |
| `OPENAI_API_KEY` | **Upstream** for LiteLLM (and optional direct scripts) |
| `AZURE_OPENAI_ENDPOINT` | Azure resource base URL for Kimi (e.g. `https://<resource>.openai.azure.com/`) |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI key for Kimi deployment |
| `AZURE_OPENAI_DEPLOYMENT_KIMI` | Azure **deployment name** for Kimi K2.6 (maps to `modelName` on `AzureOpenAI` provider) |
| `EXA_API_KEY` | Optional Exa semantic search (`flows/ingest/exa_search.yaml` / brief enrichment) |
| `ANTHROPIC_API_KEY` | Optional **tertiary** fallback only (not the primary stack) |
| `NOTION_API_KEY` | Brief delivery |
| `SLACK_WEBHOOK_URL` | **Monitors only** — Slack *Incoming Webhook* URL (`flows/monitors/alerts.yaml`) |
| `SLACK_BOT_TOKEN` | Optional / reserved (not used by current flows; brief uses webhooks) |
| `KESTRA_PUBLIC_URL` | Public UI base for alert deep-links (no trailing slash) |
| `DISCORD_WEBHOOK_AGENTIC` / `_SOLANA` / `_INDIE` / `_DATAENG` | Per-topic Discord webhooks |
| `SENDGRID_API_KEY` | Email delivery |
| `MINIFLUX_TOKEN`, `MINIFLUX_URL` | RSS aggregator |
| `SEARXNG_URL` | Self-hosted meta-search for chat |
| `GITHUB_TOKEN` | GitHub trending + repo metadata |
| `REDDIT_USER_AGENT` | Reddit JSON polling |
| `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | DB |
| `S3_BUCKET`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | gc archive |
| `NOTION_PAGE_AGENTIC` / `_SOLANA` / `_INDIE` / `_DATAENG` | Per-topic Notion pages |

Secrets are documented in `README.md` and read via `{{ secret('...') }}` in every flow.



## 4b. LiteLLM BYOK (canonical)

All **AI plugin** tasks that target OpenAI-compatible APIs should point at the **LiteLLM**
container using `io.kestra.plugin.ai.provider.OpenAI` with:

- `apiKey`: `{{ secret('LITELLM_API_KEY') }}` — LiteLLM **master** key (never commit real keys).
- `baseUrl`: `{{ secret('LITELLM_BASE_URL') }}` — e.g. `http://litellm:4000/v1` on Docker network.
- `modelName`: `{{ secret('LITELLM_MODEL_PRIMARY') }}` or fallback / router alias.

**Runtime modes**

| Host env | Meaning |
| --- | --- |
| `LITELLM_MODE=single` | LiteLLM exposes one primary vendor model; Kestra calls one completion per step. |
| `LITELLM_MODE=multi` | Configure LiteLLM `model_list` / router fallbacks (e.g. OpenAI → OpenAI alternate → Azure Kimi). Flows can still use **one** base URL; optionally set `inputs.use_multi_llm=true` to run **Kestra-side** `runIf` fallbacks with `LITELLM_MODEL_FALLBACK`. |

Provider keys such as `OPENAI_API_KEY` live in **`.env`** for the LiteLLM service (upstream), not in individual Kestra tasks.

**Validated shapes** via Kestra MCP `task_schema` (2026-05): `OpenAI` provider documents `baseUrl` for proxies; `ChatCompletion` / `Classification` accept that provider configuration.


## 5. Multi-LLM fallback chain

Pattern inspired by the [Kestra May 7 2026 production AI workflows post](https://kestra.io/blogs/ai-workflows-in-production) (Gemini-forward examples there); **Lighthouse adapts it to an OpenAI-first stack**: each LLM step is a sequence of tasks chained by `runIf` checking the previous task's `executionStatus`, with `allowFailure: true` and `retry.constant maxAttempts:3 interval:PT1S`.

| Step | Primary (OpenAI) | Fallback 1 (Azure Kimi) | Fallback 2 (optional) |
| --- | --- | --- | --- |
| Classify | `gpt-5.4` (`io.kestra.plugin.ai.provider.OpenAI`) | `modelName: "{{ secret('AZURE_OPENAI_DEPLOYMENT_KIMI') }}"` on `io.kestra.plugin.ai.provider.AzureOpenAI` | e.g. Anthropic — only if configured |
| Summarize / reasoning | `gpt-5.5` (same OpenAI provider type) | Same Azure Kimi deployment pattern | optional tertiary |
| Embed | `text-embedding-3-small` (OpenAI, 1536d) | sentence-transformers local | — |

**OpenAI provider** (typical):

```yaml
provider:
  type: io.kestra.plugin.ai.provider.OpenAI
  apiKey: "{{ secret('OPENAI_API_KEY') }}"
  modelName: gpt-5.4   # or gpt-5.5 for quality-tier steps
```

**Azure OpenAI — Kimi K2.6** (deployment id + endpoint; align property names with live Kestra `AzureOpenAI` docs if they differ):

```yaml
provider:
  type: io.kestra.plugin.ai.provider.AzureOpenAI
  apiKey: "{{ secret('AZURE_OPENAI_API_KEY') }}"
  endpoint: "{{ secret('AZURE_OPENAI_ENDPOINT') }}"
  modelName: "{{ secret('AZURE_OPENAI_DEPLOYMENT_KIMI') }}"
```

Plugin tasks used:

- `io.kestra.plugin.ai.completion.Classification`
- `io.kestra.plugin.ai.completion.ChatCompletion`
- `io.kestra.plugin.ai.agent.AIAgent`
- `io.kestra.plugin.ai.embeddings.OpenAIEmbedding`
- `io.kestra.plugin.ai.rag.IngestDocument`
- `io.kestra.plugin.ai.rag.Search`

## 5b. Optional Exa enrichment

Short semantic web context: `io.kestra.plugin.core.http.Request` to Exa’s API with `Authorization: Bearer {{ secret('EXA_API_KEY') }}`. Prefer `flows/ingest/exa_search.yaml` or a subflow from `web_articles` / deep-dive prep; use `allowFailure: true` when the key is absent.

## 5c. Authoring: Kestra MCP

Implementation and validation should **invoke** [`https://api.kestra.io/v1/mcp`](https://api.kestra.io/v1/mcp) tools (`list_plugins`, `plugin_tasks`, `task_schema`, `blueprints`, `get_blueprint_flow`, `search`) from Cursor or via JSON-RPC `curl` when MCP transports are unavailable. This repository used `task_schema` to confirm `io.kestra.plugin.ai.provider.OpenAI#baseUrl` for LiteLLM, plus `Classification` / `ChatCompletion` wiring.

## 6. Multi-tier extraction fallback (web)

Same `runIf` chain pattern, applied outside AI:

1. Trafilatura (`scripts/extract_trafilatura.py` via `io.kestra.plugin.scripts.python.Script`)
2. Jina Reader (`https://r.jina.ai/<url>`) via `io.kestra.plugin.core.http.Request`
3. Headless Playwright in Docker (`io.kestra.plugin.scripts.python.Script` with `taskRunner: io.kestra.plugin.scripts.runner.docker.Docker`)

## 7. Concurrency + retries

- All ingest flows: `concurrency: { limit: 10, behavior: QUEUE }`
- All process flows: `concurrency: { limit: 5, behavior: QUEUE }`
- Default per-task: `retry: { type: constant, maxAttempts: 5, interval: PT2S }`
- External-API tasks always set `timeout: PT60S` and `allowFailure: false` unless part of an explicit fallback chain.

## 8. Topic profiles

Stored as Kestra Namespace Files at `flows/_namespace_files/topics/<id>.yaml`. Engine flows read the active topic from `inputs.topic_id` (default `agentic-eng`). Profile schema:

```yaml
id: <slug>
name: <display name>
sources:
  rss: [list of feed URLs]
  arxiv_categories: [cs.AI, ...]
  github_queries: [list of GitHub search query strings]
  hn_keywords: [list of strings]
  reddit_subs: [list of subreddit slugs]
  youtube_channels: [list of channel handles]
  web_extra: [list of arbitrary URLs]
schedule: "<cron>"
delivery:
  notion_page_id: "{{ secret('NOTION_PAGE_<TOPIC>') }}"
  slack_channel: "#<channel>"
  discord_webhook: "{{ secret('DISCORD_<TOPIC>') }}"
  email_to: "<email>"
prompts:
  classify: "<prompt>"
  summarize: "<prompt>"
ranking:
  top_n_clusters: 5
  min_relevance: 0.6
```

## 9. Triggers

- **Schedule**: `io.kestra.plugin.core.trigger.Schedule` on every ingest flow + `deliver.brief`.
- **Realtime**: Miniflux webhook → `io.kestra.plugin.core.trigger.Webhook` on `ingest.web_articles`.
- **Flow trigger**: `io.kestra.plugin.core.trigger.Flow` listens for SUCCESS on any `ingest.*` and kicks `process.embed_dedup`. Same plugin used for `monitors.alerts` listening FAILED|WARNING across `company.team.lighthouse.*`.

## 10. Worker / scripts

`infra/Dockerfile.worker` builds a Debian-slim image with Python 3.11 + ffmpeg + the packages in `scripts/requirements.txt`. Used by Kestra's Docker task runner for Whisper, Trafilatura, BERTopic, GPT-Researcher.
