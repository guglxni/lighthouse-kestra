import { after, NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deliverBriefToUser, summarizeDelivery } from "@/lib/deliver-brief";
import { isValidByok } from "@/lib/llm-forward";
import { kestraConfigured } from "@/lib/kestra-client";
import { runKestraBriefPipeline } from "@/lib/kestra-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Payload = {
  topicId: string;
  prompt: string;
  byok: {
    llmApiKey: string;
    llmBaseUrl: string;
    llmModelPrimary: string;
    llmModelQuality?: string;
  };
  agentmail?: {
    apiKey: string;
    inboxId: string;
  };
  exaApiKey?: string;
};

export async function POST(req: NextRequest) {
  if (!kestraConfigured()) {
    return NextResponse.json(
      {
        error:
          "Kestra is required. Exa and LLMs run only through existing Kestra flows (ingest → process → deliver). Set KESTRA_PUBLIC_URL and run docker compose.",
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

  const { topicId, prompt, byok, agentmail, exaApiKey } = body ?? {};
  if (typeof topicId !== "string" || !topicId || topicId.length > 64 || typeof prompt !== "string" || !prompt || prompt.length > 4000) {
    return NextResponse.json({ error: "Missing topicId or prompt" }, { status: 400 });
  }
  if (!isValidByok(byok)) {
    return NextResponse.json({ error: "Add an LLM API key, base URL and model name in Settings first." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to run a sample brief." }, { status: 401 });
  }

  const { data: customTopic } = await supabase
    .from("custom_topics")
    .select("name,description,yaml_content")
    .eq("user_id", user.id)
    .eq("id", topicId)
    .maybeSingle();

  const topicContext = customTopic
    ? [
        `Custom topic: ${customTopic.name}`,
        customTopic.description ? `Scope: ${customTopic.description}` : "",
        `Kestra profile:\n${customTopic.yaml_content}`,
      ]
        .filter(Boolean)
        .join("\n\n")
    : `Topic id: ${topicId}`;

  const startedAt = Date.now();
  let output: string;
  let model: string;
  let exaUsed = false;
  try {
    console.log(`try-brief: kestra start user=${user.id.slice(0, 8)} topic=${topicId}`);
    const result = await runKestraBriefPipeline({
      topicId,
      prompt,
      topicContext,
      byok: {
        exaApiKey,
        llmBaseUrl: byok.llmBaseUrl,
        llmApiKey: byok.llmApiKey,
        modelPrimary: byok.llmModelPrimary,
        modelQuality: byok.llmModelQuality?.trim() || undefined,
      },
    });
    output = result.output;
    model = result.model;
    exaUsed = result.exa?.used ?? false;
    console.log(
      `try-brief: kestra ok user=${user.id.slice(0, 8)} topic=${topicId} ms=${Date.now() - startedAt} stages=${result.stages.join(",")}`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`try-brief: kestra fail user=${user.id.slice(0, 8)} topic=${topicId} err=${msg.slice(0, 200)}`);
    return NextResponse.json({ error: `Kestra pipeline failed: ${msg}` }, { status: 502 });
  }

  await supabase
    .from("sample_briefs")
    .insert({
      user_id: user.id,
      topic_id: topicId,
      prompt,
      output_md: output,
      model: model ?? byok.llmModelPrimary,
    })
    .throwOnError();

  const { data: deliverySettings } = await supabase
    .from("user_settings")
    .select("slack_webhook,discord_webhook,telegram_chat_id,email_to,notion_page_id,notion_access_token")
    .eq("user_id", user.id)
    .maybeSingle();

  const deliveryPending = Boolean(deliverySettings);
  const topicName = customTopic?.name;
  const agentmailCreds = agentmail?.apiKey && agentmail?.inboxId ? agentmail : undefined;

  if (deliverySettings) {
    after(async () => {
      try {
        const results = await deliverBriefToUser(deliverySettings, output, topicId, agentmailCreds, topicName);
        const summary = summarizeDelivery(results);
        console.log(`try-brief: delivered user=${user.id.slice(0, 8)} topic=${topicId} ok=${summary.delivered} fail=${summary.failed}`);
      } catch (e) {
        console.error(`try-brief: delivery_fail user=${user.id.slice(0, 8)}`, e);
      }
    });
  }

  return NextResponse.json({
    output,
    model: model ?? byok.llmModelPrimary,
    elapsedMs: Date.now() - startedAt,
    usage: null,
    delivery: { delivered: 0, failed: 0, channels: [], pending: deliveryPending },
    exa: { used: exaUsed, hits: exaUsed ? 1 : 0 },
    pipeline: {
      engine: "kestra",
      stages: ["ingest.exa_search", "process.classify", "process.cluster_summarize"],
      models: { draft: byok.llmModelPrimary, polish: byok.llmModelQuality ?? null },
    },
  });
}
