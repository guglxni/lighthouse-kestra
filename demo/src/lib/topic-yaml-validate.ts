import { isValidCron } from "@/lib/cron-presets";

const ID_RE = /^[a-z][a-z0-9-]{1,62}$/;

const SOURCE_KEYS = [
  "rss",
  "arxiv_categories",
  "github_queries",
  "hn_keywords",
  "reddit_subs",
  "youtube_channels",
  "web_extra",
] as const;

export function validateTopicYaml(doc: Record<string, unknown>): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  const id = String(doc.id ?? "").trim();
  const name = String(doc.name ?? "").trim();
  const description = String(doc.description ?? "").trim();
  const schedule = String(doc.schedule ?? "").trim();
  const schedulesRaw = doc.schedules;
  const schedules = Array.isArray(schedulesRaw)
    ? schedulesRaw.map((s) => String(s).trim()).filter(Boolean)
    : [];

  if (!id || !ID_RE.test(id)) errors.push("id must be a lowercase kebab-case slug (2–63 chars).");
  if (!name) errors.push("name is required.");
  if (!description) errors.push("description is required.");

  if (schedules.length > 0) {
    for (const s of schedules) {
      if (!isValidCron(s)) errors.push(`schedules entry invalid: ${s}`);
    }
  } else if (!schedule || !isValidCron(schedule)) {
    errors.push("schedule must be a valid 5-field UTC cron string (or use schedules array).");
  }

  const sources = doc.sources;
  if (!sources || typeof sources !== "object" || Array.isArray(sources)) {
    errors.push("sources object is required.");
  } else {
    const s = sources as Record<string, unknown>;
    const total = SOURCE_KEYS.reduce((n, k) => n + (Array.isArray(s[k]) ? s[k].length : 0), 0);
    if (total === 0) errors.push("sources must include at least one feed, query, or URL list.");
  }

  if (doc.delivery != null && (typeof doc.delivery !== "object" || Array.isArray(doc.delivery))) {
    errors.push("delivery must be an object when present.");
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}
