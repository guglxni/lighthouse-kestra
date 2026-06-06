"use client";

import { useEffect } from "react";
import type { TopicPreview } from "@/types/dashboard";
import type { RunSchedule } from "@/lib/schedule-simple";
import { authsomeGuide, authsomeGuideAll, type AuthsomeProvider } from "@/lib/authsome-guide";
import {
  configureAgentmailSecure,
  configureDeliverySecure,
  configureExaSecure,
  configureLlmSecure,
  fetchConfigStatus,
  importAuthsomeTokenSecure,
  sendTestEmailSecure,
  startOAuthFlow,
} from "@/lib/webmcp-config-client";

export type LighthouseWebMcpHandlers = {
  topics?: TopicPreview[];
  topicId?: string;
  selectTopic?: (id: string) => boolean;
  runSampleBrief?: (args: { topicId?: string; prompt: string }) => Promise<{ ok: boolean; message: string }>;
  buildCustomTopic?: (args: { brief: string; runSchedule?: RunSchedule }) => Promise<{ ok: boolean; message: string }>;
};

function textResult(message: string) {
  return { content: [{ type: "text" as const, text: message }] };
}

/**
 * Exposes Lighthouse to in-browser AI agents via WebMCP (document.modelContext).
 * Secret-bearing tools are write-only — responses use masked fingerprints only.
 */
export function WebMcpTools({ handlers = {} }: { handlers?: LighthouseWebMcpHandlers }) {
  const { topics = [], topicId = "", selectTopic, runSampleBrief, buildCustomTopic } = handlers;

  useEffect(() => {
    const mc = document.modelContext;
    if (!mc?.registerTool) return;

    const controller = new AbortController();
    const reg = (tool: Parameters<NonNullable<typeof document.modelContext>["registerTool"]>[0]) => {
      mc.registerTool(tool, { signal: controller.signal });
    };

    // ── Configuration & secrets (authsome-friendly, write-only) ──

    reg({
      name: "lighthouse-get-config-status",
      description:
        "Return Lighthouse configuration status with masked secrets only — LLM BYOK, Exa, AgentMail, delivery channels, OAuth connections. Safe to read; never returns full API keys or tokens.",
      inputSchema: { type: "object", properties: {} },
      async execute() {
        const status = await fetchConfigStatus();
        return textResult(JSON.stringify(status, null, 2));
      },
    });

    reg({
      name: "lighthouse-configure-llm",
      description:
        "Store LLM API key in browser localStorage (BYOK). Use after authsome export or user paste. Never echoes the key back — response is masked only.",
      inputSchema: {
        type: "object",
        properties: {
          apiKey: { type: "string", description: "OpenAI-compatible API key (write-only)" },
          baseUrl: { type: "string", description: "Default https://api.openai.com/v1" },
          modelPrimary: { type: "string", description: "Model id e.g. gpt-4o-mini" },
          name: { type: "string", description: "Optional provider label" },
          modelQuality: { type: "string", description: "Optional quality-tier model" },
        },
        required: ["apiKey", "modelPrimary"],
      },
      async execute(args) {
        const r = configureLlmSecure({
          apiKey: String(args.apiKey ?? ""),
          baseUrl: String(args.baseUrl ?? "https://api.openai.com/v1"),
          modelPrimary: String(args.modelPrimary ?? ""),
          name: args.name ? String(args.name) : undefined,
          modelQuality: args.modelQuality ? String(args.modelQuality) : undefined,
        });
        return textResult(r.message);
      },
    });

    reg({
      name: "lighthouse-configure-exa",
      description: "Store optional Exa API key in browser localStorage. Write-only; masked in status.",
      inputSchema: {
        type: "object",
        properties: { apiKey: { type: "string" } },
        required: ["apiKey"],
      },
      async execute(args) {
        const r = configureExaSecure(String(args.apiKey ?? ""));
        return textResult(r.message);
      },
    });

    reg({
      name: "lighthouse-configure-agentmail",
      description:
        "Store AgentMail API key + inbox in browser localStorage; optionally set emailTo in Supabase. Write-only secrets.",
      inputSchema: {
        type: "object",
        properties: {
          apiKey: { type: "string" },
          inboxId: { type: "string" },
          emailTo: { type: "string", description: "Recipient for daily digests" },
        },
        required: ["apiKey", "inboxId"],
      },
      async execute(args) {
        const r = configureAgentmailSecure({
          apiKey: String(args.apiKey ?? ""),
          inboxId: String(args.inboxId ?? ""),
          emailTo: args.emailTo ? String(args.emailTo) : undefined,
        });
        return textResult(r.message);
      },
    });

    reg({
      name: "lighthouse-configure-delivery",
      description:
        "Save delivery routing (webhooks, Telegram chat id, Notion page, default topic, email). Webhooks stored server-side; status responses are masked.",
      inputSchema: {
        type: "object",
        properties: {
          defaultTopicId: { type: "string" },
          slackWebhook: { type: "string" },
          discordWebhook: { type: "string" },
          telegramChatId: { type: "string" },
          notionPageId: { type: "string" },
          emailTo: { type: "string" },
        },
      },
      async execute(args) {
        const r = await configureDeliverySecure({
          defaultTopicId: args.defaultTopicId ? String(args.defaultTopicId) : undefined,
          slackWebhook: args.slackWebhook ? String(args.slackWebhook) : undefined,
          discordWebhook: args.discordWebhook ? String(args.discordWebhook) : undefined,
          telegramChatId: args.telegramChatId ? String(args.telegramChatId) : undefined,
          notionPageId: args.notionPageId ? String(args.notionPageId) : undefined,
          emailTo: args.emailTo ? String(args.emailTo) : undefined,
        });
        return textResult(r.message);
      },
    });

    reg({
      name: "lighthouse-import-authsome-token",
      description:
        "Import Slack or Notion access token from authsome CLI (authsome get <provider> --field access_token). Stored server-side under RLS; write-only — never returns full token.",
      inputSchema: {
        type: "object",
        properties: {
          provider: { type: "string", enum: ["slack", "notion"] },
          accessToken: { type: "string", description: "Token from authsome — write-only" },
          label: { type: "string", description: "Optional team or workspace name" },
        },
        required: ["provider", "accessToken"],
      },
      async execute(args) {
        const provider = String(args.provider ?? "") as "slack" | "notion";
        const r = await importAuthsomeTokenSecure({
          provider,
          accessToken: String(args.accessToken ?? ""),
          label: args.label ? String(args.label) : undefined,
        });
        return textResult(r.message);
      },
    });

    reg({
      name: "lighthouse-start-oauth",
      description: "Open Slack or Notion OAuth in a new browser tab (Lighthouse-hosted OAuth). Alternative to authsome CLI import.",
      inputSchema: {
        type: "object",
        properties: { provider: { type: "string", enum: ["slack", "notion"] } },
        required: ["provider"],
      },
      async execute(args) {
        const provider = String(args.provider ?? "") as "slack" | "notion";
        if (provider !== "slack" && provider !== "notion") {
          return textResult("provider must be slack or notion.");
        }
        const r = startOAuthFlow(provider);
        return textResult(`${r.message}\nAuthorize URL: ${r.authorizeUrl}`);
      },
    });

    reg({
      name: "lighthouse-authsome-setup-guide",
      description:
        "Step-by-step authsome CLI instructions for securing Slack, Notion, OpenAI, Exa, or AgentMail keys before importing into Lighthouse.",
      inputSchema: {
        type: "object",
        properties: {
          provider: {
            type: "string",
            enum: ["slack", "notion", "openai", "exa", "agentmail", "all"],
            description: "Which integration to set up",
          },
        },
      },
      async execute(args) {
        const p = String(args.provider ?? "all");
        if (p === "all") return textResult(authsomeGuideAll());
        return textResult(authsomeGuide(p as AuthsomeProvider));
      },
    });

    reg({
      name: "lighthouse-send-test-email",
      description: "Send AgentMail test email using configured BYOK keys and emailTo. Requires prior lighthouse-configure-agentmail.",
      inputSchema: { type: "object", properties: {} },
      async execute() {
        const r = await sendTestEmailSecure();
        return textResult(r.message);
      },
    });

    reg({
      name: "lighthouse-open-settings",
      description: "Navigate to the Lighthouse settings page for manual review of keys and channels.",
      inputSchema: { type: "object", properties: {} },
      async execute() {
        window.location.href = "/settings";
        return textResult("Navigating to /settings");
      },
    });

    // ── Topics & briefs (dashboard) ──

    reg({
      name: "lighthouse-list-topics",
      description: "List available Lighthouse research topics (preset and custom). Returns id, name, schedule, and whether custom.",
      inputSchema: { type: "object", properties: {} },
      async execute() {
        if (topics.length === 0) {
          return textResult("No topics loaded — open /dashboard while signed in.");
        }
        const list = topics.map((t) => ({
          id: t.id,
          name: t.name,
          schedule: t.schedule,
          custom: Boolean(t.custom),
          description: t.description?.slice(0, 200),
        }));
        return textResult(JSON.stringify({ activeTopicId: topicId, topics: list }, null, 2));
      },
    });

    reg({
      name: "lighthouse-select-topic",
      description: "Select the active topic used for sample briefs and delivery defaults.",
      inputSchema: {
        type: "object",
        properties: { topicId: { type: "string" } },
        required: ["topicId"],
      },
      async execute({ topicId: id }) {
        if (!selectTopic) return textResult("Open /dashboard to select topics.");
        const tid = String(id ?? "");
        const ok = selectTopic(tid);
        if (!ok) return textResult(`Unknown topic: ${tid}`);
        const t = topics.find((x) => x.id === tid);
        return textResult(`Selected topic "${t?.name ?? tid}".`);
      },
    });

    reg({
      name: "lighthouse-run-sample-brief",
      description: "Draft a Markdown research brief using BYOK LLM. Requires lighthouse-configure-llm first.",
      inputSchema: {
        type: "object",
        properties: {
          topicId: { type: "string" },
          prompt: { type: "string" },
        },
        required: ["prompt"],
      },
      async execute(args) {
        if (!runSampleBrief) return textResult("Open /dashboard to run sample briefs.");
        const result = await runSampleBrief({
          topicId: args.topicId ? String(args.topicId) : undefined,
          prompt: String(args.prompt ?? ""),
        });
        return textResult(result.message);
      },
    });

    reg({
      name: "lighthouse-build-topic",
      description: "Create a custom topic from a natural-language brief. Requires BYOK LLM.",
      inputSchema: {
        type: "object",
        properties: {
          brief: { type: "string" },
          frequency: { type: "string", enum: ["daily", "weekdays", "weekly"] },
          hour: { type: "number", minimum: 0, maximum: 23 },
          minute: { type: "number", minimum: 0, maximum: 59 },
        },
        required: ["brief"],
      },
      async execute(args) {
        if (!buildCustomTopic) return textResult("Open /dashboard to build custom topics.");
        const runSchedule: RunSchedule | undefined =
          args.frequency != null
            ? {
                frequency: String(args.frequency) as RunSchedule["frequency"],
                times: [{ hour: Number(args.hour ?? 9), minute: Number(args.minute ?? 0) }],
              }
            : undefined;
        const result = await buildCustomTopic({ brief: String(args.brief ?? ""), runSchedule });
        return textResult(result.message);
      },
    });

    return () => controller.abort();
  }, [topics, topicId, selectTopic, runSampleBrief, buildCustomTopic]);

  return null;
}

const CONFIG_TOOLS = [
  "lighthouse-get-config-status",
  "lighthouse-configure-llm",
  "lighthouse-configure-exa",
  "lighthouse-configure-agentmail",
  "lighthouse-configure-delivery",
  "lighthouse-import-authsome-token",
  "lighthouse-start-oauth",
  "lighthouse-authsome-setup-guide",
  "lighthouse-send-test-email",
  "lighthouse-open-settings",
];

const BRIEF_TOOLS = [
  "lighthouse-list-topics",
  "lighthouse-select-topic",
  "lighthouse-run-sample-brief",
  "lighthouse-build-topic",
];

export function WebMcpCallout({ variant = "dashboard" }: { variant?: "dashboard" | "settings" }) {
  const tools = variant === "settings" ? CONFIG_TOOLS : [...CONFIG_TOOLS, ...BRIEF_TOOLS];
  return (
    <div className="rounded-2xl border border-violet-400/25 bg-violet-500/10 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-200">For AI agents · WebMCP</p>
      <p className="mt-2 text-sm text-ink-200">
        Lighthouse registers{" "}
        <a href="https://github.com/webmachinelearning/webmcp" target="_blank" rel="noreferrer" className="text-beam underline">
          WebMCP
        </a>{" "}
        tools{variant === "settings" ? " on this page" : " on the dashboard and settings"}. Secrets are{" "}
        <strong className="font-normal text-violet-100">write-only</strong> — use{" "}
        <a href="https://authsome.ai/docs/integrations/oauth/index" target="_blank" rel="noreferrer" className="text-beam underline">
          authsome
        </a>{" "}
        locally, then <code className="text-[11px]">lighthouse-import-authsome-token</code> or{" "}
        <code className="text-[11px]">lighthouse-configure-*</code>. Status via{" "}
        <code className="text-[11px]">lighthouse-get-config-status</code> (masked only).
      </p>
      <p className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-violet-100/90">
        {tools.map((t) => (
          <code key={t} className="rounded bg-black/30 px-1.5 py-0.5">
            {t}
          </code>
        ))}
      </p>
      <p className="mt-2 text-xs text-ink-400">
        Skill: <code className="text-[11px]">npx skills add guglxni/lighthouse-kestra --skill lighthouse -y</code>
      </p>
    </div>
  );
}
