import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { TopicPreview } from "@/types/dashboard";

// Hardcoded fallback used when the repo's flows/ directory isn't mounted
// (e.g. on Vercel where only the demo/ subdirectory is deployed).
const FALLBACK_TOPICS: TopicPreview[] = [
  {
    id: "agentic-eng",
    name: "Agentic Engineering",
    description:
      "AI coding agents, orchestration frameworks, MCP, evals, and the practical engineering stack around production LLM applications.",
    schedule: "0 8 * * *",
    sourceCounts: { rss: 12, arxiv: 4, github: 4, hn: 7, reddit: 4, youtube: 4, web: 2 },
  },
  {
    id: "solana-zk",
    name: "Solana & ZK",
    description:
      "Solana ecosystem development (Anchor, Pinocchio, SVM internals) plus zero-knowledge cryptography research, audit reports, and ZK rollup news.",
    schedule: "30 8 * * *",
    sourceCounts: { rss: 11, arxiv: 3, github: 5, hn: 6, reddit: 4, youtube: 3, web: 4 },
  },
  {
    id: "indie-saas",
    name: "Indie SaaS",
    description:
      "Bootstrapped + small-team SaaS — distribution, pricing, growth, building in public, and the operational stack solo founders use.",
    schedule: "0 9 * * *",
    sourceCounts: { rss: 10, arxiv: 0, github: 2, hn: 5, reddit: 4, youtube: 3, web: 2 },
  },
  {
    id: "data-eng-ai",
    name: "Data Eng + AI",
    description:
      "Modern data stack — orchestration, lakehouse formats, query engines, and the AI-native data layer (vector DBs, embedding pipelines, RAG infra).",
    schedule: "30 9 * * *",
    sourceCounts: { rss: 13, arxiv: 2, github: 4, hn: 8, reddit: 3, youtube: 3, web: 3 },
  },
];

export async function loadTopics(): Promise<TopicPreview[]> {
  const root = path.resolve(process.cwd(), "..");
  const topicsDir = path.join(root, "flows", "_namespace_files", "topics");
  let entries: string[] = [];
  try {
    entries = await fs.readdir(topicsDir);
  } catch {
    return FALLBACK_TOPICS;
  }
  const topics: TopicPreview[] = [];
  for (const file of entries.filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))) {
    try {
      const raw = await fs.readFile(path.join(topicsDir, file), "utf8");
      const doc = parseYaml(raw) as Record<string, unknown>;
      const sources = (doc.sources ?? {}) as Record<string, unknown>;
      const rss = sources.rss;
      const arxiv = sources.arxiv_categories;
      const gh = sources.github_queries;
      const hn = sources.hn_keywords;
      const reddit = sources.reddit_subs;
      const yt = sources.youtube_channels;
      const web = sources.web_extra;
      topics.push({
        id: String(doc.id ?? file.replace(/\.ya?ml$/i, "")),
        name: String(doc.name ?? doc.id ?? file),
        description: String(doc.description ?? "").trim(),
        schedule: doc.schedule ? String(doc.schedule) : undefined,
        sourceCounts: {
          rss: Array.isArray(rss) ? rss.length : 0,
          arxiv: Array.isArray(arxiv) ? arxiv.length : 0,
          github: Array.isArray(gh) ? gh.length : 0,
          hn: Array.isArray(hn) ? hn.length : 0,
          reddit: Array.isArray(reddit) ? reddit.length : 0,
          youtube: Array.isArray(yt) ? yt.length : 0,
          web: Array.isArray(web) ? web.length : 0,
        },
      });
    } catch {
      /* skip malformed */
    }
  }
  if (topics.length === 0) return FALLBACK_TOPICS;
  topics.sort((a, b) => a.name.localeCompare(b.name));
  return topics;
}
