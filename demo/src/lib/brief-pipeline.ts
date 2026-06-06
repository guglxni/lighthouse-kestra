import { formatExaContext, researchExaForBrief, searchExa, type ExaResearchResult } from "@/lib/exa-search";
import { forwardChatCompletion, type ByokPayload } from "@/lib/llm-forward";

export type BriefByok = ByokPayload & { llmModelQuality?: string };

/** Vercel Hobby caps serverless at 60s — keep the whole pipeline under ~50s. */
function isServerlessDeploy(): boolean {
  return Boolean(process.env.VERCEL);
}

const DRAFT_SYSTEM = [
  "You are Lighthouse, a research operating system producing a daily intelligence brief.",
  "Write a comprehensive Markdown brief (500–800 words) grounded in the research context provided.",
  "Structure:",
  "## Executive summary (3–4 sentences)",
  "## Key developments (3–5 items — each with: headline, 2–3 sentence analysis, source URL if provided)",
  "## Themes & implications (3 themes with bullet takeaways)",
  "## Reading list (5–8 items with one-line why-it-matters)",
  "Rules: cite real URLs from the research block only; never invent links; neutral tone; no hype.",
  "When Exa research is thin, say what is known and mark gaps explicitly.",
  "The user's question is the lens for the entire brief — answer it directly in the executive summary and thread it through each section.",
].join(" ");

const DRAFT_SYSTEM_CLOUD = [
  "You are Lighthouse. Write a focused Markdown brief (300–500 words) answering the user's question.",
  "Use Exa research when provided. Sections: Executive summary, Key developments (3 items with URLs), Reading list (4 items).",
  "Cite only real URLs from research. No hype.",
].join(" ");

const POLISH_SYSTEM = [
  "You are a senior research editor. Expand and sharpen the draft brief.",
  "Add article-level key points, connect dots across sources, keep all valid URLs.",
  "Target 700–1000 words. Preserve Markdown structure. Do not remove factual content — enrich it.",
].join(" ");

export type BriefGenerationMeta = {
  exa?: ExaResearchResult;
  models: { draft: string; polish?: string };
  stages: string[];
  serverless?: boolean;
};

export async function generateComprehensiveBrief(args: {
  byok: BriefByok;
  topicContext: string;
  prompt: string;
  topicId: string;
  exaApiKey?: string;
}): Promise<{ output: string; meta: BriefGenerationMeta }> {
  const serverless = isServerlessDeploy();
  const stages: string[] = [];
  let exaMeta: ExaResearchResult | undefined;
  let researchBlock = "";

  if (args.exaApiKey?.trim()) {
    stages.push(serverless ? "exa-fast" : "exa-research");
    const query = `${args.topicId.replace(/-/g, " ")} — ${args.prompt}`;
    if (serverless) {
      const fast = await searchExa(args.exaApiKey, query, 4);
      exaMeta = { hits: fast.hits, mode: "fast", error: fast.error };
    } else {
      exaMeta = await researchExaForBrief(args.exaApiKey, query);
    }
    researchBlock = exaMeta.synthesis || formatExaContext(exaMeta.hits);
    if (exaMeta.error && !researchBlock) researchBlock = `(Exa note: ${exaMeta.error})`;
  }

  const userMessage = [
    args.topicContext,
    researchBlock ? `## Research context (Exa)\n${researchBlock}` : "",
    `## User question\n${args.prompt}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const llmTimeout = serverless ? 42_000 : 90_000;
  const maxTokens = serverless ? 1400 : undefined;
  const system = serverless ? DRAFT_SYSTEM_CLOUD : DRAFT_SYSTEM;

  stages.push("llm-draft");
  const draft = await forwardChatCompletion(args.byok, system, userMessage, 0.25, llmTimeout, maxTokens);

  let output = draft.output;
  const models: { draft: string; polish?: string } = { draft: draft.model ?? args.byok.llmModelPrimary };

  if (!serverless && args.byok.llmModelQuality?.trim()) {
    stages.push("llm-polish");
    const polished = await forwardChatCompletion(
      { ...args.byok, llmModelPrimary: args.byok.llmModelQuality },
      POLISH_SYSTEM,
      `User question (must be answered throughout):\n${args.prompt}\n\nDraft to expand:\n\n${output}`,
      0.2,
      llmTimeout,
    );
    output = polished.output;
    models.polish = polished.model ?? args.byok.llmModelQuality;
  }

  return {
    output,
    meta: { exa: exaMeta, models, stages, serverless },
  };
}
