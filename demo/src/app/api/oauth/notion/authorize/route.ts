import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { newOAuthState, oauthConfigured, oauthRedirectUri, resolveSiteOrigin } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = resolveSiteOrigin(req);
  if (!oauthConfigured("notion")) {
    return NextResponse.redirect(`${origin}/settings?oauth=notion_unconfigured`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?next=/settings`);

  const state = newOAuthState(user.id, "notion");
  const redirectUri = oauthRedirectUri("notion", req);
  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID!,
    response_type: "code",
    owner: "user",
    redirect_uri: redirectUri,
    state,
  });

  return NextResponse.redirect(`https://api.notion.com/v1/oauth/authorize?${params}`);
}
