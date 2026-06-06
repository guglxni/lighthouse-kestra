import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { forwardChatCompletion, isValidByok } from "@/lib/llm-forward";

function isSsrfSafeUrl(raw: string): boolean {
  if (!/^https?:\/\//i.test(raw)) return false;
  try {
    const { hostname } = new URL(raw);
    return !/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/i.test(hostname);
  } catch {
    return false;
  }
}
import { applySchedulesToYaml } from "@/lib/cron-presets";
import { cronsFromRunSchedule, DEFAULT_RUN_SCHEDULE, type RunSchedule } from "@/lib/schedule-simple";
import { TOPIC_YAML_EXAMPLE, TOPIC_YAML_SYSTEM } from "@/lib/topic-yaml-prompt";
import { validateTopicYaml } from "@/lib/topic-yaml-validate";
import { parse as parseYaml } from "yaml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  brief: string;
  runSchedule?: RunSchedule;
  byok: { llmApiKey: string; llmBaseUrl: string; llmModelPrimary: string };
};

function stripFences(text: string): string {
  return text.replace(/^```(?:ya?ml)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

export async function POST(req: NextRequest) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { brief, byok, runSchedule } = body ?? {};
  if (!brief || typeof brief !== "string" || brief.length > 4000) {
    return NextResponse.json({ error: "Describe what you want to track (max 4000 chars)." }, { status: 400 });
  }
  const crons = cronsFromRunSchedule(runSchedule ?? DEFAULT_RUN_SCHEDULE);
  if (!isValidByok(byok) || !isSsrfSafeUrl(byok.llmBaseUrl)) {
    return NextResponse.json({ error: "Add an LLM API key, base URL and model in Settings first." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to build a custom topic." }, { status: 401 });

  const startedAt = Date.now();
  try {
    const { output, model } = await forwardChatCompletion(
      byok,
      TOPIC_YAML_SYSTEM,
      `Example profile:\n\n${TOPIC_YAML_EXAMPLE}\n\nUser brief to turn into a new topic YAML:\n${brief}`,
      0.2,
    );

    const yaml = applySchedulesToYaml(stripFences(output), crons);
    let parsed: Record<string, unknown>;
    try {
      parsed = parseYaml(yaml) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Model returned invalid YAML. Try again with a clearer brief.", raw: yaml.slice(0, 800) }, { status: 422 });
    }

    const validation = validateTopicYaml(parsed);
    if (!validation.ok) {
      return NextResponse.json(
        { error: `YAML did not pass Lighthouse/Kestra checks: ${validation.errors.join(" ")}`, raw: yaml.slice(0, 800) },
        { status: 422 },
      );
    }

    const id = String(parsed.id ?? "").trim();
    const name = String(parsed.name ?? "").trim();
    const schedule = crons[0];
    const schedules = crons;
    const description = String(parsed.description ?? "").trim();

    const { error: upsertErr } = await supabase.from("custom_topics").upsert(
      {
        user_id: user.id,
        id,
        name,
        description,
        yaml_content: yaml,
        schedule: schedule ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,id" },
    );
    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    await supabase.from("user_settings").upsert(
      { user_id: user.id, default_topic_id: id, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

    return NextResponse.json({
      id,
      name,
      description,
      schedule,
      schedules,
      yaml,
      model,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
