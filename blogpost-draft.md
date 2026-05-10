# Lighthouse: orchestrating multi-source research with Kestra (draft)

Lighthouse is a research operating system: ingestion, embeddings, LiteLLM-backed BYOM/BYOK inference, and brief delivery in one repository of flows.

## Why LiteLLM sits in front

Teams want **one OpenAI-compatible surface** inside orchestration. LiteLLM supplies master-key auth, multi-provider routing, and predictable `baseUrl`s so Kestra YAML stays short (`LITELLM_MODEL_PRIMARY`, optional fallbacks).

## Kestra MCP

We validated task shapes with the official MCP endpoint — especially `io.kestra.plugin.ai.provider.OpenAI#baseUrl` — before writing AI steps, then kept HTTP fallbacks for bulk operations that need safer persistence.

## What is next

Blueprint contribution (`blueprint/`), deeper RAG via `io.kestra.plugin.ai.rag.*`, and polished Apps UX.
