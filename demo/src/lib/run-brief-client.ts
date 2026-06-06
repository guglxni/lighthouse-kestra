"use client";

import type { BriefResearchPayload } from "@/lib/brief-stages";

export type BriefProgressStep = {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "skipped" | "error";
  detail?: string;
  elapsedMs?: number;
};

export type BriefRunResult = {
  output: string;
  model: string;
  steps: BriefProgressStep[];
  exa?: { used: boolean; hits: number; mode?: string };
  totalMs: number;
};

type ByokPayload = {
  llmApiKey: string;
  llmBaseUrl: string;
  llmModelPrimary: string;
  llmModelQuality?: string;
};

async function postStage(body: Record<string, unknown>) {
  const res = await fetch("/api/brief-stage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j as { error?: string }).error ?? `Stage failed (HTTP ${res.status})`);
  return j as Record<string, unknown>;
}

export async function runBriefPipeline(args: {
  topicId: string;
  prompt: string;
  byok: ByokPayload;
  exaApiKey?: string;
  agentmail?: { apiKey: string; inboxId: string };
  onStep: (steps: BriefProgressStep[]) => void;
}): Promise<BriefRunResult> {
  const hasExa = Boolean(args.exaApiKey?.trim());
  const hasPolish = Boolean(args.byok.llmModelQuality?.trim());

  const steps: BriefProgressStep[] = [
    {
      id: "exa",
      label: "Kestra ingest.exa_search",
      status: hasExa ? "pending" : "skipped",
      detail: hasExa ? undefined : "No Exa key",
    },
    { id: "draft", label: "Kestra process.classify", status: "pending" },
    {
      id: "polish",
      label: "Kestra process.cluster_summarize",
      status: hasPolish ? "pending" : "pending",
      detail: hasPolish ? "Includes quality polish pass" : "Single-pass summarize",
    },
    { id: "finalize", label: "Save & deliver", status: "pending" },
  ];

  const bump = (id: string, patch: Partial<BriefProgressStep>) => {
    const i = steps.findIndex((s) => s.id === id);
    if (i >= 0) steps[i] = { ...steps[i]!, ...patch };
    args.onStep([...steps]);
  };

  const t0 = Date.now();
  let research: BriefResearchPayload | undefined;
  let draft = "";
  let output = "";
  let model = args.byok.llmModelPrimary;
  let exaMeta: BriefRunResult["exa"];

  if (hasExa) {
    bump("exa", { status: "active", detail: "Searching and synthesizing sources…" });
    const exa = await postStage({
      stage: "exa",
      topicId: args.topicId,
      prompt: args.prompt,
      byok: args.byok,
      exaApiKey: args.exaApiKey,
    });
    research = exa.research as BriefResearchPayload;
    exaMeta = { used: true, hits: research?.hits?.length ?? 0, mode: research?.mode };
    bump("exa", {
      status: "done",
      detail: String(exa.detail ?? `Found ${research?.hits?.length ?? 0} sources`),
      elapsedMs: exa.elapsedMs as number,
    });
  }

  bump("draft", { status: "active", detail: `Classifying via LiteLLM (${args.byok.llmModelPrimary})…` });
  const draftRes = await postStage({
    stage: "draft",
    topicId: args.topicId,
    prompt: args.prompt,
    byok: args.byok,
    research,
  });
  draft = draftRes.draft as string;
  model = draftRes.model as string;
  bump("draft", { status: "done", detail: String(draftRes.detail), elapsedMs: draftRes.elapsedMs as number });

  bump("polish", {
    status: "active",
    detail: hasPolish ? `Summarizing + polish (${args.byok.llmModelQuality})…` : "Summarizing via cluster_summarize…",
  });
  const polishRes = await postStage({
    stage: "polish",
    topicId: args.topicId,
    prompt: args.prompt,
    byok: args.byok,
    draft,
  });
  output = polishRes.output as string;
  model = polishRes.model as string;
  bump("polish", {
    status: polishRes.skipped ? "skipped" : "done",
    detail: String(polishRes.detail),
    elapsedMs: polishRes.elapsedMs as number,
  });

  bump("finalize", { status: "active", detail: "Saving to your library and sending to channels…" });
  const fin = await fetch("/api/try-brief/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topicId: args.topicId,
      prompt: args.prompt,
      output,
      model,
      agentmail: args.agentmail,
    }),
  });
  const finJ = await fin.json().catch(() => ({}));
  if (!fin.ok) throw new Error((finJ as { error?: string }).error ?? "Failed to save brief");
  bump("finalize", {
    status: "done",
    detail: (finJ as { deliveryPending?: boolean }).deliveryPending ? "Saved — delivery in background" : "Saved",
    elapsedMs: (finJ as { elapsedMs?: number }).elapsedMs,
  });

  return { output, model, steps, exa: exaMeta, totalMs: Date.now() - t0 };
}
