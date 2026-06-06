/** Exa semantic + deep research — https://docs.exa.ai/reference/search */

export type ExaHit = {
  title: string;
  url: string;
  snippet: string;
  highlights?: string[];
};

export type ExaResearchResult = {
  hits: ExaHit[];
  synthesis?: string;
  mode: "fast" | "deep-lite" | "none";
  error?: string;
};

async function parseExaResponse(res: Response): Promise<{ hits: ExaHit[]; synthesis?: string }> {
  const json = (await res.json()) as {
    results?: Array<{
      title?: string;
      url?: string;
      text?: string;
      summary?: string;
      highlights?: string[];
    }>;
    answer?: string;
    output?: { text?: string };
  };

  const hits = (json.results ?? [])
    .filter((r) => r.url)
    .map((r) => ({
      title: r.title?.trim() || r.url!,
      url: r.url!,
      snippet: (r.summary || r.text || "").trim().slice(0, 800),
      highlights: r.highlights?.slice(0, 3),
    }));

  const synthesis = json.answer || json.output?.text || undefined;
  return { hits, synthesis };
}

/** Fast search (legacy / fallback). */
export async function searchExa(apiKey: string, query: string, numResults = 8): Promise<{ hits: ExaHit[]; error?: string }> {
  const key = apiKey.trim();
  if (!key) return { hits: [] };

  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "x-api-key": key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query.slice(0, 800),
        type: "auto",
        numResults,
        contents: { text: { maxCharacters: 600 }, highlights: { numSentences: 2 } },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { hits: [], error: `Exa HTTP ${res.status}: ${detail.slice(0, 200)}` };
    }

    const { hits } = await parseExaResponse(res);
    return { hits };
  } catch (e) {
    return { hits: [], error: e instanceof Error ? e.message : String(e) };
  }
}

/** Deep-lite research for comprehensive briefs (~4s). Falls back to auto search. */
export async function researchExaForBrief(apiKey: string, query: string): Promise<ExaResearchResult> {
  const key = apiKey.trim();
  if (!key) return { hits: [], mode: "none" };

  const body = {
    query: query.slice(0, 800),
    type: "deep-lite",
    numResults: 10,
    systemPrompt: "Prefer primary sources, recent articles, and official announcements. Deduplicate similar stories.",
    contents: { text: { maxCharacters: 900 }, highlights: { numSentences: 3 } },
  };

  try {
    let res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "x-api-key": key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok && res.status >= 400) {
      const fast = await searchExa(key, query, 8);
      return { hits: fast.hits, mode: "fast", error: fast.error ?? `deep-lite unavailable (${res.status})` };
    }

    const { hits, synthesis } = await parseExaResponse(res);
    return { hits, synthesis, mode: "deep-lite" };
  } catch (e) {
    const fast = await searchExa(key, query, 8);
    return {
      hits: fast.hits,
      mode: "fast",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export function formatExaContext(hits: ExaHit[]): string {
  if (hits.length === 0) return "";
  return [
    "Fresh web results (Exa — use these URLs and summarize key points per article):",
    ...hits.map((h, i) => {
      const hl = h.highlights?.length ? `\n   Key points: ${h.highlights.join(" · ")}` : "";
      return `${i + 1}. **${h.title}**\n   ${h.url}\n   ${h.snippet || "(no snippet)"}${hl}`;
    }),
  ].join("\n");
}
