#!/usr/bin/env bash
# Build a knowledge graph from Lighthouse docs + flow inventory into docs/graphify/output/.
# Requires graphifyy >= 0.7 (CLI subcommand: graphify extract) and an LLM key for markdown.
# See README.md → "Architecture graph (Graphify)".

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAGING="${ROOT}/docs/graphify/.staging"
OUT="${ROOT}/docs/graphify/output"
GRAPHIFY_BACKEND="${GRAPHIFY_BACKEND:-openai}"
UV_GRAPHIFY_VERSION="${UV_GRAPHIFY_VERSION:-graphifyy>=0.7.13}"

mkdir -p "${STAGING}" "${OUT}"

cp "${ROOT}/ARCHITECTURE.md" "${ROOT}/CONVENTIONS.md" "${ROOT}/README.md" "${STAGING}/"

{
  echo "# Lighthouse flow index (auto-generated)"
  echo
  echo "Relative paths under \`flows/\`:"
  echo
  find "${ROOT}/flows" -type f \( -name '*.yaml' -o -name '*.yml' -o -name '*.md' \) \
    | sed "s|^${ROOT}/||" | LC_ALL=C sort
} > "${STAGING}/FLOWS_INDEX.md"

graphify_supports_extract() {
  command -v graphify >/dev/null 2>&1 && graphify 2>&1 | grep -q 'extract <path>'
}

run_extract_in_staging() {
  (
    cd "${STAGING}"
    rm -rf graphify-out
    if [[ -n "${GRAPHIFY_BIN:-}" ]]; then
      "${GRAPHIFY_BIN}" extract . --backend "${GRAPHIFY_BACKEND}"
    elif graphify_supports_extract; then
      graphify extract . --backend "${GRAPHIFY_BACKEND}"
    elif command -v uvx >/dev/null 2>&1; then
      uvx --from "${UV_GRAPHIFY_VERSION}" graphify extract . --backend "${GRAPHIFY_BACKEND}"
    else
      echo "error: need graphify extract (graphifyy>=0.7) or uvx. Install one of:" >&2
      echo "  uv tool install graphifyy && graphify install" >&2
      echo "  pipx install graphifyy" >&2
      echo "  brew install uv  # for uvx fallback" >&2
      exit 1
    fi
  )
}

run_extract_in_staging

# graphify writes graphify-out/ beside the corpus (here: staging root).
if [[ ! -d "${STAGING}/graphify-out" ]]; then
  echo "error: graphify-out/ missing under ${STAGING} — did extract fail?" >&2
  exit 1
fi

rm -rf "${OUT:?}/"*
rsync -a "${STAGING}/graphify-out/" "${OUT}/"

# Convenience alias (Graphify ships graph.html; some docs call it report.html).
if [[ -f "${OUT}/graph.html" ]]; then
  cp -f "${OUT}/graph.html" "${OUT}/report.html"
fi

if [[ "${GRAPHIFY_CALLFLOW:-0}" == "1" ]]; then
  if command -v uvx >/dev/null 2>&1; then
    (cd "${STAGING}" && uvx --from "${UV_GRAPHIFY_VERSION}" graphify export callflow-html --output "${OUT}/callflow.html") || true
  elif command -v graphify >/dev/null 2>&1; then
    (cd "${STAGING}" && graphify export callflow-html --output "${OUT}/callflow.html") || true
  fi
fi

echo "ok: graphify outputs in ${OUT}/"
echo "    open ${OUT}/graph.html (or report.html) / read ${OUT}/GRAPH_REPORT.md / ${OUT}/graph.json"
