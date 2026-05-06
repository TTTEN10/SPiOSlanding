#!/usr/bin/env bash
# Fix production frontend - deploy correct docker-compose and restart
# Usage: ./deployment/fix-production.sh
# Requires SSH access to production server

set -euo pipefail

APP_IP="${APP_IP:-51.159.160.246}"
APP_USER="${APP_USER:-safepsy}"
APP_BASE="/home/${APP_USER}/app"
SSH_KEY="${SSH_KEY:-}"

if [[ -n "${SSH_KEY}" ]]; then
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=12 -o StrictHostKeyChecking=accept-new -i "${SSH_KEY}")
else
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=12 -o StrictHostKeyChecking=accept-new)
fi

log() { printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }

log "Testing SSH to ${APP_IP}..."
if ! ssh "${SSH_OPTS[@]}" "root@${APP_IP}" 'echo SSH OK' >/dev/null 2>&1; then
  die "Cannot SSH to ${APP_IP}"
fi

log "Creating fixed docker-compose.yml for single-container setup..."

# Create a simplified docker-compose that works correctly
cat << 'COMPOSE_EOF' | ssh "${SSH_OPTS[@]}" "root@${APP_IP}" "cat > ${APP_BASE}/docker-compose.yml"
name: safepsy-landing

services:
  app:
    build:
      context: ../..
      dockerfile: deployment/landing-app.Dockerfile
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-safepsy}:${POSTGRES_PASSWORD:-changeme}@db:5432/${POSTGRES_DB:-safepsy}
      PORT: "3001"
      NODE_ENV: production
      FRONTEND_URL: "https://safepsy.com"
      SCALEWAY_SECRET_MANAGER_ENABLED: "false"
      SAFEPSY_LANDING_ONLY: "true"
    restart: unless-stopped
    ports:
      - "3001:3001"

  caddy:
    image: caddy:2.8-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app
    restart: unless-stopped
    entrypoint: ["/bin/sh", "-c"]
    command: |
      cat > /etc/caddy/Caddyfile << 'CADDY_EOF'
      {
        admin off
      }
      safepsy.com, www.safepsy.com {
        encode gzip
        reverse_proxy /api/* app:3001
        reverse_proxy app:3001
      }
      http://51.159.160.246 {
        encode gzip
        reverse_proxy /api/* app:3001
        reverse_proxy app:3001
      }
      CADDY_EOF
      caddy run
COMPOSE_EOF

log "Creating proper Caddyfile with API route handling..."

# Create proper Caddyfile
cat << 'CADDY_EOF' | ssh "${SSH_OPTS[@]}" "root@${APP_IP}" "cat > ${APP_BASE}/Caddyfile"
{
	admin off
}

safepsy.com, www.safepsy.com {
	encode gzip

	# API routes first (must come before catch-all)
	reverse_proxy /api/* app:3001

	# Everything else to app (SPA)
	reverse_proxy app:3001
}

http://51.159.160.246 {
	encode gzip

	# API routes first
	reverse_proxy /api/* app:3001

	# Everything else
	reverse_proxy app:3001
}
CADDY_EOF

log "Restarting services..."
ssh "${SSH_OPTS[@]}" "root@${APP_IP}" "bash -lc '
set -euo pipefail
cd ${APP_BASE}

# Stop existing services
docker compose down || true

# Start fresh
docker compose pull
docker compose up -d --build

# Wait for startup
sleep 15

# Check status
docker compose ps

# Test locally
echo \"Testing backend...\"
curl -fsS http://localhost:3001/api/healthz || echo \"Backend not ready yet\"

echo \"Testing via Caddy...\"
curl -fsS http://localhost/api/healthz || echo \"Caddy proxy not ready\"
'"

log "Verifying deployment..."
sleep 5

# Test HTTPS
if curl -fsS --max-time 10 "https://safepsy.com/api/healthz" >/dev/null 2>&1; then
  log "SUCCESS: API health check via HTTPS passed!"
else
  log "WARN: HTTPS check failed, Caddy may still be obtaining certificate"
fi

if curl -fsS --max-time 10 "https://safepsy.com" >/dev/null 2>&1; then
  log "SUCCESS: Homepage via HTTPS passed!"
else
  log "WARN: Homepage HTTPS check failed"
fi

cat << EOF

========================================
  FIX COMPLETE
========================================

Production server: ${APP_IP}
Domain: https://safepsy.com

Run verification:
  bash deployment/verify-production.sh

EOF
