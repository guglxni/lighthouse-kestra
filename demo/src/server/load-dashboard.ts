import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { Pool } from "pg";

import type { DashboardPayload, ExecutionPreview, TopicPreview } from "@/types/dashboard";

// Same fallback topics used in load-topics.ts (Vercel has no access to flows/ dir).
const FALLBACK_TOPICS: TopicPreview[] = [
  {
    id: "agentic-eng",
    name: "Agentic Engineering",
    description: "AI coding agents, orchestration frameworks, MCP, evals, and the practical engineering stack around production LLM applications.",
    schedule: "0 8 * * *",
    sourceCounts: { rss: 12, arxiv: 4, github: 4, hn: 7, reddit: 4, youtube: 4, web: 2 },
  },
  {
    id: "solana-zk",
    name: "Solana & ZK",
    description: "Solana ecosystem development (Anchor, Pinocchio, SVM internals) plus zero-knowledge cryptography research, audit reports, and ZK rollup news.",
    schedule: "30 8 * * *",
    sourceCounts: { rss: 11, arxiv: 3, github: 5, hn: 6, reddit: 4, youtube: 3, web: 4 },
  },
  {
    id: "indie-saas",
    name: "Indie SaaS",
    description: "Bootstrapped + small-team SaaS — distribution, pricing, growth, building in public, and the operational stack solo founders use.",
    schedule: "0 9 * * *",
    sourceCounts: { rss: 10, arxiv: 0, github: 2, hn: 5, reddit: 4, youtube: 3, web: 2 },
  },
  {
    id: "data-eng-ai",
    name: "Data Eng + AI",
    description: "Modern data stack — orchestration, lakehouse formats, query engines, and the AI-native data layer (vector DBs, embedding pipelines, RAG infra).",
    schedule: "30 9 * * *",
    sourceCounts: { rss: 13, arxiv: 2, github: 4, hn: 8, reddit: 3, youtube: 3, web: 3 },
  },
];
const LIGHTHOUSE_NS_PREFIX = "company.team.lighthouse";

const NAMESPACES = [
  `${LIGHTHOUSE_NS_PREFIX}.ingest`,
  `${LIGHTHOUSE_NS_PREFIX}.process`,
  `${LIGHTHOUSE_NS_PREFIX}.deliver`,
  `${LIGHTHOUSE_NS_PREFIX}.serve`,
  `${LIGHTHOUSE_NS_PREFIX}.monitors`,
  `${LIGHTHOUSE_NS_PREFIX}.maintenance`,
];

function env(name: string, fallback = ""): string {
  return process.env[name]?.trim() ?? fallback;
}

/** Prefer Bearer (EE/API token) over Basic when both are set — matches Kestra docs. */
function kestraAuthHeaders(): HeadersInit {
  const token = env("KESTRA_API_TOKEN");
  if (token) return { Authorization: `Bearer ${token}` };
  const user = env("KESTRA_BASIC_AUTH_USER");
  const password = env("KESTRA_BASIC_AUTH_PASSWORD");
  if (user && password) {
    const b64 = Buffer.from(`${user}:${password}`, "utf8").toString("base64");
    return { Authorization: `Basic ${b64}` };
  }
  return {};
}

let pool: Pool | null = null;
function getPool(): Pool | null {
  const url = env("DATABASE_URL");
  if (!url) return null;
  if (!pool) {
    pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 5000 });
  }
  return pool;
}

async function timedFetch(url: string, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

async function fetchFlowsForNamespace(kestraBase: string, tenant: string, ns: string) {
  const encoded = encodeURIComponent(ns);
  const url = `${kestraBase}/api/v1/${tenant}/flows/${encoded}`;
  const res = await timedFetch(url, { headers: kestraAuthHeaders() });
  if (!res.ok) return { ok: false as const, status: res.status };
  const data = (await res.json()) as unknown;
  const arr = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { results?: unknown }).results)
      ? ((data as { results: unknown[] }).results ?? [])
      : [];
  return { ok: true as const, count: arr.length };
}

async function fetchExecutionSample(kestraBase: string, tenant: string) {
  const url = `${kestraBase}/api/v1/${tenant}/executions?page=1&size=25`;
  const res = await timedFetch(url, { headers: kestraAuthHeaders() });
  if (!res.ok) return { ok: false as const, status: res.status };
  type ExRow = {
    id: string;
    namespace: string;
    flowId: string;
    state?: { current?: string; startDate?: string; duration?: number };
  };
  const body = (await res.json()) as { results?: ExRow[]; content?: ExRow[] };
  const list = Array.isArray(body.results)
    ? body.results
    : Array.isArray(body.content)
      ? body.content
      : [];
  const rows = list.map((r) => ({
    id: r.id,
    namespace: r.namespace,
    flowId: r.flowId,
    state: r.state?.current ?? "UNKNOWN",
    startDate: r.state?.startDate,
    durationMs: r.state?.duration != null ? Math.round(r.state.duration * 1000) : undefined,
  }));
  return { ok: true as const, rows };
}

async function fetchLiteLLMModels(base: string, apiKey: string) {
  const url = `${base.replace(/\/$/, "")}/models`;
  const res = await timedFetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) return { ok: false as const, status: res.status };
  const body = (await res.json()) as { data?: Array<{ id?: string }> };
  const models = body.data?.map((m) => m.id).filter(Boolean) as string[];
  return { ok: true as const, models: models ?? [] };
}

async function loadTopicsFromRepo(): Promise<TopicPreview[]> {
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

async function loadPostgresStats() {
  const p = getPool();
  if (!p) return { ok: false as const, error: "DATABASE_URL not set" };
  try {
    const [
      documents,
      embeddings,
      classifications,
      briefs,
      chatTurns,
      docsByTopic,
      latestBriefs,
    ] = await Promise.all([
      p.query<{ c: string }>("SELECT COUNT(*)::text AS c FROM lh.documents"),
      p.query<{ c: string }>("SELECT COUNT(*)::text AS c FROM lh.embeddings"),
      p.query<{ c: string }>("SELECT COUNT(*)::text AS c FROM lh.classifications"),
      p.query<{ c: string }>("SELECT COUNT(*)::text AS c FROM lh.briefs"),
      p.query<{ c: string }>("SELECT COUNT(*)::text AS c FROM lh.chat_history"),
      p.query<{ topic_id: string; c: string }>(
        "SELECT topic_id, COUNT(*)::text AS c FROM lh.documents GROUP BY topic_id ORDER BY COUNT(*) DESC",
      ),
      p.query<{ topic_id: string; date: string; clusters: number }>(
        `SELECT topic_id, date::text, COALESCE(jsonb_array_length(clusters), 0) AS clusters
         FROM lh.briefs ORDER BY date DESC LIMIT 12`,
      ),
    ]);
    return {
      ok: true as const,
      counts: {
        documents: Number(documents.rows[0]?.c ?? 0),
        embeddings: Number(embeddings.rows[0]?.c ?? 0),
        classifications: Number(classifications.rows[0]?.c ?? 0),
        briefs: Number(briefs.rows[0]?.c ?? 0),
        chatTurns: Number(chatTurns.rows[0]?.c ?? 0),
      },
      docsByTopic: Object.fromEntries(docsByTopic.rows.map((r) => [r.topic_id, Number(r.c)])),
      latestBriefs: latestBriefs.rows.map((r) => ({
        topic_id: r.topic_id,
        date: r.date,
        clusters: r.clusters,
      })),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false as const, error: msg };
  }
}

export async function loadDashboardPayload(): Promise<DashboardPayload> {
  // Empty default: skip Kestra probing when not explicitly configured (avoids
  // 8s per-request hangs on Vercel where localhost:8080 is unreachable).
  const kestraUrl = env("KESTRA_PUBLIC_URL", "").replace(/\/$/, "");
  const tenant = env("KESTRA_TENANT", "main");
  const litellmUrl = env("LITELLM_BASE_URL", "http://127.0.0.1:4000/v1").replace(/\/$/, "");
  const litellmKey = env("LITELLM_API_KEY", "");
  const databaseUrl = env("DATABASE_URL");

  const topics = await loadTopicsFromRepo();

  const pipeline: DashboardPayload["pipeline"] = [
    {
      id: "ingest",
      title: "Ingest",
      subtitle: "RSS · arXiv · GitHub · HN/Reddit · A/V · Web",
      flows: [
        "ingest.rss",
        "ingest.arxiv",
        "ingest.github_trending",
        "ingest.hn_reddit",
        "ingest.audio_video",
        "ingest.web_articles",
        "ingest.exa_search",
      ],
      accent: "cyan",
    },
    {
      id: "process",
      title: "Process",
      subtitle: "embed_dedup · classify · cluster_summarize",
      flows: ["process.embed_dedup", "process.classify", "process.cluster_summarize"],
      accent: "violet",
    },
    {
      id: "deliver",
      title: "Deliver & serve",
      subtitle: "Daily brief · Chat RAG · Deep-dive",
      flows: ["deliver.brief", "serve.chat_brief", "serve.deepdive"],
      accent: "amber",
    },
    {
      id: "observe",
      title: "Observe",
      subtitle: "Alerts · GC · Docs hooks",
      flows: ["monitors.alerts", "monitors.gc", "maintenance.graphify_docs"],
      accent: "emerald",
    },
  ];

  const byokPresets: DashboardPayload["byokPresets"] = [];

  const start = Date.now();
  let kestraOk = false;
  let kestraMs: number | undefined;
  let kestraError: string | undefined;
  let flowsTotal = 0;
  const flowsByNamespace: Record<string, number> = {};
  let executions: ExecutionPreview[] | undefined;

  if (!kestraUrl) {
    kestraError = "KESTRA_PUBLIC_URL not configured";
    kestraMs = 0;
  } else {
    try {
      const samples = await Promise.all(NAMESPACES.map((ns) => fetchFlowsForNamespace(kestraUrl, tenant, ns)));
      kestraOk = samples.every((s) => s.ok);
      kestraMs = Date.now() - start;
      if (!kestraOk) {
        const failed = samples.find((s): s is { ok: false; status: number } => !s.ok);
        kestraError = `Flow listing failed for one or more namespaces (HTTP ${failed?.status ?? "?"})`;
      }
      NAMESPACES.forEach((ns, i) => {
        const s = samples[i];
        if (s.ok) {
          flowsByNamespace[ns] = s.count;
          flowsTotal += s.count;
        } else {
          flowsByNamespace[ns] = 0;
        }
      });

      const ex = await fetchExecutionSample(kestraUrl, tenant);
      if (ex.ok) {
        const filtered = ex.rows.filter((r) => r.namespace.startsWith(LIGHTHOUSE_NS_PREFIX));
        executions = filtered.slice(0, 18);
      }
    } catch (e) {
      kestraOk = false;
      kestraError = e instanceof Error ? e.message : String(e);
      kestraMs = Date.now() - start;
    }

    // No flows yet isn't a failure — treat 404 namespaces as "Kestra reachable, no flows yet".
    const kestraReachable = kestraOk || (kestraError && !kestraError.includes("ECONNREFUSED") && !kestraError.includes("aborted"));
    kestraOk = Boolean(kestraReachable);
  }

  const postgres = await loadPostgresStats();

  let litellm: DashboardPayload["services"]["litellm"] = {
    ok: false,
    error: "LITELLM_API_KEY not set",
    models: [],
  };
  if (litellmKey) {
    const lm = await fetchLiteLLMModels(litellmUrl, litellmKey);
    if (lm.ok) litellm = { ok: true, models: lm.models };
    else litellm = { ok: false, error: `LiteLLM HTTP ${lm.status}`, models: [] };
  }

    const demoMode = !postgres.ok || !litellm.ok;

    let demoBanner: string | undefined;
    if (!postgres.ok && !litellm.ok) {
      demoBanner = "Backend is warming up. You can still browse — sign in to set up your AI key.";
    } else if (!postgres.ok) {
      demoBanner = "Library is still warming up. Sign in and try a brief with your own key — that works either way.";
    } else if (!litellm.ok) {
      demoBanner = "Optional AI router is offline. Lighthouse uses your own provider key anyway — head to Settings to add it.";
    } else if (!kestraOk) {
      // Common when you just spun up the stack — no flows deployed yet.
      demoBanner = undefined;
    }

  return {
    generatedAt: new Date().toISOString(),
    demoMode,
    demoBanner,
    envHints: {
      kestraUrl,
      kestraTenant: tenant,
      litellmUrl,
      databaseConfigured: Boolean(databaseUrl),
      litellmKeyConfigured: Boolean(litellmKey),
    },
    topics,
    services: {
      kestra: {
        ok: kestraOk,
        ms: kestraMs,
        error: kestraError,
        flowsTotal,
        flowsByNamespace,
        executions,
      },
      postgres,
      litellm,
    },
    pipeline,
    byokPresets,
  };
}
