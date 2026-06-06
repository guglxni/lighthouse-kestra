import Link from "next/link";
import { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { WebMcpCallout, WebMcpTools } from "@/components/WebMcpTools";
import { loadTopics } from "@/server/load-topics";
import { loadCustomTopicsForUser } from "@/server/load-custom-topics";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const presetTopics = await loadTopics();
  const customTopics = await loadCustomTopicsForUser(user?.id);
  const presetIds = new Set(presetTopics.map((t) => t.id));
  const topics = [
    ...presetTopics,
    ...customTopics.filter((t) => !presetIds.has(t.id)).map((t) => ({ id: t.id, name: t.name })),
  ];
  let oauthStatus = {
    slackTeam: null as string | null,
    notionWorkspace: null as string | null,
    slackConnected: false,
    notionConnected: false,
    agentmailInboxId: null as string | null,
  };
  if (user) {
    const { data } = await supabase
      .from("user_settings")
      .select("slack_team_name,notion_workspace_name,oauth_slack_connected_at,oauth_notion_connected_at,agentmail_inbox_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      oauthStatus = {
        slackTeam: data.slack_team_name,
        notionWorkspace: data.notion_workspace_name,
        slackConnected: Boolean(data.oauth_slack_connected_at),
        notionConnected: Boolean(data.oauth_notion_connected_at),
        agentmailInboxId: data.agentmail_inbox_id,
      };
    }
  }
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
          <Link href="/dashboard" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink-100 hover:border-beam/40">
            Back to dashboard
          </Link>
        </header>
        {user ? <WebMcpTools /> : null}
        <WebMcpCallout variant="settings" />
        <Suspense fallback={<div className="glass-panel p-6 text-sm text-ink-400">Loading settings…</div>}>
          <SettingsForm topics={topics.map((t) => ({ id: t.id, name: t.name }))} oauthStatus={oauthStatus} />
        </Suspense>
      </main>
    </div>
  );
}
