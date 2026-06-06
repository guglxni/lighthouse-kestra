"use client";

import type { BriefProgressStep } from "@/lib/run-brief-client";

const STATUS_STYLES: Record<BriefProgressStep["status"], string> = {
  pending: "border-white/10 bg-black/20 text-ink-500",
  active: "border-beam/40 bg-beam/10 text-beam-glow",
  done: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  skipped: "border-white/5 bg-black/10 text-ink-600",
  error: "border-rose-400/30 bg-rose-500/10 text-rose-100",
};

const STATUS_ICON: Record<BriefProgressStep["status"], string> = {
  pending: "○",
  active: "◉",
  done: "✓",
  skipped: "—",
  error: "✕",
};

export function BriefPipelineProgress({
  steps,
  elapsedSec,
}: {
  steps: BriefProgressStep[];
  elapsedSec: number;
}) {
  if (steps.length === 0) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-ink-400">
        <span className="font-semibold uppercase tracking-[0.14em]">Pipeline</span>
        <span className="font-mono">{elapsedSec}s elapsed</span>
      </div>
      <ol className="space-y-2">
        {steps.map((step) => (
          <li
            key={step.id}
            className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${STATUS_STYLES[step.status]}`}
          >
            <span className="mt-0.5 w-4 shrink-0 font-mono text-xs">{STATUS_ICON[step.status]}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{step.label}</p>
              {step.detail ? <p className="mt-0.5 text-xs opacity-80">{step.detail}</p> : null}
              {step.elapsedMs != null && step.status === "done" ? (
                <p className="mt-0.5 font-mono text-[10px] opacity-60">{(step.elapsedMs / 1000).toFixed(1)}s</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
