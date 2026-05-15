"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/ui/magic-card";
import { ShineBorder } from "@/components/ui/shine-border";
import { BorderBeam } from "@/components/ui/border-beam";
import { AuroraText } from "@/components/ui/aurora-text";
import { LiquidEther } from "@/components/ui/liquid-ether";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { TextAnimate } from "@/components/ui/text-animate";
import { FluidGlass } from "@/components/ui/fluid-glass";
import { FloatingHoverCard } from "@/components/ui/floating-card";
import { cn } from "@/lib/utils";

const pipeline = [
  {
    id: "ingest",
    tag: "01 · Ingest",
    title: "Read the open web",
    body: "A Kestra flow per source — RSS, arXiv, GitHub trending, HN, Reddit, YouTube transcripts, Exa semantic search. Each one is idempotent, retried with backoff, and recorded for replay.",
    flows: ["ingest.rss", "ingest.arxiv", "ingest.github_trending", "ingest.hn_reddit", "ingest.audio_video", "ingest.web_articles", "ingest.exa_search"],
    accent: "beam" as const,
  },
  {
    id: "process",
    tag: "02 · Process",
    title: "Dedupe & classify",
    body: "Documents are embedded into pgvector, near-duplicates are clustered, and an LLM classifies what matters for your topic. Cluster summaries are the source material for the brief.",
    flows: ["process.embed_dedup", "process.classify", "process.cluster_summarize"],
    accent: "iris" as const,
  },
  {
    id: "deliver",
    tag: "03 · Deliver",
    title: "Write & ship the brief",
    body: "Your AI provider drafts the Markdown brief from the cluster summaries. Lighthouse posts it to email, Slack, Discord, or Notion — whichever channels you configured.",
    flows: ["deliver.brief", "serve.chat_brief", "serve.deepdive"],
    accent: "flare" as const,
  },
  {
    id: "observe",
    tag: "04 · Observe",
    title: "Stay accountable",
    body: "Kestra’s UI shows every step that ran, every retry, every artifact. We forward alerts and let you replay any execution if a source breaks or a model is down.",
    flows: ["monitors.alerts", "monitors.gc", "maintenance.graphify_docs"],
    accent: "emerald" as const,
  },
];

const accentMap: Record<string, string> = {
  beam: "from-beam/30 to-beam/0 text-beam-glow",
  iris: "from-iris/30 to-iris/0 text-iris",
  flare: "from-flare/30 to-flare/0 text-flare",
  emerald: "from-emerald-400/30 to-emerald-400/0 text-emerald-300",
};

const credits = [
  {
    name: "Kestra",
    href: "https://kestra.io",
    role: "Workflow orchestration",
    body: "The reason this entire pipeline is YAML you can read. Replays, retries, scheduling, observability — out of the box.",
    featured: true,
  },
  { name: "Supabase", href: "https://supabase.com", role: "Auth + Postgres + RLS", body: "Sign-up, settings storage, row-level security and realtime. The whole user surface in one weekend." },
  { name: "LiteLLM", href: "https://github.com/BerriAI/litellm", role: "One API, many models", body: "BYOK works because LiteLLM speaks OpenAI on top of every provider you'd actually pick." },
  { name: "Next.js", href: "https://nextjs.org", role: "App Router + RSC", body: "Server components for the slow parts, client components for the interactive parts. One Node host." },
  { name: "Floating UI", href: "https://floating-ui.com", role: "Tooltips & popovers", body: "The topic picker and every hover hint use Floating UI’s collision-aware positioning." },
  { name: "Magic UI", href: "https://magicui.design", role: "Animated primitives", body: "Aurora, ShineBorder, BorderBeam, MagicCard, AnimatedGridPattern — the visual layer of this page is shamelessly enabled by Magic UI." },
  { name: "Tailwind CSS", href: "https://tailwindcss.com", role: "Design system", body: "Every pixel on this page. Utility-first, dark-first, a11y-friendly defaults." },
  { name: "PostgreSQL + pgvector", href: "https://github.com/pgvector/pgvector", role: "Search + storage", body: "Documents, embeddings and briefs live in the same database. One join away." },
  { name: "Framer Motion", href: "https://www.framer.com/motion/", role: "Animation runtime", body: "The hero text, page transitions, marquee, magnet cursors — all backed by Framer Motion." },
  { name: "react-markdown", href: "https://github.com/remarkjs/react-markdown", role: "Brief rendering", body: "Renders the sample brief safely with custom components — no innerHTML." },
  { name: "The open web", href: "https://en.wikipedia.org/wiki/RSS", role: "Source material", body: "RSS, arXiv, GitHub, HN, Reddit, YouTube transcripts — none of this works without their generous public surfaces." },
];

export function TechPage() {
  return (
    <div className="relative overflow-x-hidden">
      {/* HEADER */}
      <section className="relative isolate overflow-hidden border-b border-white/5">
        <LiquidEther intensity={0.7} />
        <AnimatedGridPattern numSquares={24} maxOpacity={0.14} duration={6} className="[mask-image:radial-gradient(50%_50%_at_50%_30%,black,transparent)]" />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16">
          <Badge variant="iris">Under the hood</Badge>
          <h1 className="mt-4 font-display text-4xl leading-tight text-ink-50 sm:text-5xl lg:text-6xl">
            <TextAnimate as="span" by="word" animation="blurInUp" duration={0.7}>
              The boring parts?
            </TextAnimate>{" "}
            <AuroraText className="text-4xl sm:text-5xl lg:text-6xl">Kestra handles them.</AuroraText>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-ink-300 sm:text-lg">
            Lighthouse is four steps: <strong className="text-ink-100">ingest, process, deliver, observe</strong>. Each one is a Kestra flow described in plain YAML — versioned, retried, replayed, observed. We did not invent any of that. Kestra handed it to us.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild>
              <a href="https://kestra.io" target="_blank" rel="noreferrer">
                Visit Kestra ↗
              </a>
            </Button>
            <Button variant="secondary" asChild>
              <a href="https://kestra.io/docs" target="_blank" rel="noreferrer">
                Read the Kestra docs
              </a>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* PIPELINE */}
      <section id="pipeline" className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10">
          <Badge variant="beam">The pipeline</Badge>
          <h2 className="mt-3 font-display text-3xl text-ink-50 sm:text-4xl">Four flows. One brief.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {pipeline.map((p, i) => (
            <FloatingHoverCard
              key={p.id}
              placement={i < 2 ? "bottom" : "top"}
              trigger={
                <motion.article
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className="relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-beam/30"
                >
                  <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", accentMap[p.accent])} aria-hidden />
                  <p className={cn("font-mono text-[10px] uppercase tracking-[0.18em]", accentMap[p.accent])}>
                    {p.tag}
                  </p>
                  <h3 className="mt-2 font-display text-lg text-ink-50">{p.title}</h3>
                  <p className="mt-2 text-sm text-ink-300">{p.body}</p>
                  <p className="mt-4 truncate font-mono text-[11px] text-ink-500">{p.flows[0]}…</p>
                </motion.article>
              }
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-beam-glow">{p.tag}</p>
              <p className="mt-1 font-display text-base text-ink-50">All flows in this stage</p>
              <ul className="mt-2 space-y-1 font-mono text-[11px] text-ink-300">
                {p.flows.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-ink-500">
                Each flow lives in <span className="font-mono text-beam">flows/{p.id}/*.yaml</span>. View executions in Kestra’s UI on port <span className="font-mono">8090</span>.
              </p>
            </FloatingHoverCard>
          ))}
        </div>

        {/* Three reasons */}
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <MagicCard className="rounded-2xl p-5" gradientFrom="#a78bfa" gradientTo="#7dd3fc">
            <h4 className="font-display text-base text-ink-50">Declarative YAML</h4>
            <p className="mt-2 text-sm text-ink-300">Adding a new source is a 20-line file you can review in a PR. No DSL, no framework lock-in.</p>
          </MagicCard>
          <MagicCard className="rounded-2xl p-5" gradientFrom="#a78bfa" gradientTo="#7dd3fc">
            <h4 className="font-display text-base text-ink-50">Retries built in</h4>
            <p className="mt-2 text-sm text-ink-300">Flaky RSS feed? Slow LLM call? Kestra retries with backoff and you wake up to a brief, not an outage.</p>
          </MagicCard>
          <MagicCard className="rounded-2xl p-5" gradientFrom="#a78bfa" gradientTo="#7dd3fc">
            <h4 className="font-display text-base text-ink-50">Real observability</h4>
            <p className="mt-2 text-sm text-ink-300">A namespace per stage, logs per task, a Gantt per execution. Debugging looks like a normal job.</p>
          </MagicCard>
        </div>
      </section>

      {/* SAMPLE FLOW YAML with ShineBorder */}
      <section className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr,1.1fr]">
          <div>
            <Badge variant="iris">Anatomy of a flow</Badge>
            <h2 className="mt-3 font-display text-3xl text-ink-50 sm:text-4xl">A Kestra flow is just YAML.</h2>
            <p className="mt-4 max-w-md text-base text-ink-300">
              Every ingestion source is a small flow with three or four tasks. Tasks call HTTP, run Python, talk to LLMs, and write to Postgres — orchestrated by Kestra’s engine.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-ink-300">
              <li>· <strong className="text-ink-100">Idempotent</strong> — same input, same output.</li>
              <li>· <strong className="text-ink-100">Retried</strong> — automatic backoff on transient failures.</li>
              <li>· <strong className="text-ink-100">Observable</strong> — full Gantt and logs in Kestra UI.</li>
              <li>· <strong className="text-ink-100">Replayable</strong> — one click re-runs any execution.</li>
            </ul>
          </div>
          <div className="relative">
            <ShineBorder borderWidth={1} duration={12} shineColor={["#7dd3fc", "#a78bfa", "#fbbf24"]} />
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-ink-900/70 p-6 backdrop-blur-xl">
              <pre className="overflow-auto font-mono text-[11px] leading-relaxed text-ink-300">
{`# flows/ingest/rss.yaml
id: rss
namespace: company.team.lighthouse.ingest

inputs:
  - id: topic_id
    type: STRING

triggers:
  - id: every-morning
    type: io.kestra.plugin.core.trigger.Schedule
    cron: "0 7 * * *"

tasks:
  - id: load_profile
    type: io.kestra.plugin.scripts.python.Script
    script: |
      profile = read_topic("{{ inputs.topic_id }}")

  - id: pull_feeds
    type: io.kestra.plugin.fs.http.Request
    uri: "{{ outputs.load_profile.vars.feed }}"
    retry:
      type: constant
      maxAttempt: 3
      interval: PT30S

  - id: upsert
    type: io.kestra.plugin.jdbc.postgresql.Query
    sql: "INSERT INTO lh.documents …"`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* BUILT ON */}
      <section id="builtwith" className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10">
          <Badge variant="flare">Built on</Badge>
          <h2 className="mt-3 font-display text-3xl text-ink-50 sm:text-4xl">Great open source, used gratefully.</h2>
          <p className="mt-3 max-w-2xl text-base text-ink-400">
            Every box in Lighthouse is something somebody else figured out first. We borrow heavily and link out loudly — please go support these projects.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {credits.map((c) => (
            <a
              key={c.name}
              href={c.href}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "group relative block overflow-hidden rounded-2xl border p-5 transition",
                c.featured
                  ? "border-violet-300/30 bg-gradient-to-br from-violet-500/15 via-iris/5 to-transparent shadow-[0_18px_45px_rgba(167,139,250,0.18)] hover:border-violet-200/50"
                  : "border-white/10 bg-white/[0.03] hover:border-beam/40",
              )}
            >
              {c.featured ? <BorderBeam size={140} duration={9} colorFrom="#a78bfa" colorTo="#7dd3fc" /> : null}
              <div className="flex items-baseline justify-between gap-2">
                <h3 className={cn("font-display text-lg", c.featured ? "text-iris" : "text-ink-50")}>{c.name}</h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">{c.role}</span>
              </div>
              <p className="mt-2 text-sm text-ink-300">{c.body}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs text-ink-400 group-hover:text-ink-100">
                Visit project <span aria-hidden>↗</span>
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-5xl px-6 py-24">
        <FluidGlass className="px-8 py-14 text-center sm:px-16 sm:py-20">
          <h2 className="font-display text-3xl text-ink-50 sm:text-5xl">
            Now you know the boring parts.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-ink-300">
            The interesting part is the brief that lands tomorrow morning. Pick a topic and bring your AI key.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">Open dashboard →</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/">Back to landing</Link>
            </Button>
          </div>
        </FluidGlass>
      </section>
    </div>
  );
}
