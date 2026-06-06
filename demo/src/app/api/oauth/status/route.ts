import { NextResponse, type NextRequest } from "next/server";
import { oauthConfigured, oauthRedirectUri, resolveSiteOrigin } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = resolveSiteOrigin(req);
  return NextResponse.json({
    siteUrl: origin,
    slack: { configured: oauthConfigured("slack"), redirectUri: oauthRedirectUri("slack", req) },
    notion: { configured: oauthConfigured("notion"), redirectUri: oauthRedirectUri("notion", req) },
  });
}
