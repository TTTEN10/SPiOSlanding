#!/usr/bin/env bash
# Deploy the safepsy-landing stack (Express + Vite + Caddy) to production.
# Usage:
#   SSH_KEY=~/.ssh/safepsy-deploy-key ./deployment/quick-deploy-prod.sh
# Canonical remote tree: /opt/safepsy-landing (NOT /home/safepsy/app).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

APP_IP="${APP_IP:-51.159.160.246}"
REMOTE_ROOT="${REMOTE_ROOT:-/opt/safepsy-landing}"
STACK_DIR="${REMOTE_ROOT}/deployment/.landing-stack"
SSH_KEY="${SSH_KEY:-}"

if [[ -n "${SSH_KEY}" ]]; then
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new -i "${SSH_KEY}")
else
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new)
fi

log() { printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }

log "SSH → root@${APP_IP}"
ssh "${SSH_OPTS[@]}" "root@${APP_IP}" 'echo "SSH OK"' >/dev/null || die "SSH failed"

log "Sync repo → ${REMOTE_ROOT} (excluding heavy dirs)"
ssh "${SSH_OPTS[@]}" "root@${APP_IP}" "mkdir -p '${REMOTE_ROOT}'"
rsync -az --delete \
  --exclude '.git' \
  --exclude node_modules \
  --exclude '**/dist' \
  --exclude apps/web/dist \
  --exclude apps/api/dist \
  --exclude .turbo \
  "${REPO_ROOT}/" "root@${APP_IP}:${REMOTE_ROOT}/"

log "Stop stray legacy compose at /home/safepsy/app if present (frees confusion; ports stay with landing stack)"
ssh "${SSH_OPTS[@]}" "root@${APP_IP}" 'if [[ -f /home/safepsy/app/docker-compose.yml ]]; then cd /home/safepsy/app && docker compose down 2>/dev/null || true; fi'

log "Ensure FRONTEND_URL in ${STACK_DIR}/.env"
ssh "${SSH_OPTS[@]}" "root@${APP_IP}" bash -s << REMOTE
set -euo pipefail
ENV_FILE="${STACK_DIR}/.env"
if [[ ! -f "\$ENV_FILE" ]]; then echo "Missing \$ENV_FILE"; exit 1; fi
if ! grep -q '^FRONTEND_URL=' "\$ENV_FILE" 2>/dev/null; then
  echo 'FRONTEND_URL=https://safepsy.com,https://www.safepsy.com' >> "\$ENV_FILE"
fi
REMOTE

log "Docker compose build + up (db, app, caddy)"
ssh "${SSH_OPTS[@]}" "root@${APP_IP}" bash -s << REMOTE
set -euo pipefail
cd '${STACK_DIR}'
docker compose build app
docker compose up -d
docker compose ps
REMOTE

log "Wait for app behind Caddy (avoids 502 right after container recreate)"
ok=0
for _ in $(seq 1 45); do
  if curl -fsS --max-time 6 "https://safepsy.com/api/healthz" 2>/dev/null | grep -qx ok; then
    ok=1
    break
  fi
  sleep 2
done
[[ "${ok}" -eq 1 ]] || die "App did not become healthy in time (https://safepsy.com/api/healthz)"

log "Local HTTPS smoke checks"
curl -fsS --max-time 20 "https://safepsy.com/api/healthz" | grep -qx ok || die "/api/healthz body must be ok"
CSS_PATH="$(curl -fsS --max-time 15 "https://safepsy.com/" | sed -n 's/.*href="\(\/assets\/[^"]*\.css\)".*/\1/p' | head -1)"
if [[ -n "${CSS_PATH}" ]]; then
  curl -sS -o /dev/null -w "css:%{http_code} %{content_type}\n" -H "Origin: https://safepsy.com" "https://safepsy.com${CSS_PATH}"
fi

log "Run verify-production.sh locally"
APP_IP="${APP_IP}" bash "${SCRIPT_DIR}/verify-production.sh"
