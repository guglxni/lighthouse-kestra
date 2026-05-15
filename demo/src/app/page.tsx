import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MarketingLanding } from "@/components/landing/MarketingLanding";
import { SiteHeader } from "@/components/SiteHeader";
import { loadTopics } from "@/server/load-topics";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [supabase, topics] = await Promise.all([createSupabaseServerClient(), loadTopics()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <>
      <SiteHeader initialEmail={user?.email ?? null} />
      <MarketingLanding
        signedIn={Boolean(user)}
        topics={topics.map((t) => ({ id: t.id, name: t.name, description: t.description, schedule: t.schedule, sourceCounts: t.sourceCounts }))}
      />
    </>
  );
}
