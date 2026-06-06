import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TopicPreview } from "@/types/dashboard";
import { parse as parseYaml } from "yaml";

export async function loadCustomTopicsForUser(userId: string | undefined): Promise<TopicPreview[]> {
  if (!userId) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("custom_topics")
    .select("id,name,description,schedule,yaml_content")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  return (data ?? []).map((row) => {
    let sourceCounts = { rss: 0, arxiv: 0, github: 0, hn: 0, reddit: 0, youtube: 0, web: 0 };
    try {
      const doc = parseYaml(row.yaml_content) as { sources?: Record<string, unknown> };
      const s = doc.sources ?? {};
      sourceCounts = {
        rss: Array.isArray(s.rss) ? s.rss.length : 0,
        arxiv: Array.isArray(s.arxiv_categories) ? s.arxiv_categories.length : 0,
        github: Array.isArray(s.github_queries) ? s.github_queries.length : 0,
        hn: Array.isArray(s.hn_keywords) ? s.hn_keywords.length : 0,
        reddit: Array.isArray(s.reddit_subs) ? s.reddit_subs.length : 0,
        youtube: Array.isArray(s.youtube_channels) ? s.youtube_channels.length : 0,
        web: Array.isArray(s.web_extra) ? s.web_extra.length : 0,
      };
    } catch {
      /* keep zeros */
    }
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      schedule: row.schedule ?? undefined,
      sourceCounts,
      custom: true as const,
    };
  });
}
