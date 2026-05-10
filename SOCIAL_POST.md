# Social posts — ready to publish

> Post on a Tuesday or Wednesday morning **EU time** (08:00–10:00 CET) — Kestra
> is Paris-based; you'll catch the team online.
> Tag `@kestra_io` and use **`#KestraAcademy`** on every post.

## X / Twitter thread (8 tweets)

> Replace `<LOOM_URL>` and `<BLOG_URL>` before posting. **Repository:**
> `https://github.com/guglxni/lighthouse-kestra`

**1/8** — hook
```
I lost an hour every morning to the same forty browser tabs.

So I built Lighthouse — a configurable multi-source research OS, fully orchestrated by @kestra_io.

One engine. Four topics. Daily briefs into Notion / Slack / Discord / email.

#KestraAcademy
🧵
```

**2/8** — the demo (Loom)
```
2-minute walkthrough — topic switcher, today's brief, chat-the-brief, on-demand deep-dive, all as Kestra Apps.

<LOOM_URL>
```

**3/8** — the architecture
```
Under the hood:

→ 6 ingest flows (RSS, arxiv, GitHub trending, HN+Reddit, YouTube/podcasts via Whisper, web articles)
→ pgvector embed + dedup
→ multi-LLM via LiteLLM (OpenAI-compatible proxy + optional fallbacks)
→ BERTopic clustering
→ Notion + Slack + Discord + SendGrid delivery
→ single-pager monitor flow across the whole namespace
```

**4/8** — the multi-LLM pattern
```
The killer pattern, lifted from @kestra_io's May 7 production-AI blog:

each LLM step is a runIf-chained sequence — primary → fallback 1 → fallback 2 — with allowFailure + retries on every tier.

Cheap by default. Robust to outages. Per-tier observability.

https://kestra.io/blogs/ai-workflows-in-production
```

**5/8** — the pattern outside AI
```
Best realisation: this exact pattern works *outside* AI.

My web-article extraction is Trafilatura → Jina Reader → headless Playwright, same runIf chain, same allowFailure. The orchestrator doesn't care that the layers are HTTP libraries instead of LLM calls.
```

**6/8** — Apps
```
Three Kestra Apps:

→ Dashboard — topic dropdown, today's brief preview
→ Chat-the-brief — Form → pgvector search → multi-LLM RAG, with citations
→ Deep-dive — Form → GPT-Researcher in a Docker task runner → markdown report

All YAML. All in the repo.
```

**7/8** — blueprint + blog
```
Two takeaway artifacts:

→ A slimmed `lighthouse-research-quickstart` blueprint, single-file, ready for the kestra-io/blueprints repo
→ A 1500-word blog post on the multi-LLM fallback pattern (and applying it outside AI)

<BLOG_URL>
```

**8/8** — close
```
Source, docker-compose, blueprint, blog draft, and Loom — all in:

https://github.com/guglxni/lighthouse-kestra

Built with #KestraAcademy. h/t @kestra_io for the patterns and the MCP server (Claude wrote half the YAML by querying it).
```

---

## LinkedIn post

> Replace `<LOOM_URL>` and `<BLOG_URL>` before posting. Repository: https://github.com/guglxni/lighthouse-kestra. Optimal
> length: ~1,200 chars; LinkedIn truncates after ~210 in the feed so make
> the first two lines count.

```
I lost an hour every morning reading 40 browser tabs.

So I built Lighthouse — a configurable, multi-source research OS, fully orchestrated by @Kestra.

One engine. Four topic profiles (Agentic Engineering, Solana/ZK, Indie SaaS, Data Eng + AI). Daily briefs into Notion, Slack, Discord, and email — plus chat-the-brief and on-demand deep-dives via Kestra Apps.

What's interesting is the patterns underneath:

🔁  A multi-LLM path through LiteLLM (fast vs quality models + optional Azure Kimi / other fallbacks), following the same runIf discipline as Kestra's May 7 production-AI blog.

🔁  The same fallback shape applied outside AI: web-article extraction is Trafilatura → Jina Reader → headless Playwright, with the same runIf gating. The orchestrator doesn't care that the layers are HTTP libraries instead of chat APIs.

📡  Single-pager monitor flow with a Flow trigger across the whole namespace — every new flow gets observability for free.

🧠  Topic profiles as namespace files — adding a fifth topic is one new YAML file, no code change.

I packaged a slimmed quickstart blueprint, a 1,500-word blog post draft, a 2-minute Loom walkthrough, and a one-command docker-compose. All in the repo.

Loom: <LOOM_URL>
Blog: <BLOG_URL>
Source: https://github.com/guglxni/lighthouse-kestra

Built as my #KestraAcademy contest entry. Tagging @Kestra — would love feedback from the team.
```

---

## Screenshots checklist (attach to LinkedIn; cycle through on X)

Capture during the Loom recording. Save into `docs/img/` and reference from
the README's Screenshots section.

1. `docs/img/dashboard.png` — Lighthouse dashboard App with the topic dropdown
   on `agentic-eng` and the today's-brief table populated.
2. `docs/img/chat.png` — Chat-the-brief App showing a question + answer with
   numbered `[1] [2]` citations and the source rows table beneath.
3. `docs/img/deepdive.png` — Deep-dive App with a finished GPT-Researcher
   markdown report on screen.
4. `docs/img/slack.png` — Slack post in `#agentic-eng-brief` showing today's
   brief headline + first cluster.
5. `docs/img/notion.png` — Notion page showing the same brief.
6. `docs/img/topology.png` — Kestra namespace topology view zoomed on
   `company.team.lighthouse.*`.
7. `docs/img/multi-llm.png` — `flows/process/classify.yaml` open in Kestra's
   editor with the three classification tiers visible.
8. `docs/img/alert.png` — Slack message in `#lighthouse-alerts` from the
   `monitors.alerts` flow on a forced-failure execution.

Six is the minimum I'd ship; eight if you have time.

---

## Tagging instructions

- **X**: tag `@kestra_io`. Use `#KestraAcademy` on tweets 1, 4, 8 (capped at
  3 hashtag tweets to keep the thread clean).
- **LinkedIn**: tag `@Kestra` (the company page) in tweet 1 sentence and the
  closing line. Hashtag `#KestraAcademy` once at the end.
- After posting, drop the X thread URL and LinkedIn URL into a follow-up
  comment on the blueprint PR (`blueprint/PR_BODY.md` linked at the bottom).
- DM the Loom + repo to whichever Kestra advocate replies first; mention
  the blueprint PR in the same DM.

---

## Posting order

1. Push the repo to GitHub (public).
2. Record Loom using `LOOM_SCRIPT.md`.
3. Drop screenshots into `docs/img/` and amend README + push.
4. Open the blueprint PR against `kestra-io/blueprints` using
   `blueprint/PR_BODY.md`.
5. Post the X thread.
6. Post the LinkedIn post 30 minutes later.
7. Reply on both with the PR link once it's open.
