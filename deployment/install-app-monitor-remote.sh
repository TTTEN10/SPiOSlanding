#!/usr/bin/env bash
# Push app-server self-healing monitor to production (no full repo on the host).
# Installs under /opt/spapp-monitor: monitor.sh (includes healthcheck), on-app-server-recover.sh
#
# Env:
#   APP_IP                default 51.159.149.66 (see deployment/deploy-app.sh)
#   APP_USER              default safepsy (informational for cron env)
#   MONITOR_REMOTE_ROOT   default /opt/spapp-monitor
#   SSH_KEY               optional -i path for ssh/scp
#
# Usage:
#   bash deployment/install-app-monitor-remote.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

APP_IP="${APP_IP:-51.159.149.66}"
APP_USER="${APP_USER:-safepsy}"
MONITOR_REMOTE_ROOT="${MONITOR_REMOTE_ROOT:-/opt/spapp-monitor}"

SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15)
SCP_OPTS=(-o BatchMode=yes -o ConnectTimeout=15)
if [[ -n "${SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-i "${SSH_KEY}")
  SCP_OPTS+=(-i "${SSH_KEY}")
fi

printf 'Installing app-server monitor on root@%s -> %s\n' "${APP_IP}" "${MONITOR_REMOTE_ROOT}"

ssh "${SSH_OPTS[@]}" "root@${APP_IP}" "mkdir -p '${MONITOR_REMOTE_ROOT}/logs' '${MONITOR_REMOTE_ROOT}/state' '${MONITOR_REMOTE_ROOT}/lock'"

scp "${SCP_OPTS[@]}" \
  "${REPO_ROOT}/deployment/app-server-monitor/monitor.sh" \
  "root@${APP_IP}:${MONITOR_REMOTE_ROOT}/"

scp "${SCP_OPTS[@]}" \
  "${REPO_ROOT}/deployment/on-app-server-recover.sh" \
  "root@${APP_IP}:${MONITOR_REMOTE_ROOT}/on-app-server-recover.sh"

ssh "${SSH_OPTS[@]}" "root@${APP_IP}" \
  "chmod +x '${MONITOR_REMOTE_ROOT}/monitor.sh' '${MONITOR_REMOTE_ROOT}/on-app-server-recover.sh'"

ssh "${SSH_OPTS[@]}" "root@${APP_IP}" \
  "MONITOR_REMOTE_ROOT='${MONITOR_REMOTE_ROOT}' APP_USER='${APP_USER}' APP_SERVER_IP='${APP_IP}' bash -s" <<'REMOTE'
set -euo pipefail
MARK="# spapp-self-heal"
CRON_LINE="*/30 * * * * MONITOR_ROOT=${MONITOR_REMOTE_ROOT} APP_IP=${APP_SERVER_IP} APP_USER=${APP_USER} ${MONITOR_REMOTE_ROOT}/monitor.sh >>${MONITOR_REMOTE_ROOT}/logs/cron.log 2>&1 ${MARK}"
TMP="$(mktemp)"
( crontab -l 2>/dev/null | grep -v "spapp-self-heal" || true ) >"${TMP}"
printf '%s\n' "${CRON_LINE}" >>"${TMP}"
crontab "${TMP}"
rm -f "${TMP}"
echo "--- crontab (self-heal) ---"
crontab -l | grep -F "spapp-self-heal" || true
REMOTE

printf '\nSmoke: healthcheck on server\n'
ssh "${SSH_OPTS[@]}" "root@${APP_IP}" \
  "MONITOR_ROOT='${MONITOR_REMOTE_ROOT}' APP_IP='${APP_IP}' '${MONITOR_REMOTE_ROOT}/monitor.sh' && echo monitor_ok"

printf '\nDone. Cron: monitor.sh -> logs/cron.log; events: %s/logs/monitor.log\n' "${MONITOR_REMOTE_ROOT}"
