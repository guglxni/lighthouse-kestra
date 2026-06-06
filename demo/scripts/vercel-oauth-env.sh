#!/usr/bin/env bash
# Push Slack + Notion OAuth credentials to Vercel (production + preview).
# Usage:
#   export SLACK_CLIENT_ID=...
#   export SLACK_CLIENT_SECRET=...
#   export NOTION_CLIENT_ID=...
#   export NOTION_CLIENT_SECRET=...
#   ./scripts/vercel-oauth-env.sh
#
# Or one-shot:
#   SLACK_CLIENT_ID=x SLACK_CLIENT_SECRET=y NOTION_CLIENT_ID=a NOTION_CLIENT_SECRET=b ./scripts/vercel-oauth-env.sh

set -euo pipefail
cd "$(dirname "$0")/.."

missing=()
[[ -z "${SLACK_CLIENT_ID:-}" ]] && missing+=("SLACK_CLIENT_ID")
[[ -z "${SLACK_CLIENT_SECRET:-}" ]] && missing+=("SLACK_CLIENT_SECRET")
[[ -z "${NOTION_CLIENT_ID:-}" ]] && missing+=("NOTION_CLIENT_ID")
[[ -z "${NOTION_CLIENT_SECRET:-}" ]] && missing+=("NOTION_CLIENT_SECRET")

if ((${#missing[@]} > 0)); then
  echo "Missing: ${missing[*]}"
  echo ""
  echo "Create apps first:"
  echo "  Slack:  https://api.slack.com/apps → OAuth & Permissions"
  echo "          Redirect: https://demo-beta-topaz.vercel.app/api/oauth/slack/callback"
  echo "  Notion: https://www.notion.so/my-integrations → public integration"
  echo "          Redirect: https://demo-beta-topaz.vercel.app/api/oauth/notion/callback"
  exit 1
fi

for env in production preview; do
  echo "→ Adding OAuth vars to ${env}…"
  npx vercel env add SLACK_CLIENT_ID "$env" --value "$SLACK_CLIENT_ID" --force --yes
  npx vercel env add SLACK_CLIENT_SECRET "$env" --value "$SLACK_CLIENT_SECRET" --force --yes
  npx vercel env add NOTION_CLIENT_ID "$env" --value "$NOTION_CLIENT_ID" --force --yes
  npx vercel env add NOTION_CLIENT_SECRET "$env" --value "$NOTION_CLIENT_SECRET" --force --yes
done

echo "→ Redeploying production…"
npx vercel --prod --yes
echo "Done. Test Connect Slack / Notion in Settings."
