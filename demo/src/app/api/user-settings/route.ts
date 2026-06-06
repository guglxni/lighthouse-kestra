import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { maskSecret, maskWebhook } from "@/lib/mask-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_settings")
    .select(
      "default_topic_id,slack_webhook,discord_webhook,telegram_chat_id,notion_page_id,email_to,llm_base_url,llm_model_primary,llm_model_quality,agentmail_inbox_id,slack_team_name,notion_workspace_name,oauth_slack_connected_at,oauth_notion_connected_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    delivery: {
      defaultTopicId: data?.default_topic_id ?? null,
      emailTo: data?.email_to ?? null,
      agentmailInboxId: data?.agentmail_inbox_id ?? null,
      llmBaseUrl: data?.llm_base_url ?? null,
      llmModelPrimary: data?.llm_model_primary ?? null,
    },
    oauth: {
      slackConnected: Boolean(data?.oauth_slack_connected_at),
      slackTeam: data?.slack_team_name ?? null,
      notionConnected: Boolean(data?.oauth_notion_connected_at),
      notionWorkspace: data?.notion_workspace_name ?? null,
    },
    masked: {
      slackWebhook: maskWebhook(data?.slack_webhook),
      discordWebhook: maskWebhook(data?.discord_webhook),
      notionPageId: maskSecret(data?.notion_page_id),
      telegramChatId: data?.telegram_chat_id ? "configured" : null,
    },
  });
}

type PatchBody = {
  default_topic_id?: string;
  slack_webhook?: string;
  discord_webhook?: string;
  telegram_chat_id?: string;
  notion_page_id?: string;
  email_to?: string;
  agentmail_inbox_id?: string;
  llm_base_url?: string;
  llm_model_primary?: string;
  llm_model_quality?: string | null;
};

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
  if (body.default_topic_id !== undefined) patch.default_topic_id = body.default_topic_id || "agentic-eng";
  if (body.slack_webhook !== undefined) patch.slack_webhook = body.slack_webhook || null;
  if (body.discord_webhook !== undefined) patch.discord_webhook = body.discord_webhook || null;
  if (body.telegram_chat_id !== undefined) patch.telegram_chat_id = body.telegram_chat_id || null;
  if (body.notion_page_id !== undefined) patch.notion_page_id = body.notion_page_id || null;
  if (body.email_to !== undefined) patch.email_to = body.email_to || null;
  if (body.agentmail_inbox_id !== undefined) patch.agentmail_inbox_id = body.agentmail_inbox_id || null;
  if (body.llm_base_url !== undefined) patch.llm_base_url = body.llm_base_url || null;
  if (body.llm_model_primary !== undefined) patch.llm_model_primary = body.llm_model_primary || null;
  if (body.llm_model_quality !== undefined) patch.llm_model_quality = body.llm_model_quality || null;

  const { error } = await supabase.from("user_settings").upsert(patch, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
