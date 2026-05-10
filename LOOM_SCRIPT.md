# Loom walkthrough — 2-minute script

> Recording target: 2:00. Beats are timestamped. Read out loud once for pacing
> before recording; tweak any beat that runs long.

## Setup before hitting record

- Browser tabs (in this order, all preloaded):
  1. Kestra UI dashboard at `http://localhost:8080`, namespace
     `company.team.lighthouse` selected
  2. The Apps view: `http://localhost:8080/ui/apps/company.team.lighthouse.serve`
  3. A Slack channel `#agentic-eng-brief` with a fresh brief posted today
  4. The Notion page where the brief was delivered
  5. The repo on GitHub: `github.com/aaryanguglani/lighthouse`
- Resolution: 1280×720 minimum, 1440p preferred. Hide bookmarks bar.
- Mic check: count "1, 2, 3" — playback to confirm no clipping.

## Beats

### 0:00 – 0:10 — Hook
> "Every morning I used to lose an hour to forty browser tabs. So I built
> Lighthouse — a configurable research OS, fully orchestrated by Kestra. One
> engine, four topics, daily briefs into Notion / Slack / Discord / email,
> plus chat-the-brief and on-demand deep-dives via Kestra Apps."

(Show the Kestra topology view of `company.team.lighthouse.*` namespaces.)

### 0:10 – 0:30 — The dashboard App + topic switch
> "This is the Kestra App. I pick a topic from this dropdown — Agentic
> Engineering, Solana ZK, Indie SaaS, Data Eng + AI — and the same engine
> reads a different YAML profile."

(Switch from `agentic-eng` to `solana-zk` and back. Show the today's-brief
table refreshing.)

### 0:30 – 0:50 — Today's brief
> "Today's Agentic Engineering brief — five clusters, ranked by relevance.
> The top one is the new Cursor multi-agent feature; the second is an arxiv
> drop on tool-use evals."

(Click into the brief in Notion. Then jump to the Slack post for the same
brief. Same content, four channels.)

### 0:50 – 1:10 — Chat-the-brief
> "I can ask the brief questions. The chat App fires `serve.chat_brief`,
> which does a pgvector search over today's documents and runs a multi-LLM
> RAG completion — Gemini Pro, Claude Sonnet, GPT-5 as fallbacks."

(Type "what changed in tool-use evals this week?" — show the answer with
inline citations linking back to source URLs.)

### 1:10 – 1:30 — Deep-dive
> "If I want to go deeper, deep-dive runs GPT-Researcher in a Docker task
> runner. Two-to-five minutes for a citation-heavy report."

(Show the deepdive form, hit submit, then jump-cut to the rendered report
in the same App. Pre-record this — actual GPT-Researcher runs are too slow
for live demo.)

### 1:30 – 1:50 — Under the hood
> "Behind it: six ingest flows, three process flows, deliver, two serve,
> two monitors. The neat bit is the multi-LLM fallback chain — same
> `runIf`-chained pattern from Kestra's May 7 production-AI blog post. I
> applied it to web extraction too: Trafilatura, Jina Reader, headless
> Playwright. Same pattern, no AI."

(Open `flows/process/classify.yaml` in the Kestra UI's editor pane; scroll
through the three classification tiers.)

### 1:50 – 2:00 — Outro
> "Source on GitHub. There's a slimmed quickstart blueprint, a 1500-word
> blog post draft, and a one-command docker-compose. Hashtag KestraAcademy,
> tagging at-Kestra-io. Thanks for watching."

(Cut to the GitHub repo's README. Hold the mermaid diagram on screen for
the last second.)

## Editing notes

- Do not show secrets. The `.env` file is in `.gitignore`; double-check the
  Kestra UI doesn't render secret values in the executions list.
- If you stumble, restart the affected beat fresh — it's a 2-minute video,
  re-takes are cheap.
- After upload, copy the Loom link into `SOCIAL_POST.md` (X thread tweet 4
  and the LinkedIn post body).
