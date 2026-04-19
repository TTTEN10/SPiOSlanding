#!/usr/bin/env bash
# Autonomous self-healing orchestrator for the app server only.
# Uses fail_count: first DOWN → record only; second consecutive DOWN → recovery.
# Recovery: ONLY ${MONITOR_ROOT}/on-app-server-recover.sh (docker compose up -d, no build).
#
# Layout (default MONITOR_ROOT=/opt/spapp-monitor):
#   state/last_status  state/fail_count  state/last_deploy_epoch
#   lock/deploy.lock   lock/disable-redeploy
#   logs/monitor.log
#
# Env:
#   MONITOR_ROOT         default /opt/spapp-monitor (or parent of this script if named monitor.sh)
#   APP_IP               default 51.159.149.66 (scw-happy-app)
#   RECOVER_SCRIPT       default ${MONITOR_ROOT}/on-app-server-recover.sh
#   DEPLOY_COOLDOWN_SEC  default 600

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITOR_ROOT="${MONITOR_ROOT:-${SCRIPT_DIR}}"
APP_IP="${APP_IP:-51.159.149.66}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://${APP_IP}/api/healthz}"
HEALTHCHECK_RETRIES="${HEALTHCHECK_RETRIES:-3}"
CURL_MAX_TIME="${CURL_MAX_TIME:-10}"
CURL_CONNECT_TIMEOUT="${CURL_CONNECT_TIMEOUT:-5}"

RECOVER_SCRIPT="${RECOVER_SCRIPT:-}"
if [[ -z "${RECOVER_SCRIPT}" ]]; then
  if [[ -f "${MONITOR_ROOT}/on-app-server-recover.sh" ]]; then
    RECOVER_SCRIPT="${MONITOR_ROOT}/on-app-server-recover.sh"
  elif [[ -f "${SCRIPT_DIR}/../on-app-server-recover.sh" ]]; then
    RECOVER_SCRIPT="$(cd "${SCRIPT_DIR}/.." && pwd)/on-app-server-recover.sh"
  else
    RECOVER_SCRIPT="${MONITOR_ROOT}/on-app-server-recover.sh"
  fi
fi
DEPLOY_COOLDOWN_SEC="${DEPLOY_COOLDOWN_SEC:-600}"

STATE_DIR="${MONITOR_ROOT}/state"
LOCK_DIR="${MONITOR_ROOT}/lock"
LOG_DIR="${MONITOR_ROOT}/logs"
LAST_STATUS_FILE="${STATE_DIR}/last_status"
FAIL_COUNT_FILE="${STATE_DIR}/fail_count"
LAST_DEPLOY_FILE="${STATE_DIR}/last_deploy_epoch"
DEPLOY_LOCK_FILE="${LOCK_DIR}/deploy.lock"
DISABLE_FILE="${LOCK_DIR}/disable-redeploy"

mkdir -p "${STATE_DIR}" "${LOCK_DIR}" "${LOG_DIR}"

ts() { date '+%Y-%m-%d %H:%M:%S %z'; }

log_mon() {
  printf '[%s] %s\n' "$(ts)" "$*" >>"${LOG_DIR}/monitor.log"
}

read_fail_count() {
  if [[ ! -f "${FAIL_COUNT_FILE}" ]]; then
    echo 0
    return
  fi
  tr -d '[:space:]' <"${FAIL_COUNT_FILE}"
}

read_last_deploy_epoch() {
  if [[ ! -f "${LAST_DEPLOY_FILE}" ]]; then
    echo 0
    return
  fi
  tr -d '[:space:]' <"${LAST_DEPLOY_FILE}"
}

write_fail_count() {
  umask 077
  printf '%s\n' "$1" >"${FAIL_COUNT_FILE}.new"
  mv -f "${FAIL_COUNT_FILE}.new" "${FAIL_COUNT_FILE}"
}

write_last_deploy_epoch() {
  umask 077
  printf '%s\n' "$1" >"${LAST_DEPLOY_FILE}.new"
  mv -f "${LAST_DEPLOY_FILE}.new" "${LAST_DEPLOY_FILE}"
}

healthcheck_run_once() {
  local cerr code curl_ec
  cerr="$(mktemp)"
  set +e
  code="$(curl -sS -o /dev/null -w '%{http_code}' \
    --connect-timeout "${CURL_CONNECT_TIMEOUT}" \
    --max-time "${CURL_MAX_TIME}" \
    "${HEALTHCHECK_URL}" 2>"${cerr}")"
  curl_ec=$?
  set -e
  rm -f "${cerr}"
  [[ ${curl_ec} -eq 0 && "${code}" == "200" ]]
}

run_healthcheck() {
  local attempt
  for ((attempt = 1; attempt <= HEALTHCHECK_RETRIES; attempt++)); do
    if healthcheck_run_once; then
      return 0
    fi
    if [[ "${attempt}" -lt "${HEALTHCHECK_RETRIES}" ]]; then
      sleep 2
    fi
  done
  return 1
}

main() {
  if [[ ! -f "${RECOVER_SCRIPT}" ]]; then
    log_mon "ERROR: RECOVER_SCRIPT missing: ${RECOVER_SCRIPT}"
    exit 1
  fi

  local fc now last_dep
  fc="$(read_fail_count)"

  if run_healthcheck; then
    write_fail_count 0
    printf 'UP\n' >"${LAST_STATUS_FILE}.new"
    mv -f "${LAST_STATUS_FILE}.new" "${LAST_STATUS_FILE}"
    log_mon "STATUS=UP"
    exit 0
  fi

  fc=$((fc + 1))
  write_fail_count "${fc}"
  printf 'DOWN\n' >"${LAST_STATUS_FILE}.new"
  mv -f "${LAST_STATUS_FILE}.new" "${LAST_STATUS_FILE}"

  log_mon "STATUS=DOWN"

  if [[ "${fc}" -eq 1 ]]; then
    log_mon "FIRST DOWN DETECTED"
    exit 0
  fi

  # fc >= 2: confirmed consecutive failure
  if [[ -f "${DISABLE_FILE}" ]]; then
    log_mon "RECOVERY SKIPPED (disable-redeploy)"
    exit 0
  fi

  now="$(date +%s)"
  last_dep="$(read_last_deploy_epoch)"
  if [[ "${last_dep}" -gt 0 && $((now - last_dep)) -lt "${DEPLOY_COOLDOWN_SEC}" ]]; then
    log_mon "COOLDOWN — SKIP recovery ($((now - last_dep))s since last deploy, min ${DEPLOY_COOLDOWN_SEC}s)"
    exit 0
  fi

  exec 9>"${DEPLOY_LOCK_FILE}"
  if ! flock -n 9; then
    log_mon "LOCK ACTIVE — SKIP (another recovery in progress)"
    exit 0
  fi

  log_mon "DEPLOY TRIGGERED"

  set +e
  MONITOR_ROOT="${MONITOR_ROOT}" APP_IP="${APP_IP}" bash "${RECOVER_SCRIPT}" >>"${LOG_DIR}/recover.log" 2>&1
  local rc=$?
  set -e

  write_last_deploy_epoch "$(date +%s)"

  if [[ "${rc}" -eq 0 ]]; then
    log_mon "RECOVERY SUCCESS"
    write_fail_count 0
    printf 'UP\n' >"${LAST_STATUS_FILE}.new"
    mv -f "${LAST_STATUS_FILE}.new" "${LAST_STATUS_FILE}"
  else
    log_mon "RECOVERY FAILED"
  fi

  exit 0
}

main "$@"
