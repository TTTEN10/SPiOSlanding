#!/usr/bin/env bash
# Quick check FROM THE APP SERVER: can it reach vLLM?
# Usage:
#   chmod +x deployment/test-llm-route-from-app.sh
#   ./deployment/test-llm-route-from-app.sh
# Optional:
#   APP_IP=51.159.149.66 LLM_BASE=http://62.210.238.160:8000 ./deployment/test-llm-route-from-app.sh
set -euo pipefail

APP_IP="${APP_IP:-51.159.149.66}"
LLM_BASE="${LLM_BASE:-http://62.210.238.160:8000}"
LLM_HOST="${LLM_BASE#*://}"
LLM_HOST="${LLM_HOST%%[:/]*}"
SSH_KEY="${SSH_KEY:-}"
if [[ -n "${SSH_KEY}" ]]; then
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15 -i "${SSH_KEY}")
else
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15)
fi

echo "From ${APP_IP}: route to ${LLM_HOST}; GET ${LLM_BASE}/v1/models"
ssh "${SSH_OPTS[@]}" "root@${APP_IP}" "bash -lc 'set -e; ip route get ${LLM_HOST} 2>/dev/null || true; curl -sS -w \"\\nhttp_code:%{http_code}\\n\" --max-time 25 \"${LLM_BASE}/v1/models\"'"
