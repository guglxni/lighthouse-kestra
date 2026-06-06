import { formatExaContext, researchExaForBrief, type ExaResearchResult } from "@/lib/exa-search";
import { forwardChatCompletion, type ByokPayload } from "@/lib/llm-forward";

export type BriefByok = ByokPayload & { llmModelQuality?: string };

export type BriefResearchPayload = {
  hits: ExaResearchResult["hits"];
  synthesis?: string;
  mode: ExaResearchResult["mode"];
  error?: string;
};

export const DRAFT_SYSTEM = [
  "You are Lighthouse, a research operating system producing a daily intelligence brief.",
  "Write a comprehensive Markdown brief (600–1000 words) grounded in the research context provided.",
  "Structure:",
  "## Executive summary (3–4 sentences)",
  "## Key developments (3–5 items — each with: headline, 2–3 sentence analysis, source URL if provided)",
  "## Themes & implications (3 themes with bullet takeaways)",
  "## Reading list (5–8 items with one-line why-it-matters)",
  "Rules: cite real URLs from the research block only; never invent links; neutral tone; no hype.",
  "When Exa research is thin, say what is known and mark gaps explicitly.",
  "The user's question is the lens for the entire brief — answer it directly in the executive summary and thread it through each section.",
].join(" ");

export const POLISH_SYSTEM = [
  "You are a senior research editor. Expand and sharpen the draft brief.",
  "Add article-level key points, connect dots across sources, keep all valid URLs.",
  "Target 800–1200 words. Preserve Markdown structure. Do not remove factual content — enrich it.",
].join(" ");

export async function runExaStage(exaApiKey: string, topicId: string, prompt: string): Promise<BriefResearchPayload> {
  const query = `${topicId.replace(/-/g, " ")} — ${prompt}`;
  const result = await researchExaForBrief(exaApiKey, query);
  return {
    hits: result.hits,
    synthesis: result.synthesis,
    mode: result.mode,
    error: result.error,
  };
}

export function buildUserMessage(topicContext: string, research: BriefResearchPayload | undefined, prompt: string): string {
  const researchBlock = research
    ? research.synthesis || formatExaContext(research.hits) || (research.error ? `(Exa note: ${research.error})` : "")
    : "";
  return [
    topicContext,
    researchBlock ? `## Research context (Exa)\n${researchBlock}` : "",
    `## User question\n${prompt}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function runDraftStage(
  byok: BriefByok,
  topicContext: string,
  research: BriefResearchPayload | undefined,
  prompt: string,
): Promise<{ output: string; model: string }> {
  const userMessage = buildUserMessage(topicContext, research, prompt);
  const result = await forwardChatCompletion(byok, DRAFT_SYSTEM, userMessage, 0.25, 120_000);
  return { output: result.output, model: result.model ?? byok.llmModelPrimary };
}

export async function runPolishStage(
  byok: BriefByok,
  prompt: string,
  draft: string,
): Promise<{ output: string; model: string }> {
  const quality = byok.llmModelQuality?.trim();
  if (!quality) return { output: draft, model: byok.llmModelPrimary };
  const result = await forwardChatCompletion(
    { ...byok, llmModelPrimary: quality },
    POLISH_SYSTEM,
    `User question (must be answered throughout):\n${prompt}\n\nDraft to expand:\n\n${draft}`,
    0.2,
    120_000,
  );
  return { output: result.output, model: result.model ?? quality };
}
