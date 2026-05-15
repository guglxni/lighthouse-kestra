"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { hasMinimumByok, readByok } from "@/lib/byok-store";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Topic = { id: string; name: string };
type BriefRecord = {
  id: string;
  topic_id: string;
  prompt: string;
  output_md: string;
  model: string | null;
  created_at: string;
};

export function TryBrief({
  topics,
  defaultTopicId,
  signedIn,
}: {
  topics: Topic[];
  defaultTopicId?: string;
  signedIn: boolean;
}) {
  const [byokReady, setByokReady] = useState(false);
  const [topicId, setTopicId] = useState(defaultTopicId ?? topics[0]?.id ?? "agentic-eng");
  const [prompt, setPrompt] = useState("What broke and what shipped in the last 24 hours?");
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [meta, setMeta] = useState<{ model?: string; elapsedMs?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<BriefRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createSupabaseBrowserClient>["channel"]> | null>(null);

  useEffect(() => {
    setByokReady(hasMinimumByok(readByok()));
  }, []);

  // Fetch recent briefs and subscribe to live inserts.
  useEffect(() => {
    if (!signedIn) return;
    const supabase = createSupabaseBrowserClient();

    supabase
      .from("sample_briefs")
      .select("id,topic_id,prompt,output_md,model,created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setHistory(data as BriefRecord[]);
      });

    const channel = supabase
      .channel("sample_briefs_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sample_briefs" },
        (payload) => {
          setHistory((prev) => [payload.new as BriefRecord, ...prev].slice(0, 5));
        },
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [signedIn]);

  async function onRun() {
    setBusy(true);
    setError(null);
    setOutput("");
    setMeta(null);
    const byok = readByok();
    if (!hasMinimumByok(byok)) {
      setError("Add your API key, base URL and model in Settings, then try again.");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/try-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          prompt,
          byok: {
            llmApiKey: byok.llmApiKey,
            llmBaseUrl: byok.llmBaseUrl,
            llmModelPrimary: byok.llmModelPrimary,
          },
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const j = (await res.json()) as { output: string; model?: string; elapsedMs?: number };
      setOutput(j.output);
      setMeta({ model: j.model, elapsedMs: j.elapsedMs });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn) {
    return (
      <div className="glass-panel space-y-4 p-8 text-center">
        <h2 className="font-display text-2xl text-ink-50">Try a brief with your own key</h2>
        <p className="text-sm text-ink-400">
          Bring your own AI key — paid by you, never proxied through us. Make an account to keep your sources, models and
          delivery channels in one place.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/signup" className="rounded-xl bg-beam px-5 py-3 text-sm font-semibold text-ink-950 hover:-translate-y-0.5">
            Create account
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-ink-100 hover:border-beam/40"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel space-y-5 p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl text-ink-50">Generate a sample brief</h2>
          <p className="mt-1 text-sm text-ink-400">
            Pick a topic, ask a question, and Lighthouse drafts a short Markdown brief using <em>your</em> AI provider. Your key is
            never stored on our servers.
          </p>
        </div>
        <Link
          href="/settings"
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-ink-200 hover:border-beam/40"
        >
          Settings
        </Link>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">Topic</span>
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-ink-50 focus:border-beam focus:outline-none"
          >
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">Your question</span>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-ink-50 focus:border-beam focus:outline-none"
            placeholder="e.g. What broke and what shipped in the last 24h?"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onRun}
          disabled={busy}
          className="rounded-xl bg-beam px-5 py-3 text-sm font-semibold text-ink-950 shadow-[0_18px_45px_rgba(56,189,248,0.35)] transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {busy ? "Drafting…" : "Run a sample brief"}
        </button>
        {!byokReady ? (
          <span className="text-xs text-amber-200">
            Add your API key in <Link href="/settings" className="underline">Settings</Link> first.
          </span>
        ) : (
          <span className="text-xs text-ink-500">
            Uses the model you configured. No tokens billed by us — your provider, your bill.
          </span>
        )}
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>
      ) : null}

      {output ? (
        <article className="prose prose-invert max-w-none rounded-2xl border border-white/10 bg-black/30 p-6 text-sm text-ink-100">
          <BriefBody markdown={output} />
          {meta ? (
            <p className="mt-4 text-[11px] text-ink-500">
              Drafted with <span className="font-mono">{meta.model}</span> in {meta.elapsedMs}ms.
            </p>
          ) : null}
        </article>
      ) : null}

      {history.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">Recent briefs</h3>
          <ul className="space-y-2">
            {history.map((b) => (
              <li key={b.id} className="rounded-xl border border-white/10 bg-black/20">
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="flex-1 truncate text-sm text-ink-200">
                    <span className="mr-2 font-mono text-[11px] text-ink-500">{b.topic_id}</span>
                    {b.prompt}
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-500">
                    {new Date(b.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </button>
                {expandedId === b.id ? (
                  <div className="border-t border-white/10 px-4 py-3">
                    <BriefBody markdown={b.output_md} />
                    {b.model ? (
                      <p className="mt-3 text-[11px] text-ink-500">
                        <span className="font-mono">{b.model}</span>
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function BriefBody({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: (p) => <h1 className="font-display text-2xl text-ink-50" {...p} />,
        h2: (p) => <h2 className="mt-4 font-display text-xl text-ink-50" {...p} />,
        h3: (p) => <h3 className="mt-3 font-semibold text-ink-100" {...p} />,
        p: (p) => <p className="mt-2 leading-relaxed text-ink-200" {...p} />,
        ul: (p) => <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-200" {...p} />,
        li: (p) => <li className="text-ink-200" {...p} />,
        a: (p) => <a className="text-beam underline" target="_blank" rel="noreferrer" {...p} />,
        code: (p) => <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-xs text-beam-glow" {...p} />,
      }}
    >
      {markdown}
    </ReactMarkdown>
  );
}
