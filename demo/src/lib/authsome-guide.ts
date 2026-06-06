/** Authsome CLI guidance for agents — tokens are write-only into Lighthouse, never echoed back. */

export type AuthsomeProvider = "slack" | "notion" | "openai" | "exa" | "agentmail";

const GUIDES: Record<AuthsomeProvider, { title: string; steps: string[]; envVar: string; lighthouseTool: string }> = {
  slack: {
    title: "Slack via authsome",
    envVar: "SLACK_ACCESS_TOKEN",
    lighthouseTool: "lighthouse-import-authsome-token",
    steps: [
      "Register a Slack app at https://api.slack.com/apps — redirect URL http://127.0.0.1:7998/auth/callback/oauth",
      "Run: authsome login slack",
      "Verify: authsome get slack --field status",
      "Export once (user's machine): authsome get slack --field access_token",
      "Call lighthouse-import-authsome-token with provider=slack and accessToken — Lighthouse stores server-side; response is masked only.",
      "Alternative: lighthouse-start-oauth provider=slack for browser OAuth on the Lighthouse site.",
    ],
  },
  notion: {
    title: "Notion via authsome",
    envVar: "NOTION_ACCESS_TOKEN",
    lighthouseTool: "lighthouse-import-authsome-token",
    steps: [
      "Create a Notion integration at https://www.notion.so/my-integrations",
      "Run: authsome login notion",
      "Verify: authsome get notion --field status",
      "Export: authsome get notion --field access_token",
      "Call lighthouse-import-authsome-token with provider=notion and accessToken.",
      "Alternative: lighthouse-start-oauth provider=notion",
    ],
  },
  openai: {
    title: "OpenAI / compatible LLM (browser BYOK)",
    envVar: "OPENAI_API_KEY",
    lighthouseTool: "lighthouse-configure-llm",
    steps: [
      "Store API key locally with authsome or your secret manager on the user's machine.",
      "Run: eval \"$(authsome export openai --format env)\" (if openai provider registered in authsome)",
      "Or paste the key once into lighthouse-configure-llm — stored in browser localStorage only, never returned in tool output.",
      "Set baseUrl (default https://api.openai.com/v1) and modelPrimary (e.g. gpt-4o-mini).",
    ],
  },
  exa: {
    title: "Exa web search (optional)",
    envVar: "EXA_API_KEY",
    lighthouseTool: "lighthouse-configure-exa",
    steps: [
      "Get a key at https://exa.ai",
      "Call lighthouse-configure-exa with apiKey — browser localStorage only, masked in status.",
    ],
  },
  agentmail: {
    title: "AgentMail email delivery",
    envVar: "AGENTMAIL_API_KEY",
    lighthouseTool: "lighthouse-configure-agentmail",
    steps: [
      "Create inbox at https://agentmail.to — docs: https://docs.agentmail.to/llms.txt",
      "Call lighthouse-configure-agentmail with apiKey and inboxId (browser localStorage).",
      "Set emailTo via the same tool or lighthouse-configure-delivery.",
      "Test with lighthouse-send-test-email after configuration.",
    ],
  },
};

export function authsomeGuide(provider: AuthsomeProvider): string {
  const g = GUIDES[provider];
  return [
    `# ${g.title}`,
    `Env var (authsome): ${g.envVar}`,
    `Lighthouse tool: ${g.lighthouseTool}`,
    "",
    ...g.steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    "Security: Lighthouse never returns full secrets in WebMCP responses — only masked fingerprints.",
  ].join("\n");
}

export function authsomeGuideAll(): string {
  return (Object.keys(GUIDES) as AuthsomeProvider[]).map((p) => authsomeGuide(p)).join("\n\n---\n\n");
}
