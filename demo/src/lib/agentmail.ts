/** AgentMail send helper — https://docs.agentmail.to/llms.txt */

export type AgentMailSendInput = {
  apiKey: string;
  inboxId: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendAgentMail(input: AgentMailSendInput): Promise<{ ok: boolean; status: number; error?: string }> {
  const inboxId = input.inboxId.trim();
  const apiKey = input.apiKey.trim();
  if (!inboxId || !apiKey) {
    return { ok: false, status: 400, error: "AgentMail inbox ID and API key are required" };
  }

  const url = `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inboxId)}/messages/send`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, status: res.status, error: detail.slice(0, 300) || `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, status: 502, error: e instanceof Error ? e.message : String(e) };
  }
}
