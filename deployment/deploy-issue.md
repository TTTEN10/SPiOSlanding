# Deployment blockers and mitigations

This document summarizes issues that have blocked or complicated production deployment for SafePsy (`./deployment/deploy.sh` and related scripts). IPs and hostnames match the current Terraform defaults for prod; override with `APP_HOST`, `CHATBOT_HOST`, etc. if your infrastructure differs.

**Prod Scaleway (defaults in repo):** app **`scw-happy-app`** public **`51.159.149.66`**; chatbot / LLM API **`scw-new-psy`** public **`62.210.238.160`** (instance id `60a5e86a-07a8-4e17-aa3b-862ae586d030`, PAR2). Ensure **TCP 8000** on the chatbot SG allows the app instance IP.

---

## Field report: typical failed run (what actually happens)

This mirrors a real `deploy.sh` run where **Terraform completes** but **no code is synced** and **no Docker containers are restarted** on the VMs.

### Timeline (success then hard stop)

1. **Pre-flight** — Passes: `git` matches `origin/main`, `terraform validate` OK, outbound IPv4 printed (e.g. `88.160.139.5` when running from Cursor’s cloud agent, or your home ISP IP from a Mac).
2. **STEP 1 — Local Docker build** — Passes (optional); only validates the chatbot image on the laptop.
3. **STEP 2 — `terraform apply`** — Often reports **“No changes”** if instances already match `variables.tf` / `terraform.tfvars`. Outputs still list **app** and **chatbot** IPs from the Scaleway API.
4. **Immediately after** — `[CHECK] SSH → app (51.159.149.66)` runs with **retries** (default 3, `DEPLOY_RETRY_DELAY_SEC` between attempts).
5. **Failure** — Each attempt ends with **`Connection timed out during banner exchange`** and/or **`Connection to 51.159.149.66 port 22 timed out`**. Script exits: **`[ERROR] Cannot deploy: app host SSH failed.`**

### Why this is confusing

- **Terraform does not need SSH.** It uses the Scaleway API with keys from `terraform.tfvars` (or `TF_VAR_*`). The API can read instance IDs and state while **port 22 is closed** to your current public IP.
- **Deploy does need SSH** to push `tar` streams and run `docker compose`. The **first mandatory SSH** target is always the **app** host (`APP_HOST` / `app_public_ip`). If that fails, you never reach chatbot sync, `deploy-app.sh`, or container recreation.
- **“Banner exchange” timeout** usually means the TCP path to port 22 is blocked, filtered, or too lossy for the handshake to finish—treat it as **network / security group**, not an application bug in the repo.

### Exact mitigations for the observed error

1. In Scaleway, open **inbound TCP 22** on the **app** instance security group for the **exact IPv4** printed in **`[PRE-FLIGHT] Outbound IPv4`** (ideally a `/32` rule). Repeat for the **chatbot** instance if you use the dedicated two-VM path.
2. **Different machines = different IPs.** If you whitelist your Mac but run deploy from **Cursor Agent / GitHub Actions / another VPN**, you must whitelist **that** outbound IP too—or always run `./deployment/deploy.sh` from one trusted machine whose IP is in the SG.
3. Confirm the instance is **Running** and the **flexible IP** in the console still matches Terraform outputs (`51.159.149.66` app, `62.210.238.160` chatbot).
4. Quick test from the same host as deploy: `ssh -v -o ConnectTimeout=10 root@51.159.149.66` — if it hangs at “Connecting…” or “banner exchange”, fix SG/routing before re-running deploy.

---

## 1. SSH not reachable (most common)

### Symptom

- `ssh: connect to host <chatbot-ip> port 22: Operation timed out`
- `Connection timed out during banner exchange` / `Connection to <app-ip> port 22 timed out`
- **`[CHECK] SSH → app (<ip>)`** then repeated timeouts and **`[ERROR] Cannot SSH into app … after 3 attempts`** / **`Cannot deploy: app host SSH failed`**
- Colocate path fails at `tar | ssh` to the app host with a **Write error** (opaque failure from the pipe when SSH never connects).

### Cause

**Inbound TCP 22** to the Scaleway instances is not allowed from the **public IPv4 of the machine running the deploy** (home/office IP changed, new laptop, Cursor/agent egress IP, or rules never added). Terraform and the Scaleway API can still succeed while SSH fails.

### Mitigation

1. From the **same machine** you use for deploy, note your outbound IP (`curl -4 https://ifconfig.me/ip`). `deploy.sh` prints **`[PRE-FLIGHT] Outbound IPv4`** and, on failure, **`[HINT] Detected outbound IPv4`**—use that for Scaleway `/32` rules.
2. In **Scaleway** → instance (or security group) → **inbound rules**: allow **TCP 22** from that IP (ideally `/32`).
3. Apply the rule on **both** the **app** and **chatbot** instances if you use the split-host path; the colocate path still needs SSH to the **app** host.

### Script behavior (order matters)

- After Terraform, **`deploy.sh` always checks SSH to the app host first.** Chatbot SSH, `tar` sync, and colocation logic run only after app SSH succeeds.
- If SSH to the **dedicated chatbot host** fails (but app SSH works), `deploy.sh` **colocates** the chatbot compose on the **app** host (`SINGLE_HOST=1` + `host.docker.internal` for the proxy). That **still requires SSH to the app server**.
- NDJSON debug lines (including outbound IP hint **H6**) are written under `deployment/deployment-logs/debug-fcc1a0.log` when `deploy.sh` from `main` includes the instrumentation commits.

---

## 2. App VM cannot reach chatbot VM (split-host LLM path)

### Symptom

- From the app server: `curl http://<chatbot-ip>:8000/health` → **No route to host** or similar.
- Production `/api/v1/models` returns **502/500** because the Python proxy on the app cannot open the chatbot upstream.

### Cause

Even if the chatbot listens on `0.0.0.0:8000`, **routing or security groups** may block **app → chatbot** on **TCP 8000** (or ICMP/routing issues between public IPs in the same region). Terraform in this repo does **not** manage fine-grained SG rules (see `infra/terraform/envs/prod/main.tf` comments).

### Mitigation

- Allow **TCP 8000** from the **app instance public (or private) IP** to the **chatbot** instance SG.
- If a **private VPC** is introduced later, point `MODEL_API_URL_*` at the chatbot **private** IP instead of the public one.

### Script behavior

- After the dedicated chatbot is up, `deploy.sh` runs an **app → chatbot** HTTP probe (`ssh` to app, `curl` to `http://<chatbot>:8000/health`). If it fails, set **`FORCE_COLOCATE_ON_ROUTING_FAIL=1`** to **auto-colocate** on the app host, or fix SG/routing.
- `deploy.sh` may **colocate** when **SSH to the chatbot fails**, or when the inter-VM probe fails and **`FORCE_COLOCATE_ON_ROUTING_FAIL=1`**.

---

## 3. Chatbot container crash on boot (image / imports)

### Symptom

- Colocated or remote chatbot container **restarts**; logs show `ModuleNotFoundError: No module named 'prompt_builder'` (or `session_redis`).

### Cause

The `apps/ai-chatbot/Dockerfile` only copied `main.py` and omitted helper modules.

### Status

**Fixed in repo:** `Dockerfile` copies `prompt_builder.py` and `session_redis.py`, runs **`RUN python -c "import prompt_builder, session_redis"`** so a bad image fails at build time, and defines a **Docker HEALTHCHECK** on `/health` with a long **start-period** for model load. Rebuild images after pull.

---

## 4. Deploy health timeouts while the CPU model loads

### Symptom

- `deploy.sh` fails at “Verify colocated chatbot /health” even though the container eventually becomes healthy.

### Cause

`initialize_model()` used to run **synchronously** in the FastAPI lifespan **before** the server accepted connections, so `/health` was unreachable for a long time during Hugging Face weight load on small instances.

### Status

**Fixed in repo:** model init runs in a **background thread** so `/health` responds immediately (degraded until the model is ready).

---

## 5. Stale or unpushed `deploy.sh` (missing logging / preflight)

### Symptom

- No line `Debug NDJSON (session fcc1a0): …` after Terraform.
- Immediate failure at `tar | ssh` without a clear **preflight** SSH error to the app host.

### Cause

Local changes (NDJSON, app SSH preflight, outbound IP hint) were not on `origin/main` yet, or the machine never **`git pull`** after pushes.

### Mitigation

Always **`git pull origin main`** before diagnosing deploy behavior. Check `git log -1 deployment/deploy.sh`.

---

## 6. NDJSON log not under `.cursor/`

### Symptom

- Expected ` .cursor/debug-fcc1a0.log` never appears.

### Cause

On some hosts, writing under **`.cursor/`** can return **EPERM** (tooling / OS policy). Logs are therefore written primarily to **`deployment/deployment-logs/debug-fcc1a0.log`**.

---

## 7. Terraform / credentials

### Symptom

- Terraform fails init/apply; or **apply succeeds** with loud **warnings** (see below).
- Repeated console lines: **`Warning: Multiple variable sources detected`** on `provider "scaleway"` (`main.tf`), listing **`SCW_ACCESS_KEY`**, **`SCW_SECRET_KEY`**, **`SCW_DEFAULT_PROJECT_ID`**, **`SCW_DEFAULT_REGION`**, **`SCW_DEFAULT_ZONE`** with **AvailableSources** = *Active Profile in config.yaml* **and** *Profile defined in provider{} block*, with **Using** = *Profile defined in provider{} block*.

### Cause

**Overlapping Scaleway configuration:** Terraform is fed keys via **`terraform.tfvars`** (mapped into the `provider "scaleway"` block), while the Scaleway **Go SDK / provider** also sees an **active `scw` CLI profile** in **`~/.config/scw/config.yaml`**. Both are “valid”; the provider warns because a mistake there could point Terraform at the **wrong project** than the CLI.

A second variant: **`terraform.tfvars` exists** and you **also** set **`TF_VAR_access_key`** (or related `TF_VAR_*`) — the pre-flight in `deploy.sh` treats that as a **hard error** to avoid silent overrides.

### Mitigation

Pick **one** primary path and silence the other for Terraform runs:

1. **Tfvars-only for Terraform:** when running `terraform apply` from a shell, **`unset SCW_ACCESS_KEY SCW_SECRET_KEY SCW_DEFAULT_PROJECT_ID SCW_DEFAULT_REGION SCW_DEFAULT_ZONE`** (or run in a clean env) so only `terraform.tfvars` + `provider {}` apply; **or**
2. **CLI profile only:** remove duplicate keys from `terraform.tfvars` and pass credentials only via env / `scw` profile (less common in this repo, which documents `terraform.tfvars`); **or**
3. **Accept the warning** if you have verified **`terraform output`** IPs match the instances you expect in the Scaleway console—still reduce duplication when you have time.

Always keep **`terraform.tfvars` gitignored**; never commit secrets.

---

## 8. macOS `tar` extended attributes (noise)

### Symptom

Many lines: `tar: Ignoring unknown extended header keyword 'LIBARCHIVE.xattr.com.apple.provenance'`

### Cause

BSD `tar` on macOS embeds xattrs in archives consumed by GNU `tar` on Linux.

### Status

**Mitigated in repo:** `COPYFILE_DISABLE=1` is set for `tar` invocations in `deploy.sh` / `deploy-app.sh` where applicable.

---

## 9. Production stack vs monorepo `apps/api`

### Fact

`deploy-app.sh` deploys a **small FastAPI proxy** plus **Vite-built `apps/web`** behind Caddy. It does **not** build or run the **Node `apps/api`** service from the monorepo. “API” in that stack means **`/api/*` → Python proxy** (OpenAI-compatible passthrough to the chatbot), not the TypeScript API unless you add a separate compose/service.

---

## 10. Terraform outputs: `chatbot_private_ip` equals `chatbot_public_ip`

### Symptom

After apply, outputs show the same address for both, e.g. `chatbot_private_ip = "62.210.238.160"` and `chatbot_public_ip = "62.210.238.160"`.

### Cause

On some instance types / networking setups, the Scaleway **private** address exposed to the API may match the **public** flexible IP, or only one routable address is returned for the data source used in `modules/chatbot-instance`.

### Impact

`deploy.sh` sets **`MODEL_API_URL_ALT_FOR_COMPOSE`** from `chatbot_private_ip`. If it equals the public IP, the “alternate” URL is redundant but usually **harmless**; the proxy still tries primary `http://<chatbot_public>:8000` first.

### Mitigation

None required unless you introduce a real private VPC—then refresh outputs and env vars to use the **private** chatbot IP from the app subnet.

---

## 11. DNS: multiple `A` records for the same hostname

### Symptom

- `deployment/verify-production.sh` prints **`WARN  Multiple A records detected`** for `safepsy.com`.
- Browsers or `curl` hit **different** backends on successive requests; HTTPS or `/api/*` **intermittently** fails or shows the wrong service (e.g. traffic lands on the **chatbot** IP instead of the **app** Caddy stack).

### Cause

Both **`51.159.149.66`** (app) and **`62.210.238.160`** (chatbot) were configured as **apex** `A` records for the same name. Only the app VM should terminate TLS and serve the SPA + `/api/*` proxy.

### Mitigation

- For **`safepsy.com` / `www.safepsy.com`**, keep **`A` (and AAAA if used) only to the app instance** `51.159.149.66` (or a load balancer in front of it).
- Give the chatbot a **different** DNS name if you need a public name at all (e.g. `llm.internal.example` or no public DNS—app talks by IP or private IP).

### `deploy.sh` pre-flight (authoritative NS)

`validate_dns_mode` does **not** use the resolver default for the apex check: it reads **`NS`** for `APP_DOMAIN`, then runs **`dig +short <name> A @<each-ns>`** (e.g. `@ns0.dom.scw.cloud`). That matches the **Scaleway zone editor** and avoids **false failures** when public resolvers still cache an old second **`A`** to the chatbot after you removed it in the zone.

---

## 12. `verify-production.sh` timeouts from some networks (not always “prod is down”)

### Symptom

- Checks show **`-> 000000`** or **`curl: (28) Connection timed out`** for `https://safepsy.com`, `http://51.159.149.66`, and `/api/v1/models`.
- The same checks **pass** from your phone or home, but **fail** from Cursor Agent, CI, or a corporate network.

### Cause

Egress filtering, geo/IP blocking, or Scaleway **SG rules on port 80/443** (if you restricted HTTP/HTTPS to certain CIDRs). Less commonly, production Caddy is actually down—correlate with SSH + on-server `docker compose ps`.

### Mitigation

- Run **`bash deployment/verify-production.sh`** from a network you trust (often the same as deploy).
- If only **SSH** is restricted to your IP but **80/443** is world-open, verify can still pass from more places than deploy—compare results.
- Use **`APP_DOMAIN`**, **`APP_IP`**, and **`TIMEOUT`** env overrides as documented in the script header.

---

## Quick checklist before opening an issue

- [ ] Read **Field report** (above) if Terraform is green but deploy stops at **`[CHECK] SSH → app`** — almost always **SG + outbound IP** mismatch  
- [ ] `git pull` and latest `deployment/deploy.sh` on the machine running deploy  
- [ ] Optional: **`./deployment/deploy.sh --diagnose`** — runs pre-flight + SSH + app→chatbot probe **without** Terraform apply or stack deploy  
- [ ] **TCP 22** allowed from **this** public IP to **app** (and **chatbot** if split host) — use pre-flight **Outbound IPv4** line for `/32` rules  
- [ ] **TCP 8000** from **app** to **chatbot** if chatbot stays on a separate VM  
- [ ] **DNS:** apex hostname has **only** app IPs for HTTPS (see §11)  
- [ ] `terraform apply` succeeds for `infra/terraform/envs/prod`; if **multiple credential sources** warnings appear, plan cleanup per §7  
- [ ] After a failed run: read `deployment/deployment-logs/deploy.jsonl`, `debug-fcc1a0.log` (if present), **`tf-output.json`**, and the **outbound IPv4** line from pre-flight  
- [ ] Post-deploy: `bash deployment/verify-production.sh` from a network that can reach **443** (see §12 if everything times out)

### `deploy.sh` environment switches (reference)

| Variable | Effect |
|----------|--------|
| `SKIP_PREFLIGHT_GIT=1` | Skip “local HEAD must match `origin/main`” check |
| `REFRESH_IPS_FROM_TF=0` | Do not overwrite `APP_HOST` / `CHATBOT_HOST` from `terraform output -json` |
| `FORCE_COLOCATE_ON_ROUTING_FAIL=1` | If app cannot reach chatbot `:8000`, colocate chatbot on app |
| `PREFLIGHT_SSH=1` | After other pre-flight checks, require SSH to **current** `APP_HOST` **before** Terraform (IPs may still refresh after apply) |
| `SKIP_DNS_VALIDATION=1` | Skip pre-flight check that apex/www `A` records do not point at `CHATBOT_HOST` |
| `SKIP_POST_DEPLOY_VERIFY=1` | Skip final `curl` checks to `https://${APP_DOMAIN}/api/*` (e.g. DNS not ready from deploy laptop) |
| `CHECK_LLM=1` | After deploy success, hint to run `verify-production.sh` with LLM probe (full check is in verify script) |
| `DEPLOY_RETRY_MAX` / `DEPLOY_RETRY_DELAY_SEC` | SSH / curl retry tuning |

---

## Related files

| File | Role |
|------|------|
| `deployment/deploy.sh` | Full pipeline: pre-flight, optional `--diagnose`, Terraform → chatbot (dedicated or colocated) → `deploy-app.sh`; logs to `deployment-logs/` |
| `deployment/deploy-app.sh` | Caddy + SPA + Python proxy on app host |
| `deployment/bootstrap-chatbot-host.sh` | Chatbot-only sync when you SSH only to the chatbot host |
| `deployment/verify-production.sh` | HTTPS / `/api` smoke checks against `APP_DOMAIN` |
| `infra/terraform/envs/prod/main.tf` | Notes on SG management vs Terraform |
