#!/usr/bin/env bash
# End-to-end deploy: pre-flight → Terraform (prod) → chatbot (dedicated or colocated) → deploy-app.sh
#
# Usage:
#   ./deployment/deploy.sh
#   ./deployment/deploy.sh --diagnose     # pre-flight + SSH + inter-VM probes only (no terraform apply / no image deploy)
#   DEPLOY_LEGACY=1 ./deployment/deploy.sh  # app stack only (see deploy-app.sh)
#
# Optional env: SKIP_PREFLIGHT_GIT=1  SKIP_DNS_VALIDATION=1  REFRESH_IPS_FROM_TF=0  FORCE_COLOCATE_ON_ROUTING_FAIL=1
#               PREFLIGHT_SSH=1  SKIP_POST_DEPLOY_VERIFY=1  CHECK_LLM=1 (post-deploy)
#               DEPLOY_RETRY_MAX=3  DEPLOY_RETRY_DELAY_SEC=2  SSH_CONNECT_TIMEOUT=12  SSH_KEY=...
#
# Success gates (all must pass unless skipped by env): preflight → Terraform → app SSH →
#   code sync + compose → /health → app→chatbot (or colocate) → deploy-app.sh → post-deploy HTTPS checks.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
export REPO_ROOT
TF_DIR="${REPO_ROOT}/infra/terraform/envs/prod"
DEPLOY_LOG_DIR="${REPO_ROOT}/deployment/deployment-logs"
DEPLOY_JSONL="${DEPLOY_LOG_DIR}/deploy.jsonl"
DEBUG_NDJSON="${DEPLOY_LOG_DIR}/debug-fcc1a0.log"

APP_DOMAIN="${APP_DOMAIN:-safepsy.com}"
CADDY_SITE_NAMES="${CADDY_SITE_NAMES:-safepsy.com, www.safepsy.com}"
CHATBOT_HOST="${CHATBOT_HOST:-62.210.238.160}"
APP_HOST="${APP_HOST:-51.159.149.66}"
REMOTE_BASE="${REMOTE_BASE:-/opt/safepsy}"
SSH_KEY="${SSH_KEY:-}"
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-12}"
# When 1, deploy must NOT fail if chatbot is down; landing page must still go live.
ALLOW_DEGRADED_CHATBOT="${ALLOW_DEGRADED_CHATBOT:-0}"
OUTBOUND_IP=""
DEPLOY_DIAGNOSE=0
for _arg in "$@"; do
  [[ "${_arg}" == "--diagnose" ]] && DEPLOY_DIAGNOSE=1
done

# Single-instance mode: only deploy the landing page stack on the app host.
# This bypasses Terraform and chatbot deployment, and delegates to deploy-app.sh.
if [[ "${SINGLE_INSTANCE_ONLY:-1}" == "1" ]]; then
  printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "SINGLE_INSTANCE_ONLY=1 — running single-host landing page deploy on APP_HOST=${APP_HOST}"
  export APP_IP="${APP_HOST}"
  export SINGLE_HOST=1
  export SKIP_VLLM_DEPLOY=1
  export ALLOW_DEGRADED_CHATBOT="${ALLOW_DEGRADED_CHATBOT:-1}"
  export POST_DEPLOY_LANDING_ONLY="${POST_DEPLOY_LANDING_ONLY:-1}"
  exec "${SCRIPT_DIR}/deploy-app.sh" "$@"
fi

if [[ "${DEPLOY_LEGACY:-0}" == "1" ]]; then
  exec "${SCRIPT_DIR}/deploy-app.sh" "$@"
fi

if [[ -n "${SSH_KEY}" ]]; then
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -o StrictHostKeyChecking=accept-new -i "${SSH_KEY}")
else
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -o StrictHostKeyChecking=accept-new)
fi

log() { printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
warn() { printf "\n[WARN] %s\n" "$*" >&2; }
die() { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }

# JSONL line: event + optional JSON object string (merged into .data)
log_event() {
  local event="$1"
  local meta="${2:-{}}"
  deploy_log_struct "${event}" "${meta}"
}

run_ssh() {
  local host="$1"
  shift
  ssh "${SSH_OPTS[@]}" "root@${host}" "$@"
}

# --- structured deploy log (deployment/deployment-logs only) ---
_deploy_log_struct() {
  local event="$1"
  local data_json="${2:-{}}"
  mkdir -p "${DEPLOY_LOG_DIR}" 2>/dev/null || true
  python3 <<PY || true
import json, os, time, pathlib
event = os.environ["DLE_EVENT"]
try:
    data = json.loads(os.environ.get("DLE_DATA") or "{}")
except json.JSONDecodeError:
    data = {"parse_error": True}
entry = {
    "ts": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    "event": event,
    "data": data,
}
path = pathlib.Path(os.environ["DLE_PATH"])
path.parent.mkdir(parents=True, exist_ok=True)
with path.open("a") as f:
    f.write(json.dumps(entry) + "\n")
PY
}
deploy_log_struct() {
  export DLE_EVENT="$1"
  export DLE_DATA="${2:-{}}"
  export DLE_PATH="${DEPLOY_JSONL}"
  _deploy_log_struct "$@"
  unset DLE_EVENT DLE_DATA DLE_PATH
}

# #region agent log (NDJSON diagnostics; same directory as deploy.jsonl)
agent_dbg_log() {
  export AGENT_HYP="$1"
  export AGENT_MSG="$2"
  export AGENT_JSON_PAYLOAD="${3:-{}}"
  python3 <<'PY' || true
import json, os, sys, time, pathlib
try:
    data = json.loads(os.environ.get("AGENT_JSON_PAYLOAD") or "{}")
except json.JSONDecodeError:
    data = {"json_parse_error": True}
entry = {
    "sessionId": "fcc1a0",
    "timestamp": int(time.time() * 1000),
    "hypothesisId": os.environ.get("AGENT_HYP", ""),
    "location": "deployment/deploy.sh",
    "message": os.environ.get("AGENT_MSG", ""),
    "data": data,
    "runId": os.environ.get("AGENT_RUN_ID", "pre-fix"),
}
path = pathlib.Path(os.environ["REPO_ROOT"]) / "deployment" / "deployment-logs" / "debug-fcc1a0.log"
path.parent.mkdir(parents=True, exist_ok=True)
with path.open("a") as f:
    f.write(json.dumps(entry) + "\n")
PY
  unset AGENT_HYP AGENT_MSG AGENT_JSON_PAYLOAD
}
# #endregion

retry() {
  local max="${DEPLOY_RETRY_MAX:-3}"
  local delay="${DEPLOY_RETRY_DELAY_SEC:-2}"
  local i
  for ((i = 1; i <= max; i++)); do
    if "$@"; then
      return 0
    fi
    [[ "${i}" -lt "${max}" ]] && sleep "${delay}"
  done
  return 1
}

detect_outbound_ipv4() {
  OUTBOUND_IP="$( (curl -4 -fsS --max-time 5 https://ifconfig.me/ip 2>/dev/null || curl -4 -fsS --max-time 5 https://api.ipify.org 2>/dev/null || echo "") | tr -d '\n\r' )"
  log "[PRE-FLIGHT] OUTBOUND_IP=${OUTBOUND_IP:-unknown} (use /32 on Scaleway SG for TCP 22)"
  log_event "outbound_ip" "{\"ipv4\":\"${OUTBOUND_IP}\"}"
  agent_dbg_log H6 "client_outbound_ipv4_hint" "{\"ifconfig_or_ipify\":\"${OUTBOUND_IP}\"}"
}

check_git_sync() {
  if [[ "${SKIP_PREFLIGHT_GIT:-0}" == "1" ]]; then
    log "[PRE-FLIGHT] SKIP_PREFLIGHT_GIT=1 — skipping origin/main sync check"
    log_event "preflight_git_skipped" "{}"
    return 0
  fi
  if [[ ! -d "${REPO_ROOT}/.git" ]]; then
    log "[PRE-FLIGHT] Not a git checkout — skipping origin/main sync check"
    return 0
  fi
  cd "${REPO_ROOT}"
  local local_h remote_h
  local_h="$(git rev-parse HEAD)"
  remote_h="$(git ls-remote origin refs/heads/main 2>/dev/null | awk '{print $1}' | head -1)"
  [[ -n "${remote_h}" ]] || die "[PRE-FLIGHT] git ls-remote origin main failed (network?). Fix network or set SKIP_PREFLIGHT_GIT=1"
  if [[ "${local_h}" != "${remote_h}" ]]; then
    die "[PRE-FLIGHT] Local HEAD != origin/main (local=${local_h:0:12}… remote=${remote_h:0:12}…). Run: git pull origin main && git push if needed"
  fi
  log "[PRE-FLIGHT] Git OK — HEAD matches origin/main (${local_h:0:12}…)"
  log_event "preflight_git_ok" "{\"head\":\"${local_h:0:12}\"}"
}

check_tf_sanity() {
  if ! command -v terraform >/dev/null 2>&1; then
    die "[PRE-FLIGHT] terraform not found in PATH"
  fi
  (
    cd "${TF_DIR}"
    terraform init -backend=false >/dev/null
    terraform validate
  ) || die "[PRE-FLIGHT] terraform validate failed in ${TF_DIR}"
  log "[PRE-FLIGHT] terraform validate OK (${TF_DIR})"
  log_event "preflight_terraform_validate_ok" "{\"dir\":\"${TF_DIR}\"}"
}

validate_credentials() {
  local tfvars="${TF_DIR}/terraform.tfvars"
  if [[ -f "${tfvars}" ]]; then
    if [[ -n "${TF_VAR_access_key:-}" || -n "${TF_VAR_scaleway_access_key:-}" ]]; then
      die "[PRE-FLIGHT] Conflicting Terraform credential sources: ${tfvars} exists AND TF_VAR_*access_key is set. Use only terraform.tfvars OR only TF_VAR_*, not both."
    fi
    if [[ -n "${TF_VAR_secret_key:-}" || -n "${TF_VAR_scaleway_secret_key:-}" ]]; then
      die "[PRE-FLIGHT] Conflicting Terraform credential sources: ${tfvars} exists AND TF_VAR_*secret_key is set."
    fi
    if [[ -n "${TF_VAR_project_id:-}" || -n "${TF_VAR_scaleway_project_id:-}" ]]; then
      die "[PRE-FLIGHT] Conflicting Terraform credential sources: ${tfvars} exists AND TF_VAR_*project_id is set."
    fi
  fi
  if [[ -n "${SCW_ACCESS_KEY:-}" ]] && [[ -f "${HOME}/.config/scw/config.yaml" ]]; then
    warn "[PRE-FLIGHT] SCW_ACCESS_KEY is set and ~/.config/scw/config.yaml exists — Terraform may warn about multiple credential sources (see deployment/deploy-issue.md §7)."
    log_event "preflight_scw_warning" "{\"note\":\"multiple_scw_sources_possible\"}"
  fi
}

# Apex / www must not expose the chatbot IP on the public site name.
# IMPORTANT: query authoritative NS (e.g. Scaleway ns0.dom.scw.cloud), not the resolver default —
# recursive caches often still return a *stale* second A (old chatbot) after the zone was fixed.
validate_dns_mode() {
  [[ "${SKIP_DNS_VALIDATION:-0}" == "1" ]] && return 0
  if ! command -v dig >/dev/null 2>&1; then
    die "[PRE-FLIGHT] dig(1) not found; install bind-tools / dnsutils for DNS validation."
  fi
  local ns_list ns name combined ipv4
  ns_list="$(dig +short "${APP_DOMAIN}" NS 2>/dev/null | tr -d '\r' | sed 's/\.$//' | grep -E '^[a-zA-Z0-9.-]+\.[a-zA-Z]' || true)"
  if [[ -z "${ns_list}" ]]; then
    die "[PRE-FLIGHT] DNS: could not read NS records for ${APP_DOMAIN}. Fix delegation or tooling."
  fi
  for name in "${APP_DOMAIN}" "www.${APP_DOMAIN}"; do
    [[ "${name}" == www.* ]] && ! [[ "${CADDY_SITE_NAMES}" == *"www."* ]] && continue
    combined=""
    while IFS= read -r ns; do
      [[ -z "${ns}" ]] && continue
      combined+="$(dig +short "${name}" A @"${ns}" 2>/dev/null | tr -d '\r')"$'\n'
    done <<< "${ns_list}"
    # Keep dotted-quad lines only (drops stray CNAME text if present)
    ipv4="$(printf '%s\n' "${combined}" | grep -E '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' | sort -u)"
    [[ -z "${ipv4}" ]] && continue
    if printf '%s\n' "${ipv4}" | grep -qxF "${CHATBOT_HOST}"; then
      die "[PRE-FLIGHT] DNS misconfigured (authoritative zone): name ${name} resolves to chatbot IP ${CHATBOT_HOST}. Apex/www must point only at the app (Caddy) host, not the LLM VM."
    fi
  done
  log "[PRE-FLIGHT] DNS OK (authoritative NS for ${APP_DOMAIN}: no A record → chatbot ${CHATBOT_HOST})"
  log_event "preflight_dns_ok" "{\"APP_DOMAIN\":\"${APP_DOMAIN}\",\"CHATBOT_HOST\":\"${CHATBOT_HOST}\"}"
}

run_preflight() {
  log "PRE-FLIGHT START (before Terraform)"
  log_event "preflight_start" "{}"
  cd "${REPO_ROOT}"
  check_git_sync
  detect_outbound_ipv4
  validate_credentials
  export TF_VAR_scaleway_access_key="${TF_VAR_scaleway_access_key:-${TF_VAR_access_key:-}}"
  export TF_VAR_scaleway_secret_key="${TF_VAR_scaleway_secret_key:-${TF_VAR_secret_key:-}}"
  export TF_VAR_scaleway_project_id="${TF_VAR_scaleway_project_id:-${TF_VAR_project_id:-}}"
  local _tfvars="${TF_DIR}/terraform.tfvars"
  if [[ -z "${TF_VAR_scaleway_access_key:-}" || -z "${TF_VAR_scaleway_secret_key:-}" || -z "${TF_VAR_scaleway_project_id:-}" ]]; then
    if [[ -f "${_tfvars}" ]]; then
      log "[PRE-FLIGHT] Using Scaleway credentials from ${_tfvars} (TF_VAR_* not all set)."
    else
      die "[PRE-FLIGHT] Missing Scaleway credentials: set TF_VAR_scaleway_* or create ${_tfvars}"
    fi
  fi
  check_tf_sanity
  validate_dns_mode
  if [[ "${PREFLIGHT_SSH:-0}" == "1" ]]; then
    log "[PRE-FLIGHT] PREFLIGHT_SSH=1 — probing SSH to app (${APP_HOST}) before Terraform"
    ssh_probe "app" "${APP_HOST}" || die "[PRE-FLIGHT] App SSH failed. Outbound: ${OUTBOUND_IP:-unknown}"
  fi
  log_event "preflight_done" "{}"
  log "PRE-FLIGHT OK"
}

ssh_failure_banner() {
  local role="$1" host="$2"
  printf '\n[SSH FAILURE]\n' >&2
  printf '  Target: %s (%s)\n' "${role}" "${host}" >&2
  printf '  Cause:   TCP 22 blocked, security group mismatch, or instance down\n' >&2
  printf '  Action:  In Scaleway, allow inbound TCP/22 from your public IPv4 /32\n' >&2
  printf '  Hint:    OUTBOUND_IP=%s\n' "${OUTBOUND_IP:-unknown}" >&2
  printf '  (If you saw tar|ssh Write error, the SSH leg failed — same fix.)\n\n' >&2
}

# One SSH attempt (echo ok). Use retry() wrapper for gates.
_ssh_probe_once() {
  local host="$1"
  ssh "${SSH_OPTS[@]}" "root@${host}" "echo ok" >/dev/null 2>&1
}

ssh_probe() {
  local name="$1"
  local host="$2"
  log "[SSH CHECK] → ${name} (${host})"
  log_event "ssh_probe_start" "{\"role\":\"${name}\",\"host\":\"${host}\"}"
  if retry _ssh_probe_once "${host}"; then
    agent_dbg_log "SSH" "ssh_ok" "{\"role\":\"${name}\",\"host\":\"${host}\"}"
    log_event "ssh_probe_ok" "{\"role\":\"${name}\",\"host\":\"${host}\"}"
    return 0
  fi
  ssh_failure_banner "${name}" "${host}"
  agent_dbg_log "SSH" "ssh_fail" "{\"role\":\"${name}\",\"host\":\"${host}\"}"
  log_event "ssh_probe_fail" "{\"role\":\"${name}\",\"host\":\"${host}\"}"
  return 1
}

# From app VM: HTTP reachability to chatbot :8000 (split-host path)
check_app_to_chatbot() {
  local chatbot_ip="$1"
  log "[CHECK] App → chatbot (${APP_HOST} → http://${chatbot_ip}:8000/health)"
  log_event "intervm_probe_start" "{\"from\":\"app\",\"to\":\"${chatbot_ip}\"}"
  if retry ssh "${SSH_OPTS[@]}" "root@${APP_HOST}" "curl -fsS --connect-timeout 5 --max-time 8 http://${chatbot_ip}:8000/health" >/dev/null 2>&1; then
    log_event "intervm_ok" "{\"from\":\"app\",\"to\":\"${chatbot_ip}\",\"port\":8000}"
    return 0
  fi
  printf '\n[ROUTING FAILURE]\n  App %s cannot GET http://%s:8000/health\n  Action: allow TCP/8000 on chatbot SG from app IP %s\n\n' "${APP_HOST}" "${chatbot_ip}" "${APP_HOST}" >&2
  log_event "intervm_fail" "{\"from\":\"app\",\"to\":\"${chatbot_ip}\",\"port\":8000}"
  return 1
}

refresh_hosts_from_terraform() {
  [[ "${REFRESH_IPS_FROM_TF:-1}" == "1" ]] || return 0
  local json
  json="$(cd "${TF_DIR}" && terraform output -json 2>/dev/null)" || return 0
  local new_app new_bot
  new_app="$(printf '%s' "${json}" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('app_public_ip',{}).get('value') or '')" 2>/dev/null || true)"
  new_bot="$(printf '%s' "${json}" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('chatbot_public_ip',{}).get('value') or '')" 2>/dev/null || true)"
  if [[ -n "${new_app}" ]]; then
    APP_HOST="${new_app}"
  fi
  if [[ -n "${new_bot}" ]]; then
    CHATBOT_HOST="${new_bot}"
  fi
  log_event "hosts_from_tf" "{\"APP_HOST\":\"${APP_HOST}\",\"CHATBOT_HOST\":\"${CHATBOT_HOST}\"}"
}

log_terraform_outputs_to_jsonl() {
  export TF_OUT="${DEPLOY_LOG_DIR}/tf-output.json"
  export DJSONL="${DEPLOY_JSONL}"
  [[ -f "${TF_OUT}" ]] || return 0
  python3 <<'PY' || true
import json, pathlib, os, time
p = pathlib.Path(os.environ["TF_OUT"])
if not p.is_file():
    raise SystemExit(0)
d = json.loads(p.read_text())
summary = {k: (d.get(k) or {}).get("value") for k in ("app_public_ip", "app_private_ip", "chatbot_public_ip", "chatbot_private_ip")}
entry = {"ts": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "event": "terraform_outputs", "data": summary}
logp = pathlib.Path(os.environ["DJSONL"])
logp.parent.mkdir(parents=True, exist_ok=True)
with logp.open("a") as f:
    f.write(json.dumps(entry) + "\n")
PY
  unset TF_OUT DJSONL
}

post_deploy_verify() {
  if [[ "${SKIP_POST_DEPLOY_VERIFY:-0}" == "1" ]]; then
    warn "SKIP_POST_DEPLOY_VERIFY=1 — skipping HTTPS API checks"
    log_event "post_deploy_verify_skipped" "{}"
    return 0
  fi
  log "POST-DEPLOY VERIFY (public HTTPS)"
  curl -fsS --max-time 25 "https://${APP_DOMAIN}/api/healthz" >/dev/null \
    || die "post-deploy: https://${APP_DOMAIN}/api/healthz failed"
  if [[ "${POST_DEPLOY_LANDING_ONLY:-0}" == "1" ]]; then
    log_event "post_deploy_verify_ok" "{\"APP_DOMAIN\":\"${APP_DOMAIN}\",\"mode\":\"landing\"}"
    log "POST-DEPLOY VERIFY OK (landing: healthz only)"
    return 0
  fi
  curl -fsS --max-time 25 "https://${APP_DOMAIN}/api/v1/models" >/dev/null \
    || die "post-deploy: https://${APP_DOMAIN}/api/v1/models failed"
  log_event "post_deploy_verify_ok" "{\"APP_DOMAIN\":\"${APP_DOMAIN}\"}"
  if [[ "${CHECK_LLM:-0}" == "1" ]]; then
    warn "CHECK_LLM=1 — run: CHECK_LLM=1 bash deployment/verify-production.sh (full chat probe)"
  fi
  log "POST-DEPLOY VERIFY OK"
}

sync_and_compose_chatbot_on() {
  local target_host="$1"
  log "Sync chatbot slice → ${target_host}:${REMOTE_BASE}"
  COPYFILE_DISABLE=1 tar -C "${REPO_ROOT}" -cf - apps/ai-chatbot deployment/chatbot | ssh "${SSH_OPTS[@]}" "root@${target_host}" "mkdir -p '${REMOTE_BASE}' && tar -C '${REMOTE_BASE}' -xf -" \
    || die "[ERROR] tar|ssh to ${target_host} failed — likely SSH unreachable or disk full. If you saw 'Write error', the SSH leg failed (check TCP/22). Outbound IP hint: ${OUTBOUND_IP:-unknown}"
  run_ssh "${target_host}" "bash -lc '
    set -euo pipefail
    mkdir -p /data
    cd \"${REMOTE_BASE}/deployment/chatbot\"
    docker compose pull || true
    docker compose up -d --build
    docker compose ps
  '"
}

wait_chatbot_http_ok_ssh() {
  local target="$1"
  local max_tries="${2:-36}"
  local delay="${3:-5}"
  local i ok=0
  for ((i = 1; i <= max_tries; i++)); do
    if ssh "${SSH_OPTS[@]}" "root@${target}" "curl -fsS --max-time 8 http://127.0.0.1:8000/health" >/dev/null 2>&1; then
      ok=1
      break
    fi
    sleep "${delay}"
  done
  [[ "${ok}" -eq 1 ]] || die "[ERROR] Colocated chatbot /health failed on ${target} (containers not healthy)"
  log_event "chatbot_loopback_ok" "{\"host\":\"${target}\"}"
}

# --- optional: model_loaded / model_ready in JSON (best-effort grep) ---
_health_json_has_model_true() {
  printf '%s' "$1" | grep -qE '"(model_loaded|model_ready)"[[:space:]]*:[[:space:]]*true'
}

wait_chatbot_model_ready_optional() {
  local base_url="$1"
  local max_tries="${2:-30}"
  local delay="${3:-5}"
  local i body
  for ((i = 1; i <= max_tries; i++)); do
    body="$(curl -fsS --max-time 8 "${base_url}" 2>/dev/null || true)"
    if _health_json_has_model_true "${body}"; then
      log "[INFO] Chatbot reports model ready (${base_url})"
      log_event "model_ready" "{\"url\":\"${base_url}\"}"
      return 0
    fi
    sleep "${delay}"
  done
  log "[WARN] model not reported ready yet — continuing (service may still be degraded)"
  log_event "model_ready_timeout_warn" "{\"url\":\"${base_url}\"}"
  return 0
}

wait_chatbot_model_ready_optional_ssh() {
  local target="$1"
  local max_tries="${2:-30}"
  local delay="${3:-5}"
  local i body
  for ((i = 1; i <= max_tries; i++)); do
    body="$(ssh "${SSH_OPTS[@]}" "root@${target}" "curl -fsS --max-time 8 http://127.0.0.1:8000/health" 2>/dev/null || true)"
    if _health_json_has_model_true "${body}"; then
      log "[INFO] Chatbot on ${target} reports model ready (loopback /health)"
      log_event "model_ready" "{\"host\":\"${target}\",\"via\":\"ssh_loopback\"}"
      return 0
    fi
    sleep "${delay}"
  done
  log "[WARN] model not reported ready on ${target} — continuing (degraded)"
  log_event "model_ready_timeout_warn" "{\"host\":\"${target}\",\"via\":\"ssh_loopback\"}"
  return 0
}

# ========== --diagnose (preflight + SSH + routing; no Terraform / no image deploy) ==========
if [[ "${DEPLOY_DIAGNOSE}" == "1" ]]; then
  log "[DIAGNOSE] Preflight + SSH + app→chatbot (no Terraform apply, no stack deploy)"
  run_preflight
  ssh_probe "app" "${APP_HOST}" || exit 1
  if ssh_probe "chatbot" "${CHATBOT_HOST}"; then
    check_app_to_chatbot "${CHATBOT_HOST}" || warn "[DIAGNOSE] app cannot reach chatbot :8000 (fix SG or use colocation)"
  else
    warn "[DIAGNOSE] chatbot SSH failed — production deploy would set colocated chatbot on app (requires app SSH above)"
  fi
  log "[DIAGNOSE] Done."
  exit 0
fi

# ========== PRE-FLIGHT (mandatory, before Terraform) ==========
run_preflight

# ========== Local docker (optional) ==========
log "STEP 1 — Build (optional local validation)"
if command -v docker >/dev/null 2>&1; then
  COPYFILE_DISABLE=1 docker build -t safepsy-chatbot:local "${REPO_ROOT}/apps/ai-chatbot" || log "Local docker build skipped or failed (non-fatal)"
else
  log "docker not installed locally; build will happen on remote host"
fi

# ========== Terraform apply ==========
log "STEP 2 — Terraform apply (${TF_DIR})"
(
  cd "${TF_DIR}"
  terraform init -backend=false
  terraform apply -auto-approve -input=false
) || die "terraform apply failed"

mkdir -p "${DEPLOY_LOG_DIR}" 2>/dev/null || true
(cd "${TF_DIR}" && terraform output -json > "${DEPLOY_LOG_DIR}/tf-output.json") 2>/dev/null || true
log_event "terraform_output_json" "{\"path\":\"${DEPLOY_LOG_DIR}/tf-output.json\"}"
log_terraform_outputs_to_jsonl

CHATBOT_PRIVATE_IP="$(cd "${TF_DIR}" && terraform output -raw chatbot_private_ip)"
[[ -n "${CHATBOT_PRIVATE_IP}" ]] || die "terraform output chatbot_private_ip empty"
APP_TF_PUBLIC_IP="$(cd "${TF_DIR}" && terraform output -raw app_public_ip 2>/dev/null || echo "")"
refresh_hosts_from_terraform
validate_dns_mode

_key_set="false"
[[ -n "${SSH_KEY}" ]] && _key_set="true"
_match_tf="false"
[[ -n "${APP_TF_PUBLIC_IP}" && "${APP_HOST}" == "${APP_TF_PUBLIC_IP}" ]] && _match_tf="true"
agent_dbg_log H5 "post_terraform_hosts" "{\"CHATBOT_HOST\":\"${CHATBOT_HOST}\",\"APP_HOST\":\"${APP_HOST}\",\"chatbot_private_ip\":\"${CHATBOT_PRIVATE_IP}\",\"app_public_ip_tf\":\"${APP_TF_PUBLIC_IP}\",\"app_host_matches_tf\":${_match_tf},\"SSH_CONNECT_TIMEOUT\":${SSH_CONNECT_TIMEOUT},\"ssh_key_path_set\":\"${_key_set}\"}"
log "Debug NDJSON: ${DEBUG_NDJSON}"
log_event "terraform_apply_done" "{\"CHATBOT_HOST\":\"${CHATBOT_HOST}\",\"APP_HOST\":\"${APP_HOST}\"}"

# App SSH is mandatory (hard stop before tar|ssh)
ssh_probe "app" "${APP_HOST}" || die "Cannot deploy: app host SSH failed."

COLOCATE_CHATBOT_ON_APP=0
_ts0="$(python3 -c 'import time; print(int(time.time()*1000))')"
if ssh_probe "chatbot" "${CHATBOT_HOST}"; then
  CHATBOT_SSH_RC=0
else
  CHATBOT_SSH_RC=1
fi
_ts1="$(python3 -c 'import time; print(int(time.time()*1000))')"
CHATBOT_SSH_MS=$((_ts1 - _ts0))
agent_dbg_log H1 "chatbot_ssh_probe" "{\"host\":\"${CHATBOT_HOST}\",\"exitCode\":${CHATBOT_SSH_RC},\"durationMs\":${CHATBOT_SSH_MS}}"

if [[ "${CHATBOT_SSH_RC}" -ne 0 ]]; then
  COLOCATE_CHATBOT_ON_APP=1
  warn "Chatbot SSH failed → SINGLE_HOST / colocated chatbot on app ${APP_HOST}"
  log_event "fallback_colocate_ssh" "{\"reason\":\"chatbot_ssh\",\"chatbotHost\":\"${CHATBOT_HOST}\"}"
  agent_dbg_log H2 "colocate_branch_selected" "{\"reason\":\"chatbot_ssh_nonzero\",\"chatbotSshExitCode\":${CHATBOT_SSH_RC}}"
  log "Hint — allow Scaleway inbound TCP/22 from: ${OUTBOUND_IP:-unknown}"
fi

if [[ "${COLOCATE_CHATBOT_ON_APP}" -eq 1 ]]; then
  if [[ "${ALLOW_DEGRADED_CHATBOT}" == "1" ]]; then
    warn "ALLOW_DEGRADED_CHATBOT=1 — skipping chatbot deployment/health on app host; continuing with app deploy."
    log_event "chatbot_skipped_degraded" "{\"mode\":\"colocate\",\"host\":\"${APP_HOST}\"}"
  else
    sync_and_compose_chatbot_on "${APP_HOST}"
    wait_chatbot_http_ok_ssh "${APP_HOST}" 36 5
    wait_chatbot_model_ready_optional_ssh "${APP_HOST}" 24 5 || true
  fi
else
  log "STEP 3 — Dedicated chatbot on ${CHATBOT_HOST}"
  if [[ "${ALLOW_DEGRADED_CHATBOT}" == "1" ]]; then
    warn "ALLOW_DEGRADED_CHATBOT=1 — skipping dedicated chatbot deploy/health; continuing with app deploy."
    log_event "chatbot_skipped_degraded" "{\"mode\":\"dedicated\",\"host\":\"${CHATBOT_HOST}\"}"
  else
    sync_and_compose_chatbot_on "${CHATBOT_HOST}"
    log "STEP 4 — Verify chatbot /health (public or on-host)"
    ok=0
    for _i in 1 2 3 4 5 6 7 8 9 10; do
      if curl -fsS --max-time 5 "http://${CHATBOT_HOST}:8000/health" >/dev/null 2>&1; then
        ok=1
        break
      fi
      if ssh "${SSH_OPTS[@]}" "root@${CHATBOT_HOST}" "curl -fsS --max-time 5 http://127.0.0.1:8000/health" >/dev/null 2>&1; then
        ok=1
        break
      fi
      sleep 3
    done
    [[ "${ok}" -eq 1 ]] || die "Chatbot health check failed on ${CHATBOT_HOST}"
    log_event "dedicated_chatbot_health_ok" "{\"host\":\"${CHATBOT_HOST}\"}"
    wait_chatbot_model_ready_optional "http://${CHATBOT_HOST}:8000/health" 24 5 || true
  fi

  if [[ "${ALLOW_DEGRADED_CHATBOT}" == "1" ]]; then
    warn "ALLOW_DEGRADED_CHATBOT=1 — skipping app→chatbot routing check."
    log_event "intervm_probe_skipped_degraded" "{\"from\":\"app\",\"to\":\"${CHATBOT_HOST}\",\"port\":8000}"
  elif ! check_app_to_chatbot "${CHATBOT_HOST}"; then
    if [[ "${FORCE_COLOCATE_ON_ROUTING_FAIL:-0}" == "1" ]]; then
      warn "Inter-VM routing failed → forcing colocated mode on ${APP_HOST}"
      log_event "fallback_colocate_intervm" "{\"reason\":\"app_to_chatbot_http\"}"
      COLOCATE_CHATBOT_ON_APP=1
      sync_and_compose_chatbot_on "${APP_HOST}"
      wait_chatbot_http_ok_ssh "${APP_HOST}" 36 5
      wait_chatbot_model_ready_optional_ssh "${APP_HOST}" 24 5 || true
    else
      die "Inter-VM routing failed: app cannot reach chatbot :8000. Fix Scaleway SG (TCP 8000 app→chatbot) or set FORCE_COLOCATE_ON_ROUTING_FAIL=1."
    fi
  fi
fi

log "STEP 5 — App stack (deploy-app.sh)"
export APP_DOMAIN
export CADDY_SITE_NAMES
export APP_IP="${APP_HOST}"
export SKIP_VLLM_DEPLOY=1
export CHATBOT_HEALTH_PATH=/health
if [[ "${COLOCATE_CHATBOT_ON_APP}" -eq 1 ]]; then
  export SINGLE_HOST=1
  export API_IP="${APP_HOST}"
  unset MODEL_API_URL_FOR_COMPOSE || true
  unset MODEL_API_URL_ALT_FOR_COMPOSE || true
else
  export SINGLE_HOST=0
  export API_IP="${CHATBOT_HOST}"
  export MODEL_API_URL_FOR_COMPOSE="http://${CHATBOT_HOST}:8000"
  export MODEL_API_URL_ALT_FOR_COMPOSE="http://${CHATBOT_PRIVATE_IP}:8000"
fi
export ALLOW_DEGRADED_CHATBOT
log_event "exec_deploy_app" "{\"SINGLE_HOST\":\"${SINGLE_HOST:-0}\",\"COLOCATE\":\"${COLOCATE_CHATBOT_ON_APP}\"}"
export OUTBOUND_IP
if ! "${SCRIPT_DIR}/deploy-app.sh" "$@"; then
  die "deploy-app.sh failed — app stack not fully updated (inspect SSH host ${APP_HOST})"
fi
post_deploy_verify
log "DEPLOY SUCCESS — app SSH, sync, compose, /health gates, deploy-app, and post-deploy HTTPS checks passed."
exit 0
