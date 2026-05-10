# Security policy

## Supported versions

| Area | Version / policy |
|------|------------------|
| Kestra | Pinned in [`infra/docker-compose.yml`](infra/docker-compose.yml) (currently `kestra/kestra:v0.21.0`) |
| Lighthouse flows | `main` branch — report issues against latest |

## Threat model (local / demo stack)

This repository targets a **developer laptop or small team homelab** using Docker Compose. It is **not** a hardened production baseline without extra controls:

| Risk | Mitigation / note |
|------|-------------------|
| **Kestra UI without auth** | `basic-auth.enabled: false` in the bundled compose is intentional for local dev. Put Kestra behind **TLS + SSO or basic auth** (reverse proxy) before exposing port `8080` to a network. |
| **Docker socket mounted into Kestra** | `docker-compose` mounts `/var/run/docker.sock` so `Script` tasks can use the Docker task runner. This grants the Kestra container **`docker`-equivalent privileges** on the host. Prefer a **remote worker** that only runs approved images, or drop the socket if you do not need Docker runners. |
| **Postgres on `5432`** | Exposed for local tools. On a server, **bind to `127.0.0.1` only** or remove the `ports:` mapping and use an internal network. |
| **Default Miniflux password** | Replace `MINIFLUX_ADMIN_PASSWORD` and `MINIFLUX_WEBHOOK_SECRET` in `.env` with strong random values before any non-local use (see [`.env.example`](.env.example)). |
| **LiteLLM master key** | Set `LITELLM_API_KEY` / `LITELLM_MASTER_KEY` to a long random string; do not reuse demo defaults on reachable hosts. |
| **Outbound webhooks** | `flows/deliver/brief.yaml` only POSTs to **`https://`** Discord/Slack URLs from secrets to reduce accidental `file://` or MITM downgrade. Configure webhooks in Slack/Discord with least privilege. |

## Reporting vulnerabilities

Please open a **private** report via GitHub Security Advisories for this repository, or email the maintainer if disclosure requires it. Include repro steps and impact; we aim to acknowledge within a few business days.

## Dependency & supply chain

- **LiteLLM** and **SearxNG** images should be **pinned** in Compose (update intentionally). Floating `latest` / `main-latest` tags increase surprise upgrades.
- Use `.env` for secrets; **never commit** `.env` or API keys (see [`.gitignore`](.gitignore)).
- Enable **Dependabot** (`.github/dependabot.yml`) for GitHub Actions; consider `pip audit` / `docker scout` in your own CI for the worker image.

## Slack monitor (`flows/monitors/alerts.yaml`)

Alerts use **Slack Incoming Webhooks** (`SLACK_WEBHOOK_URL`), not `chat.postMessage`. Do not point this task at `https://slack.com/api/chat.postMessage` without a **Bearer bot token** — that pattern belongs in a different integration (`SLACK_BOT_TOKEN` + HTTP `Authorization` header).

## Responsible AI / data

- Ingest flows pull **public** RSS, APIs, and URLs you configure. Ensure your use complies with **terms of service**, **copyright**, and **privacy** (e.g. Miniflux, arXiv, GitHub, Reddit).
- **PG content** may include article full text — encrypt volumes at rest and restrict DB access in production.
