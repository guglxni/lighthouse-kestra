import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { oauthRedirectUri, resolveSiteOrigin, verifyOAuthState } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const origin = resolveSiteOrigin(req);

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/settings?oauth=notion_error`);
  }

  const parsed = verifyOAuthState(state);
  if (!parsed || parsed.provider !== "notion") {
    return NextResponse.redirect(`${origin}/settings?oauth=notion_invalid_state`);
  }

  const redirectUri = oauthRedirectUri("notion", req);
  const creds = Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString("base64");

  const tokenRes = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    workspace_name?: string;
    error?: string;
  };

  if (!tokenJson.access_token) {
    return NextResponse.redirect(`${origin}/settings?oauth=notion_denied`);
  }

  const admin = createSupabaseAdminClient();
  await admin.from("user_settings").upsert(
    {
      user_id: parsed.userId,
      notion_access_token: tokenJson.access_token,
      notion_workspace_name: tokenJson.workspace_name ?? null,
      oauth_notion_connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  return NextResponse.redirect(`${origin}/settings?oauth=notion_connected`);
}
