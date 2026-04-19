## Chatbot instance spec (production)

This repo supports two deployment modes for the chatbot/LLM side:

1) **FastAPI chatbot container** (what `deployment/deploy.sh` deploys by default via `deployment/chatbot`): can run on **CPU** if the underlying model/provider is CPU-friendly (or remote).
2) **vLLM OpenAI-compatible container** (what `deployment/deploy-app.sh` can deploy when `SKIP_VLLM_DEPLOY=0`): for **`dphn/Dolphin-Mistral-24B-Venice-Edition`** this is **GPU-only in practice**.

### Option A — Keep current CPU chatbot (recommended on `DEV1-M`)

If you want to keep using the dedicated chatbot host (`scw-new-psy`, `DEV1-M`, 3 vCPU / 4GB) for the FastAPI chatbot (not vLLM 24B), the current spec can be acceptable **only if**:

- The chatbot is not loading a large local LLM into RAM, and
- The chatbot is proxying to a remote LLM provider or using a small local model.

Minimum CPU spec for “proxy/route + light logic”:
- **vCPU**: 2+
- **RAM**: 2–4 GB
- **Disk**: 20–40 GB SSD
- **Network**: 200 Mbps+

### Option B — vLLM Dolphin Mistral 24B (recommended spec)

For `dphn/Dolphin-Mistral-24B-Venice-Edition` with vLLM (OpenAI-compatible), plan for **GPU VRAM** first. A DEV1-M cannot run this model with vLLM.

Recommended production spec:
- **GPU**: 1× **80 GB VRAM** class GPU (or multiple GPUs whose aggregate VRAM is sufficient and supported by your vLLM tensor parallelism plan)
  - Target: enough VRAM for weights + KV cache + runtime overhead.
- **vCPU**: 8–16+
- **RAM**: 64–128 GB
- **Disk**: 200 GB+ SSD (container layers + model cache + logs); 500 GB if you expect multiple models/checkpoints
- **Network**: 1 Gbps preferred

Operational notes:
- Ensure vLLM runs with **`VLLM_TOKENIZER_MODE=mistral`** for this model.
- Expect to tune runtime flags (e.g. max context length, GPU memory utilization) and raise container memory limits.

### Security group requirements (chatbot host)

Whether CPU FastAPI or GPU vLLM:
- Inbound **TCP 22** from your deploy machine’s public IPv4 `/32`
- Inbound **TCP 8000** from the **app host IP** (only), for `http://<chatbot>:8000/health` and inference routes

