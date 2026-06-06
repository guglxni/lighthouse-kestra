import "server-only";

/** Kestra REST client — executions, health, namespace file sync. */

export type KestraExecution = {
  id: string;
  namespace?: string;
  flowId?: string;
  state?: { current: string };
  outputs?: Record<string, unknown>;
  taskRunList?: Array<{
    id: string;
    taskId: string;
    state?: { current: string };
    outputs?: Record<string, unknown>;
  }>;
};

function kestraBase(): string {
  return (process.env.KESTRA_PUBLIC_URL ?? "").replace(/\/$/, "");
}

function tenant(): string {
  return process.env.KESTRA_TENANT?.trim() || "main";
}

function authHeaders(): HeadersInit {
  const token = process.env.KESTRA_API_TOKEN?.trim();
  if (token) return { Authorization: `Bearer ${token}` };
  const user = process.env.KESTRA_BASIC_AUTH_USER?.trim();
  const password = process.env.KESTRA_BASIC_AUTH_PASSWORD?.trim();
  if (user && password) {
    const b64 = Buffer.from(`${user}:${password}`, "utf8").toString("base64");
    return { Authorization: `Basic ${b64}` };
  }
  return {};
}

export function kestraConfigured(): boolean {
  return Boolean(kestraBase());
}

export async function createExecution(
  namespace: string,
  flowId: string,
  inputs: Record<string, unknown>,
): Promise<{ id: string }> {
  const base = kestraBase();
  if (!base) throw new Error("KESTRA_PUBLIC_URL not set");
  const ns = encodeURIComponent(namespace);
  const flow = encodeURIComponent(flowId);
  const res = await fetch(`${base}/api/v1/${tenant()}/executions/${ns}/${flow}`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(inputs),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Kestra execution failed HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new Error("Kestra returned no execution id");
  return { id: json.id };
}

export async function getExecution(executionId: string): Promise<KestraExecution> {
  const base = kestraBase();
  if (!base) throw new Error("KESTRA_PUBLIC_URL not set");
  const res = await fetch(`${base}/api/v1/${tenant()}/executions/${encodeURIComponent(executionId)}`, {
    headers: authHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Kestra get execution HTTP ${res.status}: ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as KestraExecution;
}

const TERMINAL = new Set(["SUCCESS", "FAILED", "KILLED", "CANCELLED", "WARNING"]);

export async function waitForExecution(
  executionId: string,
  opts: { timeoutMs?: number; pollMs?: number } = {},
): Promise<KestraExecution> {
  const timeoutMs = opts.timeoutMs ?? 600_000;
  const pollMs = opts.pollMs ?? 2000;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ex = await getExecution(executionId);
    const state = ex.state?.current ?? "";
    if (TERMINAL.has(state)) {
      if (state === "FAILED" || state === "KILLED" || state === "CANCELLED") {
        throw new Error(`Kestra execution ${executionId} ended with ${state}`);
      }
      return ex;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
  throw new Error(`Kestra execution ${executionId} timed out after ${timeoutMs}ms`);
}

export async function kestraPing(): Promise<{ ok: boolean; ms: number; error?: string }> {
  const base = kestraBase();
  if (!base) return { ok: false, ms: 0, error: "KESTRA_PUBLIC_URL not set" };
  const start = Date.now();
  try {
    const res = await fetch(`${base}/api/v1/${tenant()}/flows/search?size=1`, {
      headers: authHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return { ok: res.ok, ms: Date.now() - start, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, ms: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Upload a topic profile YAML into Kestra namespace files (topics/). */
export async function uploadTopicYaml(topicId: string, yamlContent: string): Promise<{ ok: boolean; error?: string }> {
  const base = kestraBase();
  if (!base) return { ok: false, error: "KESTRA_PUBLIC_URL not set" };
  const ns = encodeURIComponent("company.team.lighthouse");
  const path = encodeURIComponent(`_files/topics/${topicId}.yaml`);
  try {
    const res = await fetch(`${base}/api/v1/${tenant}/namespaces/${ns}/files?path=${path}`, {
      method: "PUT",
      headers: { ...authHeaders(), "Content-Type": "application/x-yaml" },
      body: yamlContent,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${detail.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
