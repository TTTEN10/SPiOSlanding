# SSE streaming contract — `POST /api/chat/completions`

Canonical wire format for **SafePsy chat streaming** returned by the Node API (`apps/api`). The web client (`ChatWidget`) expects **Server-Sent Events** (SSE), not raw OpenAI-style chunked JSON.

**Implementation:** `apps/api/src/routes/chat.ts`, `apps/api/src/lib/ai-gateway.service.ts`.

## Request (streaming)

- **Method / path:** `POST /api/chat/completions`
- **Headers:** `Content-Type: application/json`; optional wallet / auth headers per route.
- **Body (typical):**
  - `messages`: `{ role, content }[]`
  - `stream`: `true`
  - `mode`: `"guest"` | `"authenticated"` (guest skips quota attach / DID increment; see [CHAT_COMPLETE_GUIDE.md](../CHAT_COMPLETE_GUIDE.md))

## Response (SSE)

`Content-Type: text/event-stream`. Each event:

```
event: <event_type>
data: <json_object>

```

### Event types

| `event`   | `data` (JSON) | Meaning |
|-----------|----------------|--------|
| `connected` | e.g. `{ "message": "..." }` | Stream opened |
| `metadata`  | Model / run metadata | Optional preamble |
| `token`     | `{ "token": "<chunk>" }` | Incremental assistant text |
| `done`      | `{ "finishReason", "usage"? }` | Normal completion |
| `error`     | `{ "message", "error"?, "paywall"? }` | Failure; may include quota / paywall payload (`QUOTA_EXCEEDED`) |

### Non-streaming

If `stream` is false, the API may return a single JSON object (OpenAI-like `choices` shape). See [CHAT_COMPLETE_GUIDE.md](../CHAT_COMPLETE_GUIDE.md).

## Deployment note

`deployment/deploy-app.sh` deploys a **minimal FastAPI proxy** to vLLM’s OpenAI-compatible `/v1/*` endpoints. That proxy does **not** implement this SSE contract or `/api/chat/*` routes. End-to-end chat with the current web app requires the **Node** `apps/api` stack (or another service that implements this contract).

## Related

- [CHAT_COMPLETE_GUIDE.md](../CHAT_COMPLETE_GUIDE.md) — routes, guest mode, examples
- [DEPENDENCIES.md](../DEPENDENCIES.md) — runtime stacks
