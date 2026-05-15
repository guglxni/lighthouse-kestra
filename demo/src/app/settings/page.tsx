import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { loadTopics } from "@/server/load-topics";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const topics = await loadTopics();
  return (
    <div className="relative isolate min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
      <main className="relative mx-auto max-w-3xl space-y-8 px-6 py-12">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-beam-glow/90">Settings</p>
            <h1 className="font-display text-3xl text-ink-50">Your keys, your channels</h1>
            <p className="mt-2 text-sm text-ink-400">
              Signed in as <span className="font-mono text-ink-200">{user?.email}</span>.
            </p>
          </div>
          <Link href="/" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink-100 hover:border-beam/40">
            Back to dashboard
          </Link>
        </header>
        <SettingsForm topics={topics.map((t) => ({ id: t.id, name: t.name }))} />
      </main>
    </div>
  );
}
