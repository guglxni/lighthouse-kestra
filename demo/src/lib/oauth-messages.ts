export const OAUTH_FLASH: Record<string, { kind: "success" | "error"; message: string }> = {
  slack_connected: { kind: "success", message: "Slack connected. Save settings if you added a webhook manually." },
  notion_connected: { kind: "success", message: "Notion connected. Paste your Notion page ID below so briefs can append there." },
  slack_unconfigured: {
    kind: "error",
    message:
      "Slack OAuth is not configured on this deployment. Add SLACK_CLIENT_ID + SLACK_CLIENT_SECRET to Vercel (or use authsome CLI → lighthouse-import-authsome-token).",
  },
  notion_unconfigured: {
    kind: "error",
    message:
      "Notion OAuth is not configured on this deployment. Add NOTION_CLIENT_ID + NOTION_CLIENT_SECRET to Vercel (or use authsome CLI import).",
  },
  slack_error: { kind: "error", message: "Slack OAuth failed — missing code or state." },
  slack_invalid_state: { kind: "error", message: "Slack OAuth state invalid. Try connecting again." },
  slack_denied: { kind: "error", message: "Slack denied access or token exchange failed." },
  notion_error: { kind: "error", message: "Notion OAuth failed — missing code or state." },
  notion_invalid_state: { kind: "error", message: "Notion OAuth state invalid. Try connecting again." },
  notion_denied: { kind: "error", message: "Notion denied access or token exchange failed." },
};
