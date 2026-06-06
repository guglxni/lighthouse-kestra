export type ByokPayload = {
  llmApiKey: string;
  llmBaseUrl: string;
  llmModelPrimary: string;
};

export function isValidByok(byok: unknown): byok is ByokPayload {
  if (!byok || typeof byok !== "object") return false;
  const b = byok as Record<string, unknown>;
  return (
    typeof b.llmApiKey === "string" &&
    b.llmApiKey.length > 0 &&
    b.llmApiKey.length <= 200 &&
    typeof b.llmBaseUrl === "string" &&
    b.llmBaseUrl.length > 0 &&
    b.llmBaseUrl.length <= 500 &&
    /^https?:\/\//i.test(b.llmBaseUrl) &&
    typeof b.llmModelPrimary === "string" &&
    b.llmModelPrimary.length > 0 &&
    b.llmModelPrimary.length <= 200
  );
}

/** Normalize BYOK base URL — users often paste the full /chat/completions path by mistake. */
export function normalizeLlmBaseUrl(raw: string): string {
  let base = raw.trim().replace(/\/+$/, "");
  // Full endpoint pasted as base URL
  base = base.replace(/\/chat\/completions$/i, "");
  // Some dashboards append /v1/chat/completions — already stripped above
  if (!/\/v\d+(\/|$)/i.test(base) && /^https:\/\/api\.openai\.com$/i.test(base)) {
    base = `${base}/v1`;
  }
  return base;
}

export function resolveChatCompletionsUrl(baseUrl: string): string {
  const base = normalizeLlmBaseUrl(baseUrl);
  // Azure OpenAI: deployment URL already ends with .../chat/completions
  if (/\/deployments\/[^/]+\/chat\/completions/i.test(base)) {
    return base;
  }
  return `${base}/chat/completions`;
}

export async function forwardChatCompletion(
  byok: ByokPayload,
  system: string,
  user: string,
  temperature = 0.3,
  timeoutMs = 90_000,
  maxTokens?: number,
): Promise<{ output: string; model?: string; usage?: Record<string, number> | null; endpoint: string }> {
  const url = resolveChatCompletionsUrl(byok.llmBaseUrl);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${byok.llmApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: byok.llmModelPrimary,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let host = url;
    try {
      const u = new URL(url);
      host = `${u.host}${u.pathname}`;
    } catch {
      /* keep full url */
    }
    throw new Error(
      `Provider returned HTTP ${res.status} at ${host}: ${text.slice(0, 300) || "no body"}. ` +
        `Check Settings → Base URL should be the API root (e.g. https://api.openai.com/v1), not the full /chat/completions path.`,
    );
  }

  type ChatResp = {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: Record<string, number>;
    model?: string;
  };
  const json = (await res.json()) as ChatResp;
  const output = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!output) throw new Error("Empty completion from provider");
  return { output, model: json.model ?? byok.llmModelPrimary, usage: json.usage ?? null, endpoint: url };
}
