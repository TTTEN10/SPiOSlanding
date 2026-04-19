#!/usr/bin/env bash
# Run ON the app instance (same host as docker-compose stack).
# Restarts the Caddy + frontend + backend stack (no image rebuild by default).
#
# Env:
#   APP_USER           default safepsy
#   APP_IP             post-deploy HTTP check (default 51.159.149.66 — matches Caddy plain HTTP site)
#   APP_BASE_DIR       default /home/${APP_USER}/app
#   MONITOR_ROOT       if set, logs go only to ${MONITOR_ROOT}/logs/deploy.log (avoids duplicate lines with cron redirect)
#   COMPOSE_UP_ARGS    optional extra args (e.g. --build)
#   RECOVER_HEALTH_RETRIES default 20 (~40s with 2s sleep)

set -euo pipefail

APP_USER="${APP_USER:-safepsy}"
APP_IP="${APP_IP:-51.159.149.66}"
APP_BASE_DIR="${APP_BASE_DIR:-/home/${APP_USER}/app}"
COMPOSE_FILE="${COMPOSE_FILE:-${APP_BASE_DIR}/docker-compose.yml}"
RECOVER_HEALTH_RETRIES="${RECOVER_HEALTH_RETRIES:-20}"

log() {
  local line="[$(date '+%Y-%m-%d %H:%M:%S %z')] $*"
  if [[ -n "${MONITOR_ROOT:-}" && -d "${MONITOR_ROOT}/logs" ]]; then
    printf '%s\n' "${line}" >>"${MONITOR_ROOT}/logs/deploy.log"
  else
    printf '%s\n' "${line}"
  fi
}

wait_health() {
  local i
  for ((i = 1; i <= RECOVER_HEALTH_RETRIES; i++)); do
    if curl -fsS --connect-timeout 5 --max-time 10 "http://${APP_IP}/api/healthz" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

log "ACTION: on-app-server-recover start dir=${APP_BASE_DIR}"

[[ -f "${COMPOSE_FILE}" ]] || {
  log "ERROR: missing ${COMPOSE_FILE}"
  exit 1
}

cd "${APP_BASE_DIR}"
# Avoid --build: full rebuild can fail (e.g. frontend TS) and prolong outage.
docker compose -f "${COMPOSE_FILE}" up -d ${COMPOSE_UP_ARGS:-}
docker compose -f "${COMPOSE_FILE}" ps

if ! wait_health; then
  log "ERROR: health check failed after compose up (http://${APP_IP}/api/healthz)"
  exit 1
fi

log "ACTION: on-app-server-recover success"
