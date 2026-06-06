# WebMCP integration

Lighthouse implements [WebMCP](https://github.com/webmachinelearning/webmcp) via `document.modelContext.registerTool()`.

**Pages:** `/dashboard` (full tools) · `/settings` (config tools)  
**Signed in:** required for API-backed tools  
**Secrets policy:** write-only inputs; responses use masked fingerprints only (`sk-…abcd`, `xoxb-…wxyz`)

## Setup flow for agents (recommended)

```
1. lighthouse-authsome-setup-guide  provider=all | slack | notion | openai | …
2. User runs authsome login <provider> on their machine (or pastes keys once)
3. lighthouse-configure-llm | lighthouse-configure-exa | lighthouse-configure-agentmail
   OR lighthouse-import-authsome-token  provider=slack|notion
   OR lighthouse-start-oauth  provider=slack|notion
4. lighthouse-get-config-status  → verify masked status
5. lighthouse-configure-delivery  → webhooks, email, default topic
6. lighthouse-list-topics → lighthouse-select-topic → lighthouse-run-sample-brief
```

## Configuration tools (settings + dashboard)

### lighthouse-get-config-status

Returns JSON with `llm`, `exa`, `agentmail`, `delivery` — **no full secrets**.

### lighthouse-configure-llm

**Input:** `{ apiKey, modelPrimary, baseUrl?, name?, modelQuality? }`  
**Storage:** browser `localStorage` (BYOK) + non-secret model fields in Supabase  
**Use with authsome:** export key locally, pass once to this tool

### lighthouse-configure-exa

**Input:** `{ apiKey }` — browser localStorage only

### lighthouse-configure-agentmail

**Input:** `{ apiKey, inboxId, emailTo? }` — key in localStorage; inbox/email in Supabase

### lighthouse-configure-delivery

**Input:** `{ defaultTopicId?, slackWebhook?, discordWebhook?, telegramChatId?, notionPageId?, emailTo? }`  
**Storage:** Supabase `user_settings` (RLS). Webhooks masked in status.

### lighthouse-import-authsome-token

**Input:** `{ provider: "slack"|"notion", accessToken, label? }`  
**Source:** `authsome get slack --field access_token` (user machine)  
**Storage:** Supabase server-side (`slack_access_token` / `notion_access_token`)  
**Response:** masked token fingerprint only

### lighthouse-start-oauth

**Input:** `{ provider: "slack"|"notion" }`  
Opens Lighthouse-hosted OAuth in a new tab (alternative to authsome CLI).

### lighthouse-authsome-setup-guide

**Input:** `{ provider?: "slack"|"notion"|"openai"|"exa"|"agentmail"|"all" }`  
Returns step-by-step authsome + Lighthouse tool mapping.

### lighthouse-send-test-email

Requires AgentMail BYOK + `emailTo`. Sends test via `/api/send-email`.

### lighthouse-open-settings

Navigates to `/settings` for human review.

## Brief tools (dashboard only)

| Tool | Purpose |
|------|---------|
| `lighthouse-list-topics` | Topics + active id |
| `lighthouse-select-topic` | Set active topic |
| `lighthouse-run-sample-brief` | BYOK brief draft |
| `lighthouse-build-topic` | Custom Kestra topic |

## Authsome references

- Index: https://authsome.ai/docs/llms.txt
- Slack: https://authsome.ai/docs/integrations/oauth/slack
- Notion: https://authsome.ai/docs/integrations/oauth/notion

## Security notes for agents

- Never log or repeat full `apiKey` / `accessToken` values in chat after import
- Prefer `lighthouse-get-config-status` over re-reading secrets from the user
- LLM/Exa/AgentMail keys never touch Lighthouse servers — only per-request forward for briefs
- Slack/Notion OAuth tokens are server-stored under RLS; agents only receive masked confirmation
