import { loadDashboardPayload } from "@/server/load-dashboard";
import { loadCustomTopicsForUser } from "@/server/load-custom-topics";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LiveDashboard } from "@/components/LiveDashboard";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [initial, supabase] = await Promise.all([loadDashboardPayload(), createSupabaseServerClient()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let defaultTopic: string | undefined;
  const customTopics = await loadCustomTopicsForUser(user?.id);
  const presetIds = new Set(initial.topics.map((t) => t.id));
  const mergedTopics = [...initial.topics, ...customTopics.filter((t) => !presetIds.has(t.id))];

  if (user) {
    const { data } = await supabase
      .from("user_settings")
      .select("default_topic_id")
      .eq("user_id", user.id)
      .maybeSingle();
    defaultTopic = data?.default_topic_id ?? undefined;
  }

  return (
    <>
      <SiteHeader initialEmail={user?.email ?? null} />
      <LiveDashboard
        initial={{ ...initial, topics: mergedTopics }}
        signedIn={Boolean(user)}
        userDefaultTopic={defaultTopic}
      />
    </>
  );
}
