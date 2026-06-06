import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { kestraConfigured, kestraPing, uploadTopicYaml } from "@/lib/kestra-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Push custom topic YAML from Supabase → Kestra namespace files (self-hosted engine). */
export async function POST() {
  if (!kestraConfigured()) {
    return NextResponse.json(
      { error: "KESTRA_PUBLIC_URL not configured on this deployment. Run Kestra via infra/docker-compose.yml locally." },
      { status: 503 },
    );
  }

  const ping = await kestraPing();
  if (!ping.ok) {
    return NextResponse.json({ error: `Kestra unreachable: ${ping.error}` }, { status: 502 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { data: topics, error } = await supabase
    .from("custom_topics")
    .select("id,yaml_content")
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const t of topics ?? []) {
    const r = await uploadTopicYaml(t.id, t.yaml_content);
    results.push({ id: t.id, ok: r.ok, error: r.error });
  }

  const ok = results.filter((r) => r.ok).length;
  return NextResponse.json({
    synced: ok,
    failed: results.length - ok,
    results,
    kestraMs: ping.ms,
  });
}

export async function GET() {
  const ping = await kestraPing();
  return NextResponse.json({
    configured: kestraConfigured(),
    reachable: ping.ok,
    ms: ping.ms,
    error: ping.error,
    notifyBridge: Boolean(process.env.NOTIFY_SECRET),
    hint: kestraConfigured()
      ? "POST while signed in to sync custom_topics YAML to Kestra namespace files."
      : "Set KESTRA_PUBLIC_URL (+ KESTRA_API_TOKEN) on the demo server to enable sync.",
  });
}
