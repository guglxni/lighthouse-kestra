import { sendAgentMail } from "@/lib/agentmail";
import { markdownToEmailHtml } from "@/lib/markdown-email";

const WEBHOOK_HOSTNAME_ALLOWLIST = new Set([
  "hooks.slack.com",
  "discord.com",
  "discordapp.com",
  "hooks.zapier.com",
  "make.com",
  "hook.us.make.com",
  "hook.eu.make.com",
]);

export type UserDeliverySettings = {
  slack_webhook?: string | null;
  discord_webhook?: string | null;
  telegram_chat_id?: string | null;
  email_to?: string | null;
  notion_page_id?: string | null;
  notion_access_token?: string | null;
};

export type AgentMailCredentials = {
  apiKey: string;
  inboxId: string;
};

export type DeliveryResult = {
  channel: string;
  ok: boolean;
  status?: number | null;
  error?: string;
};

function mdToSlack(md: string): string {
  return md
    .replace(/^#{1,3} (.+)$/gm, "*$1*")
    .replace(/\*\*(.+?)\*\*/gs, "*$1*")
    .replace(/__(.+?)__/gs, "*$1*")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<$2|$1>")
    .replace(/^[-*+] (.+)$/gm, "• $1")
    .slice(0, 3000);
}

function mdToDiscord(md: string): string {
  return md.length > 1900 ? `${md.slice(0, 1900)}…` : md;
}

function mdToTelegramHtml(md: string): string {
  const preserved = new Map<string, string>();
  let out = md.replace(/```(?:\w+)?\n?([\s\S]+?)```/g, (_m, c) => {
    const key = `§${preserved.size}§`;
    const safe = c.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    preserved.set(key, `<pre>${safe}</pre>`);
    return key;
  });
  out = out.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  out = out
    .replace(/^#{1,3} (.+)$/gm, "<b>$1</b>")
    .replace(/\*\*(.+?)\*\*/gs, "<b>$1</b>")
    .slice(0, 4096);
  for (const [key, val] of preserved) out = out.replaceAll(key, val);
  return out;
}

function isAllowedWebhookUrl(raw: string): boolean {
  if (!raw.startsWith("https://")) return false;
  try {
    const { hostname } = new URL(raw);
    return WEBHOOK_HOSTNAME_ALLOWLIST.has(hostname) || hostname.endsWith(".slack.com") || hostname.endsWith(".discord.com");
  } catch {
    return false;
  }
}

async function sendWebhook(kind: "slack" | "discord", url: string, markdown: string): Promise<DeliveryResult> {
  if (!isAllowedWebhookUrl(url)) {
    return { channel: kind, ok: false, error: "webhook URL not in allowlist" };
  }
  const text = kind === "slack" ? mdToSlack(markdown) : mdToDiscord(markdown);
  const body = kind === "discord" ? { content: text } : { text };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    return { channel: kind, ok: res.ok, status: res.status, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e) {
    return { channel: kind, ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function sendTelegram(chatId: string, markdown: string): Promise<DeliveryResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { channel: "telegram", ok: false, error: "TELEGRAM_BOT_TOKEN not configured on server" };
  const safeChatId = chatId.replace(/[^\d-]/g, "");
  if (!safeChatId) return { channel: "telegram", ok: false, error: "invalid chat_id" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: safeChatId,
        text: mdToTelegramHtml(markdown),
        parse_mode: "HTML",
      }),
      signal: AbortSignal.timeout(15_000),
    });
    return { channel: "telegram", ok: res.ok, status: res.status, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e) {
    return { channel: "telegram", ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function sendNotion(pageId: string, token: string, markdown: string): Promise<DeliveryResult> {
  const cleanPageId = pageId.replace(/-/g, "");
  if (!/^[a-f0-9]{32}$/i.test(cleanPageId)) {
    return { channel: "notion", ok: false, error: "invalid notion_page_id" };
  }
  const chunks: string[] = [];
  let rest = markdown;
  while (rest.length > 0) {
    chunks.push(rest.slice(0, 1900));
    rest = rest.slice(1900);
  }
  try {
    const res = await fetch(`https://api.notion.com/v1/blocks/${cleanPageId}/children`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        children: chunks.map((content) => ({
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content } }] },
        })),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { channel: "notion", ok: false, status: res.status, error: detail.slice(0, 200) || `HTTP ${res.status}` };
    }
    return { channel: "notion", ok: true, status: res.status };
  } catch (e) {
    return { channel: "notion", ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function sendEmail(
  to: string,
  markdown: string,
  topicId: string,
  agentmail?: AgentMailCredentials,
  topicName?: string,
): Promise<DeliveryResult> {
  if (!agentmail?.apiKey || !agentmail?.inboxId) {
    return { channel: "email", ok: false, error: "AgentMail API key + inbox required (configure in Settings)" };
  }
  const result = await sendAgentMail({
    apiKey: agentmail.apiKey,
    inboxId: agentmail.inboxId,
    to,
    subject: `Lighthouse brief · ${topicName ?? topicId}`,
    text: markdown,
    html: markdownToEmailHtml(markdown, { topicId, topicName }),
  });
  return {
    channel: "email",
    ok: result.ok,
    status: result.status,
    error: result.ok ? undefined : result.error,
  };
}

/**
 * Fan out a brief to every channel the user has configured.
 * All configured channels receive the brief (not just one).
 */
export async function deliverBriefToUser(
  settings: UserDeliverySettings,
  markdown: string,
  topicId: string,
  agentmail?: AgentMailCredentials,
  topicName?: string,
): Promise<DeliveryResult[]> {
  const tasks: Promise<DeliveryResult>[] = [];

  if (settings.slack_webhook) tasks.push(sendWebhook("slack", settings.slack_webhook, markdown));
  if (settings.discord_webhook) tasks.push(sendWebhook("discord", settings.discord_webhook, markdown));
  if (settings.telegram_chat_id) tasks.push(sendTelegram(settings.telegram_chat_id, markdown));
  if (settings.notion_page_id && settings.notion_access_token) {
    tasks.push(sendNotion(settings.notion_page_id, settings.notion_access_token, markdown));
  } else if (settings.notion_page_id && !settings.notion_access_token) {
    tasks.push(Promise.resolve({ channel: "notion", ok: false, error: "Notion page set but OAuth token missing — connect Notion in Settings" }));
  }
  if (settings.email_to) tasks.push(sendEmail(settings.email_to, markdown, topicId, agentmail, topicName));

  if (tasks.length === 0) {
    return [{ channel: "none", ok: false, error: "No delivery channels configured in Settings" }];
  }

  const results = await Promise.all(tasks);
  return results;
}

export function summarizeDelivery(results: DeliveryResult[]): { delivered: number; failed: number; channels: DeliveryResult[] } {
  return {
    delivered: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    channels: results,
  };
}
