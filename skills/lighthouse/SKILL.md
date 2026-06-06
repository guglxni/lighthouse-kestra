---
name: lighthouse
description: Use Lighthouse as an end user — daily research briefs with BYOK AI, topic selection, custom topic builder, and delivery channels. Connect via WebMCP tools on the live dashboard or guide the user through the web UI. Use when the user wants research digests, wants to run or schedule briefs, connect an agent to Lighthouse, or operate the demo at demo-beta-topaz.vercel.app — not when developing or contributing to the lighthouse-kestra repository.
---

# Lighthouse (usage)

Lighthouse answers: *“What moved today in the spaces I care about?”*  
**Live app:** https://demo-beta-topaz.vercel.app  
**Your keys:** BYOK — LLM API keys stay in the user’s browser, never on Lighthouse servers.

## Install this skill

```bash
npx skills add guglxni/lighthouse-kestra --skill lighthouse -a claude-code -a cursor -a codex -a gemini-cli -y
```

## What you can do for the user

| Goal | How |
|------|-----|
| Sample a brief now | Dashboard → pick **Topics** → **Generate a sample brief** |
| Track a new niche | **Build your brief** → describe scope → topic auto-saves and activates |
| Daily delivery | **Settings** → webhooks / AgentMail / Slack or Notion OAuth |
| Agent drives the UI | **WebMCP** tools on the signed-in dashboard (see below) |

## User flow (web UI)

1. **Sign in** at `/login`
2. **Settings** (`/settings`) — add LLM API key, base URL, model (required for briefs)
3. **Dashboard** (`/dashboard`)
   - **Topics** — click a card (preset or custom); this sets the active topic
   - **Generate a sample brief** — dropdown mirrors the selected topic; run with a question
   - **Build your brief** — plain-English scope + simple schedule (how often + time UTC); YAML validates and plugs in automatically
4. **Settings** again — optional Slack/Discord/Telegram/Notion/email delivery

Custom topics: saved to the user’s account, selected automatically after creation, and injected into sample-brief prompts (sources + scope from their Kestra YAML).

## WebMCP — connect your agent to Lighthouse

Open **dashboard** or **settings** while signed in. Lighthouse registers [WebMCP](https://github.com/webmachinelearning/webmcp) tools with **write-only secrets** (masked status only).

### Secure setup (authsome + WebMCP)

1. `lighthouse-authsome-setup-guide` — CLI steps per provider  
2. User runs `authsome login slack` / `notion` / stores OpenAI key locally  
3. Import without echoing secrets back:
   - `lighthouse-configure-llm` — BYOK in browser  
   - `lighthouse-import-authsome-token` — Slack/Notion server-side (from `authsome get … --field access_token`)  
   - `lighthouse-start-oauth` — browser OAuth alternative  
4. `lighthouse-get-config-status` — verify (masked fingerprints only)  
5. `lighthouse-configure-delivery` / `lighthouse-configure-agentmail`  
6. Briefs: `lighthouse-list-topics` → `lighthouse-select-topic` → `lighthouse-run-sample-brief`

| Tool | Purpose |
|------|---------|
| `lighthouse-get-config-status` | Masked config snapshot |
| `lighthouse-configure-llm` | Store LLM key (write-only) |
| `lighthouse-configure-exa` | Optional Exa key |
| `lighthouse-configure-agentmail` | AgentMail BYOK + inbox |
| `lighthouse-configure-delivery` | Webhooks, Telegram, Notion page, default topic |
| `lighthouse-import-authsome-token` | Slack/Notion token from authsome CLI |
| `lighthouse-start-oauth` | Open Slack/Notion OAuth tab |
| `lighthouse-authsome-setup-guide` | authsome CLI instructions |
| `lighthouse-send-test-email` | Test AgentMail wiring |
| `lighthouse-list-topics` | Topics + active selection |
| `lighthouse-run-sample-brief` | Draft brief (BYOK) |
| `lighthouse-build-topic` | Custom topic from brief |

**Never** repeat full API keys or tokens in agent chat after import. Use `lighthouse-get-config-status` instead.

Spec: https://github.com/webmachinelearning/webmcp · authsome: https://authsome.ai/docs/llms.txt

## Schedule (user-facing)

Users pick **How often?** (every day / weekdays / weekly Monday) and **What time?** (UTC). No raw cron required.  
Examples: every day at 9:00 UTC · weekdays at 8:00 UTC.

## Delivery channels

| Channel | User setup |
|---------|------------|
| Email | AgentMail API key + inbox in Settings — https://docs.agentmail.to/llms.txt |
| Slack | OAuth connect in Settings — https://authsome.ai/docs/integrations/oauth/slack |
| Notion | OAuth connect in Settings — https://authsome.ai/docs/integrations/oauth/notion |
| Discord / Telegram | Webhook or chat id in Settings |

## Agent checklist

```
- [ ] User signed in?
- [ ] BYOK configured in Settings?
- [ ] Topic selected (card or lighthouse-select-topic)?
- [ ] For custom scope: build topic first OR use existing custom topic
- [ ] Run sample brief or configure delivery
```

## Preset topics

| id | Focus |
|----|-------|
| `agentic-eng` | AI agents, MCP, coding assistants |
| `solana-zk` | Solana + ZK / audits |
| `indie-saas` | Bootstrapped SaaS, growth |
| `data-eng-ai` | Data engineering, RAG, lakehouse |

## Additional resources

- WebMCP tool schemas & fallbacks: [webmcp.md](webmcp.md)
- End-user workflows & troubleshooting: [using-lighthouse.md](using-lighthouse.md)

**Not in scope for this skill:** editing Kestra flows, contributing to the repo, or deploying infrastructure — use the project README for that.
