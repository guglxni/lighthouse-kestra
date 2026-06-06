import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { oauthRedirectUri, resolveSiteOrigin, verifyOAuthState } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const origin = resolveSiteOrigin(req);

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/settings?oauth=slack_error`);
  }

  const parsed = verifyOAuthState(state);
  if (!parsed || parsed.provider !== "slack") {
    return NextResponse.redirect(`${origin}/settings?oauth=slack_invalid_state`);
  }

  const redirectUri = oauthRedirectUri("slack", req);
  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenJson = (await tokenRes.json()) as {
    ok?: boolean;
    access_token?: string;
    team?: { name?: string };
    incoming_webhook?: { url?: string };
    error?: string;
  };

  if (!tokenJson.ok || !tokenJson.access_token) {
    return NextResponse.redirect(`${origin}/settings?oauth=slack_denied`);
  }

  const admin = createSupabaseAdminClient();
  await admin.from("user_settings").upsert(
    {
      user_id: parsed.userId,
      slack_access_token: tokenJson.access_token,
      slack_team_name: tokenJson.team?.name ?? null,
      slack_webhook: tokenJson.incoming_webhook?.url ?? null,
      oauth_slack_connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return NextResponse.redirect(`${origin}/settings?oauth=slack_connected`);
}
