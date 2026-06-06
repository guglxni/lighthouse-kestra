"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DEFAULT_RUN_SCHEDULE,
  RUN_FREQUENCIES,
  clampHour,
  clampMinute,
  describeRunSchedule,
  type RunSchedule,
} from "@/lib/schedule-simple";
import { formatCronSchedule } from "@/lib/format-cron";
import { hasMinimumByok, readByok } from "@/lib/byok-store";

export function BuildBrief({
  signedIn,
  onTopicCreated,
}: {
  signedIn: boolean;
  onTopicCreated: (topic: { id: string; name: string; description: string; schedule?: string }) => void;
}) {
  const [brief, setBrief] = useState(
    "Track Solana DeFi protocol upgrades, new Anchor releases, and security audit reports.",
  );
  const [runSchedule, setRunSchedule] = useState<RunSchedule>(DEFAULT_RUN_SCHEDULE);
  const [busy, setBusy] = useState(false);
  const [yaml, setYaml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ id: string; name: string; schedule?: string; schedules?: string[]; elapsedMs?: number } | null>(null);

  function updateTime(index: number, patch: Partial<{ hour: number; minute: number }>) {
    setRunSchedule((s) => ({
      ...s,
      times: s.times.map((t, i) =>
        i === index
          ? { hour: clampHour(patch.hour ?? t.hour), minute: clampMinute(patch.minute ?? t.minute) }
          : t,
      ),
    }));
  }

  function addTime() {
    if (runSchedule.times.length >= 8) return;
    setRunSchedule((s) => ({
      ...s,
      times: [...s.times, { hour: 12, minute: 0 }],
    }));
  }

  function removeTime(index: number) {
    if (runSchedule.times.length <= 1) return;
    setRunSchedule((s) => ({ ...s, times: s.times.filter((_, i) => i !== index) }));
  }

  if (!signedIn) {
    return (
      <div className="glass-panel p-6 text-center text-sm text-ink-400">
        <Link href="/signup" className="text-beam underline">
          Sign in
        </Link>{" "}
        to build a custom topic profile.
      </div>
    );
  }

  async function onBuild() {
    setBusy(true);
    setError(null);
    setYaml("");
    setMeta(null);

    const byok = readByok();
    if (!hasMinimumByok(byok)) {
      setError("Add your LLM API key in Settings first.");
      setBusy(false);
      return;
    }

    try {
      const res = await fetch("/api/build-topic-yaml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          runSchedule,
          byok: {
            llmApiKey: byok.llmApiKey,
            llmBaseUrl: byok.llmBaseUrl,
            llmModelPrimary: byok.llmModelPrimary,
          },
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);

      setYaml(j.yaml as string);
      setMeta({ id: j.id, name: j.name, schedule: j.schedule, schedules: j.schedules, elapsedMs: j.elapsedMs });
      onTopicCreated({
        id: j.id,
        name: j.name,
        description: j.description ?? "",
        schedule: j.schedule,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-panel space-y-5 p-6">
      <header>
        <h2 className="font-display text-2xl text-ink-50">Build your brief</h2>
        <p className="mt-1 text-sm text-ink-400">
          Describe what to track. Your LLM drafts a Kestra-ready topic profile — saved automatically and wired into{" "}
          <strong className="font-normal text-ink-200">Generate a sample brief</strong> above.
        </p>
      </header>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">What should Lighthouse watch?</span>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-ink-50 focus:border-beam focus:outline-none"
          placeholder="e.g. Daily digest of Rust async runtime changes, Tokio releases, and r/rust discussions…"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">How often?</span>
        <select
          value={runSchedule.frequency}
          onChange={(e) =>
            setRunSchedule((s) => ({ ...s, frequency: e.target.value as RunSchedule["frequency"] }))
          }
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-ink-50 focus:border-beam focus:outline-none"
        >
          {RUN_FREQUENCIES.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </label>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
            Run times (UTC) — add multiple briefs per day
          </span>
          <button
            type="button"
            onClick={addTime}
            disabled={runSchedule.times.length >= 8}
            className="text-xs text-beam hover:underline disabled:opacity-40"
          >
            + Add time
          </button>
        </div>
        {runSchedule.times.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <label className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-500">HH</span>
              <input
                type="number"
                min={0}
                max={23}
                value={t.hour}
                onChange={(e) => updateTime(i, { hour: Number(e.target.value) })}
                className="w-full bg-transparent text-sm text-ink-50 focus:outline-none"
              />
            </label>
            <span className="text-ink-400">:</span>
            <label className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
              <span className="text-[10px] uppercase tracking-wider text-ink-500">MM</span>
              <input
                type="number"
                min={0}
                max={59}
                value={t.minute}
                onChange={(e) => updateTime(i, { minute: Number(e.target.value) })}
                className="w-full bg-transparent text-sm text-ink-50 focus:outline-none"
              />
            </label>
            {runSchedule.times.length > 1 ? (
              <button
                type="button"
                onClick={() => removeTime(i)}
                className="rounded-lg px-2 py-1 text-xs text-ink-500 hover:bg-white/5 hover:text-rose-200"
                aria-label="Remove time"
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-ink-500">{describeRunSchedule(runSchedule)} — written to your topic YAML.</p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onBuild}
          disabled={busy}
          className="rounded-xl bg-beam px-5 py-3 text-sm font-semibold text-ink-950 shadow-[0_18px_45px_rgba(56,189,248,0.35)] transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {busy ? "Creating your topic…" : "Create topic & activate"}
        </button>
        <span className="text-xs text-ink-500">Validates against Kestra topic rules · BYOK LLM</span>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>
      ) : null}

      {meta ? (
        <div className="space-y-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4">
          <p className="text-sm text-emerald-50">
            <span className="font-semibold">{meta.name}</span> is active — selected in Topics and ready in{" "}
            <a href="#try" className="underline">
              Generate a sample brief
            </a>
            .
            {meta.schedules && meta.schedules.length > 1 ? (
              <>
                {" "}
                Runs {meta.schedules.length} times daily:{" "}
                {meta.schedules.map((c) => formatCronSchedule(c)).join(" · ")}.
              </>
            ) : meta.schedule ? (
              <>
                {" "}
                Runs <span className="text-emerald-100">{formatCronSchedule(meta.schedule)}</span> (
                <code className="font-mono text-[11px]">{meta.schedule}</code>).
              </>
            ) : null}
          </p>
          {yaml ? (
            <details className="text-xs text-ink-300">
              <summary className="cursor-pointer text-ink-400">View Kestra topic YAML</summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-[11px] leading-relaxed text-ink-200">
                {yaml}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
