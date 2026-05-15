import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TechPage } from "@/components/tech/TechPage";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lighthouse — Under the hood",
  description:
    "How Lighthouse works: the four-step Kestra-orchestrated pipeline, the YAML topic profiles, and the open-source projects that make it possible.",
};

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <>
      <SiteHeader initialEmail={user?.email ?? null} />
      <TechPage />
    </>
  );
}
