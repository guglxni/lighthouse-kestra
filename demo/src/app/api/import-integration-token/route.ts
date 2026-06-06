import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { maskSecret } from "@/lib/mask-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  provider?: "slack" | "notion";
  accessToken?: string;
  label?: string;
};

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { provider, accessToken, label } = body;
  const token = accessToken?.trim();
  if (!provider || !token) {
    return NextResponse.json({ error: "provider and accessToken are required." }, { status: 400 });
  }
  if (provider !== "slack" && provider !== "notion") {
    return NextResponse.json({ error: "provider must be slack or notion." }, { status: 400 });
  }
  if (token.length < 10 || token.length > 4096) {
    return NextResponse.json({ error: "accessToken length invalid." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    user_id: user.id,
    updated_at: now,
  };

  if (provider === "slack") {
    patch.slack_access_token = token;
    patch.oauth_slack_connected_at = now;
    if (label) patch.slack_team_name = label;
  } else {
    patch.notion_access_token = token;
    patch.oauth_notion_connected_at = now;
    if (label) patch.notion_workspace_name = label;
  }

  const { error } = await supabase.from("user_settings").upsert(patch, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    provider,
    masked: maskSecret(token),
    message: `${provider} token stored server-side (RLS). Full value never returned.`,
  });
}
