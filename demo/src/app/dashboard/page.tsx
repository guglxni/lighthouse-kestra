import { loadDashboardPayload } from "@/server/load-dashboard";
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
      <LiveDashboard initial={initial} signedIn={Boolean(user)} userDefaultTopic={defaultTopic} />
    </>
  );
}
