import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidByok } from "@/lib/llm-forward";
import { kestraConfigured } from "@/lib/kestra-client";
import {
  pollKestraStageExecution,
  startKestraStage,
  type KestraByokInputs,
  type KestraStage,
} from "@/lib/kestra-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** UI stage → existing Kestra flow (ingest.exa_search → process.classify → process.cluster_summarize). */
const STAGE_MAP: Record<string, KestraStage> = {
  exa: "exa",
  draft: "classify",
  polish: "summarize",
};

type Payload = {
  action?: "start" | "poll";
  executionId?: string;
  startedAt?: number;
  stage: "exa" | "draft" | "polish";
  topicId: string;
  prompt: string;
  byok: {
    llmApiKey: string;
    llmBaseUrl: string;
    llmModelPrimary: string;
    llmModelQuality?: string;
  };
  exaApiKey?: string;
  topicContext?: string;
};

function toKestraByok(body: Payload): KestraByokInputs {
  return {
    exaApiKey: body.exaApiKey,
    llmBaseUrl: body.byok.llmBaseUrl,
    llmApiKey: body.byok.llmApiKey,
    modelPrimary: body.byok.llmModelPrimary,
    modelQuality: body.byok.llmModelQuality,
  };
}

function stageResponse(
  stage: Payload["stage"],
  byok: Payload["byok"],
  result: { executionId: string; state: string; elapsedMs: number; markdown?: string },
) {
  if (stage === "exa") {
    return {
      stage,
      research: { hits: [], mode: "kestra" as const },
      elapsedMs: result.elapsedMs,
      detail: `ingest.exa_search (${result.state})`,
      executionId: result.executionId,
    };
  }
  if (stage === "draft") {
    return {
      stage,
      draft: "(classified via Kestra)",
      model: byok.llmModelPrimary,
      elapsedMs: result.elapsedMs,
      detail: `process.classify (${result.state})`,
      executionId: result.executionId,
    };
  }
  const output = result.markdown ?? "";
  if (!output.trim()) {
    throw new Error("Kestra cluster_summarize returned no markdown.");
  }
  return {
    stage,
    output,
    model: byok.llmModelQuality?.trim() || byok.llmModelPrimary,
    skipped: !byok.llmModelQuality?.trim(),
    elapsedMs: result.elapsedMs,
    detail: `process.cluster_summarize (${result.state})`,
    executionId: result.executionId,
  };
}

export async function POST(req: NextRequest) {
  if (!kestraConfigured()) {
    return NextResponse.json(
      {
        error:
          "Kestra is required for all briefs. Set KESTRA_PUBLIC_URL on this server and run infra/docker-compose.yml (Kestra + LiteLLM + Postgres).",
      },
      { status: 503 },
    );
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { stage, topicId, prompt, byok, exaApiKey, topicContext, action = "start", executionId, startedAt } = body ?? {};
  const kestraStage = STAGE_MAP[stage];
  if (!kestraStage || !topicId || !prompt) {
    return NextResponse.json({ error: "Missing stage, topicId, or prompt." }, { status: 400 });
  }

  if (stage !== "exa" && !isValidByok(byok)) {
    return NextResponse.json({ error: "Add LLM BYOK in Settings — Kestra forwards it to process.classify / cluster_summarize." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  if (action === "poll") {
    if (!executionId) return NextResponse.json({ error: "executionId required for poll." }, { status: 400 });
    try {
      const polled = await pollKestraStageExecution(executionId, startedAt ?? Date.now());
      if (!polled.done) {
        return NextResponse.json({
          stage,
          status: "running",
          executionId,
          state: polled.state,
          startedAt: startedAt ?? Date.now(),
        });
      }
      return NextResponse.json(stageResponse(stage, byok, polled));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg, stage }, { status: 502 });
    }
  }

  let resolvedTopicContext = topicContext;
  if (!resolvedTopicContext) {
    const { data: customTopic } = await supabase
      .from("custom_topics")
      .select("name,description,yaml_content")
      .eq("user_id", user.id)
      .eq("id", topicId)
      .maybeSingle();
    resolvedTopicContext = customTopic
      ? [
          `Custom topic: ${customTopic.name}`,
          customTopic.description ? `Scope: ${customTopic.description}` : "",
          `Kestra profile:\n${customTopic.yaml_content}`,
        ]
          .filter(Boolean)
          .join("\n\n")
      : `Topic id: ${topicId}`;
  }

  try {
    if (stage === "exa" && !exaApiKey?.trim() && !process.env.EXA_API_KEY?.trim()) {
      return NextResponse.json({
        stage,
        skipped: true,
        research: { hits: [], mode: "none" as const },
        elapsedMs: 0,
        detail: "No Exa key — set EXA_API_KEY on Kestra or in Settings",
      });
    }

    const t0 = Date.now();
    const created = await startKestraStage({
      stage: kestraStage,
      topicId,
      prompt,
      topicContext: resolvedTopicContext,
      byok: toKestraByok({ ...body, exaApiKey }),
      useMultiLlm: Boolean(byok?.llmModelQuality?.trim()),
    });

    return NextResponse.json({
      stage,
      status: "running",
      executionId: created.executionId,
      startedAt: t0,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`brief-stage:${stage} kestra start fail topic=${topicId} err=${msg.slice(0, 200)}`);
    return NextResponse.json({ error: msg, stage }, { status: 502 });
  }
}
