#!/usr/bin/env bash
# Push all flows/*.yaml into a running Kestra OSS instance (POST /api/v1/flows).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KESTRA_URL="${KESTRA_PUBLIC_URL:-http://127.0.0.1:8090}"
KESTRA_URL="${KESTRA_URL%/}"

ok=0
fail=0
while IFS= read -r -d '' f; do
  rel="${f#"$ROOT/flows/"}"
  code=$(curl -s -o /tmp/kestra-flow-resp.json -w "%{http_code}" \
    -X POST "${KESTRA_URL}/api/v1/flows" \
    -H "Content-Type: application/x-yaml" \
    --data-binary @"$f")
  if [[ "$code" == "200" || "$code" == "201" ]]; then
    echo "✓ $rel"
    ok=$((ok + 1))
  else
    echo "✗ $rel (HTTP $code)"
    head -c 200 /tmp/kestra-flow-resp.json; echo
    fail=$((fail + 1))
  fi
done < <(find "$ROOT/flows" -name '*.yaml' ! -path '*/_namespace_files/*' -print0)

echo ""
echo "Synced $ok flows ($fail failed) → $KESTRA_URL"
