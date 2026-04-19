#!/usr/bin/env bash
# Simulate degraded LLM routing for manual checks (API gateway → Scaleway fallback, circuit breaker, health).
# Does not modify production infra — use against staging or local API only.
set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:3001}"
echo "Using API_BASE=$API_BASE"
echo ""
echo "1) Upstream health snapshot (set AI_UPSTREAM_STATUS_SECRET on the API if required):"
curl -sS "${API_BASE}/api/chat/upstream-status" | head -c 2000 || true
echo ""
echo ""
echo "2) Point AI_GPU_BASE_URL at a dead host, then call POST /api/chat/completions — expect fallback or error per config."
echo "   Example (local shell, API restarted with bad URL):"
echo "   export AI_GPU_BASE_URL=http://127.0.0.1:59999"
echo ""
echo "3) Chatbot direct health:"
echo "   curl -sS \${CHATBOT_BASE_URL:-http://127.0.0.1:8000}/health"
echo ""
echo "Done."
