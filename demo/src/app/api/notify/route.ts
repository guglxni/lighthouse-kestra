import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { timingSafeEqual, createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Allowlist of hostnames we will fan-out briefs to.
// SSRF protection: user-stored webhook URLs are validated before server-side fetch.
const WEBHOOK_HOSTNAME_ALLOWLIST = new Set([
  "hooks.slack.com",
  "discord.com",
  "discordapp.com",
  "hooks.zapier.com",
  "make.com",
  "hook.us.make.com",
  "hook.eu.make.com",
]);

type Payload = {
  topic_id: string;
  markdown: string;
};

type UserWebhooks = {
  slack_webhook: string | null;
  discord_webhook: string | null;
  email_to: string | null;
};

type DeliveryResult = {
  url: string;
  kind: string;
  status: number | null;
  ok: boolean;
  error?: string;
};

function isAllowedWebhookUrl(raw: string): boolean {
  if (!raw.startsWith("https://")) return false;
  try {
    const { hostname } = new URL(raw);
    return WEBHOOK_HOSTNAME_ALLOWLIST.has(hostname) || hostname.endsWith(".slack.com") || hostname.endsWith(".discord.com");
  } catch {
    return false;
  }
}

// Constant-time comparison to prevent timing attacks on the bearer token.
function safeCompare(a: string, b: string): boolean {
  try {
    // Hash both sides so lengths are equal regardless of input.
    const ha = createHash("sha256").update(a).digest();
    const hb = createHash("sha256").update(b).digest();
    return timingSafeEqual(ha, hb);
  } catch {
    return false;
  }
}

async function sendWebhook(kind: "slack" | "discord", url: string, text: string): Promise<DeliveryResult> {
  if (!isAllowedWebhookUrl(url)) {
    return { url: url.slice(0, 40) + "…", kind, status: null, ok: false, error: "webhook URL not in allowlist" };
  }
  const body = kind === "discord" ? { content: text } : { text };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    return { url: url.slice(0, 60) + "…", kind, status: res.status, ok: res.ok };
  } catch (e) {
    return { url: url.slice(0, 60) + "…", kind, status: null, ok: false, error: String(e) };
  }
}

export async function POST(req: NextRequest) {
  // Verify shared secret so only Kestra (or authorized callers) can trigger delivery.
  const secret = process.env.NOTIFY_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "NOTIFY_SECRET not configured" }, { status: 500 });
  }
  const auth = req.headers.get("Authorization") ?? "";
  // Constant-time comparison prevents timing-based brute-force of the bearer token.
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

  // Truncate for messaging platforms (Discord 2000 char limit, Slack similar).
  const text = markdown.length > 1900 ? markdown.slice(0, 1900) + "…" : markdown;

  const admin = createSupabaseAdminClient();
  const { data: rows, error } = await admin
    .from("user_settings")
    .select("slack_webhook, discord_webhook, email_to")
    .eq("default_topic_id", topic_id)
    .or("slack_webhook.not.is.null,discord_webhook.not.is.null");

  if (error) {
    return NextResponse.json({ error: `Supabase query failed: ${error.message}` }, { status: 500 });
  }

  const users = (rows ?? []) as UserWebhooks[];
  if (users.length === 0) {
    return NextResponse.json({ delivered: 0, skipped: 0, note: "no subscribers for this topic" });
  }

  // Fan out — deduplicate URLs so a shared webhook only receives one message.
  const seen = new Set<string>();
  const tasks: Promise<DeliveryResult>[] = [];

  for (const u of users) {
    if (u.slack_webhook && !seen.has(u.slack_webhook)) {
      seen.add(u.slack_webhook);
      tasks.push(sendWebhook("slack", u.slack_webhook, text));
    }
    if (u.discord_webhook && !seen.has(u.discord_webhook)) {
      seen.add(u.discord_webhook);
      tasks.push(sendWebhook("discord", u.discord_webhook, text));
    }
  }

  const results = await Promise.allSettled(tasks);
  const settled = results.map((r) =>
    r.status === "fulfilled" ? r.value : { url: "?", kind: "?", status: null, ok: false, error: String(r.reason) },
  );

  const delivered = settled.filter((r) => r.ok).length;
  const failed = settled.filter((r) => !r.ok);

  // Sanitize topic_id for log (strip control chars to prevent log injection).
  const safeTopicId = topic_id.replace(/[^\w-]/g, "_").slice(0, 64);
  console.log(`notify: topic=${safeTopicId} subscribers=${users.length} webhooks=${tasks.length} delivered=${delivered} failed=${failed.length}`);

  return NextResponse.json({
    delivered,
    skipped: failed.length,
    errors: failed.length > 0 ? failed.map((r) => `${r.kind} ${r.error ?? `HTTP ${r.status}`}`) : undefined,
  });
}
