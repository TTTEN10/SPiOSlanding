#!/usr/bin/env bash
set -euo pipefail

# Instance-aware end-to-end deployment script for:
# - API server (vLLM/OpenAI-compatible endpoint)
# - App server (frontend + backend + caddy)
#
# Strict order:
# 1) Deploy API server first
# 2) Verify API responds
# 3) Deploy APP server stack
# 4) Validate backend -> API connectivity
# 5) Harden API exposure
#
# Usage:
#   chmod +x deployment/deploy-instance-aware-roadmap.sh
#   ./deployment/deploy-instance-aware-roadmap.sh
#
# Optional overrides:
#   APP_IP=... API_IP=... CADDY_SITE_NAMES=... APP_USER=... SSH_KEY=... \
#   VLLM_IMAGE=... VLLM_CPU_KVCACHE_SPACE=... VLLM_DTYPE=... \
#   MODEL_ID=... FALLBACK_MODEL_ID=... MAX_MODEL_LEN=... ./deployment/deploy-instance-aware-roadmap.sh
#
# CADDY_SITE_NAMES: comma-separated hostnames for one Caddy site block (ACME cert covers all).
#   Default: safepsy.com, www.safepsy.com
#
# LLM routing: see deploy-app.sh (LLM_UPSTREAM_URL, APP_PRIVATE_IP). Same variables apply here.

APP_IP="${APP_IP:-51.159.149.66}"
API_IP="${API_IP:-62.210.238.160}"
# Canonical browser URL (used in success output / checks)
APP_DOMAIN="${APP_DOMAIN:-safepsy.com}"
# Hostnames Caddy will terminate TLS for (must match DNS A/AAAA to this server)
CADDY_SITE_NAMES="${CADDY_SITE_NAMES:-safepsy.com, www.safepsy.com}"
APP_USER="${APP_USER:-safepsy}"
SSH_KEY="${SSH_KEY:-}"
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-12}"

API_PORT="${API_PORT:-8000}"
LLM_UPSTREAM_URL="${LLM_UPSTREAM_URL:-http://${API_IP}:${API_PORT}}"
APP_PRIVATE_IP="${APP_PRIVATE_IP:-}"
VLLM_IMAGE="${VLLM_IMAGE:-vllm/vllm-openai-cpu:latest}"
# Default: very small instruct model; phi-2 + float32 often OOMs / fails engine init on 8GB CPU.
MODEL_ID="${MODEL_ID:-Qwen/Qwen2-0.5B-Instruct}"
FALLBACK_MODEL_ID="${FALLBACK_MODEL_ID:-TinyLlama/TinyLlama-1.1B-Chat-v1.0}"
MAX_MODEL_LEN="${MAX_MODEL_LEN:-256}"
FALLBACK_MAX_MODEL_LEN="${FALLBACK_MAX_MODEL_LEN:-256}"
VLLM_CPU_KVCACHE_SPACE="${VLLM_CPU_KVCACHE_SPACE:-1}"
VLLM_DTYPE="${VLLM_DTYPE:-auto}"

APP_BASE_DIR="/home/${APP_USER}/app"
API_BASE_DIR="/home/${APP_USER}/llm-api"
SCRIPT_VERSION="2026-03-24.1"

if [[ -n "${SSH_KEY}" ]]; then
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -i "${SSH_KEY}")
else
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}")
fi

log() { printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }

run_ssh() {
  local host="$1"
  shift
  ssh "${SSH_OPTS[@]}" "root@${host}" "$@"
}

wait_http() {
  local url="$1"
  local retries="${2:-30}"
  local delay="${3:-2}"
  local i
  for ((i=1; i<=retries; i++)); do
    if curl -fsS --max-time 4 "${url}" >/dev/null 2>&1; then
      return 0
    fi
    sleep "${delay}"
  done
  return 1
}

log "Preflight: checking SSH access"
log "Running deploy-instance-aware-roadmap.sh v${SCRIPT_VERSION}"
log "LLM upstream URL (app→vLLM): ${LLM_UPSTREAM_URL}"
[[ -n "${APP_PRIVATE_IP}" ]] && log "APP_PRIVATE_IP for UFW on API host: ${APP_PRIVATE_IP}"
run_ssh "${API_IP}" "echo 'API SSH OK on $(hostname)'" || die "Cannot SSH to API server ${API_IP}"
run_ssh "${APP_IP}" "echo 'APP SSH OK on $(hostname)'" || die "Cannot SSH to APP server ${APP_IP}"

log "STEP 1: Ensure ${APP_USER} exists and has docker group on both servers"
run_ssh "${API_IP}" "id ${APP_USER} >/dev/null 2>&1 || useradd -m -s /bin/bash ${APP_USER}; groupadd -f docker; usermod -aG docker ${APP_USER}"
run_ssh "${APP_IP}" "id ${APP_USER} >/dev/null 2>&1 || useradd -m -s /bin/bash ${APP_USER}; groupadd -f docker; usermod -aG docker ${APP_USER}"

log "STEP 2: Install Docker and Compose plugin (if missing) on both servers"
for HOST in "${API_IP}" "${APP_IP}"; do
  run_ssh "${HOST}" "bash -lc '
    set -e
    if ! command -v docker >/dev/null 2>&1; then
      export DEBIAN_FRONTEND=noninteractive
      apt-get update
      apt-get install -y docker.io docker-compose-plugin curl ca-certificates
      systemctl enable docker
      systemctl start docker
    fi
    if ! docker compose version >/dev/null 2>&1; then
      export DEBIAN_FRONTEND=noninteractive
      apt-get update
      apt-get install -y docker-compose-plugin || true
    fi
  '"
done

log "STEP 3: Deploy API server first (vLLM CPU-friendly profile with fallback)"
run_ssh "${API_IP}" "bash -lc '
  set -euo pipefail
  mkdir -p ${API_BASE_DIR}
  chown -R ${APP_USER}:${APP_USER} /home/${APP_USER}

  docker rm -f vllm >/dev/null 2>&1 || true

  run_model() {
    local model=\"\$1\"
    local maxlen=\"\$2\"
    docker run -d \
      --name vllm \
      -p ${API_PORT}:8000 \
      --restart unless-stopped \
      --memory=6g \
      --cpus=3 \
      -e VLLM_CPU_KVCACHE_SPACE=${VLLM_CPU_KVCACHE_SPACE} \
      ${VLLM_IMAGE} \
      --model \"\${model}\" \
      --dtype ${VLLM_DTYPE} \
      --max-model-len \"\${maxlen}\"
  }

  run_model \"${MODEL_ID}\" \"${MAX_MODEL_LEN}\"

  for i in {1..120}; do
    if curl -fsS http://localhost:${API_PORT}/v1/models >/dev/null 2>&1; then
      echo \"vLLM primary model healthy\"
      exit 0
    fi
    sleep 3
  done

  echo \"Primary model failed. Falling back to ${FALLBACK_MODEL_ID} / max-len ${FALLBACK_MAX_MODEL_LEN}\"
  docker rm -f vllm >/dev/null 2>&1 || true
  run_model \"${FALLBACK_MODEL_ID}\" \"${FALLBACK_MAX_MODEL_LEN}\"

  for i in {1..120}; do
    if curl -fsS http://localhost:${API_PORT}/v1/models >/dev/null 2>&1; then
      echo \"vLLM fallback healthy\"
      exit 0
    fi
    sleep 3
  done

  echo \"vLLM failed with both primary and fallback models\"
  docker logs --tail=120 vllm || true
  exit 1
'"

log "STEP 4: Verify API server externally from local machine"
wait_http "http://${API_IP}:${API_PORT}/v1/models" 120 3 || die "API endpoint is not reachable at http://${API_IP}:${API_PORT}/v1/models"

log "STEP 5: Deploy app stack on APP server (frontend + backend + caddy)"
run_ssh "${APP_IP}" "bash -lc '
  set -euo pipefail
  mkdir -p ${APP_BASE_DIR}/frontend ${APP_BASE_DIR}/backend
  cd ${APP_BASE_DIR}

  cat > frontend/package.json <<\"EOF\"
{
  \"name\": \"safepsy-frontend\",
  \"private\": true,
  \"version\": \"1.0.0\",
  \"scripts\": {
    \"build\": \"mkdir -p dist/chat && cp -f index.html dist/index.html && cp -f chat.html dist/chat/index.html\"
  }
}
EOF

  cat > frontend/index.html <<\"EOF\"
<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>SafePsy</title>
  <style>
    body { font-family: sans-serif; margin: 2rem; background: #0f172a; color: #e2e8f0; }
    button { padding: 0.6rem 1rem; border: 0; border-radius: 8px; cursor: pointer; }
    pre { background: #111827; color: #e5e7eb; padding: 1rem; border-radius: 8px; overflow:auto; }
  </style>
</head>
<body>
  <h1>SafePsy Deployment Check</h1>
  <p>If you see this page, frontend + caddy are up.</p>
  <p><a href=\"/chat/\" style=\"color:#93c5fd\">Open LLM chat (/chat)</a></p>
  <button onclick=\"pingApi()\">Test /api/healthz</button>
  <pre id=\"out\">Ready.</pre>
  <script>
    async function pingApi() {
      const el = document.getElementById(\"out\");
      el.textContent = \"Calling /api/healthz...\";
      try {
        const r = await fetch(\"/api/healthz\");
        el.textContent = await r.text();
      } catch (e) {
        el.textContent = String(e);
      }
    }
  </script>
</body>
</html>
EOF

  cat > frontend/chat.html <<\"EOF\"
<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>SafePsy Chat</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; min-height: 100vh; background: #0f172a; color: #e2e8f0; display: flex; flex-direction: column; }
    header { padding: 1rem 1.25rem; border-bottom: 1px solid #334155; display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    header a { color: #93c5fd; }
    #log { flex: 1; overflow: auto; padding: 1rem; white-space: pre-wrap; font-size: 0.95rem; line-height: 1.5; }
    .row { display: flex; gap: 0.5rem; padding: 1rem; border-top: 1px solid #334155; }
    textarea { flex: 1; min-height: 3rem; background: #1e293b; color: #e2e8f0; border: 1px solid #475569; border-radius: 8px; padding: 0.5rem; }
    button { padding: 0.5rem 1rem; border: 0; border-radius: 8px; background: #2563eb; color: white; cursor: pointer; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .err { color: #fca5a5; }
  </style>
</head>
<body>
  <header>
    <strong>LLM Chat</strong>
    <a href=\"/\">Home</a>
    <span id=\"model\"></span>
  </header>
  <div id=\"log\"></div>
  <div class=\"row\">
    <textarea id=\"msg\" placeholder=\"Message...\"></textarea>
    <button id=\"send\" type=\"button\">Send</button>
  </div>
  <script>
    const logEl = document.getElementById(\"log\");
    const modelEl = document.getElementById(\"model\");
    const msgEl = document.getElementById(\"msg\");
    const sendBtn = document.getElementById(\"send\");

    async function loadModel() {
      try {
        const r = await fetch(\"/api/v1/models\");
        const j = await r.json();
        const id = j.data && j.data[0] ? j.data[0].id : \"(unknown)\";
        modelEl.textContent = \"Model: \" + id;
        return id;
      } catch (e) {
        modelEl.textContent = \"Model: (failed to load)\";
        return null;
      }
    }

    async function send() {
      const text = (msgEl.value || \"\").trim();
      if (!text) return;
      const model = await loadModel();
      sendBtn.disabled = true;
      logEl.textContent += \"\\nYou: \" + text + \"\\n\";
      msgEl.value = \"\";
      try {
        const r = await fetch(\"/api/v1/chat/completions\", {
          method: \"POST\",
          headers: { \"Content-Type\": \"application/json\" },
          body: JSON.stringify({
            model: model || \"default\",
            messages: [{ role: \"user\", content: text }],
            max_tokens: 256,
            temperature: 0.7
          })
        });
        const raw = await r.text();
        if (!r.ok) {
          logEl.innerHTML += \"<span class=err>HTTP \" + r.status + \": \" + raw + \"</span>\\n\";
          return;
        }
        const j = JSON.parse(raw);
        const part = j.choices && j.choices[0] && j.choices[0].message
          ? j.choices[0].message.content
          : raw;
        logEl.textContent += \"Assistant: \" + part + \"\\n\";
      } catch (e) {
        logEl.innerHTML += \"<span class=err>\" + String(e) + \"</span>\\n\";
      } finally {
        sendBtn.disabled = false;
      }
    }

    sendBtn.addEventListener(\"click\", send);
    msgEl.addEventListener(\"keydown\", (e) => {
      if (e.key === \"Enter\" && !e.shiftKey) { e.preventDefault(); send(); }
    });
    loadModel();
  </script>
</body>
</html>
EOF

  cat > frontend/Dockerfile <<\"EOF\"
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
RUN npm install -g serve
CMD [\"serve\", \"dist\", \"-l\", \"3000\"]
EOF

  cat > backend/requirements.txt <<\"EOF\"
fastapi
uvicorn
requests
EOF

  cat > backend/main.py <<\"EOF\"
import os
import requests
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
MODEL_API_URL = os.getenv(\"MODEL_API_URL\", \"http://127.0.0.1:8000\").rstrip(\"/\")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[\"*\"],
    allow_credentials=True,
    allow_methods=[\"*\"],
    allow_headers=[\"*\"],
)

@app.get(\"/healthz\")
def healthz():
  return {\"ok\": True, \"service\": \"backend\"}

@app.get(\"/models\")
def models():
  resp = requests.get(f\"{MODEL_API_URL}/v1/models\", timeout=15)
  resp.raise_for_status()
  return resp.json()

@app.get(\"/v1/models\")
def v1_models():
  resp = requests.get(f\"{MODEL_API_URL}/v1/models\", timeout=15)
  resp.raise_for_status()
  return resp.json()

@app.post(\"/v1/chat/completions\")
async def v1_chat_completions(request: Request):
  body = await request.body()
  ctype = request.headers.get(\"content-type\", \"application/json\")
  r = requests.post(
      f\"{MODEL_API_URL}/v1/chat/completions\",
      data=body,
      headers={\"Content-Type\": ctype},
      timeout=180,
  )
  ct = r.headers.get(\"content-type\", \"application/json\")
  return Response(content=r.content, status_code=r.status_code, media_type=ct)
EOF

  cat > backend/Dockerfile <<\"EOF\"
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
CMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"5000\"]
EOF

  cat > docker-compose.yml <<\"EOF\"
services:
  frontend:
    build: ./frontend
    restart: always
    deploy:
      resources:
        limits:
          memory: 1G

  backend:
    build: ./backend
    restart: always
    environment:
      - MODEL_API_URL=${LLM_UPSTREAM_URL}
    deploy:
      resources:
        limits:
          memory: 1G

  caddy:
    image: caddy:latest
    restart: always
    ports:
      - \"80:80\"
      - \"443:443\"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    deploy:
      resources:
        limits:
          memory: 512M

volumes:
  caddy_data:
  caddy_config:
EOF

  cat > Caddyfile <<\"EOF\"
${CADDY_SITE_NAMES} {
  encode gzip
  handle_path /api/* {
    reverse_proxy backend:5000
  }
  reverse_proxy /* frontend:3000
}

# Plain HTTP for direct-IP access only (no public cert for raw IPs — avoids breaking :443 for real domains)
http://${APP_IP} {
  encode gzip
  handle_path /api/* {
    reverse_proxy backend:5000
  }
  reverse_proxy /* frontend:3000
}
EOF

  docker compose up -d --build
  docker compose ps
  curl -fsS http://localhost >/dev/null
'"

log "STEP 6: Validate APP -> API connectivity from APP server"
run_ssh "${APP_IP}" "bash -lc '
  set -euo pipefail
  curl -fsS ${LLM_UPSTREAM_URL}/v1/models >/dev/null
  docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps
  docker logs --tail=80 \$(docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps -q backend) || true
'"

UFW_EXTRA_CMD=""
if [[ -n "${APP_PRIVATE_IP}" ]]; then
  UFW_EXTRA_CMD="ufw allow from ${APP_PRIVATE_IP} to any port ${API_PORT} proto tcp"
fi

log "STEP 7: Security hardening on API server (UFW allow app IP only on ${API_PORT})"
run_ssh "${API_IP}" "bash -lc '
  set -e
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y ufw
  ufw --force enable || true
  ufw allow OpenSSH
  ufw allow from ${APP_IP} to any port ${API_PORT} proto tcp
  ${UFW_EXTRA_CMD}
  ufw deny ${API_PORT}/tcp || true
  ufw status verbose
'"

log "STEP 8: Final checks"
wait_http "http://${APP_IP}" 30 2 || die "App root is not reachable at http://${APP_IP}"
run_ssh "${APP_IP}" "bash -lc 'curl -fsS http://localhost/api/healthz && echo'"
run_ssh "${APP_IP}" "bash -lc 'curl -fsS http://localhost/api/models >/dev/null && echo backend_to_api_ok'"

log "STEP 8b: HTTPS / domain (Caddy auto-HTTPS; requires DNS → ${APP_IP})"
if wait_http "https://${APP_DOMAIN}" 25 3; then
  curl -fsS --max-time 15 "https://${APP_DOMAIN}/api/healthz" >/dev/null && echo "domain_https_ok"
else
  printf "\n[WARN] https://%s not reachable from here yet (DNS/propagation/firewall). App still OK on http://%s\n" "${APP_DOMAIN}" "${APP_IP}"
fi

cat <<EOF

SUCCESS
- Frontend reachable:  http://${APP_IP}
- Domain (HTTPS):       https://${APP_DOMAIN}  (also ${CADDY_SITE_NAMES})
- LLM upstream (app):   ${LLM_UPSTREAM_URL}/v1/models
- API host (vLLM):      http://${API_IP}:${API_PORT}/v1/models
- App stack path:       ${APP_BASE_DIR}
- Inference container:  vllm

Useful follow-ups:
- App logs: ssh root@${APP_IP} \"cd ${APP_BASE_DIR} && docker compose logs -f\"
- API logs: ssh root@${API_IP} \"docker logs -f vllm\"
EOF
