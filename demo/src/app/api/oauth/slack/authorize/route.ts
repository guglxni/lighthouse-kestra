import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { newOAuthState, oauthConfigured, oauthRedirectUri, resolveSiteOrigin } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = resolveSiteOrigin(req);
  if (!oauthConfigured("slack")) {
    return NextResponse.redirect(`${origin}/settings?oauth=slack_unconfigured`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?next=/settings`);

  const state = newOAuthState(user.id, "slack");
  const redirectUri = oauthRedirectUri("slack", req);
  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID!,
    scope: "channels:read,chat:write,incoming-webhook",
    redirect_uri: redirectUri,
    state,
  });

  return NextResponse.redirect(`https://slack.com/oauth/v2/authorize?${params}`);
}
