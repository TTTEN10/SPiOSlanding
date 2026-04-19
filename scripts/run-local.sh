#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

echo "==> SafePsy local run"
echo "Repo: ${REPO_ROOT}"
echo

# Prevent a common workspace pitfall: a nested apps/api/node_modules can shadow
# the root workspace dependencies and break Prisma initialization at runtime.
if [[ -d "apps/api/node_modules" ]]; then
  echo "==> Removing nested apps/api/node_modules (workspace shadowing)"
  rm -rf "apps/api/node_modules"
fi

if [[ ! -d "node_modules" ]]; then
  echo "==> Installing dependencies (npm install)"
  npm install
else
  echo "==> Dependencies already present (node_modules exists)"
fi

echo "==> Generating Prisma client"
npm run db:generate

echo "==> Starting dev servers (web + api)"
echo "Web: http://localhost:3000"
echo "API: http://localhost:3001"
echo
exec npm run dev

