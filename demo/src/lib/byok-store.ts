"use client";

// API keys never touch our database or server logs.
// They live in the browser only, and are sent per-request to /api/try-brief.

export type LlmProvider = {
  id: string;
  name: string;
  apiKey: string;        // localStorage only — never written to server
  baseUrl: string;
  modelPrimary: string;
  modelQuality: string;
};

export type ByokStore = {
  version: 2;
  providers: LlmProvider[];
  activeProviderId: string | null;
  exaApiKey: string;
};

// Legacy type kept for TryBrief / api/try-brief compatibility
export type ByokKeys = {
  llmApiKey: string;
  llmBaseUrl: string;
  llmModelPrimary: string;
  llmModelQuality: string;
  exaApiKey: string;
};

const V2_KEY = "lighthouse.byok.v2";
const V1_KEY = "lighthouse.byok.v1";

function emptyStore(): ByokStore {
  return { version: 2, providers: [], activeProviderId: null, exaApiKey: "" };
}

function migrateRaw(raw: string): ByokStore {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed?.version === 2) return parsed as unknown as ByokStore;
    // v1 → v2: single provider upgrade
    const store = emptyStore();
    if (parsed?.llmApiKey || parsed?.llmBaseUrl) {
      const id = "provider_default";
      store.providers = [{
        id,
        name: "Default",
        apiKey: String(parsed.llmApiKey ?? ""),
        baseUrl: String(parsed.llmBaseUrl ?? "https://api.openai.com/v1"),
        modelPrimary: String(parsed.llmModelPrimary ?? ""),
        modelQuality: String(parsed.llmModelQuality ?? ""),
      }];
      store.activeProviderId = id;
    }
    store.exaApiKey = String(parsed?.exaApiKey ?? "");
    return store;
  } catch {
    return emptyStore();
  }
}

export function readByokStore(): ByokStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const v2 = window.localStorage.getItem(V2_KEY);
    if (v2) return migrateRaw(v2);
    const v1 = window.localStorage.getItem(V1_KEY);
    if (v1) return migrateRaw(v1);
    return emptyStore();
  } catch {
    return emptyStore();
  }
}

export function writeByokStore(store: ByokStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(V2_KEY, JSON.stringify(store));
}

export function clearByokStore() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(V2_KEY);
  window.localStorage.removeItem(V1_KEY);
}

export function getActiveProvider(store: ByokStore): LlmProvider | null {
  if (store.providers.length === 0) return null;
  return store.providers.find((p) => p.id === store.activeProviderId) ?? store.providers[0];
}

export function hasMinimumByok(provider: LlmProvider | ByokKeys | null): boolean {
  if (!provider) return false;
  if ("apiKey" in provider) {
    return Boolean(provider.apiKey && provider.baseUrl && provider.modelPrimary);
  }
  return Boolean(provider.llmApiKey && provider.llmBaseUrl && provider.llmModelPrimary);
}

export function maskKey(k: string): string {
  if (!k) return "—";
  if (k.length <= 8) return "•".repeat(k.length);
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

// ── Legacy compat for TryBrief (reads the active provider as flat ByokKeys) ──

export function readByok(): ByokKeys {
  const store = readByokStore();
  const active = getActiveProvider(store);
  return {
    llmApiKey: active?.apiKey ?? "",
    llmBaseUrl: active?.baseUrl ?? "https://api.openai.com/v1",
    llmModelPrimary: active?.modelPrimary ?? "",
    llmModelQuality: active?.modelQuality ?? "",
    exaApiKey: store.exaApiKey,
  };
}

export function writeByok(keys: ByokKeys) {
  const store = readByokStore();
  if (store.providers.length === 0) {
    const id = "provider_default";
    store.providers = [{
      id,
      name: "Default",
      apiKey: keys.llmApiKey,
      baseUrl: keys.llmBaseUrl,
      modelPrimary: keys.llmModelPrimary,
      modelQuality: keys.llmModelQuality,
    }];
    store.activeProviderId = id;
  } else {
    const active = getActiveProvider(store);
    if (active) {
      store.providers = store.providers.map((p) =>
        p.id === active.id
          ? { ...p, apiKey: keys.llmApiKey, baseUrl: keys.llmBaseUrl, modelPrimary: keys.llmModelPrimary, modelQuality: keys.llmModelQuality }
          : p,
      );
    }
  }
  store.exaApiKey = keys.exaApiKey;
  writeByokStore(store);
}

export function clearByok() {
  clearByokStore();
}
