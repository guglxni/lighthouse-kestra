import "server-only";

import {
  createExecution,
  getExecution,
  kestraConfigured,
  type KestraExecution,
  waitForExecution,
} from "@/lib/kestra-client";

/** Existing Kestra flows — ingest → process → deliver (no new flows). */
export const KESTRA_FLOWS = {
  exa: { namespace: "company.team.lighthouse.ingest", flowId: "exa_search" },
  classify: { namespace: "company.team.lighthouse.process", flowId: "classify" },
  summarize: { namespace: "company.team.lighthouse.process", flowId: "cluster_summarize" },
  deliver: { namespace: "company.team.lighthouse.deliver", flowId: "brief" },
} as const;

export type KestraByokInputs = {
  exaApiKey?: string;
  llmBaseUrl?: string;
  llmApiKey?: string;
  modelPrimary?: string;
  modelFallback?: string;
  modelQuality?: string;
};

export type KestraStage = "exa" | "classify" | "summarize";

export function requireKestra(): string {
  if (!kestraConfigured()) {
    throw new Error(
      "Kestra is required. Set KESTRA_PUBLIC_URL on the demo server and run the engine via infra/docker-compose.yml.",
    );
  }
  return process.env.KESTRA_PUBLIC_URL!.replace(/\/$/, "");
}

function llmInputs(byok?: KestraByokInputs): Record<string, string> {
  const out: Record<string, string> = {};
  if (byok?.llmBaseUrl?.trim()) out.llm_base_url = byok.llmBaseUrl.trim();
  if (byok?.llmApiKey?.trim()) out.llm_api_key = byok.llmApiKey.trim();
  if (byok?.modelPrimary?.trim()) out.model_primary = byok.modelPrimary.trim();
  if (byok?.modelFallback?.trim()) out.model_fallback = byok.modelFallback.trim();
  if (byok?.modelQuality?.trim()) out.model_quality = byok.modelQuality.trim();
  return out;
}

export async function runKestraStage(args: {
  stage: KestraStage;
  topicId: string;
  prompt: string;
  topicContext?: string;
  byok?: KestraByokInputs;
  useMultiLlm?: boolean;
}): Promise<{ executionId: string; state: string; elapsedMs: number; markdown?: string }> {
  requireKestra();
  const t0 = Date.now();
  let spec: (typeof KESTRA_FLOWS)[keyof typeof KESTRA_FLOWS];
  let inputs: Record<string, unknown>;

  if (args.stage === "exa") {
    spec = KESTRA_FLOWS.exa;
    const query = `${args.topicId.replace(/-/g, " ")} — ${args.prompt}`;
    inputs = {
      topic_id: args.topicId,
      query,
      ...(args.byok?.exaApiKey?.trim() ? { exa_api_key: args.byok.exaApiKey.trim() } : {}),
    };
  } else if (args.stage === "classify") {
    spec = KESTRA_FLOWS.classify;
    inputs = {
      topic_id: args.topicId,
      limit: 30,
      use_multi_llm: args.useMultiLlm ?? false,
      ...llmInputs(args.byok),
    };
  } else {
    spec = KESTRA_FLOWS.summarize;
    inputs = {
      topic_id: args.topicId,
      use_multi_llm: args.useMultiLlm ?? Boolean(args.byok?.modelFallback?.trim()),
      user_prompt: args.prompt,
      topic_context: args.topicContext ?? `Topic id: ${args.topicId}`,
      ...llmInputs(args.byok),
    };
  }

  const created = await createExecution(spec.namespace, spec.flowId, inputs);
  const done = await waitForExecution(created.id, { timeoutMs: 600_000, pollMs: 2000 });
  const markdown = extractBriefMarkdown(done);
  return {
    executionId: created.id,
    state: done.state?.current ?? "UNKNOWN",
    elapsedMs: Date.now() - t0,
    markdown,
  };
}

/** Full on-demand brief via existing flows: exa → classify → cluster_summarize. */
export async function runKestraBriefPipeline(args: {
  topicId: string;
  prompt: string;
  topicContext?: string;
  byok?: KestraByokInputs;
  skipExa?: boolean;
  onStage?: (stage: KestraStage, status: "active" | "done" | "skipped" | "error", detail?: string) => void;
}): Promise<{
  output: string;
  model: string;
  stages: KestraStage[];
  executionIds: Partial<Record<KestraStage, string>>;
  exa?: { used: boolean };
}> {
  const executionIds: Partial<Record<KestraStage, string>> = {};
  const stages: KestraStage[] = [];
  const hasExa = Boolean(args.byok?.exaApiKey?.trim()) || Boolean(process.env.EXA_API_KEY?.trim());

  if (!args.skipExa && hasExa) {
    stages.push("exa");
    args.onStage?.("exa", "active", "Kestra ingest.exa_search…");
    try {
      const exa = await runKestraStage({ stage: "exa", ...args });
      executionIds.exa = exa.executionId;
      args.onStage?.("exa", "done", `ingest.exa_search ${exa.state}`);
    } catch (e) {
      args.onStage?.("exa", "error", e instanceof Error ? e.message : String(e));
      throw e;
    }
  } else {
    args.onStage?.("exa", "skipped", "No Exa key on engine");
  }

  stages.push("classify");
  args.onStage?.("classify", "active", "Kestra process.classify…");
  const classify = await runKestraStage({ stage: "classify", ...args, useMultiLlm: false });
  executionIds.classify = classify.executionId;
  args.onStage?.("classify", "done", `process.classify ${classify.state}`);

  stages.push("summarize");
  args.onStage?.("summarize", "active", "Kestra process.cluster_summarize…");
  const summarize = await runKestraStage({
    stage: "summarize",
    ...args,
    useMultiLlm: Boolean(args.byok?.modelFallback?.trim()),
  });
  executionIds.summarize = summarize.executionId;
  args.onStage?.("summarize", "done", `process.cluster_summarize ${summarize.state}`);

  const output = summarize.markdown?.trim();
  if (!output) {
    throw new Error("Kestra cluster_summarize finished but no brief markdown was returned.");
  }

  return {
    output,
    model: args.byok?.modelQuality?.trim() || args.byok?.modelPrimary?.trim() || "kestra/litellm",
    stages,
    executionIds,
    exa: hasExa && !args.skipExa ? { used: true } : { used: false },
  };
}

function extractBriefMarkdown(execution: KestraExecution): string | undefined {
  const flowOut = execution.outputs as Record<string, unknown> | undefined;
  if (typeof flowOut?.markdown === "string" && flowOut.markdown.trim()) {
    return flowOut.markdown;
  }
  const runs = execution.taskRunList ?? [];
  for (const tr of runs) {
    if (tr.taskId !== "summarize_and_persist") continue;
    const outputs = tr.outputs as Record<string, unknown> | undefined;
    if (typeof outputs?.markdown === "string" && outputs.markdown.trim()) {
      return outputs.markdown;
    }
    const files = outputs?.outputFiles as Record<string, string> | undefined;
    if (typeof files?.["brief.md"] === "string") return files["brief.md"];
  }
  return undefined;
}

export async function pollKestraExecution(executionId: string): Promise<KestraExecution> {
  return getExecution(executionId);
}
