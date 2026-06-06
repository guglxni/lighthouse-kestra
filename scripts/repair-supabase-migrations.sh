#!/usr/bin/env bash
# Fix migration history drift between remote Supabase and local files.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Remote versions missing locally? Repair then push:"
echo "  supabase migration repair --status reverted 20260515 20260606"
echo ""

supabase migration repair --status reverted 20260515 2>/dev/null || true
supabase migration repair --status reverted 20260606 2>/dev/null || true

echo "==> supabase db push"
supabase db push
