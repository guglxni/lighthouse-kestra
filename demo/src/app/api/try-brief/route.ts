import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// SSRF protection: block private/internal IP ranges and metadata endpoints.
// Users provide their own llmBaseUrl; we must not let it reach internal services.
const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,        // link-local / AWS metadata
  /^::1$/,              // IPv6 loopback
  /^fc00:/i,            // IPv6 private
  /^fe80:/i,            // IPv6 link-local
  /\.internal$/i,
  /\.local$/i,
];

function isSsrfSafeUrl(raw: string): { ok: true } | { ok: false; reason: string } {
  if (!/^https?:\/\//i.test(raw)) return { ok: false, reason: "Base URL must start with http(s)://" };
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "Invalid base URL" };
  }
  const { hostname } = parsed;
  for (const pat of BLOCKED_HOSTNAME_PATTERNS) {
    if (pat.test(hostname)) {
      return { ok: false, reason: "Base URL points to a private or reserved address" };
    }
  }
  return { ok: true };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  topicId: string;
  prompt: string;
  byok: {
    llmApiKey: string;
    llmBaseUrl: string;
    llmModelPrimary: string;
  };
};

function isString(v: unknown, max = 1000): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= max;
}

export async function POST(req: NextRequest) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { topicId, prompt, byok } = body ?? {};
  if (!isString(topicId, 64) || !isString(prompt, 4000)) {
    return NextResponse.json({ error: "Missing topicId or prompt" }, { status: 400 });
  }
  if (!byok || !isString(byok.llmApiKey, 200) || !isString(byok.llmBaseUrl, 500) || !isString(byok.llmModelPrimary, 200)) {
    return NextResponse.json(
      { error: "Add an LLM API key, base URL and model name in Settings first." },
      { status: 400 },
    );
  }
  const ssrf = isSsrfSafeUrl(byok.llmBaseUrl);
  if (!ssrf.ok) {
    return NextResponse.json({ error: ssrf.reason }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to run a sample brief." }, { status: 401 });
  }

  const system = [
    "You are Lighthouse, a research operating system.",
    "Write a concise daily research brief in Markdown for the topic the user provides.",
    "Sections: 1) Why today matters (2 lines). 2) Top 3 themes with one-line take. 3) Reading list (3-5 bullets).",
    "Tone: neutral, plain-language, no hype. No fabricated URLs. If you do not know a source, write 'source TBD'.",
    "Keep total length under 300 words.",
  ].join(" ");

  const url = `${byok.llmBaseUrl.replace(/\/$/, "")}/chat/completions`;
  const startedAt = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${byok.llmApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: byok.llmModelPrimary,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Topic: ${topicId}\nUser question: ${prompt}` },
        ],
        temperature: 0.3,
      }),
    });
  } catch (e) {
    // Don't echo the full internal URL back to avoid leaking network topology.
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Could not reach your LLM provider: ${msg}` }, { status: 502 });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Provider returned HTTP ${res.status}`, detail: text.slice(0, 400) },
      { status: 502 },
    );
  }

  type ChatResp = {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    model?: string;
  };
  const json = (await res.json()) as ChatResp;
  const output = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!output) {
    return NextResponse.json({ error: "Empty completion" }, { status: 502 });
  }

  // Persist (non-secret) brief output so the user has a history; key never written.
  await supabase
    .from("sample_briefs")
    .insert({
      user_id: user.id,
      topic_id: topicId,
      prompt,
      output_md: output,
      model: json.model ?? byok.llmModelPrimary,
    })
    .throwOnError();

  return NextResponse.json({
    output,
    model: json.model ?? byok.llmModelPrimary,
    elapsedMs: Date.now() - startedAt,
    usage: json.usage ?? null,
  });
}
