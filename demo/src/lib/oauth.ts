import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

/** Canonical public origin for OAuth redirect URIs and post-auth redirects. */
export function resolveSiteOrigin(req?: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (req) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
    if (host) return `${proto}://${host.split(",")[0]!.trim()}`;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3010";
}

/** @deprecated Use resolveSiteOrigin(req) when a request is available. */
export function siteOrigin(): string {
  return resolveSiteOrigin();
}

export function oauthConfigured(provider: "slack" | "notion"): boolean {
  if (provider === "slack") {
    return Boolean(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET);
  }
  return Boolean(process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET);
}

export function oauthRedirectUri(provider: "slack" | "notion", req?: NextRequest): string {
  return `${resolveSiteOrigin(req)}/api/oauth/${provider}/callback`;
}

export function newOAuthState(userId: string, provider: string): string {
  const nonce = randomBytes(16).toString("hex");
  const payload = `${provider}:${userId}:${nonce}`;
  const sig = createHash("sha256").update(`${payload}:${process.env.OAUTH_STATE_SECRET ?? "lighthouse-dev"}`).digest("hex").slice(0, 16);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyOAuthState(state: string): { userId: string; provider: string } | null {
  try {
    const raw = Buffer.from(state, "base64url").toString("utf8");
    const parts = raw.split(":");
    if (parts.length < 4) return null;
    const sig = parts.pop()!;
    const nonce = parts.pop()!;
    const userId = parts.pop()!;
    const provider = parts.join(":");
    const expected = createHash("sha256")
      .update(`${provider}:${userId}:${nonce}:${process.env.OAUTH_STATE_SECRET ?? "lighthouse-dev"}`)
      .digest("hex")
      .slice(0, 16);
    if (sig !== expected) return null;
    return { userId, provider };
  } catch {
    return null;
  }
}
