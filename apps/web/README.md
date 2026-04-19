# SafePsy web app (`apps/web`)

Vite + React client for marketing pages, beta chat, wallet/DID flows, and legal pages.

## Guest mode

- **No wallet** is required to try the chat (`/beta/chat`). Messages stay in the browser for that session only (React state); a full page refresh clears them.
- Guests are limited to **five user messages** per session. The UI shows a banner, usage counter, and a conversion modal linking to wallet creation (e.g. MetaMask) and the in-header **Connect wallet** control.
- API requests send `mode: "guest"` on `POST /api/chat/completions` so the backend does not attach DID quota or persist guest transcripts.

## Wallet mode

After **connect + verify**, chat uses client-side encryption (`useChatEncryption`) and `/api/chat/save` / `/api/chat/load` for ciphertext storage, subject to product limits and subscriptions.
