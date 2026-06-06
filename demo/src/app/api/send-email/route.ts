import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendAgentMail } from "@/lib/agentmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  agentmail: { apiKey: string; inboxId: string };
};

export async function POST(req: NextRequest) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { to, subject, text, html, agentmail } = body ?? {};
  if (!to || !subject || !text || !agentmail?.apiKey || !agentmail?.inboxId) {
    return NextResponse.json({ error: "to, subject, text, and agentmail credentials required" }, { status: 400 });
  }

  const result = await sendAgentMail({
    apiKey: agentmail.apiKey,
    inboxId: agentmail.inboxId,
    to,
    subject,
    text,
    html,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Send failed", status: result.status }, { status: 502 });
  }

  // Persist inbox id (non-secret) for routing future briefs
  await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      agentmail_inbox_id: agentmail.inboxId,
      email_to: to,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return NextResponse.json({ ok: true });
}
