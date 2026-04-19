#!/usr/bin/env bash
# Production entrypoint: full pipeline when Terraform/Scaleway config exists, otherwise app stack only.
#
# Usage (from repo root):
#   ./deployment/deploy-safepsy.sh
#   DEPLOY_LEGACY=1 ./deployment/deploy-safepsy.sh   # same as deploy-app.sh only
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

if [[ "${DEPLOY_LEGACY:-0}" == "1" ]]; then
  exec "${SCRIPT_DIR}/deploy-app.sh" "$@"
fi

if [[ -f "${REPO_ROOT}/infra/terraform/envs/prod/terraform.tfvars" ]] || {
  [[ -n "${TF_VAR_scaleway_access_key:-}" ]] && [[ -n "${TF_VAR_scaleway_secret_key:-}" ]] && [[ -n "${TF_VAR_scaleway_project_id:-}" ]]
}; then
  exec "${SCRIPT_DIR}/deploy.sh" "$@"
fi

printf '\n[%s] deploy-safepsy: no prod terraform.tfvars / TF_VAR_scaleway_* — app stack only (split-host defaults: scw-happy-app + scw-new-psy).\n' "$(date '+%Y-%m-%d %H:%M:%S')"
export APP_IP="${APP_IP:-51.159.149.66}"
export API_IP="${API_IP:-62.210.238.160}"
export SINGLE_HOST="${SINGLE_HOST:-0}"
export SKIP_VLLM_DEPLOY="${SKIP_VLLM_DEPLOY:-1}"
exec "${SCRIPT_DIR}/deploy-app.sh" "$@"
