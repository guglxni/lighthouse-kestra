/** Mask secrets for agent-visible responses — never echo full tokens. */

export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (v.length <= 8) return "••••••••";
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}

export function maskWebhook(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url);
    const tail = u.pathname.length > 12 ? `${u.pathname.slice(0, 8)}…` : u.pathname;
    return `${u.host}${tail}`;
  } catch {
    return "configured";
  }
}
