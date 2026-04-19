#!/usr/bin/env bash
# Run all bootstrap steps on the Scaleway chatbot instance (requires SSH from your network).
#
# Usage:
#   ./deployment/bootstrap-chatbot-host.sh
#   CHATBOT_HOST=203.0.113.10 ./deployment/bootstrap-chatbot-host.sh
#   SSH_KEY=~/.ssh/id_ed25519 CHATBOT_HOST=... ./deployment/bootstrap-chatbot-host.sh
#
# Steps:
#   1) Print hostname + IPv4 (confirm correct VM)
#   2) docker ps -a (see existing containers)
#   3) Sync apps/ai-chatbot + deployment/chatbot → /opt/safepsy, then docker compose up -d --build
#   4) Optional: list other docker-compose.yml on host (debug wrong path)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TF_DIR="${REPO_ROOT}/infra/terraform/envs/prod"
REMOTE_BASE="${REMOTE_BASE:-/opt/safepsy}"
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-25}"
SSH_KEY="${SSH_KEY:-}"

CHATBOT_HOST="${CHATBOT_HOST:-}"
if [[ -z "${CHATBOT_HOST}" ]] && [[ -d "${TF_DIR}" ]] && command -v terraform >/dev/null 2>&1; then
  CHATBOT_HOST="$(cd "${TF_DIR}" && terraform output -raw chatbot_public_ip 2>/dev/null)" || true
fi
CHATBOT_HOST="${CHATBOT_HOST:-62.210.238.160}"

if [[ -n "${SSH_KEY}" ]]; then
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -o StrictHostKeyChecking=accept-new -i "${SSH_KEY}")
else
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -o StrictHostKeyChecking=accept-new)
fi

run_ssh() {
  ssh "${SSH_OPTS[@]}" "root@${CHATBOT_HOST}" "$@"
}

ssh_unreachable_help() {
  cat <<'EOF'

SSH timed out or was refused. The bootstrap script never reached the VM.

Checklist (Scaleway):
  1) Console → Instances → open the CHATBOT server → confirm state is "running".
  2) Copy the current public IPv4 (it may differ from Terraform if the IP changed).
     Run:  CHATBOT_HOST=<that-ip> ./deployment/bootstrap-chatbot-host.sh
  3) Security group on that instance: inbound TCP 22 from your current public IP
     (or /32 rule). Home/office IPs change; update the rule if you switched networks.
  4) Optional quick test from this Mac:  nc -vz CHATBOT_HOST 22
  5) If SSH is only via bastion/VPN, use ProxyJump in ~/.ssh/config and a Host alias,
     or run this script from a machine that is allowed to reach port 22.

EOF
}

echo ""
echo "Using CHATBOT_HOST=${CHATBOT_HOST} REMOTE_BASE=${REMOTE_BASE}"
echo ""

echo "=== Preflight: TCP reachability port 22 ==="
_nc_ok=0
if nc -z -G 5 "${CHATBOT_HOST}" 22 2>/dev/null; then _nc_ok=1; fi
if [[ "${_nc_ok}" -eq 0 ]] && nc -z -w 5 "${CHATBOT_HOST}" 22 2>/dev/null; then _nc_ok=1; fi
if [[ "${_nc_ok}" -eq 0 ]]; then
  echo "Port 22 on ${CHATBOT_HOST} is not reachable from this machine."
  echo "Try:  nc -vz ${CHATBOT_HOST} 22"
  ssh_unreachable_help
  exit 1
fi

echo "=== Step 1: hostname + primary IPv4 ==="
if ! run_ssh 'echo "hostname: $(hostname -f)"; echo "IPv4:"; ip -4 addr show scope global 2>/dev/null | sed -n "1,24p" || true'; then
  ssh_unreachable_help
  exit 1
fi

echo ""
echo "=== Step 2: docker ps -a ==="
run_ssh 'docker ps -a 2>/dev/null || echo "docker: not available"'

echo ""
echo "=== Step 3: sync apps/ai-chatbot + deployment/chatbot → ${REMOTE_BASE} ==="
[[ -d "${REPO_ROOT}/apps/ai-chatbot" ]] || { echo "Missing ${REPO_ROOT}/apps/ai-chatbot"; exit 1; }
[[ -d "${REPO_ROOT}/deployment/chatbot" ]] || { echo "Missing ${REPO_ROOT}/deployment/chatbot"; exit 1; }

COPYFILE_DISABLE=1 tar -C "${REPO_ROOT}" -cf - apps/ai-chatbot deployment/chatbot | run_ssh "mkdir -p '${REMOTE_BASE}' && tar -C '${REMOTE_BASE}' -xf -"

echo ""
echo "=== Step 3b: docker compose up -d --build ==="
run_ssh "bash -lc '
  set -euo pipefail
  mkdir -p /data
  echo \"--- disk before build ---\"
  df -h /
  docker builder prune -f 2>/dev/null || true
  cd \"${REMOTE_BASE}/deployment/chatbot\"
  docker compose pull || true
  docker compose build --no-cache chatbot-api
  docker compose up -d
  docker compose ps
'"

echo ""
echo "=== Step 4: other docker-compose.yml (first 20 hits) ==="
run_ssh 'find /opt /root /home -maxdepth 6 -name docker-compose.yml 2>/dev/null | head -20 || true'

echo ""
echo "=== safepsy-chatbot-api logs (tail 80) ==="
run_ssh 'docker logs --tail=80 safepsy-chatbot-api 2>/dev/null || echo "(no container safepsy-chatbot-api yet)"'

echo ""
echo "Done."
