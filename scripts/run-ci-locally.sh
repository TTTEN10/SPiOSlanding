#!/usr/bin/env bash
# Local reproduction of CI intent (3 layers):
# - Code quality (non-blocking for now): typecheck, lint, unit tests
# - Build validation (warning for now): build
# - Deployment readiness (STRICT): required scripts + safety constraints
#
# This script NEVER attempts runtime recovery or deployment.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

print_result() {
  local label="$1"
  local ec="$2"
  local mode="$3" # blocking|nonblocking
  if [[ "${ec}" -eq 0 ]]; then
    printf '%s: ✅ OK\n' "${label}"
  else
    if [[ "${mode}" == "blocking" ]]; then
      printf '%s: ❌ FAILED (blocking)\n' "${label}"
    else
      printf '%s: ❌ FAILED (non-blocking)\n' "${label}"
    fi
  fi
}

run_nonblocking() {
  local label="$1"
  shift
  set +e
  "$@"
  local ec=$?
  set -e
  print_result "${label}" "${ec}" "nonblocking"
  return 0
}

run_blocking() {
  local label="$1"
  shift
  set +e
  "$@"
  local ec=$?
  set -e
  print_result "${label}" "${ec}" "blocking"
  return "${ec}"
}

echo
echo "=== Layer 1: Code Quality (non-blocking for now) ==="
run_nonblocking "TYPECHECK (root)" npm run typecheck
run_nonblocking "LINT (root)" npm run lint
run_nonblocking "TESTS (root)" npm test -- --run

echo
echo "=== Layer 2: Build Validation (warning for now) ==="
run_nonblocking "BUILD (root)" npm run build

echo
echo "=== Layer 3: Deployment Readiness (STRICT) ==="
required=(
  "deployment/deploy-app.sh"
  "deployment/on-app-server-recover.sh"
  "deployment/install-app-monitor-remote.sh"
  "deployment/app-server-monitor/monitor.sh"
)
for f in "${required[@]}"; do
  if [[ ! -f "${f}" ]]; then
    echo "DEPLOYMENT SCRIPTS: ❌ FAILED (missing ${f})"
    exit 1
  fi
done
echo "DEPLOYMENT SCRIPTS: ✅ OK"

if grep -RIn "127\\.0\\.0\\.1" deployment/app-server-monitor deployment/on-app-server-recover.sh >/dev/null 2>&1; then
  echo "MONITOR SAFETY: ❌ FAILED (localhost healthcheck found)"
  exit 1
fi
if grep -RIn "docker compose .*--build" deployment/on-app-server-recover.sh deployment/app-server-monitor/monitor.sh >/dev/null 2>&1; then
  echo "MONITOR SAFETY: ❌ FAILED (--build found in recovery path)"
  exit 1
fi
if grep -RIn "deploy-app\\.sh" deployment/app-server-monitor deployment/on-app-server-recover.sh >/dev/null 2>&1; then
  echo "MONITOR SAFETY: ❌ FAILED (deploy-app.sh referenced by recovery)"
  exit 1
fi
echo "MONITOR SAFETY: ✅ OK"

echo
echo "=== Summary ==="
echo "Code quality/build may be red but is non-blocking for now."
echo "Deployment readiness is strict and must be green."

