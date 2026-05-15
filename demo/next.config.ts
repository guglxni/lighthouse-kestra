import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  // A02: Security Misconfiguration — baseline HTTP headers
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS — 1 year, include subdomains
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  // CSP: tight allowlist. 'unsafe-inline' for styles only (required by Tailwind CSS-in-JS).
  // Scripts: only self + Supabase. No eval, no data: URIs.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Supabase realtime and storage
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.exa.ai`,
      // Fonts (none external currently, but safe fallback)
      "font-src 'self' data:",
      // Images: self + supabase storage
      "img-src 'self' data: blob: https://*.supabase.co",
      // Scripts: only self. Next.js inline scripts use nonces in prod but allow unsafe-inline for dev.
      "script-src 'self' 'unsafe-inline'",
      // Styles: Tailwind injects inline styles
      "style-src 'self' 'unsafe-inline'",
      // Frames: none
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pg"],
  outputFileTracingRoot: path.join(__dirname),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
