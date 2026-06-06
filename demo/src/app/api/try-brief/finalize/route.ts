import { after, NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deliverBriefToUser, summarizeDelivery } from "@/lib/deliver-brief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Payload = {
  topicId: string;
  prompt: string;
  output: string;
  model?: string;
  agentmail?: { apiKey: string; inboxId: string };
};

export async function POST(req: NextRequest) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { topicId, prompt, output, model, agentmail } = body ?? {};
  if (!topicId || !prompt || !output?.trim()) {
    return NextResponse.json({ error: "Missing topicId, prompt, or output." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const startedAt = Date.now();
  const { data: customTopic } = await supabase
    .from("custom_topics")
    .select("name")
    .eq("user_id", user.id)
    .eq("id", topicId)
    .maybeSingle();

  await supabase
    .from("sample_briefs")
    .insert({
      user_id: user.id,
      topic_id: topicId,
      prompt,
      output_md: output,
      model: model ?? null,
    })
    .throwOnError();

  const { data: deliverySettings } = await supabase
    .from("user_settings")
    .select("slack_webhook,discord_webhook,telegram_chat_id,email_to,notion_page_id,notion_access_token")
    .eq("user_id", user.id)
    .maybeSingle();

  const deliveryPending = Boolean(deliverySettings);
  if (deliverySettings) {
    const creds = agentmail?.apiKey && agentmail?.inboxId ? agentmail : undefined;
    after(async () => {
      try {
        const results = await deliverBriefToUser(deliverySettings, output, topicId, creds, customTopic?.name);
        const summary = summarizeDelivery(results);
        console.log(`try-brief/finalize: delivered ok=${summary.delivered} fail=${summary.failed}`);
      } catch (e) {
        console.error("try-brief/finalize: delivery_fail", e);
      }
    });
  }

  return NextResponse.json({
    ok: true,
    deliveryPending,
    elapsedMs: Date.now() - startedAt,
  });
}
