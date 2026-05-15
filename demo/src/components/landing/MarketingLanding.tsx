"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { AuroraText } from "@/components/ui/aurora-text";
import { TextAnimate } from "@/components/ui/text-animate";
import { BorderBeam } from "@/components/ui/border-beam";
import { MagicCard } from "@/components/ui/magic-card";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { ShineBorder } from "@/components/ui/shine-border";
import { LiquidEther } from "@/components/ui/liquid-ether";
import { FluidGlass } from "@/components/ui/fluid-glass";
import { Marquee } from "@/components/ui/marquee";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FloatingHoverCard } from "@/components/ui/floating-card";

type TopicLite = {
  id: string;
  name: string;
  description: string;
  schedule?: string;
  sourceCounts?: { rss: number; arxiv: number; github: number; hn: number; reddit: number; youtube: number; web: number };
};

export function MarketingLanding({
  signedIn,
  topics,
}: {
  signedIn: boolean;
  topics: TopicLite[];
}) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const parallax = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const heroFade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="relative overflow-x-hidden">
      {/* HERO */}
      <section ref={heroRef} className="relative isolate min-h-[92vh] overflow-hidden">
        <LiquidEther />
        <AnimatedGridPattern
          numSquares={28}
          maxOpacity={0.18}
          duration={5}
          className="[mask-image:radial-gradient(60%_50%_at_50%_30%,black,transparent)]"
        />
        <motion.div style={{ y: parallax, opacity: heroFade }} className="relative">
          <div className="mx-auto max-w-6xl px-6 pt-24 pb-20 lg:pt-32">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mx-auto max-w-3xl text-center"
            >
              <Link
                href="/tech"
                className="group mx-auto inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs transition hover:border-beam/40"
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-beam to-iris text-[10px] font-bold text-ink-950">
                  ✦
                </span>
                <AnimatedShinyText className="text-ink-300/80">
                  Orchestrated by Kestra — see how it works
                </AnimatedShinyText>
                <span className="text-ink-500 transition group-hover:translate-x-0.5">→</span>
              </Link>

              <h1 className="mt-8 font-display text-5xl leading-[1.02] text-ink-50 sm:text-6xl lg:text-7xl">
                <TextAnimate
                  as="span"
                  by="word"
                  animation="blurInUp"
                  duration={0.9}
                  className="inline-block"
                >
                  Daily research briefs,
                </TextAnimate>{" "}
                <AuroraText className="text-5xl sm:text-6xl lg:text-7xl">your way.</AuroraText>
              </h1>

              <TextAnimate
                as="p"
                by="word"
                animation="fadeIn"
                duration={0.8}
                delay={0.4}
                className="mx-auto mt-6 max-w-2xl text-lg text-ink-300 sm:text-xl"
              >
                Pick a topic. Bring your own AI key. Get a single, focused brief on the things you care about — in your inbox, Slack, Discord or Notion. Stop drowning in tabs.
              </TextAnimate>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.9 }}
                className="mt-10 flex flex-wrap items-center justify-center gap-3"
              >
                <ShimmerButton onClick={() => undefined} className="shadow-[0_18px_45px_rgba(56,189,248,0.35)]">
                  <Link href={signedIn ? "/dashboard" : "/signup"} className="inline-flex items-center gap-2">
                    <span>{signedIn ? "Open dashboard" : "Start free"}</span>
                    <span aria-hidden>→</span>
                  </Link>
                </ShimmerButton>
                <Button variant="secondary" size="lg" asChild>
                  <Link href="/tech">See how it works</Link>
                </Button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-6 text-xs text-ink-500"
              >
                Bring-your-own-key · No proxying · Your provider, your bill
              </motion.p>
            </motion.div>

            {/* Hero preview — Fluid Glass card with mock brief */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative mx-auto mt-16 max-w-4xl"
            >
              <FluidGlass className="relative p-2">
                <BorderBeam size={180} duration={9} colorFrom="#7dd3fc" colorTo="#a78bfa" />
                <div className="relative rounded-2xl bg-ink-950/70 p-7 lg:p-9">
                  <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-300/70" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                      <span className="ml-3 font-mono text-[11px] text-ink-500">
                        agentic-eng · {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <Badge variant="beam">Daily brief</Badge>
                  </div>
                  <div className="space-y-4 pt-5 text-left">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-beam-glow/80">
                      Today&apos;s snapshot
                    </p>
                    <p className="font-display text-xl text-ink-50">
                      What changed overnight
                    </p>
                    <p className="text-sm leading-relaxed text-ink-300">
                      Major SDKs are settling on the same shapes for tool calls, so switching models should mean less glue code
                      and fewer surprises. The eval harness many teams share quietly re-weighted long, multi-step tasks—old leaderboard
                      scores aren&apos;t apples-to-apples. Quiet on arXiv, but two repo threads are worth a skim before standup.
                    </p>
                    <div className="grid gap-3 pt-2 sm:grid-cols-3">
                      <BriefBullet
                        n={1}
                        title="Tool calls, one dialect"
                        body="Frameworks are converging on compatible tool JSON; you write adapters once, not per provider."
                      />
                      <BriefBullet
                        n={2}
                        title="Re-baseline your evals"
                        body="A widely used harness changed how it scores agentic runs—rerun benchmarks before you trust last week."
                      />
                      <BriefBullet
                        n={3}
                        title="Two diffs to skim"
                        body="Streaming rerank for retrieval quality, plus smarter eviction when long-session memory fills up."
                      />
                    </div>
                  </div>
                </div>
              </FluidGlass>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* TRUST / SOURCES MARQUEE */}
      <section className="relative border-y border-white/5 bg-ink-950/80 py-10">
        <p className="mb-6 text-center text-[11px] uppercase tracking-[0.3em] text-ink-500">
          One brief. Every source you actually trust.
        </p>
        <Marquee duration="42s" gap="3rem">
          {[
            "RSS",
            "arXiv",
            "GitHub Trending",
            "Hacker News",
            "Reddit",
            "YouTube transcripts",
            "Exa semantic search",
            "Your private feeds",
          ].map((src) => (
            <span key={src} className="text-base font-medium text-ink-400/90">
              <span className="mr-3 text-beam">◆</span>
              {src}
            </span>
          ))}
        </Marquee>
      </section>

      {/* FEATURE GRID — MagicCard + Floating UI hovercards */}
      <section className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="mb-12 max-w-2xl">
          <Badge variant="beam">Features</Badge>
          <h2 className="mt-3 font-display text-3xl text-ink-50 sm:text-4xl">
            <TextAnimate as="span" by="word" animation="slideUp" duration={0.6}>
              Designed to be the one tab you open in the morning.
            </TextAnimate>
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <FloatingHoverCard
            placement="top"
            trigger={
              <div className="cursor-pointer">
                <FeatureCard
                  glyph="◐"
                  title="Bring your own AI"
                  body="Any OpenAI-compatible key. Set the base URL and model you trust. Lighthouse never sees the key — it stays on your device."
                />
              </div>
            }
          >
            <p className="font-display text-base text-ink-50">Truly model-agnostic</p>
            <p className="mt-1.5 text-xs text-ink-400">
              OpenAI, Anthropic, Groq, OpenRouter, Together, Fireworks, a local Ollama — anything that speaks the OpenAI HTTP shape works. Configure in Settings, key lives in your browser only.
            </p>
          </FloatingHoverCard>

          <FloatingHoverCard
            placement="top"
            trigger={
              <div className="cursor-pointer">
                <FeatureCard
                  glyph="✦"
                  title="Topic profiles in YAML"
                  body="Each brief is one declarative file: feeds, arXiv categories, GitHub queries, forum keywords. Add a file, get a new brief."
                />
              </div>
            }
          >
            <p className="font-display text-base text-ink-50">Read it, version it, share it</p>
            <p className="mt-1.5 text-xs text-ink-400">
              Topics live as YAML in <code className="font-mono text-beam">flows/_namespace_files/topics/</code>. Pull requests, code review, blame — your research config is just text.
            </p>
          </FloatingHoverCard>

          <FloatingHoverCard
            placement="top"
            trigger={
              <div className="cursor-pointer">
                <FeatureCard
                  glyph="⊙"
                  title="Lives where you read"
                  body="Email, Slack, Discord, Notion. Webhooks in, briefs out. Skip the channels you don’t use — Lighthouse doesn’t care."
                />
              </div>
            }
          >
            <p className="font-display text-base text-ink-50">Channels are optional</p>
            <p className="mt-1.5 text-xs text-ink-400">
              Set any combination. Empty fields are silently skipped. Each channel is just an HTTPS webhook configured in your account.
            </p>
          </FloatingHoverCard>

          <FloatingHoverCard
            placement="top"
            trigger={
              <div className="cursor-pointer">
                <FeatureCard
                  glyph="◇"
                  title="Dedupe & cluster"
                  body="Embeds every document, finds near-duplicates, and clusters the noisy ten posts into the one thing they’re really about."
                />
              </div>
            }
          >
            <p className="font-display text-base text-ink-50">Powered by pgvector</p>
            <p className="mt-1.5 text-xs text-ink-400">
              Documents and embeddings live in the same Postgres database. One join away from a clustered, scored, classified brief.
            </p>
          </FloatingHoverCard>

          <FloatingHoverCard
            placement="top"
            trigger={
              <div className="cursor-pointer">
                <FeatureCard
                  glyph="✧"
                  title="Replayable, observable"
                  body="A Kestra-orchestrated pipeline. Every run, every retry, every artifact is a click away. Debugging looks like a normal job."
                />
              </div>
            }
          >
            <p className="font-display text-base text-ink-50">Kestra makes the boring parts boring</p>
            <p className="mt-1.5 text-xs text-ink-400">
              Each step is a tracked execution. Retries are automatic, replays are one click. We pass through everything Kestra gives us.
            </p>
          </FloatingHoverCard>

          <FloatingHoverCard
            placement="top"
            trigger={
              <div className="cursor-pointer">
                <FeatureCard
                  glyph="◈"
                  title="Pay your provider, not us"
                  body="No middleman tokens, no proxying. Your AI costs go to your provider. Free to use, free to fork, fair to all."
                />
              </div>
            }
          >
            <p className="font-display text-base text-ink-50">Open & honest pricing</p>
            <p className="mt-1.5 text-xs text-ink-400">
              We never see your traffic. We never see your bill. We don’t markup tokens because we never touch them.
            </p>
          </FloatingHoverCard>
        </div>
      </section>

      {/* PIPELINE PREVIEW with ShineBorder */}
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr,1fr]">
          <div>
            <Badge variant="iris">Under the hood</Badge>
            <h2 className="mt-3 font-display text-3xl text-ink-50 sm:text-4xl">
              <TextAnimate as="span" by="word" animation="blurInUp" duration={0.6}>
                A four-step pipeline that runs itself.
              </TextAnimate>
            </h2>
            <p className="mt-4 max-w-lg text-base text-ink-300">
              Each morning, Lighthouse fans out to your sources, dedupes the noise, classifies what matters, and writes the brief — all orchestrated by{" "}
              <Link href="/tech" className="text-beam hover:underline">
                Kestra
              </Link>
              . You wake up to one Markdown page, not 47 tabs.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <Badge variant="beam">01 Ingest</Badge>
              <span className="text-ink-500" aria-hidden>→</span>
              <Badge variant="iris">02 Process</Badge>
              <span className="text-ink-500" aria-hidden>→</span>
              <Badge variant="flare">03 Deliver</Badge>
              <span className="text-ink-500" aria-hidden>→</span>
              <Badge variant="emerald">04 Observe</Badge>
            </div>
            <div className="mt-8">
              <Button asChild variant="secondary">
                <Link href="/tech">Read the full architecture →</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-3xl">
              <ShineBorder borderWidth={1} duration={10} shineColor={["#7dd3fc", "#a78bfa", "#fbbf24"]} />
              <div className="relative rounded-3xl border border-white/10 bg-ink-900/60 p-6 backdrop-blur-xl">
                <pre className="overflow-auto font-mono text-[11px] leading-relaxed text-ink-300">
{`# topics/agentic-eng.yaml
id: agentic-eng
name: Agentic Engineering
schedule: "0 8 * * *"

sources:
  rss:
    - https://simonwillison.net/atom.xml
    - https://anthropic.com/news/feed.xml
  arxiv_categories: [cs.AI, cs.CL]
  github_queries:
    - language:python topic:agents
  hn_keywords: [llm, agent, mcp]
  reddit_subs: [LocalLLaMA]

deliver:
  email:   you@studio.com
  slack:   $SLACK_WEBHOOK
  notion:  $NOTION_PAGE_ID`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PERSONAS */}
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10">
          <Badge variant="flare">Who reads these briefs</Badge>
          <h2 className="mt-3 font-display text-3xl text-ink-50 sm:text-4xl">
            For everyone tracking a fast-moving field.
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Indie founders", body: "Track 8 forums and 12 RSS feeds without opening a single tab." },
            { title: "Research teams", body: "A daily arXiv + GitHub digest, scoped to your sub-field." },
            { title: "DevRel & community", body: "Every conversation about your tool, on one Markdown page." },
            { title: "Engineering leaders", body: "One brief in the morning — not a Slack channel from hell." },
          ].map((p) => (
            <MagicCard key={p.title} className="rounded-2xl p-5" gradientFrom="#7dd3fc" gradientTo="#a78bfa">
              <h3 className="font-display text-lg text-ink-50">{p.title}</h3>
              <p className="mt-2 text-sm text-ink-300">{p.body}</p>
            </MagicCard>
          ))}
        </div>
      </section>

      {/* TOPIC PEEK */}
      <section className="relative mx-auto max-w-6xl px-6 py-20">
        <div className="mb-8 flex items-end justify-between gap-3">
          <div>
            <Badge variant="beam">Preset topics</Badge>
            <h2 className="mt-3 font-display text-3xl text-ink-50 sm:text-4xl">
              Start with a topic. Or write your own in 20 lines of YAML.
            </h2>
          </div>
          {signedIn ? (
            <Button asChild variant="secondary">
              <Link href="/dashboard">Open dashboard</Link>
            </Button>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          {topics.slice(0, 4).map((t) => {
            const sc = t.sourceCounts;
            const total = sc ? sc.rss + sc.arxiv + sc.github + sc.hn + sc.reddit + sc.youtube + sc.web : null;
            return (
              <FloatingHoverCard
                key={t.id}
                placement="top"
                trigger={
                  <div className="cursor-pointer">
                    <MagicCard className="rounded-2xl p-6" gradientFrom="#a78bfa" gradientTo="#7dd3fc">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-xl text-ink-50">{t.name}</h3>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-400">
                          {t.id}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm text-ink-300">{t.description || "A bring-your-own-key research topic profile."}</p>
                      {total !== null ? (
                        <p className="mt-3 font-mono text-[11px] text-beam-glow/70">{total} sources tracked</p>
                      ) : null}
                    </MagicCard>
                  </div>
                }
              >
                <p className="font-display text-sm font-semibold text-ink-50">{t.name}</p>
                {t.schedule ? (
                  <p className="mt-0.5 font-mono text-[11px] text-ink-400">Runs {t.schedule}</p>
                ) : null}
                {sc ? (
                  <dl className="mt-3 grid grid-cols-3 gap-x-4 gap-y-1.5 text-[11px]">
                    {[
                      { label: "RSS", value: sc.rss },
                      { label: "arXiv", value: sc.arxiv },
                      { label: "GitHub", value: sc.github },
                      { label: "HN", value: sc.hn },
                      { label: "Reddit", value: sc.reddit },
                      { label: "YouTube", value: sc.youtube },
                      { label: "Web", value: sc.web },
                    ]
                      .filter((r) => r.value > 0)
                      .map((r) => (
                        <div key={r.label}>
                          <dt className="text-ink-500">{r.label}</dt>
                          <dd className="font-mono text-ink-200">{r.value}</dd>
                        </div>
                      ))}
                  </dl>
                ) : null}
              </FloatingHoverCard>
            );
          })}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative mx-auto max-w-5xl px-6 py-24">
        <FluidGlass className="px-8 py-14 text-center sm:px-16 sm:py-20">
          <BorderBeam size={240} duration={11} colorFrom="#fbbf24" colorTo="#7dd3fc" />
          <Badge variant="beam">Free forever · Your keys, your channels</Badge>
          <h2 className="mt-5 font-display text-3xl text-ink-50 sm:text-5xl">
            Wake up to <AuroraText>one brief</AuroraText>, not 47 tabs.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300">
            Make a free account, paste your AI key, pick a topic, choose a channel. Your first brief takes about a minute to set up.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ShimmerButton>
              <Link href={signedIn ? "/dashboard" : "/signup"} className="inline-flex items-center gap-2">
                <span>{signedIn ? "Open dashboard" : "Create your free account"}</span>
                <span aria-hidden>→</span>
              </Link>
            </ShimmerButton>
            <Button variant="ghost" asChild>
              <Link href="/tech">See how it works</Link>
            </Button>
          </div>
        </FluidGlass>
      </section>

      {/* FOOTER */}
      <footer className="relative mx-auto max-w-6xl border-t border-white/5 px-6 py-12 text-sm text-ink-400">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="font-display text-lg text-ink-50">Lighthouse</p>
            <p className="mt-2 text-xs text-ink-500">
              A bring-your-own-key research OS, orchestrated by{" "}
              <a href="https://kestra.io" target="_blank" rel="noreferrer" className="text-beam hover:underline">
                Kestra
              </a>
              .
            </p>
          </div>
          <div className="text-xs text-ink-500">
            <p className="text-ink-200">Product</p>
            <ul className="mt-2 space-y-1">
              <li>
                <Link href={signedIn ? "/dashboard" : "/signup"} className="hover:text-beam">
                  {signedIn ? "Dashboard" : "Get started"}
                </Link>
              </li>
              <li>
                <Link href="/tech" className="hover:text-beam">
                  Under the hood
                </Link>
              </li>
              <li>
                <a href="/api/dashboard" className="hover:text-beam">
                  JSON status
                </a>
              </li>
            </ul>
          </div>
          <div className="text-xs text-ink-500">
            <p className="text-ink-200">Open source we lean on</p>
            <ul className="mt-2 space-y-1">
              <li>
                <a href="https://kestra.io" target="_blank" rel="noreferrer" className="hover:text-beam">
                  Kestra ↗
                </a>
              </li>
              <li>
                <a href="https://supabase.com" target="_blank" rel="noreferrer" className="hover:text-beam">
                  Supabase ↗
                </a>
              </li>
              <li>
                <a href="https://floating-ui.com" target="_blank" rel="noreferrer" className="hover:text-beam">
                  Floating UI ↗
                </a>
              </li>
              <li>
                <a href="https://magicui.design" target="_blank" rel="noreferrer" className="hover:text-beam">
                  Magic UI ↗
                </a>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

function BriefBullet({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-beam-glow">0{n}</p>
      <p className="mt-1 text-sm font-semibold text-ink-50">{title}</p>
      <p className="mt-1 text-xs text-ink-400">{body}</p>
    </div>
  );
}

function FeatureCard({ glyph, title, body }: { glyph: string; title: string; body: string }) {
  return (
    <MagicCard className="rounded-2xl p-6" gradientFrom="#7dd3fc" gradientTo="#a78bfa">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 font-display text-xl text-beam-glow">
        {glyph}
      </span>
      <h3 className="mt-4 font-display text-lg text-ink-50">{title}</h3>
      <p className="mt-2 text-sm text-ink-300">{body}</p>
    </MagicCard>
  );
}
