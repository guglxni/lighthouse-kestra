"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { OAUTH_FLASH } from "@/lib/oauth-messages";
import {
  readByokStore,
  writeByokStore,
  clearByokStore,
  getActiveProvider,
  maskKey,
  type ByokStore,
  type LlmProvider,
} from "@/lib/byok-store";

type Prefs = {
  default_topic_id: string;
  slack_webhook: string;
  discord_webhook: string;
  telegram_chat_id: string;
  notion_page_id: string;
  email_to: string;
};

const DEFAULT_PREFS: Prefs = {
  default_topic_id: "agentic-eng",
  slack_webhook: "",
  discord_webhook: "",
  telegram_chat_id: "",
  notion_page_id: "",
  email_to: "",
};

function newProvider(): LlmProvider {
  return {
    id: `provider_${Date.now()}`,
    name: "",
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    modelPrimary: "",
    modelQuality: "",
  };
}

type OAuthStatus = {
  slackTeam: string | null;
  notionWorkspace: string | null;
  slackConnected: boolean;
  notionConnected: boolean;
  agentmailInboxId: string | null;
};

export function SettingsForm({
  topics,
  oauthStatus,
}: {
  topics: { id: string; name: string }[];
  oauthStatus?: OAuthStatus;
}) {
  const supabase = createSupabaseBrowserClient();
  const [store, setStore] = useState<ByokStore>(() => readByokStore());
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [busy, setBusy] = useState(false);
  const [savedTick, setSavedTick] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState(false);
  const [emailTestBusy, setEmailTestBusy] = useState(false);
  const [emailTestMsg, setEmailTestMsg] = useState<string | null>(null);
  const [oauthConfig, setOauthConfig] = useState<{
    siteUrl: string;
    slack: { configured: boolean; redirectUri: string };
    notion: { configured: boolean; redirectUri: string };
  } | null>(null);
  const searchParams = useSearchParams();
  const oauthFlashKey = searchParams.get("oauth");
  const oauthFlash = oauthFlashKey ? OAUTH_FLASH[oauthFlashKey] : undefined;

  useEffect(() => {
    fetch("/api/oauth/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setOauthConfig(j))
      .catch(() => setOauthConfig(null));
  }, [oauthFlashKey]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("default_topic_id,slack_webhook,discord_webhook,telegram_chat_id,notion_page_id,email_to")
        .maybeSingle();
      if (!alive) return;
      if (error && error.code !== "PGRST116") setError(error.message);
      if (data) {
        setPrefs({
          default_topic_id: data.default_topic_id ?? "agentic-eng",
          slack_webhook: data.slack_webhook ?? "",
          discord_webhook: data.discord_webhook ?? "",
          telegram_chat_id: data.telegram_chat_id ?? "",
          notion_page_id: data.notion_page_id ?? "",
          email_to: data.email_to ?? "",
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [supabase]);

  // ── provider mutations ──
  function addProvider() {
    const p = newProvider();
    setStore((s) => ({
      ...s,
      providers: [...s.providers, p],
      activeProviderId: s.activeProviderId ?? p.id,
    }));
  }

  function removeProvider(id: string) {
    setStore((s) => {
      const remaining = s.providers.filter((p) => p.id !== id);
      return {
        ...s,
        providers: remaining,
        activeProviderId:
          s.activeProviderId === id ? (remaining[0]?.id ?? null) : s.activeProviderId,
      };
    });
  }

  function updateProvider(id: string, field: keyof LlmProvider, value: string) {
    setStore((s) => ({
      ...s,
      providers: s.providers.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    }));
  }

  function makeActive(id: string) {
    setStore((s) => ({ ...s, activeProviderId: id }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSavedTick(null);

    // Persist providers (incl. API keys) to localStorage.
    writeByokStore(store);

    const { data: userResp } = await supabase.auth.getUser();
    const userId = userResp.user?.id;
    if (!userId) {
      setError("Please sign in again.");
      setBusy(false);
      return;
    }

    // Save non-secret active-provider fields + prefs to Supabase.
    const active = getActiveProvider(store);
    const { error } = await supabase.from("user_settings").upsert(
      {
        user_id: userId,
        default_topic_id: prefs.default_topic_id,
        slack_webhook: prefs.slack_webhook || null,
        discord_webhook: prefs.discord_webhook || null,
        telegram_chat_id: prefs.telegram_chat_id || null,
        notion_page_id: prefs.notion_page_id || null,
        email_to: prefs.email_to || null,
        llm_base_url: active?.baseUrl || null,
        llm_model_primary: active?.modelPrimary || null,
        llm_model_quality: active?.modelQuality || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) setError(error.message);
    else setSavedTick(new Date().toLocaleTimeString());
    setBusy(false);
  }

  function onClearKeys() {
    if (!confirm("Clear all AI providers stored on this device?")) return;
    clearByokStore();
    setStore({ version: 2, providers: [], activeProviderId: null, exaApiKey: "", agentmailApiKey: "", agentmailInboxId: "" });
  }

  const activeId = store.activeProviderId ?? store.providers[0]?.id ?? null;

  return (
    <form onSubmit={onSave} className="space-y-10">
      {/* ── AI Providers ── */}
      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="font-display text-2xl text-ink-50">Your AI providers</h2>
          <p className="text-sm text-ink-400">
            Lighthouse is bring-your-own-key. Each provider speaks the OpenAI HTTP shape — your key, your bill, no shared
            keys. Keys live in <span className="font-mono text-ink-200">your browser only</span> and are sent server-side
            per request.
          </p>
        </header>

        {store.providers.length === 0 ? (
          <div className="glass-panel rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-ink-400">
            No providers added yet. Add one below.
          </div>
        ) : (
          <div className="space-y-4">
            {store.providers.map((provider) => {
              const isActive = provider.id === activeId;
              return (
                <div
                  key={provider.id}
                  className={`relative rounded-2xl border p-5 transition ${
                    isActive
                      ? "border-beam/50 bg-beam/5"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <span className="rounded-full bg-beam/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-beam-glow">
                          Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => makeActive(provider.id)}
                          className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-400 transition hover:border-beam/40 hover:text-ink-100"
                        >
                          Make active
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProvider(provider.id)}
                      className="rounded-lg border border-rose-400/20 bg-rose-500/5 px-2.5 py-1 text-[11px] text-rose-300 hover:border-rose-400/50 hover:bg-rose-500/10"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      label="Provider name"
                      tooltip="A label just for you — e.g. 'OpenAI', 'Claude via Anthropic', 'Groq (fast)'."
                      value={provider.name}
                      onChange={(v) => updateProvider(provider.id, "name", v)}
                      placeholder="e.g. OpenAI, Anthropic, Groq"
                    />
                    <Field
                      label="API key"
                      tooltip="Stored only in your browser's localStorage. Never sent to our server — only forwarded directly to your provider per request."
                      help={`Current key: ${maskKey(provider.apiKey)}`}
                      value={provider.apiKey}
                      onChange={(v) => updateProvider(provider.id, "apiKey", v)}
                      placeholder="sk-… (any OpenAI-compatible key)"
                      type={showKeys ? "text" : "password"}
                      mono
                    />
                    <Field
                      label="Base URL"
                      tooltip="The root URL of any OpenAI-compatible endpoint. Use https://api.openai.com/v1 for OpenAI, https://api.anthropic.com/v1 for Anthropic, https://api.groq.com/openai/v1 for Groq, or your own LiteLLM gateway."
                    value={provider.baseUrl}
                    onChange={(v) => updateProvider(provider.id, "baseUrl", v)}
                    help="API root only — e.g. https://api.openai.com/v1 (do not include /chat/completions)"
                      placeholder="https://api.openai.com/v1"
                      mono
                    />
                    <Field
                      label="Primary model"
                      tooltip="Used for classify and cluster steps. Pick a fast, cheap model — gpt-4o-mini, claude-haiku-3-5, llama-3.1-8b, etc."
                      value={provider.modelPrimary}
                      onChange={(v) => updateProvider(provider.id, "modelPrimary", v)}
                      placeholder="e.g. gpt-4o-mini"
                      mono
                    />
                    <Field
                      label="Quality model (optional)"
                      tooltip="If set, used for the final summarisation step where output quality matters most. Leave empty to use the primary model for everything."
                      value={provider.modelQuality}
                      onChange={(v) => updateProvider(provider.id, "modelQuality", v)}
                      placeholder="e.g. gpt-4o"
                      mono
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addProvider}
            className="inline-flex items-center gap-1.5 rounded-xl border border-beam/30 bg-beam/5 px-4 py-2 text-sm font-medium text-beam-glow transition hover:border-beam/60 hover:bg-beam/10"
          >
            <span aria-hidden>+</span>
            Add provider
          </button>
          <button
            type="button"
            onClick={() => setShowKeys((v) => !v)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-ink-400 hover:border-beam/40"
          >
            {showKeys ? "Hide keys" : "Show keys"}
          </button>
          {store.providers.length > 0 ? (
            <button
              type="button"
              onClick={onClearKeys}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-ink-400 hover:border-rose-400/40"
            >
              Forget all keys
            </button>
          ) : null}
        </div>
      </section>

      {/* ── Exa web search ── */}
      <section className="glass-panel space-y-5 p-6">
        <header className="space-y-1">
          <h2 className="font-display text-2xl text-ink-50">Optional: web search</h2>
          <p className="text-sm text-ink-400">
            Exa runs through <strong className="font-normal text-ink-200">Kestra ingest.exa_search</strong> — this key is forwarded to the engine on each brief. You can also set{" "}
            <code className="text-[11px]">EXA_API_KEY</code> on the Kestra host. LLMs run through LiteLLM via <code className="text-[11px]">process.classify</code> and{" "}
            <code className="text-[11px]">process.cluster_summarize</code>.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Exa API key"
            tooltip="Get a key at exa.ai. Used when you Run a sample brief on the dashboard (browser BYOK). Also used by Kestra ingest.exa_search when EXA_API_KEY is set on the engine."
            value={store.exaApiKey}
            onChange={(v) => setStore((s) => ({ ...s, exaApiKey: v }))}
            placeholder="Exa key (optional)"
            type={showKeys ? "text" : "password"}
            mono
          />
        </div>
      </section>

      {/* ── AgentMail (email for agents) ── */}
      <section className="glass-panel space-y-5 p-6">
        <header className="space-y-1">
          <h2 className="font-display text-2xl text-ink-50">Email via AgentMail</h2>
          <p className="text-sm text-ink-400">
            AgentMail gives agents their own inbox API. Store your API key locally (BYOK) — same pattern as LLM keys.{" "}
            <a href="https://docs.agentmail.to/llms.txt" target="_blank" rel="noreferrer" className="text-beam hover:underline">
              AgentMail docs ↗
            </a>
            . Manage keys locally with{" "}
            <a href="https://authsome.ai/docs/integrations/oauth/index" target="_blank" rel="noreferrer" className="text-beam hover:underline">
              authsome ↗
            </a>{" "}
            if you prefer CLI token export.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="AgentMail API key"
            tooltip="Bearer token from AgentMail console. Stored in localStorage only — never in Supabase."
            value={store.agentmailApiKey}
            onChange={(v) => setStore((s) => ({ ...s, agentmailApiKey: v }))}
            placeholder="am_…"
            type={showKeys ? "text" : "password"}
            mono
          />
          <Field
            label="AgentMail inbox ID"
            tooltip="The inbox_id path segment for POST /v0/inboxes/{inbox_id}/messages/send"
            value={store.agentmailInboxId || oauthStatus?.agentmailInboxId || ""}
            onChange={(v) => setStore((s) => ({ ...s, agentmailInboxId: v }))}
            placeholder="my-agent-inbox"
            mono
          />
          <Field
            label="Email digest goes to"
            tooltip="Recipient address for daily briefs sent via AgentMail."
            value={prefs.email_to}
            onChange={(v) => setPrefs({ ...prefs, email_to: v })}
            placeholder="you@studio.com"
          />
        </div>
        <button
          type="button"
          disabled={emailTestBusy || !prefs.email_to}
          onClick={async () => {
            setEmailTestBusy(true);
            setEmailTestMsg(null);
            writeByokStore(store);
            try {
              const res = await fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: prefs.email_to,
                  subject: "Lighthouse test brief",
                  text: "If you received this, AgentMail delivery is wired up.",
                  agentmail: { apiKey: store.agentmailApiKey, inboxId: store.agentmailInboxId },
                }),
              });
              const j = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
              setEmailTestMsg("Test email sent.");
            } catch (e) {
              setEmailTestMsg(e instanceof Error ? e.message : String(e));
            } finally {
              setEmailTestBusy(false);
            }
          }}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink-100 hover:border-beam/40 disabled:opacity-50"
        >
          {emailTestBusy ? "Sending…" : "Send test email"}
        </button>
        {emailTestMsg ? <p className="text-xs text-ink-400">{emailTestMsg}</p> : null}
      </section>

      {/* ── Delivery channels ── */}
      <section className="glass-panel space-y-5 p-6">
        <header className="space-y-1">
          <h2 className="font-display text-2xl text-ink-50">Where briefs land</h2>
          <p className="text-sm text-ink-400">
            Every channel you configure receives the brief — Slack, Discord, Telegram, Notion, and email all fire together
            (not just one). Sample briefs on the dashboard use these same settings. Connect Slack or Notion via OAuth (web) or use{" "}
            <a href="https://authsome.ai/docs/integrations/oauth/slack" target="_blank" rel="noreferrer" className="text-beam hover:underline">
              authsome Slack ↗
            </a>{" "}
            /{" "}
            <a href="https://authsome.ai/docs/integrations/oauth/notion" target="_blank" rel="noreferrer" className="text-beam hover:underline">
              authsome Notion ↗
            </a>{" "}
            for local CLI token management.
          </p>
        </header>

        {oauthFlash ? (
          <p
            className={`rounded-xl border px-4 py-3 text-sm ${
              oauthFlash.kind === "success"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-50"
                : "border-amber-400/30 bg-amber-500/10 text-amber-50"
            }`}
          >
            {oauthFlash.message}
          </p>
        ) : null}

        {!oauthConfig?.slack.configured || !oauthConfig?.notion.configured ? (
          <div className="rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-xs text-ink-400">
            <p className="font-medium text-ink-200">OAuth setup on this deployment</p>
            <p className="mt-1">
              Browser OAuth needs server env vars on Vercel. Until those are set, use{" "}
              <a href="https://authsome.ai/docs/integrations/oauth/slack" target="_blank" rel="noreferrer" className="text-beam underline">
                authsome
              </a>{" "}
              + <code className="text-ink-300">lighthouse-import-authsome-token</code> on the dashboard.
            </p>
            {oauthConfig ? (
              <ul className="mt-2 space-y-1 font-mono text-[10px] text-ink-500">
                {!oauthConfig.slack.configured ? <li>SLACK_CLIENT_ID + SLACK_CLIENT_SECRET missing</li> : null}
                {!oauthConfig.notion.configured ? <li>NOTION_CLIENT_ID + NOTION_CLIENT_SECRET missing</li> : null}
                <li>Slack redirect: {oauthConfig.slack.redirectUri}</li>
                <li>Notion redirect: {oauthConfig.notion.redirectUri}</li>
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {oauthConfig?.slack.configured ? (
            <a
              href="/api/oauth/slack/authorize"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink-100 hover:border-beam/40"
            >
              {oauthStatus?.slackConnected
                ? `Slack connected${oauthStatus.slackTeam ? ` · ${oauthStatus.slackTeam}` : ""}`
                : "Connect Slack (OAuth)"}
            </a>
          ) : (
            <span
              title="Add SLACK_CLIENT_ID and SLACK_CLIENT_SECRET to Vercel"
              className="cursor-not-allowed rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2 text-sm text-ink-500"
            >
              Connect Slack (not configured)
            </span>
          )}
          {oauthConfig?.notion.configured ? (
            <a
              href="/api/oauth/notion/authorize"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink-100 hover:border-beam/40"
            >
              {oauthStatus?.notionConnected
                ? `Notion connected${oauthStatus.notionWorkspace ? ` · ${oauthStatus.notionWorkspace}` : ""}`
                : "Connect Notion (OAuth)"}
            </a>
          ) : (
            <span
              title="Add NOTION_CLIENT_ID and NOTION_CLIENT_SECRET to Vercel"
              className="cursor-not-allowed rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2 text-sm text-ink-500"
            >
              Connect Notion (not configured)
            </span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Default topic"
            tooltip="The topic Kestra uses when generating your daily brief. Custom topics from Build your brief appear here after you save."
            value={prefs.default_topic_id}
            onChange={(v) => setPrefs({ ...prefs, default_topic_id: v })}
            select={topics.map((t) => ({ value: t.id, label: t.name }))}
          />
          <Field
            label="Slack incoming webhook"
            tooltip="Optional if you connected Slack OAuth. Or paste a webhook from api.slack.com. Brief auto-converts to mrkdwn."
            value={prefs.slack_webhook}
            onChange={(v) => setPrefs({ ...prefs, slack_webhook: v })}
            placeholder="https://hooks.slack.com/services/…"
          />
          <Field
            label="Discord webhook"
            tooltip="Right-click a Discord channel → Edit Channel → Integrations → Webhooks. Paste the full URL here. Discord renders Markdown natively so the brief arrives beautifully formatted."
            value={prefs.discord_webhook}
            onChange={(v) => setPrefs({ ...prefs, discord_webhook: v })}
            placeholder="https://discord.com/api/webhooks/…"
          />
          <Field
            label="Telegram chat ID"
            tooltip="Your Telegram chat or group ID. Get it by messaging @userinfobot in Telegram — it replies with your numeric ID. The server uses a shared Lighthouse bot to send you richly formatted HTML briefs."
            value={prefs.telegram_chat_id}
            onChange={(v) => setPrefs({ ...prefs, telegram_chat_id: v })}
            placeholder="e.g. 123456789 or -100123456789"
          />
          <Field
            label="Notion page ID"
            tooltip="The 32-character hex ID from a Notion page URL: notion.so/your-workspace/PAGE_ID. The brief appends a new block each day."
            value={prefs.notion_page_id}
            onChange={(v) => setPrefs({ ...prefs, notion_page_id: v })}
            placeholder="Optional"
          />
        </div>
      </section>

      <div className="sticky bottom-6 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-ink-900/90 px-5 py-3 shadow-lift backdrop-blur-xl">
        <p className="text-xs text-ink-400">
          {savedTick ? `Saved at ${savedTick}` : "Changes are local until you save."}
          {error ? <span className="ml-2 text-rose-200">· {error}</span> : null}
        </p>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-beam px-5 py-2.5 text-sm font-semibold text-ink-950 shadow-[0_18px_45px_rgba(56,189,248,0.35)] transition hover:-translate-y-0.5 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}

function InfoTooltip({ tip }: { tip: string }) {
  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        tabIndex={-1}
        onClick={(e) => e.preventDefault()}
        aria-label="More info"
        className="inline-flex h-4 w-4 cursor-default items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px] text-ink-400 transition hover:border-beam/40 hover:text-ink-200"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-[80] mb-2 w-[min(90vw,260px)] -translate-x-1/2 rounded-xl border border-white/10 bg-ink-900 px-3 py-2 text-[12px] normal-case leading-snug tracking-normal text-ink-300 opacity-0 shadow-lift transition-opacity duration-150 group-hover:opacity-100"
      >
        {tip}
      </span>
    </span>
  );
}

function Field({
  label,
  help,
  tooltip,
  value,
  onChange,
  placeholder,
  type = "text",
  mono,
  select,
}: {
  label: string;
  help?: string;
  tooltip?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
  select?: { value: string; label: string; disabled?: boolean }[];
}) {
  return (
    <label className="space-y-1.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
        {label}
        {tooltip ? <InfoTooltip tip={tooltip} /> : null}
      </span>
      {select ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-ink-50 focus:border-beam focus:outline-none"
        >
          {select.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-ink-50 placeholder-ink-500 focus:border-beam focus:outline-none ${mono ? "font-mono" : ""}`}
        />
      )}
      {help ? <span className="block text-[11px] text-ink-500">{help}</span> : null}
    </label>
  );
}
