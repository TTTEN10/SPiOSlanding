#!/usr/bin/env bash
# Run the same landing stack as production (Postgres + Express API + Vite static + Caddy).
# Usage:
#   ./deployment/run-local-landing.sh          # foreground
#   ./deployment/run-local-landing.sh -d       # detached
#
# Open http://localhost:8080 — waitlist POSTs go to /api/subscribe (Prisma + Postgres).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
LANDING="${SCRIPT_DIR}/landing"
DETACH=0
for a in "$@"; do [[ "${a}" == "-d" ]] && DETACH=1; done

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found; install Docker Desktop or docker.io" >&2
  exit 1
fi

export APP_DOMAIN="${APP_DOMAIN:-localhost}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-devlocalwaitlist}"

WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/safepsy-landing.XXXXXX")"
cleanup() { rm -rf "${WORKDIR}"; }
if [[ "${DETACH}" -eq 0 ]]; then
  trap cleanup EXIT
fi

mkdir -p "${WORKDIR}/frontend" "${WORKDIR}/api"
COPYFILE_DISABLE=1 tar -C "${REPO_ROOT}/apps/web" -cf - . | tar -C "${WORKDIR}/frontend" -xf -
COPYFILE_DISABLE=1 tar -C "${REPO_ROOT}/apps/api" \
  --exclude=node_modules --exclude=dist --exclude=.git -cf - . | tar -C "${WORKDIR}/api" -xf -
cp "${LANDING}/docker-compose.yml" "${LANDING}/docker-compose.local.yml" "${LANDING}/frontend.Dockerfile" "${WORKDIR}/"
cp "${WORKDIR}/frontend.Dockerfile" "${WORKDIR}/frontend/Dockerfile"

cat > "${WORKDIR}/.env" <<EOF
APP_DOMAIN=${APP_DOMAIN}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DATABASE_URL=postgresql://safepsy:${POSTGRES_PASSWORD}@postgres:5432/safepsy?schema=public
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:8080
EOF

cat > "${WORKDIR}/Caddyfile" <<EOF
:80 {
  encode gzip
  handle /api/* {
    reverse_proxy api:3001
  }
  reverse_proxy /* frontend:3000
}
EOF

cd "${WORKDIR}"
compose=(docker compose -f docker-compose.yml -f docker-compose.local.yml)
if [[ "${DETACH}" -eq 1 ]]; then
  "${compose[@]}" up -d --build
  "${compose[@]}" ps
  echo "Open http://localhost:8080  (health: curl -fsS http://127.0.0.1:8080/api/healthz)"
  echo "Compose project files: ${WORKDIR} (remove after docker compose down to reclaim disk)"
else
  "${compose[@]}" up --build
fi
