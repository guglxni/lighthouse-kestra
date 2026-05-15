"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  readByokStore,
  writeByokStore,
  clearByokStore,
  getActiveProvider,
  maskKey,
  type ByokStore,
  type LlmProvider,
} from "@/lib/byok-store";
import { FloatingHoverCard } from "@/components/ui/floating-card";

type Prefs = {
  default_topic_id: string;
  slack_webhook: string;
  discord_webhook: string;
  notion_page_id: string;
  email_to: string;
};

const DEFAULT_PREFS: Prefs = {
  default_topic_id: "agentic-eng",
  slack_webhook: "",
  discord_webhook: "",
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

export function SettingsForm({ topics }: { topics: { id: string; name: string }[] }) {
  const supabase = createSupabaseBrowserClient();
  const [store, setStore] = useState<ByokStore>(() => readByokStore());
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [busy, setBusy] = useState(false);
  const [savedTick, setSavedTick] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("default_topic_id,slack_webhook,discord_webhook,notion_page_id,email_to")
        .maybeSingle();
      if (!alive) return;
      if (error && error.code !== "PGRST116") setError(error.message);
      if (data) {
        setPrefs({
          default_topic_id: data.default_topic_id ?? "agentic-eng",
          slack_webhook: data.slack_webhook ?? "",
          discord_webhook: data.discord_webhook ?? "",
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
    setStore({ version: 2, providers: [], activeProviderId: null, exaApiKey: "" });
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
            Add an Exa key to enrich briefs with fresh web context. Skip it — Lighthouse degrades gracefully.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Exa API key"
            tooltip="Get a key at exa.ai. When set, the ingest flow uses Exa for semantic web search to supplement RSS/arXiv. If not set, the step is silently skipped."
            value={store.exaApiKey}
            onChange={(v) => setStore((s) => ({ ...s, exaApiKey: v }))}
            placeholder="Exa key (optional)"
            type={showKeys ? "text" : "password"}
            mono
          />
        </div>
      </section>

      {/* ── Delivery channels ── */}
      <section className="glass-panel space-y-5 p-6">
        <header className="space-y-1">
          <h2 className="font-display text-2xl text-ink-50">Where briefs land</h2>
          <p className="text-sm text-ink-400">
            Pick channels you actually read. Empty = skipped, no errors. When Kestra generates your morning brief it calls
            these webhooks directly — whatever you set here is where it lands.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Default topic"
            tooltip="The topic Kestra uses when generating your daily brief. You can override this per-run in the dashboard."
            value={prefs.default_topic_id}
            onChange={(v) => setPrefs({ ...prefs, default_topic_id: v })}
            select={topics.map((t) => ({ value: t.id, label: t.name }))}
          />
          <Field
            label="Email digest goes to"
            tooltip="Where the daily Markdown digest is emailed. Requires a SendGrid API key on the server side."
            value={prefs.email_to}
            onChange={(v) => setPrefs({ ...prefs, email_to: v })}
            placeholder="you@studio.com"
          />
          <Field
            label="Slack incoming webhook"
            tooltip="Create one at api.slack.com → Your Apps → Incoming Webhooks. The brief posts as a message in whichever channel you configure."
            value={prefs.slack_webhook}
            onChange={(v) => setPrefs({ ...prefs, slack_webhook: v })}
            placeholder="https://hooks.slack.com/services/…"
          />
          <Field
            label="Discord webhook"
            tooltip="Right-click a Discord channel → Edit Channel → Integrations → Webhooks. Paste the full URL here."
            value={prefs.discord_webhook}
            onChange={(v) => setPrefs({ ...prefs, discord_webhook: v })}
            placeholder="https://discord.com/api/webhooks/…"
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
    <FloatingHoverCard
      placement="top"
      trigger={
        <span className="inline-flex h-4 w-4 cursor-default items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px] text-ink-400 hover:border-beam/40 hover:text-ink-200">
          ?
        </span>
      }
    >
      <p className="text-[12px] leading-snug text-ink-300">{tip}</p>
    </FloatingHoverCard>
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
  select?: { value: string; label: string }[];
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
            <option key={opt.value} value={opt.value}>
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
