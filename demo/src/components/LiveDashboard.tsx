"use client";

import type { DashboardPayload, TopicPreview } from "@/types/dashboard";
import { cn } from "@/lib/utils";
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { TryBrief } from "@/components/TryBrief";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/ui/magic-card";
import { FloatingHoverCard } from "@/components/ui/floating-card";
import { AnimatedGridPattern } from "@/components/ui/animated-grid-pattern";
import { LiquidEther } from "@/components/ui/liquid-ether";
import { BorderBeam } from "@/components/ui/border-beam";
import { FluidGlass } from "@/components/ui/fluid-glass";

function StatusPill({ label, ok, detail, hint }: { label: string; ok: boolean; detail?: string; hint?: string }) {
  const pill = (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-ink-300 transition hover:border-beam/40">
      <span
        className={cn(
          "inline-flex h-2 w-2 rounded-full",
          ok ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.75)]" : "bg-amber-300 animate-pulseSoft",
        )}
        aria-hidden
      />
      <span className="font-medium text-ink-100">{label}</span>
      {detail ? <span className="text-ink-500">{detail}</span> : null}
    </div>
  );
  if (!hint) return pill;
  return (
    <FloatingHoverCard placement="bottom" trigger={<div className="cursor-default">{pill}</div>}>
      <p className="font-display text-sm text-ink-50">{label} · {ok ? "Healthy" : "Awaiting"}</p>
      <p className="mt-1 text-xs text-ink-400">{hint}</p>
    </FloatingHoverCard>
  );
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "top",
    whileElementsMounted: autoUpdate,
    middleware: [offset(10), flip(), shift({ padding: 8 })],
  });
  const hover = useHover(context, { move: false, delay: { open: 40, close: 120 } });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "tooltip" });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  return (
    <>
      <span ref={refs.setReference} {...getReferenceProps()} className="inline-flex">
        {children}
      </span>
      {open ? (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-[60] max-w-xs rounded-xl border border-white/10 bg-ink-850/95 px-3 py-2 text-[13px] leading-snug text-ink-100 shadow-lift backdrop-blur-xl"
          >
            {label}
          </div>
        </FloatingPortal>
      ) : null}
    </>
  );
}

function TopicCard({ topic, active, onClick }: { topic: TopicPreview; active: boolean; onClick: () => void }) {
  const total =
    topic.sourceCounts.rss +
    topic.sourceCounts.arxiv +
    topic.sourceCounts.github +
    topic.sourceCounts.hn +
    topic.sourceCounts.reddit +
    topic.sourceCounts.youtube +
    topic.sourceCounts.web;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 text-left transition",
        active
          ? "border-beam/60 bg-beam/10 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
          : "border-white/10 bg-white/[0.03] hover:border-beam/30 hover:bg-white/[0.06]",
      )}
    >
      {active ? <BorderBeam size={100} duration={7} colorFrom="#7dd3fc" colorTo="#a78bfa" /> : null}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg text-ink-50">{topic.name}</h3>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-200">
          {total} sources
        </span>
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-ink-300">{topic.description || "Custom topic profile."}</p>
      <p className="mt-3 font-mono text-[11px] text-beam-glow/90">
        runs {topic.schedule ? `at ${topic.schedule}` : "on demand"}
      </p>
    </button>
  );
}

function TopicPopover({ topics, value, onChange }: { topics: TopicPreview[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const active = useMemo(() => topics.find((t) => t.id === value) ?? topics[0], [topics, value]);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [offset(10), flip(), shift({ padding: 12 })],
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "menu" });
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  if (!active) return null;
  return (
    <div className="relative inline-flex">
      <button
        type="button"
        ref={refs.setReference}
        {...getReferenceProps()}
        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-ink-100 transition hover:border-beam/40 hover:bg-white/10"
      >
        Topic:
        <span className="rounded-lg bg-beam/15 px-2 py-0.5 text-xs text-beam-glow">{active.name}</span>
        <span className="text-ink-500">▾</span>
      </button>
      {open ? (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-[70] w-[min(100vw-2rem,360px)] rounded-2xl border border-white/10 bg-ink-900/95 p-2 shadow-lift backdrop-blur-xl"
          >
            <ul className="max-h-80 space-y-1 overflow-auto">
              {topics.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(t.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full rounded-xl px-3 py-2 text-left text-sm transition",
                      t.id === value ? "bg-beam/15 text-beam-glow" : "text-ink-200 hover:bg-white/10",
                    )}
                  >
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-ink-500">{t.description ? t.description.slice(0, 80) : t.id}</div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </FloatingPortal>
      ) : null}
    </div>
  );
}

export function LiveDashboard({
  initial,
  signedIn,
  userDefaultTopic,
}: {
  initial: DashboardPayload;
  signedIn: boolean;
  userDefaultTopic?: string;
}) {
  const [data, setData] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [topicId, setTopicId] = useState(userDefaultTopic ?? data.topics[0]?.id ?? "agentic-eng");

  function refresh() {
    startTransition(async () => {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as DashboardPayload;
      setData(json);
    });
  }

  return (
    <div className="relative isolate overflow-hidden">
      <LiquidEther className="opacity-60" intensity={0.6} />
      <AnimatedGridPattern
        numSquares={18}
        maxOpacity={0.08}
        duration={6}
        className="[mask-image:radial-gradient(80%_50%_at_50%_0%,black,transparent)]"
      />

      {/* Dashboard hero */}
      <section className="relative mx-auto max-w-6xl px-6 pb-10 pt-14">
        <div className="grid items-start gap-8 lg:grid-cols-[1.3fr,1fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="beam">
                <span className="h-1.5 w-1.5 rounded-full bg-beam shadow-[0_0_8px_rgba(56,189,248,0.9)]" aria-hidden />
                Your dashboard
              </Badge>
              <Link
                href="/tech"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-ink-300 transition hover:border-violet-300/40 hover:text-ink-100"
              >
                <span aria-hidden>⚙</span>
                See how it works
              </Link>
            </div>
            <h1 className="font-display text-4xl leading-[1.05] text-ink-50 sm:text-5xl">
              Welcome back. Your brief is <span className="text-gradient">queued for tomorrow</span>.
            </h1>
            <p className="text-base text-ink-300">
              Pick a topic, sample a brief with your AI key, and tell Lighthouse where to deliver it. Settings live in your browser; the rest is just YAML.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/settings">Configure your brief</Link>
              </Button>
              <Button variant="secondary" onClick={refresh} disabled={pending}>
                {pending ? "Checking…" : "Refresh status"}
              </Button>
              <TopicPopover topics={data.topics} value={topicId} onChange={setTopicId} />
            </div>
            <p className="text-xs text-ink-500">
              Your AI keys live in your browser. You pay your provider directly. We never see, store or proxy them.
            </p>
          </div>

          <FluidGlass className="relative p-6">
            <BorderBeam size={120} duration={8} colorFrom="#7dd3fc" colorTo="#a78bfa" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">How it’s going</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill
                label="Engine"
                ok={data.services.kestra.ok}
                detail={data.services.kestra.ok ? "live" : "starting up"}
                hint="The Kestra orchestrator that runs every flow. Hosted on http://localhost:8090 in dev."
              />
              <StatusPill
                label="Library"
                ok={data.services.postgres.ok}
                detail={data.services.postgres.ok ? "ready" : "setup"}
                hint="Postgres + pgvector — your documents, embeddings and briefs live here."
              />
              <StatusPill
                label="AI router"
                ok={data.services.litellm.ok}
                detail={data.services.litellm.ok ? "online" : "byok"}
                hint="Optional LiteLLM proxy for server-side calls. Your own browser BYOK still works without it."
              />
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-xs text-ink-400">
              <div>
                <dt className="text-ink-500">Topic profiles</dt>
                <dd className="font-mono text-sm text-ink-100">{data.topics.length}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Sources covered</dt>
                <dd className="font-mono text-sm text-ink-100">
                  {data.topics.reduce(
                    (n, t) =>
                      n +
                      t.sourceCounts.rss +
                      t.sourceCounts.arxiv +
                      t.sourceCounts.github +
                      t.sourceCounts.hn +
                      t.sourceCounts.reddit +
                      t.sourceCounts.youtube +
                      t.sourceCounts.web,
                    0,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">Briefs in library</dt>
                <dd className="font-mono text-sm text-ink-100">
                  {data.services.postgres.ok ? data.services.postgres.counts?.briefs ?? 0 : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">Last checked</dt>
                <dd className="font-mono text-[11px] text-ink-200">{new Date(data.generatedAt).toLocaleTimeString()}</dd>
              </div>
            </dl>
            {data.demoBanner ? (
              <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-50">
                {data.demoBanner}
              </p>
            ) : null}
          </FluidGlass>
        </div>
      </section>

      <main className="relative mx-auto max-w-6xl space-y-14 px-6 pb-24">
        {/* TryBrief — the core action */}
        <section id="try">
          <TryBrief
            topics={data.topics.map((t) => ({ id: t.id, name: t.name }))}
            defaultTopicId={topicId}
            signedIn={signedIn}
          />
        </section>

        {/* Topic gallery */}
        <section id="topics" className="space-y-5">
          <header className="flex items-end justify-between gap-3">
            <div>
              <Badge variant="beam">Topics</Badge>
              <h2 className="mt-2 font-display text-2xl text-ink-50">Pick what to track</h2>
              <p className="mt-1 max-w-xl text-sm text-ink-400">
                Click a card to make it active. Generate a brief from it on the right.
              </p>
            </div>
            <Tip label="Topics live as YAML in flows/_namespace_files/topics/. Add a file → a new daily brief appears.">
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-ink-400">
                What’s a topic profile?
              </span>
            </Tip>
          </header>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.topics.map((t) => (
              <TopicCard key={t.id} topic={t} active={t.id === topicId} onClick={() => setTopicId(t.id)} />
            ))}
          </div>
        </section>

        {/* Channels */}
        <section className="space-y-5">
          <header className="space-y-1">
            <Badge variant="iris">Delivery</Badge>
            <h2 className="mt-2 font-display text-2xl text-ink-50">Where your brief shows up</h2>
            <p className="text-sm text-ink-400">
              Pick the channels you actually read. Skip the rest. Webhooks live in your settings.
            </p>
          </header>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <ChannelCard name="Email" glyph="✉" detail="Daily digest with the headline and reading list." />
            <ChannelCard name="Slack" glyph="#" detail="Posted to a channel via incoming webhook." />
            <ChannelCard name="Discord" glyph="◆" detail="Same shape, different surface." />
            <ChannelCard name="Notion" glyph="¶" detail="One page per day, archived for search." />
          </div>
        </section>

        {/* Pointer to /tech */}
        <section>
          <FluidGlass className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div>
              <p className="font-display text-lg text-ink-50">Curious how this actually works?</p>
              <p className="text-sm text-ink-300">
                The full Kestra-powered pipeline and the open source it stands on live on the Under-the-hood page.
              </p>
            </div>
            <Button asChild variant="secondary">
              <Link href="/tech">Read the architecture →</Link>
            </Button>
          </FluidGlass>
        </section>

        <footer className="border-t border-white/10 pt-6 text-[11px] text-ink-500">
          Last status check {new Date(data.generatedAt).toLocaleString()}. Your AI keys never leave your device.
        </footer>
      </main>
    </div>
  );
}

function ChannelCard({ name, detail, glyph }: { name: string; detail: string; glyph: string }) {
  return (
    <MagicCard className="rounded-2xl p-4" gradientFrom="#7dd3fc" gradientTo="#a78bfa">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 font-mono text-xs text-beam-glow" aria-hidden>
          {glyph}
        </span>
        <div className="text-sm font-semibold text-ink-50">{name}</div>
      </div>
      <p className="mt-2 text-xs text-ink-400">{detail}</p>
    </MagicCard>
  );
}
