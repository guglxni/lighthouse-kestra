"use client";

import {
  getActiveProvider,
  hasMinimumByok,
  maskKey,
  readByokStore,
  writeByokStore,
  type LlmProvider,
} from "@/lib/byok-store";
import { maskSecret, maskWebhook } from "@/lib/mask-secret";

export type ConfigStatus = {
  llm: {
    configured: boolean;
    providerName: string | null;
    baseUrl: string | null;
    modelPrimary: string | null;
    keyMasked: string | null;
  };
  exa: { configured: boolean; keyMasked: string | null };
  agentmail: { configured: boolean; keyMasked: string | null; inboxId: string | null };
  delivery: {
    defaultTopicId: string | null;
    emailTo: string | null;
    slackWebhook: string | null;
    discordWebhook: string | null;
    telegramChatId: string | null;
    notionPageId: string | null;
    slackOAuth: boolean;
    slackTeam: string | null;
    notionOAuth: boolean;
    notionWorkspace: string | null;
  };
};

export async function fetchConfigStatus(): Promise<ConfigStatus> {
  const store = readByokStore();
  const active = getActiveProvider(store);

  let server: Record<string, unknown> = {};
  try {
    const res = await fetch("/api/user-settings", { cache: "no-store" });
    if (res.ok) server = (await res.json()) as Record<string, unknown>;
  } catch {
    /* offline */
  }

  const delivery = (server.delivery ?? {}) as Record<string, string | boolean | null>;
  const oauth = (server.oauth ?? {}) as Record<string, string | boolean | null>;

  return {
    llm: {
      configured: hasMinimumByok(active),
      providerName: active?.name || null,
      baseUrl: active?.baseUrl || null,
      modelPrimary: active?.modelPrimary || null,
      keyMasked: active?.apiKey ? maskKey(active.apiKey) : null,
    },
    exa: {
      configured: Boolean(store.exaApiKey),
      keyMasked: store.exaApiKey ? maskKey(store.exaApiKey) : null,
    },
    agentmail: {
      configured: Boolean(store.agentmailApiKey && store.agentmailInboxId),
      keyMasked: store.agentmailApiKey ? maskKey(store.agentmailApiKey) : null,
      inboxId: store.agentmailInboxId || (delivery.agentmailInboxId as string) || null,
    },
    delivery: {
      defaultTopicId: (delivery.defaultTopicId as string) || null,
      emailTo: (delivery.emailTo as string) || null,
      slackWebhook: maskWebhook(delivery.slackWebhook as string),
      discordWebhook: maskWebhook(delivery.discordWebhook as string),
      telegramChatId: (delivery.telegramChatId as string) ? "configured" : null,
      notionPageId: (delivery.notionPageId as string) ? maskSecret(delivery.notionPageId as string) : null,
      slackOAuth: Boolean(oauth.slackConnected),
      slackTeam: (oauth.slackTeam as string) || null,
      notionOAuth: Boolean(oauth.notionConnected),
      notionWorkspace: (oauth.notionWorkspace as string) || null,
    },
  };
}

export function configureLlmSecure(args: {
  apiKey: string;
  baseUrl: string;
  modelPrimary: string;
  name?: string;
  modelQuality?: string;
}): { ok: boolean; message: string } {
  const apiKey = args.apiKey?.trim();
  const baseUrl = args.baseUrl?.trim() || "https://api.openai.com/v1";
  const modelPrimary = args.modelPrimary?.trim();
  if (!apiKey || !modelPrimary) {
    return { ok: false, message: "apiKey and modelPrimary are required." };
  }

  const store = readByokStore();
  const active = getActiveProvider(store);
  if (active) {
    store.providers = store.providers.map((p) =>
      p.id === active.id
        ? {
            ...p,
            apiKey,
            baseUrl,
            modelPrimary,
            modelQuality: args.modelQuality?.trim() || p.modelQuality,
            name: args.name?.trim() || p.name || "Default",
          }
        : p,
    );
  } else {
    const id = "provider_default";
    const provider: LlmProvider = {
      id,
      name: args.name?.trim() || "Default",
      apiKey,
      baseUrl,
      modelPrimary,
      modelQuality: args.modelQuality?.trim() || "",
    };
    store.providers = [provider];
    store.activeProviderId = id;
  }
  writeByokStore(store);

  void fetch("/api/user-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ llm_base_url: baseUrl, llm_model_primary: modelPrimary, llm_model_quality: args.modelQuality?.trim() || null }),
  });

  return {
    ok: true,
    message: `LLM provider configured (key ${maskKey(apiKey)}). Stored in browser only — secret not returned.`,
  };
}

export function configureExaSecure(apiKey: string): { ok: boolean; message: string } {
  const key = apiKey?.trim();
  if (!key) return { ok: false, message: "apiKey is required." };
  const store = readByokStore();
  store.exaApiKey = key;
  writeByokStore(store);
  return { ok: true, message: `Exa key saved (${maskKey(key)}). Browser localStorage only.` };
}

export function configureAgentmailSecure(args: {
  apiKey: string;
  inboxId: string;
  emailTo?: string;
}): { ok: boolean; message: string } {
  const apiKey = args.apiKey?.trim();
  const inboxId = args.inboxId?.trim();
  if (!apiKey || !inboxId) return { ok: false, message: "apiKey and inboxId are required." };
  const store = readByokStore();
  store.agentmailApiKey = apiKey;
  store.agentmailInboxId = inboxId;
  writeByokStore(store);

  if (args.emailTo?.trim()) {
    void fetch("/api/user-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email_to: args.emailTo.trim(), agentmail_inbox_id: inboxId }),
    });
  }

  return {
    ok: true,
    message: `AgentMail configured (key ${maskKey(apiKey)}, inbox ${inboxId}). Secrets not echoed.`,
  };
}

export async function configureDeliverySecure(args: {
  defaultTopicId?: string;
  slackWebhook?: string;
  discordWebhook?: string;
  telegramChatId?: string;
  notionPageId?: string;
  emailTo?: string;
}): Promise<{ ok: boolean; message: string }> {
  const res = await fetch("/api/user-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      default_topic_id: args.defaultTopicId,
      slack_webhook: args.slackWebhook,
      discord_webhook: args.discordWebhook,
      telegram_chat_id: args.telegramChatId,
      notion_page_id: args.notionPageId,
      email_to: args.emailTo,
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: String(j.error ?? `HTTP ${res.status}`) };
  return { ok: true, message: "Delivery preferences saved. Webhook URLs stored masked in status responses." };
}

export async function importAuthsomeTokenSecure(args: {
  provider: "slack" | "notion";
  accessToken: string;
  label?: string;
}): Promise<{ ok: boolean; message: string }> {
  const token = args.accessToken?.trim();
  if (!token) return { ok: false, message: "accessToken is required." };
  const res = await fetch("/api/import-integration-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: args.provider, accessToken: token, label: args.label }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: String(j.error ?? `HTTP ${res.status}`) };
  return {
    ok: true,
    message: `${args.provider} token imported (${j.masked ?? "stored"}). Full token never returned.`,
  };
}

export function startOAuthFlow(provider: "slack" | "notion"): { ok: boolean; message: string; authorizeUrl: string } {
  const path = `/api/oauth/${provider}/authorize`;
  const authorizeUrl = `${window.location.origin}${path}`;
  window.open(authorizeUrl, "_blank", "noopener,noreferrer");
  return {
    ok: true,
    message: `Opened ${provider} OAuth in a new tab. Complete login there, then call lighthouse-get-config-status.`,
    authorizeUrl,
  };
}

export async function sendTestEmailSecure(): Promise<{ ok: boolean; message: string }> {
  const store = readByokStore();
  let emailTo = "";
  try {
    const res = await fetch("/api/user-settings");
    if (res.ok) {
      const j = await res.json();
      emailTo = j.delivery?.emailTo ?? "";
    }
  } catch {
    /* ignore */
  }
  if (!emailTo) return { ok: false, message: "Set emailTo via lighthouse-configure-agentmail or lighthouse-configure-delivery first." };
  if (!store.agentmailApiKey || !store.agentmailInboxId) {
    return { ok: false, message: "Configure AgentMail via lighthouse-configure-agentmail first." };
  }
  const res = await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: emailTo,
      subject: "Lighthouse test brief",
      text: "If you received this, AgentMail delivery is wired up.",
      agentmail: { apiKey: store.agentmailApiKey, inboxId: store.agentmailInboxId },
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: String(j.error ?? `HTTP ${res.status}`) };
  return { ok: true, message: `Test email sent to ${emailTo}.` };
}
