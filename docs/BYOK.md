# Bring your own model (provider-agnostic)

Lighthouse routes **all** LLM traffic through **LiteLLM** using an **OpenAI-compatible** client in Kestra (`baseUrl` + `Bearer` + `model` string). That design is **not tied to OpenAI, Kimi, or any single vendor**.

## What you control

1. **`LITELLM_BASE_URL`** — Usually `http://litellm:4000/v1` in Docker. You can instead point Kestra at **any** OpenAI-compatible endpoint (e.g. [vLLM](https://github.com/vllm-project/vllm), [Ollama OpenAI compatibility](https://github.com/ollama/ollama/blob/main/docs/openai.md), [Groq](https://console.groq.com/docs/openai), [Together](https://docs.together.ai/docs/openai-api-compatibility), a corporate gateway) **if you skip LiteLLM** and set secrets accordingly — the flows use the same HTTP shape.

2. **`LITELLM_MODEL_PRIMARY` / `LITELLM_MODEL_FALLBACK`** — These are **logical names** that must match **`model_name`** entries in [`infra/litellm/config.yaml`](../infra/litellm/config.yaml) (or your replacement config). Name them `my-fast`, `my-quality`, `qwen-local`, etc.

3. **`infra/litellm/config.yaml`** — This is where **provider, API keys, and optional `api_base`** are defined. Add LiteLLM `model_list` rows for Anthropic, Gemini, Mistral, Azure, Bedrock, etc., per [LiteLLM providers](https://docs.litellm.ai/docs/providers). The shipped file only includes **example** entries; **replace or extend** for your keys.

4. **Embeddings** — `embed_dedup` calls `/v1/embeddings` with `text-embedding-3-small` by default. For a local-only stack, add a LiteLLM route to an OpenAI-compatible embedding model or change the `EMBEDDING_MODEL` env in that flow after validating dimensions vs [`sql/schema.sql`](../sql/schema.sql) (`vector(1536)`).

## Presets (for a future UI)

Major patterns you can expose as dropdown presets without changing Kestra YAML:

| Preset | Typical LiteLLM `model` string | Notes |
|--------|--------------------------------|-------|
| OpenAI API | `openai/gpt-*` | `OPENAI_API_KEY` |
| Azure OpenAI | `azure/<deployment>` | `AZURE_OPENAI_*` |
| Anthropic | `anthropic/claude-*` | `ANTHROPIC_API_KEY` |
| Google AI | `gemini/*` | `GEMINI_API_KEY` |
| Groq | `groq/llama-*` | `GROQ_API_KEY` |
| Ollama (local) | `openai/<model>` + `api_base` | No cloud key |
| Together / Fireworks / Mistral | Provider docs | Single |

A static or Vercel **frontend** can only **generate** `config.yaml` fragments and env var checklists; runtime keys stay on the host or in your secret manager.

## Exa (semantic search) — BYOK

[Exa](https://exa.ai) is **optional**. Lighthouse never ships a shared key.

- **`EXA_API_KEY`** — Your Exa API key (`Bearer` in [`flows/ingest/exa_search.yaml`](../flows/ingest/exa_search.yaml)).
- **`EXA_API_BASE`** — Base URL only (default `https://api.exa.ai`). Change only if Exa documents an alternate endpoint or you route through an approved proxy; the flow appends `/search`.

Unset key → the HTTP task may fail auth; the flow is configured with **`allowFailure: true`** so the rest of the pipeline continues.

## Kestra MCP (authoring)

When editing flows, use the public catalog at **[Kestra MCP – plugins and blueprints](https://kestra.io/blogs/2026-04-30-kestra-mcp-plugins-blueprints)** (`https://api.kestra.io/v1/mcp`) so `task_schema` / `get_blueprint_flow` match your Kestra version’s task FQCNs.
