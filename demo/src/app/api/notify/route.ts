import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { deliverBriefToUser, summarizeDelivery, type UserDeliverySettings } from "@/lib/deliver-brief";
import { timingSafeEqual, createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  topic_id: string;
  markdown: string;
};

function safeCompare(a: string, b: string): boolean {
  try {
    const ha = createHash("sha256").update(a).digest();
    const hb = createHash("sha256").update(b).digest();
    return timingSafeEqual(ha, hb);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.NOTIFY_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "NOTIFY_SECRET not configured" }, { status: 500 });
  }
  const auth = req.headers.get("Authorization") ?? "";
  if (!safeCompare(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { topic_id, markdown } = body ?? {};
  if (typeof topic_id !== "string" || !topic_id || typeof markdown !== "string" || !markdown) {
    return NextResponse.json({ error: "topic_id and markdown are required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: rows, error } = await admin
    .from("user_settings")
    .select(
      "user_id,slack_webhook,discord_webhook,telegram_chat_id,email_to,notion_page_id,notion_access_token,agentmail_inbox_id",
    )
    .eq("default_topic_id", topic_id);

  if (error) {
    return NextResponse.json({ error: `Supabase query failed: ${error.message}` }, { status: 500 });
  }

  const serverAgentmail =
    process.env.AGENTMAIL_API_KEY && process.env.AGENTMAIL_INBOX_ID
      ? { apiKey: process.env.AGENTMAIL_API_KEY, inboxId: process.env.AGENTMAIL_INBOX_ID }
      : undefined;

  const subscribers = (rows ?? []).filter(
    (u) =>
      u.slack_webhook ||
      u.discord_webhook ||
      u.telegram_chat_id ||
      u.email_to ||
      (u.notion_page_id && u.notion_access_token),
  );

  if (subscribers.length === 0) {
    return NextResponse.json({ delivered: 0, failed: 0, note: "no subscribers with delivery channels for this topic" });
  }

  const allResults: Array<{ user_id: string; channels: ReturnType<typeof summarizeDelivery> }> = [];

  for (const u of subscribers) {
    const settings: UserDeliverySettings = {
      slack_webhook: u.slack_webhook,
      discord_webhook: u.discord_webhook,
      telegram_chat_id: u.telegram_chat_id,
      email_to: u.email_to,
      notion_page_id: u.notion_page_id,
      notion_access_token: u.notion_access_token,
    };
    const agentmail =
      serverAgentmail ??
      (u.agentmail_inbox_id && process.env.AGENTMAIL_API_KEY
        ? { apiKey: process.env.AGENTMAIL_API_KEY, inboxId: u.agentmail_inbox_id }
        : undefined);

    const results = await deliverBriefToUser(settings, markdown, topic_id, agentmail);
    allResults.push({ user_id: u.user_id, channels: summarizeDelivery(results) });
  }

  const delivered = allResults.reduce((n, r) => n + r.channels.delivered, 0);
  const failed = allResults.reduce((n, r) => n + r.channels.failed, 0);

  const safeTopicId = topic_id.replace(/[^\w-]/g, "_").slice(0, 64);
  console.log(`notify: topic=${safeTopicId} subscribers=${subscribers.length} delivered=${delivered} failed=${failed}`);

  return NextResponse.json({
    delivered,
    failed,
    subscribers: subscribers.length,
    results: allResults.map((r) => ({
      delivered: r.channels.delivered,
      failed: r.channels.failed,
      channels: r.channels.channels.map((c) => ({ channel: c.channel, ok: c.ok, error: c.error })),
    })),
  });
}
