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
#   chmod +x deployment/deploy-app.sh
#   ./deployment/deploy-app.sh
#
# Optional overrides:
#   APP_IP=... API_IP=... CADDY_SITE_NAMES=... APP_USER=... SSH_KEY=... \
#   VLLM_IMAGE=... VLLM_DOCKER_GPU_ARGS=... VLLM_TOKENIZER_MODE=... VLLM_CPU_KVCACHE_SPACE=... VLLM_DTYPE=... \
#   MODEL_ID=... FALLBACK_MODEL_ID=... MAX_MODEL_LEN=... \
#   VLLM_TENSOR_PARALLEL_SIZE=... VLLM_EXTRA_DOCKER_ARGS=... \
#   VLLM_DOCKER_MEMORY=... ./deployment/deploy-app.sh
#
# CADDY_SITE_NAMES: comma-separated hostnames for one Caddy site block (ACME cert covers all).
#   Default: safepsy.com, www.safepsy.com
#
# SINGLE_HOST=1: run vLLM on APP_IP only (bind 127.0.0.1:8000). Use when SSH to API_IP fails or there is no separate API VM.
#   Example: SINGLE_HOST=1 APP_IP=51.159.149.66 ./deployment/deploy-app.sh
#
# REUSE_CONTAINERS=1: restart existing Docker containers only (docker restart vllm; docker compose restart).
#   No rm/run, no compose --build, no frontend sync. Requires a prior full deploy on the host(s).

# Defaults: scw-happy-app (app+frontend, single host)
APP_IP="${APP_IP:-51.159.149.66}"
API_IP="${API_IP:-51.159.149.66}"
SINGLE_HOST="${SINGLE_HOST:-1}"
REUSE_CONTAINERS="${REUSE_CONTAINERS:-0}"
# When 1, do not run the vLLM docker container; use an external FastAPI chatbot (e.g. docker compose on API_IP).
SKIP_VLLM_DEPLOY="${SKIP_VLLM_DEPLOY:-1}"
CHATBOT_HEALTH_PATH="${CHATBOT_HEALTH_PATH:-/health}"
# Canonical browser URL (used in success output / checks)
APP_DOMAIN="${APP_DOMAIN:-safepsy.com}"
# Hostnames Caddy will terminate TLS for (must match DNS A/AAAA to this server)
CADDY_SITE_NAMES="${CADDY_SITE_NAMES:-safepsy.com, www.safepsy.com}"
APP_USER="${APP_USER:-safepsy}"
SSH_USER="${SSH_USER:-root}"
SSH_KEY="${SSH_KEY:-}"
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-12}"
# When 1, deployment must not fail if chatbot/vLLM is unavailable.
ALLOW_DEGRADED_CHATBOT="${ALLOW_DEGRADED_CHATBOT:-0}"

API_PORT="${API_PORT:-8000}"
# Dolphin 24B needs a CUDA image + GPU; override for CPU-only dev (e.g. smaller MODEL_ID + vllm/vllm-openai-cpu:latest).
VLLM_IMAGE="${VLLM_IMAGE:-vllm/vllm-openai:latest}"
VLLM_DOCKER_GPU_ARGS="${VLLM_DOCKER_GPU_ARGS:---gpus all}"
# Primary: dphn/Dolphin-Mistral-24B-Venice-Edition (Mistral tokenizer). Fallback: Qwen (no --tokenizer-mode on fallback).
MODEL_ID="${MODEL_ID:-dphn/Dolphin-Mistral-24B-Venice-Edition}"
FALLBACK_MODEL_ID="${FALLBACK_MODEL_ID:-Qwen/Qwen2.5-3B-Instruct}"
MAX_MODEL_LEN="${MAX_MODEL_LEN:-8192}"
FALLBACK_MAX_MODEL_LEN="${FALLBACK_MAX_MODEL_LEN:-8192}"
VLLM_CPU_KVCACHE_SPACE="${VLLM_CPU_KVCACHE_SPACE:-1}"
VLLM_DTYPE="${VLLM_DTYPE:-auto}"
VLLM_TENSOR_PARALLEL_SIZE="${VLLM_TENSOR_PARALLEL_SIZE:-1}"
# Applied only to MODEL_ID (see https://huggingface.co/dphn/Dolphin-Mistral-24B-Venice-Edition — vLLM + tokenizer_mode mistral).
VLLM_TOKENIZER_MODE="${VLLM_TOKENIZER_MODE:-mistral}"
# Example GPU image extras: VLLM_EXTRA_DOCKER_ARGS='--gpu-memory-utilization 0.9'
VLLM_EXTRA_DOCKER_ARGS="${VLLM_EXTRA_DOCKER_ARGS:-}"
# cgroup cap; 24B BF16 needs substantial host RAM / VRAM — raise if the instance allows.
VLLM_DOCKER_MEMORY="${VLLM_DOCKER_MEMORY:-80g}"

APP_BASE_DIR="/home/${APP_USER}/app"
API_BASE_DIR="/home/${APP_USER}/llm-api"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WEB_SRC_DIR="${WEB_SRC_DIR:-${REPO_ROOT}/apps/web}"
SCRIPT_VERSION="2026-04-07.1"

# Where vLLM / chatbot runs and how the app backend reaches it (set MODEL_API_URL_FOR_COMPOSE before this script to override).
if [[ "${SINGLE_HOST}" == "1" ]]; then
  VLLM_SSH_HOST="${APP_IP}"
  VLLM_PUBLISH="-p 127.0.0.1:${API_PORT}:8000"
  if [[ -z "${MODEL_API_URL_FOR_COMPOSE:-}" ]]; then
    MODEL_API_URL_FOR_COMPOSE="http://host.docker.internal:${API_PORT}"
  fi
else
  VLLM_SSH_HOST="${API_IP}"
  VLLM_PUBLISH="-p ${API_PORT}:8000"
  if [[ -z "${MODEL_API_URL_FOR_COMPOSE:-}" ]]; then
    MODEL_API_URL_FOR_COMPOSE="http://${API_IP}:${API_PORT}"
  fi
fi

if [[ -n "${SSH_KEY}" ]]; then
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -o StrictHostKeyChecking=accept-new -i "${SSH_KEY}")
else
  SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" -o StrictHostKeyChecking=accept-new)
fi

log() { printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
die() { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }

run_ssh() {
  local host="$1"
  shift
  ssh "${SSH_OPTS[@]}" "${SSH_USER}@${host}" "$@"
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
log "Running deploy-app.sh v${SCRIPT_VERSION}"
if [[ "${REUSE_CONTAINERS}" == "1" ]]; then
  log "REUSE_CONTAINERS=1: will docker restart vllm and docker compose restart (no new containers / no --build)"
fi
if [[ "${SINGLE_HOST}" == "1" ]]; then
  log "SINGLE_HOST=1: vLLM + app stack on APP_IP=${APP_IP} (no SSH to API_IP)"
  run_ssh "${APP_IP}" "echo 'APP SSH OK on $(hostname)'" || die "Cannot SSH to APP server ${APP_IP}"
else
  run_ssh "${API_IP}" "echo 'API SSH OK on $(hostname)'" || die "Cannot SSH to API server ${API_IP}. If vLLM runs on the app host: SINGLE_HOST=1 ./deployment/deploy.sh"
  run_ssh "${APP_IP}" "echo 'APP SSH OK on $(hostname)'" || die "Cannot SSH to APP server ${APP_IP}"
fi

log "STEP 1: Ensure ${APP_USER} exists and has docker group on target server(s)"
if [[ "${SINGLE_HOST}" != "1" ]]; then
  run_ssh "${API_IP}" "id ${APP_USER} >/dev/null 2>&1 || useradd -m -s /bin/bash ${APP_USER}; groupadd -f docker; usermod -aG docker ${APP_USER}"
fi
run_ssh "${APP_IP}" "id ${APP_USER} >/dev/null 2>&1 || useradd -m -s /bin/bash ${APP_USER}; groupadd -f docker; usermod -aG docker ${APP_USER}"

log "STEP 2: Install Docker and Compose plugin (if missing)"
for HOST in $([[ "${SINGLE_HOST}" == "1" ]] && echo "${APP_IP}" || echo "${API_IP} ${APP_IP}"); do
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

if [[ "${REUSE_CONTAINERS}" == "1" ]]; then
  if [[ "${SKIP_VLLM_DEPLOY}" == "1" ]]; then
    log "STEP 3: REUSE_CONTAINERS=1 and SKIP_VLLM_DEPLOY=1 — skip vLLM restart (external chatbot)"
  else
    log "STEP 3: Restart existing vLLM container on ${VLLM_SSH_HOST} (REUSE_CONTAINERS=1)"
    run_ssh "${VLLM_SSH_HOST}" "bash -lc '
      set -euo pipefail
      if ! docker ps -a --format \"{{.Names}}\" | grep -qx vllm; then
        echo \"No container named vllm. Run a full deploy without REUSE_CONTAINERS=1 first.\" >&2
        exit 1
      fi
      docker restart vllm
      for i in {1..120}; do
        if curl -fsS http://localhost:${API_PORT}/v1/models >/dev/null 2>&1; then
          echo \"vLLM healthy after restart\"
          exit 0
        fi
        sleep 3
      done
      docker logs --tail=120 vllm || true
      exit 1
    '"
  fi
elif [[ "${SKIP_VLLM_DEPLOY}" == "1" ]]; then
  log "STEP 3: SKIP_VLLM_DEPLOY=1 — skipping vLLM container (use FastAPI chatbot + compose on ${VLLM_SSH_HOST})"
else
  log "STEP 3: Deploy vLLM on ${VLLM_SSH_HOST} (OpenAI server, chunked prefill, tensor-parallel-size fallback chain)"
  run_ssh "${VLLM_SSH_HOST}" "bash -lc '
    set -euo pipefail
    mkdir -p ${API_BASE_DIR}
    chown -R ${APP_USER}:${APP_USER} /home/${APP_USER}

    docker rm -f vllm >/dev/null 2>&1 || true

    run_model() {
      local model=\"\$1\"
      local maxlen=\"\$2\"
      local tokenizer_mode=\"\$3\"
      extra_tok=
      if [ -n \"\$tokenizer_mode\" ]; then
        extra_tok=\"--tokenizer-mode \$tokenizer_mode\"
      fi
      docker run -d \
        ${VLLM_DOCKER_GPU_ARGS} \
        --name vllm \
        ${VLLM_PUBLISH} \
        --restart unless-stopped \
        --memory=${VLLM_DOCKER_MEMORY} \
        --cpus=3 \
        -e VLLM_CPU_KVCACHE_SPACE=${VLLM_CPU_KVCACHE_SPACE} \
        ${VLLM_IMAGE} \
        --model \"\${model}\" \
        --dtype ${VLLM_DTYPE} \
        --max-model-len \"\${maxlen}\" \
        --enable-chunked-prefill \
        --tensor-parallel-size ${VLLM_TENSOR_PARALLEL_SIZE} \
        \${extra_tok} \
        ${VLLM_EXTRA_DOCKER_ARGS}
    }

    run_model \"${MODEL_ID}\" \"${MAX_MODEL_LEN}\" \"${VLLM_TOKENIZER_MODE}\"

    for i in {1..120}; do
      if curl -fsS http://localhost:${API_PORT}/v1/models >/dev/null 2>&1; then
        echo \"vLLM primary model healthy\"
        exit 0
      fi
      sleep 3
    done

    echo \"Primary model failed. Falling back to ${FALLBACK_MODEL_ID} / max-len ${FALLBACK_MAX_MODEL_LEN}\"
    docker rm -f vllm >/dev/null 2>&1 || true
    run_model \"${FALLBACK_MODEL_ID}\" \"${FALLBACK_MAX_MODEL_LEN}\" \"\"

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
fi

log "STEP 4: Verify inference endpoint is reachable"
if [[ "${ALLOW_DEGRADED_CHATBOT}" == "1" ]]; then
  log "ALLOW_DEGRADED_CHATBOT=1: skipping inference health gate"
else
  if [[ "${SKIP_VLLM_DEPLOY}" == "1" ]]; then
    if [[ "${SINGLE_HOST}" == "1" ]]; then
      run_ssh "${APP_IP}" "bash -lc 'for i in {1..80}; do curl -fsS http://127.0.0.1:${API_PORT}${CHATBOT_HEALTH_PATH} >/dev/null && exit 0; sleep 3; done; exit 1'" \
        || die "Chatbot not healthy on APP host loopback http://127.0.0.1:${API_PORT}${CHATBOT_HEALTH_PATH}"
    else
      wait_http "http://${API_IP}:${API_PORT}${CHATBOT_HEALTH_PATH}" 120 3 || die "Chatbot not reachable at http://${API_IP}:${API_PORT}${CHATBOT_HEALTH_PATH}"
    fi
  elif [[ "${SINGLE_HOST}" == "1" ]]; then
    run_ssh "${APP_IP}" "bash -lc 'for i in {1..80}; do curl -fsS http://127.0.0.1:${API_PORT}/v1/models >/dev/null && exit 0; sleep 3; done; exit 1'" \
      || die "vLLM not healthy on APP host loopback http://127.0.0.1:${API_PORT}/v1/models"
  else
    wait_http "http://${API_IP}:${API_PORT}/v1/models" 120 3 || die "API endpoint is not reachable at http://${API_IP}:${API_PORT}/v1/models"
  fi
fi

if [[ "${REUSE_CONTAINERS}" == "1" ]]; then
  log "STEP 5: Restart existing app stack on APP server (REUSE_CONTAINERS=1; no build, no new containers)"
  run_ssh "${APP_IP}" "bash -lc '
    set -euo pipefail
    cd ${APP_BASE_DIR}
    if [[ ! -f docker-compose.yml ]]; then
      echo \"${APP_BASE_DIR}/docker-compose.yml missing. Run a full deploy without REUSE_CONTAINERS=1 first.\" >&2
      exit 1
    fi
    docker compose restart
    docker compose ps
    curl -fsS http://localhost >/dev/null
  '"
else
  log "STEP 5: Deploy app stack on APP server (apps/web frontend + backend + caddy)"
  [[ -d "${WEB_SRC_DIR}" ]] || die "Frontend source directory not found: ${WEB_SRC_DIR}"

  log "STEP 5a: Sync local apps/web -> ${APP_IP}:${APP_BASE_DIR}/frontend"
  run_ssh "${APP_IP}" "bash -lc 'mkdir -p ${APP_BASE_DIR}/frontend && rm -rf ${APP_BASE_DIR}/frontend/*'"
  COPYFILE_DISABLE=1 tar -C "${WEB_SRC_DIR}" -cf - . | run_ssh "${APP_IP}" "bash -lc 'tar -C ${APP_BASE_DIR}/frontend -xf -'"

  run_ssh "${APP_IP}" "bash -lc '
  set -euo pipefail
  mkdir -p ${APP_BASE_DIR}/frontend ${APP_BASE_DIR}/backend
  cd ${APP_BASE_DIR}

  cat > frontend/Dockerfile <<\"EOF\"
FROM node:20-alpine
WORKDIR /app
COPY . .
# apps/web currently has strict TS errors in some files; build production bundle via Vite.
ENV VITE_API_URL=https://${APP_DOMAIN}
RUN npm install --legacy-peer-deps && npm run build
RUN npm install -g serve
CMD [\"serve\", \"-s\", \"dist\", \"-l\", \"3000\"]
EOF

  cat > backend/requirements.txt <<\"EOF\"
fastapi
uvicorn
httpx
EOF

  cat > backend/main.py <<\"EOF\"
import json
import os
import time
import httpx
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.responses import StreamingResponse

app = FastAPI()
MODEL_API_URL = os.getenv(\"MODEL_API_URL\", \"http://127.0.0.1:8000\").rstrip(\"/\")
MODEL_API_URL_ALT = os.getenv(\"MODEL_API_URL_ALT\", \"\").strip().rstrip(\"/\")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[\"*\"],
    allow_credentials=True,
    allow_methods=[\"*\"],
    allow_headers=[\"*\"],
)

@app.get(\"/health\")
@app.get(\"/healthz\")
def healthz():
  return {\"ok\": True, \"service\": \"backend\"}

def _upstream_bases():
  out = []
  for b in (MODEL_API_URL, MODEL_API_URL_ALT):
    if b and b not in out:
      out.append(b)
  return out if out else [\"http://127.0.0.1:8000\"]

def _models_upstream():
  \"\"\"Proxy GET /v1/models; try each upstream base; never return HTTP 500 (verify + UIs).\"\"\"
  errors = []
  timeout = httpx.Timeout(45.0, connect=15.0)
  for base in _upstream_bases():
    try:
      with httpx.Client(timeout=timeout) as client:
        r = client.get(f\"{base}/v1/models\")
        if r.status_code == 200:
          data = r.json()
          if isinstance(data, dict) and \"data\" in data:
            return data
        errors.append(f\"{base}: HTTP {r.status_code}\")
    except Exception as e:
      errors.append(f\"{base}: {type(e).__name__}\")
  return JSONResponse(
    status_code=200,
    content={
      \"object\": \"list\",
      \"data\": [
        {
          \"id\": os.getenv(\"FALLBACK_MODEL_ID\", \"dr-safe\"),
          \"object\": \"model\",
          \"created\": int(time.time()),
          \"owned_by\": \"safepsy\",
        }
      ],
      \"warning\": \"chatbot /v1/models unreachable from app proxy: \" + \"; \".join(errors[:5]),
    },
  )

@app.get(\"/models\")
def models():
  return _models_upstream()

@app.get(\"/v1/models\")
def v1_models():
  return _models_upstream()

def _want_stream(body: bytes) -> bool:
  try:
    return json.loads(body).get(\"stream\", True) is True
  except Exception:
    return True

# Caddy handle_path /api/* strips /api prefix:
#   /api/chat/completions → /chat/completions
#   /api/v1/chat/completions → /v1/chat/completions
@app.post(\"/chat/completions\")
@app.post(\"/v1/chat/completions\")
async def v1_chat_completions(request: Request):
  body = await request.body()
  ctype = request.headers.get(\"content-type\", \"application/json\")
  headers = {\"Content-Type\": ctype}
  timeout = httpx.Timeout(300.0, connect=30.0)
  want_stream = _want_stream(body)
  last_err = None
  for base in _upstream_bases():
    url = f\"{base}/v1/chat/completions\"
    try:
      if want_stream:
        async def gen(u=url):
          async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(\"POST\", u, content=body, headers=headers) as response:
              async for chunk in response.aiter_bytes():
                yield chunk

        return StreamingResponse(
          gen(),
          media_type=\"text/event-stream\",
          status_code=200,
        )

      async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(url, content=body, headers=headers)
      return Response(
        content=r.content,
        status_code=r.status_code,
        media_type=r.headers.get(\"content-type\", \"application/json\"),
      )
    except Exception as e:
      last_err = e
      continue
  raise HTTPException(status_code=502, detail=f\"chatbot unreachable: {last_err!s}\")
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
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G

  backend:
    build: ./backend
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped
    environment:
      - MODEL_API_URL=${MODEL_API_URL_FOR_COMPOSE}
      - MODEL_API_URL_ALT=${MODEL_API_URL_ALT_FOR_COMPOSE:-}
    deploy:
      resources:
        limits:
          memory: 1G

  caddy:
    image: caddy:latest
    restart: unless-stopped
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

  docker compose up -d --build --force-recreate
  docker compose ps
  curl -fsS http://localhost >/dev/null
'"
fi

log "STEP 6: Validate APP -> inference from APP server"
if [[ "${ALLOW_DEGRADED_CHATBOT}" == "1" ]]; then
  log "ALLOW_DEGRADED_CHATBOT=1: skipping APP -> inference validation"
  run_ssh "${APP_IP}" "bash -lc '
    set -euo pipefail
    docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps
    docker logs --tail=120 \$(docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps -q backend) || true
  '"
else
  if [[ "${SKIP_VLLM_DEPLOY}" == "1" ]]; then
    if [[ "${SINGLE_HOST}" == "1" ]]; then
      run_ssh "${APP_IP}" "bash -lc '
        set -euo pipefail
        curl -fsS http://127.0.0.1:${API_PORT}${CHATBOT_HEALTH_PATH} >/dev/null
        docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps
        docker logs --tail=80 \$(docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps -q backend) || true
      '"
    else
      run_ssh "${APP_IP}" "bash -lc '
        set -euo pipefail
        curl -fsS http://${API_IP}:${API_PORT}${CHATBOT_HEALTH_PATH} >/dev/null
        docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps
        docker logs --tail=80 \$(docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps -q backend) || true
      '"
    fi
  elif [[ "${SINGLE_HOST}" == "1" ]]; then
    run_ssh "${APP_IP}" "bash -lc '
      set -euo pipefail
      curl -fsS http://127.0.0.1:${API_PORT}/v1/models >/dev/null
      docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps
      docker logs --tail=80 \$(docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps -q backend) || true
    '"
  else
    run_ssh "${APP_IP}" "bash -lc '
      set -euo pipefail
      curl -fsS http://${API_IP}:${API_PORT}/v1/models >/dev/null
      docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps
      docker logs --tail=80 \$(docker compose -f ${APP_BASE_DIR}/docker-compose.yml ps -q backend) || true
    '"
  fi
fi

log "STEP 7: Security hardening on API server (UFW allow app IP only on ${API_PORT})"
if [[ "${REUSE_CONTAINERS}" == "1" ]]; then
  log "REUSE_CONTAINERS=1: skip UFW (unchanged from prior deploy)"
elif [[ "${SKIP_VLLM_DEPLOY}" == "1" ]]; then
  log "SKIP_VLLM_DEPLOY=1: skip UFW on API host (chatbot exposure managed via Scaleway security groups / compose)"
elif [[ "${SINGLE_HOST}" == "1" ]]; then
  log "SINGLE_HOST=1: skip UFW on separate API host (vLLM bound to 127.0.0.1 on APP)"
else
  run_ssh "${API_IP}" "bash -lc '
    set -e
    export DEBIAN_FRONTEND=noninteractive
    apt-get update
    apt-get install -y ufw
    ufw --force enable || true
    ufw allow OpenSSH
    ufw allow from ${APP_IP} to any port ${API_PORT} proto tcp
    ufw deny ${API_PORT}/tcp || true
    ufw status verbose
  '"
fi

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
- Inference URL:        $([[ "${SKIP_VLLM_DEPLOY}" == "1" ]] && echo "http://${API_IP}:${API_PORT}${CHATBOT_HEALTH_PATH} (FastAPI chatbot)" || ([[ "${SINGLE_HOST}" == "1" ]] && echo "http://127.0.0.1:${API_PORT}/v1/models (on APP) / backend uses ${MODEL_API_URL_FOR_COMPOSE}" || echo "http://${API_IP}:${API_PORT}/v1/models"))
- App stack path:       ${APP_BASE_DIR}
- Inference container:  $([[ "${SKIP_VLLM_DEPLOY}" == "1" ]] && echo "safepsy-chatbot-api (compose)" || echo "vllm")

Useful follow-ups:
- App logs: ssh root@${APP_IP} \"cd ${APP_BASE_DIR} && docker compose logs -f\"
- Inference logs (SKIP_VLLM): ssh root@${VLLM_SSH_HOST} \"cd /opt/safepsy/deployment/chatbot && docker compose logs -f\"  OR  (vLLM): ssh root@${VLLM_SSH_HOST} \"docker logs -f vllm\"
EOF
