#!/usr/bin/env bash
# Lightweight CI/CD functional test (local):
# - Validates workflow YAML parses
# - Ensures 3-layer jobs exist (code-quality, build-validation, deployment-readiness)
# - Runs scripts/run-ci-locally.sh and ensures the STRICT layer passes

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

echo "Checking workflow YAML parses."
ruby -e "require 'yaml'; YAML.load_file('.github/workflows/ci-cd.yml');"
echo "OK: YAML parses"

echo
echo "Checking required jobs exist in ci-cd.yml."
grep -q "^  code-quality:" .github/workflows/ci-cd.yml
grep -q "^  build-validation:" .github/workflows/ci-cd.yml
grep -q "^  deployment-readiness:" .github/workflows/ci-cd.yml
echo "OK: required jobs found"

echo
echo "Running local CI reproduction."
chmod +x scripts/run-ci-locally.sh
./scripts/run-ci-locally.sh
echo "OK: run-ci-locally completed"

