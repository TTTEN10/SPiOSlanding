#!/usr/bin/env bash
# Verify/diagnose production (Caddy + Python proxy + SPA on APP_DOMAIN).
# Usage: bash deployment/verify-production.sh
# Optional env:
#   APP_DOMAIN=safepsy.com
#   APP_IP=51.159.149.66
#   TIMEOUT=15
#   CHECK_LLM=1

set -euo pipefail

APP_DOMAIN="${APP_DOMAIN:-safepsy.com}"
# Default matches prod app instance when DNS for APP_DOMAIN points here; override if needed.
APP_IP="${APP_IP:-51.159.149.66}"
TIMEOUT="${TIMEOUT:-15}"
CHECK_LLM="${CHECK_LLM:-0}"

fail=0

pass() { echo "  PASS  $*"; }
failf() { echo "  FAIL  $*"; fail=$((fail+1)); }

check_http_code() {
  local name="$1"
  local url="$2"
  local expected="${3:-200}"
  local code
  code="$(curl -sS -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo 000)"
  if [[ "$code" == "$expected" ]]; then
    pass "$name ($url -> $code)"
  else
    failf "$name ($url -> $code, expected $expected)"
  fi
}

echo "Verifying production for domain: $APP_DOMAIN"
echo "Expected app IP: $APP_IP"
echo

dns_out="$(dig +short "$APP_DOMAIN" A 2>/dev/null || true)"
if echo "$dns_out" | grep -Eq "^${APP_IP}$"; then
  pass "DNS includes expected A record ($APP_IP)"
else
  failf "DNS does not include expected A record ($APP_IP). Got: ${dns_out:-<empty>}"
fi

if [[ "$(echo "$dns_out" | wc -l | tr -d ' ')" -gt 1 ]]; then
  echo "  WARN  Multiple A records detected. Ensure no stale/incorrect records remain."
fi

check_http_code "Homepage HTTPS" "https://${APP_DOMAIN}" "200"
check_http_code "Backend health via Caddy" "https://${APP_DOMAIN}/api/healthz" "200"
check_http_code "Direct app IP HTTP" "http://${APP_IP}" "200"
check_http_code "Direct app IP API health" "http://${APP_IP}/api/healthz" "200"

echo
if [[ "$fail" -eq 0 ]]; then
  echo "All production checks passed."
  exit 0
fi

echo "$fail check(s) failed."
echo "If needed, diagnose on app server:"
echo "  ssh root@${APP_IP} 'cd /home/safepsy/app && docker compose ps && docker logs --tail=80 app-caddy-1 && docker logs --tail=80 app-backend-1'"
exit 1
