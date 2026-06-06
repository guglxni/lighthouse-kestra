import { NextResponse } from "next/server";
import { applySchedulesToYaml } from "@/lib/cron-presets";
import { cronsFromRunSchedule, DEFAULT_RUN_SCHEDULE, type RunSchedule } from "@/lib/schedule-simple";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("custom_topics")
    .select("id,name,description,schedule,yaml_content,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ topics: data ?? [] });
}

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { id?: string; runSchedule?: RunSchedule };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, runSchedule } = body ?? {};
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const crons = cronsFromRunSchedule(runSchedule ?? DEFAULT_RUN_SCHEDULE);

  const { data: row, error: fetchErr } = await supabase
    .from("custom_topics")
    .select("yaml_content")
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();
  if (fetchErr || !row) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  const yaml_content = applySchedulesToYaml(row.yaml_content, crons);
  const { error } = await supabase
    .from("custom_topics")
    .update({ schedule: crons[0], yaml_content, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id, schedule: crons[0], schedules: crons, yaml: yaml_content });
}

export async function DELETE(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase.from("custom_topics").delete().eq("user_id", user.id).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
