# Lighthouse: Orchestrating Multi-Source Research with Kestra

> Draft, ~1,500 words. Cross-posted as `lighthouse-orchestrating-research-with-kestra.md`.

I read too much. So I built a lighthouse for it.

For the last few months I've been losing the same hour every morning to the
same ritual: open Anthropic's blog, then OpenAI's, then arxiv cs.AI, then HN,
then a Cursor-shaped subreddit, then a podcast feed, then a half-watched
YouTube tab. By the time I'd separated *new and load-bearing* from *mildly
interesting*, my actual workday had started fifty minutes late.

The hand-rolled scripts I tried first all died the same death — one provider
hiccup and the cron'd Python file silently produced an empty digest. So
I rebuilt the whole thing on top of Kestra and made it the kind of thing the
Kestra team would, hopefully, want to retweet. This is the postmortem.

## The shape of the problem

A research brief is a pipeline shaped like a tree:

1. **Many sources.** RSS, arxiv, GitHub trending, HN, Reddit, YouTube,
   podcasts, arbitrary web. Each has its own pagination, rate limit, format
   quirks, and "is this new?" semantics.
2. **Convergent processing.** All sources fan into the same embed → dedup →
   classify → cluster → summarise pipeline.
3. **Divergent delivery.** One brief, four channels (Notion, Slack, Discord,
   email), and two interactive surfaces (chat and deep-dive).
4. **Operational concerns at every step.** Watermarks, retries, rate-limit
   backoff, "did the LLM call actually return something?", "did Notion 5xx
   me?", "what happens when Gemini is down for an hour?"

That tree is *exactly* the shape an orchestrator wants to be handed.

## Why orchestrators beat scripts for AI workflows

Kestra published a post on May 7, 2026 — ["Building production-grade AI
workflows that don't break"](https://kestra.io/blogs/ai-workflows-in-production)
— that articulated the failure mode I'd been hitting. The headline pattern
was a **multi-LLM fallback chain**: each LLM step is a sequence of
Classification tasks (primary → fallback 1 → fallback 2), each carrying
`allowFailure: true` and a constant retry, with downstream tasks gated by
`runIf` against the upstream's `executionStatus`.

In a Python script you'd write that as a try / except cascade and call it a
day. In Kestra, the same pattern gives you, for free:

- **Per-task observability** in the UI: which tier ran, which fell through,
  how long each took.
- **Per-task secrets**: rotate one provider's key without touching the
  others.
- **Per-task retries** that respect Kestra's queue semantics, not whatever
  `time.sleep` tier you cobbled together.
- **A literal record of which model produced the answer** that you can store
  in your DB and analyse later.

The killer realisation, while building Lighthouse, was that **the same
pattern works outside of AI**. My web-article extraction has the same shape:
Trafilatura first (cheap, deterministic), Jina Reader second (LLM-friendly
markdown for JS-rendered pages), headless Playwright third (last resort).
Same `runIf`-chained tasks, same `allowFailure`, same retries. The
orchestrator doesn't care that the layers are HTTP libraries instead of
chat APIs.

If you're writing AI pipelines as long Python scripts in 2026, this is the
single biggest behaviour change to make. **Make every fallible call a task
with a fallback peer.** Then let your orchestrator do the gating.

## The architecture I landed on

```
sources →  ingest.* (per-source flows, schedule + webhook triggers)
                ↓        Flow trigger on SUCCESS, fan-in to:
        process.embed_dedup  (pgvector)
                ↓
        process.classify     (multi-LLM fallback)
                ↓
        process.cluster_summarize  (BERTopic + multi-LLM)
                ↓
         deliver.brief       (Notion + Slack + Discord + email, allowFailure parallel)
                ↘
                 serve.chat_brief / serve.deepdive  (Apps)
```

Each ingest flow is independent. Each holds its own watermark in Kestra's KV
store. Each emits a SUCCESS event that the `embed_dedup` Flow trigger fans
in on. The first time I drew this on a whiteboard, I realised I'd been
writing the same plumbing in plain Python for years and Kestra had quietly
turned it into declarative YAML.

## Three patterns worth stealing

**1. Topic profiles as namespace files.** Each topic — Agentic Engineering,
Solana/ZK, Indie SaaS, Data Eng/AI — is one YAML file at
`flows/_namespace_files/topics/<id>.yaml`. The flows are completely
parametric: they read the topic profile via `io.kestra.plugin.core.namespace.DownloadFiles`
and use it to drive source allowlists, prompts, schedules, delivery targets.
Adding a fifth topic is one new file. The configurability story is the
demo, more than any single feature.

**2. Single-pager monitor flow.** Instead of bolting a Slack-fail-handler
into every flow, there's one `monitors.alerts` flow with a Flow trigger
that listens to *every* `FAILED` or `WARNING` execution under
`company.team.lighthouse.*` and posts one compact Slack message. New flows
are observed automatically because the trigger uses `prefix: true` against
the namespace. This is the same pattern from the May 7 post; it stays
striking every time you add a new flow and your alerts work without any
extra wiring.

**3. Apps for the human-shaped surfaces.** A research OS isn't done at the
delivery step — humans want to ask the brief questions, and sometimes go
deeper. Kestra Apps make that ergonomic: `apps/chat.yaml` is a Form that
fires `serve.chat_brief` (vector search over pgvector + multi-LLM RAG) and
renders the answer with citations. `apps/deepdive.yaml` is a Form that
fires `serve.deepdive` (GPT-Researcher in a Docker task runner). Both are
just YAML; both render in the same UI a non-technical reader already knows.

## What surprised me

**Kestra MCP was the meta-loop.** I built half this project by asking Claude
Code to query Kestra's own MCP server for plugin schemas — `Classification`,
`AIAgent`, `Notion`, `Slack`, `Postgres JDBC`. The model wrote the YAML;
the MCP told the model whether the YAML referenced real properties; I
eyeballed the diff. The "Claude reads Kestra's docs while writing Kestra
flows" loop felt unreasonably productive. It's also the cleanest argument
I've seen for why MCPs matter for orchestration — your AI assistant
suddenly has the *exact* schema for every task type.

**pgvector was enough.** I started by reflexively reaching for a dedicated
vector DB and then realised that piggybacking on Postgres meant zero new
services, that HNSW + cosine ops are first-class now, and that my joins
back to `lh.documents` and `lh.classifications` could happen in-DB. Less
infra to demo means more demo to actually demo.

**The single-LLM call was always the wrong default.** Every time I dropped a
fallback tier "just to keep the YAML short," that flow was the next one to
fail in a way I didn't see for a day. Three tiers minimum, always.

## What I'd change next

- **Per-cluster diffing across days.** "What's new this morning that *wasn't*
  in yesterday's brief?" is a one-pgvector-query feature I haven't built yet.
- **Topic auto-suggest.** A meta-flow that watches the user's chat queries
  and suggests new topic profiles. Probably 1-day of work and a great
  feature for the next blog post.
- **An LLM gateway abstraction.** Right now the fallback chain is wired
  per-flow; LiteLLM in front of all three providers would simplify the
  YAML at the cost of one new service. Worth it past five LLM-using flows.

## Try it

Source: `github.com/aaryanguglani/lighthouse`. One `docker compose up` and
you have Kestra, Postgres + pgvector, Miniflux, SearxNG, and the worker
container. Drop your secrets in `.env`, point your Notion / Slack /
Discord / email at `lh.briefs`, and tomorrow morning you'll have a brief.

The repo also includes a slimmed `lighthouse-research-quickstart` blueprint
ready to drop into `kestra-io/blueprints` (single topic, RSS + arxiv only,
single LLM, Notion delivery — the "I want to try this in 5 minutes"
variant).

If you're a Kestra user already, the parts most worth stealing are the
multi-LLM fallback pattern in `flows/process/classify.yaml`, the same
pattern applied to extraction in `flows/ingest/web_articles.yaml`, and the
single-pager `monitors.alerts` flow.

If you're not yet, this is a not-bad excuse to start. The orchestrator
disappears in production; you just notice it isn't 9 AM and you don't have
to read 40 tabs.

— Aaryan, with #KestraAcademy.
