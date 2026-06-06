# Using Lighthouse

## First-time setup

1. Create account: https://demo-beta-topaz.vercel.app/signup
2. Open **Settings** → **LLM provider**
   - API key, OpenAI-compatible base URL, model name
3. Optional: Exa key for semantic search experiments
4. Optional: delivery — AgentMail, Slack/Notion OAuth, Discord webhook, Telegram chat id

## Daily workflow

### Use a preset topic

1. Dashboard → **Topics** → click e.g. **Agentic Engineering**
2. **Generate a sample brief** → enter question → **Run a sample brief**
3. Read Markdown output; check **Recent briefs** for history

### Create your own topic

1. Dashboard → scroll to **Build your brief** (below sample brief)
2. Describe what to watch in plain English
3. Choose **How often?** and **What time? (UTC)** — no cron syntax needed
4. **Create topic & activate**
5. Green confirmation: topic is selected in **Topics** and available in the sample brief dropdown
6. Run a sample brief to test scope

The generated YAML is Kestra-compatible (id, name, description, schedule, sources, delivery placeholders). It is stored in your account and used automatically when you run briefs for that topic.

## Agent-assisted setup (WebMCP + authsome)

1. Agent calls `lighthouse-authsome-setup-guide` on the signed-in settings or dashboard page  
2. User runs authsome locally (`authsome login slack`, etc.)  
3. Agent calls `lighthouse-import-authsome-token` or `lighthouse-configure-llm` — secrets are **write-only**  
4. Agent verifies with `lighthouse-get-config-status` (masked only)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| “Add your LLM API key in Settings first” | `lighthouse-configure-llm` or Settings UI |
| Custom topic not in dropdown | Refresh page; topic saves on successful create |
| OAuth connect fails | `lighthouse-start-oauth` or set Vercel Slack/Notion env vars |
| Agent cannot see tools | Signed in on `/dashboard` or `/settings`; WebMCP-capable browser |

## What Lighthouse is not (for users)

- Not a hosted LLM — you bring your own provider and pay them directly
- Not a full Kestra deployment on Vercel — the live demo is the front door; the engine runs separately for operators self-hosting the repo

## Links

- Demo: https://demo-beta-topaz.vercel.app
- WebMCP: https://github.com/webmachinelearning/webmcp
- AgentMail: https://docs.agentmail.to/llms.txt
