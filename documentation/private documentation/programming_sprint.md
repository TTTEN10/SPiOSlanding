# Programming sprint & implementation roadmap

> Restored from `COMPLETE_IMPLEMENTATION_SUMMARY.md` (last revision before deletion in commit `a45b56c14`). The **MVP launch** section is the live operator view. **Part 1 / Part 2** below were reconciled with `apps/web`, `apps/api`, and `apps/ai-chatbot` on **2026-04-12** (see **Repository verification**).

---

## MVP launch roadmap (2026)

**Framework:** HubSpot’s [The $1M Solopreneur MVP](https://offers.hubspot.com/view/1m-solopreneur-mvp) stresses a **minimum viable *representation*** (ship something learnable fast), **maximize information per hour spent**, and pick tactics that match your strengths (landing + waitlist, demo video, lightweight tool, content, ads, “wizard of oz” manual fulfillment, etc.). SafePsy maps cleanly: **guest or wallet → DID → first Dr. Safe chat** is your activation story; everything else supports learning and trust, not vanity features.

### Canonical activation (what “launched” means)

Align with **`documentation/public documentation/BETA_QUICKSTART.md`**: user reaches value when **(1) DID exists** and **(2) at least one real exchange with Dr. Safe** has happened. Funnel metrics: visits → wallet connect attempts → successful session → DID mint → first chat completion → support/feedback.

### ✅ Repository verification (2026-04-12)

- ✅ **`npm run lint`** (root: web + api): passing  
- ✅ **Unit tests:** root **`npm test`** runs `vitest run` for web then API (exits cleanly for CI); per-app `cd apps/web && npm test` / `cd apps/api && npm test` are equivalent. All passing; `Status.test.tsx` uses `act()` around timer-driven updates so the suite stays warning-free.  
- ✅ **`npm run build`** (web + api): passing after pinning Tailwind to **`apps/web/tailwind.config.ts`** in **`apps/web/postcss.config.cjs`** so `vite build --config apps/web/vite.config.ts` from the monorepo root loads theme/content correctly  

### Operator checklist — ship and learn

1. **Local sanity**
   - Root `env.example` → `.env`; `apps/api/.env.example` and web env templates filled (`DATABASE_URL`, JWT, chain/RPC, contract addresses, AI upstream as configured).
   - `npm install` at repo root; `npm run db:generate` / Prisma migrate as needed; `npm run dev` (web + API) for smoke testing.

2. **Quality gate**
   - `npm run lint`, `npm run test`, `npm run build` before production.
   - Optional: `npm run verify:flow` for the mocked DID/auth path used in automation.

3. **Production deploy (this repository)**
   - Main path: **`deployment/deploy.sh`** — Terraform (`infra/terraform/envs/prod`) → chatbot stack on chatbot host → app deploy via **`deployment/deploy-app.sh`**. Requires Scaleway (or equivalent) credentials, Terraform variables, and SSH access; see script comments. Override **`APP_DOMAIN`**, **`APP_HOST`**, **`CHATBOT_HOST`**, **`SSH_KEY`** as needed; never commit secrets.
   - Legacy one-liner: `DEPLOY_LEGACY=1 ./deployment/deploy.sh` runs app deploy only.
   - Post-deploy: **`deployment/verify-production.sh`** (and any manual HTTPS/API checks you rely on).

4. **MVP learning tactics (pick 1–2 first week)**
   - **Early access / squeeze page:** One primary CTA—waitlist email, “Book a call,” or “Try guest chat”—and a way to follow up.
   - **Demo video:** Short walkthrough (wallet, Sepolia, DID, first message); shareable without requiring a full product tour.
   - **Content MVP:** Reuse approved claims from **`documentation/public documentation/CLAIMS_AND_TRUST_LANGUAGE.md`** and positioning from **`documentation/private documentation/LAUNCH.md`** / **`PERSONAS.md`**.
   - **Wizard of Oz:** Manually onboard the first cohort while you observe friction (wallet, gas, errors).

5. **Weekly review**
   - Identify the largest funnel drop-off; fix that before new features. Re-read public security/privacy guides before changing copy.

---

## ✅ Part 1: Client-side encryption for storage (ChatWidget)

### Files Created/Modified

#### Backend
1. **Database Schema** (`apps/api/schema.prisma`)
   - ✅ `EncryptedChat` model for off-chain storage

2. **API Endpoints** (`apps/api/src/routes/chat.ts` + `apps/api/src/routes/chat-completions.ts`)
   - ✅ `POST /api/chat/save` — save encrypted chat
   - ✅ `GET /api/chat/load` — load encrypted chat
   - ✅ `POST /api/chat/completions` — mounted via `mountChatCompletions(router)` (shared handler with rate limits, guest mode, streaming)

3. **Encryption Utilities** (`apps/web/src/utils/did-encryption.ts`)
   - ✅ Wallet-based key encryption/decryption
   - ✅ AES-GCM chat encryption

#### Frontend
1. **Encryption Hook** (`apps/web/src/hooks/useChatEncryption.ts`)
   - ✅ Key management and chat load/save with encryption (verified-wallet path)
   - ⚠️ **Refinement:** symmetric key still falls back to **localStorage** when loading from DID metadata is incomplete; `saveKeyToDID` does not yet submit on-chain metadata (comments reference legacy `setDidData` wording — V2 flow uses **`updateChatReference`** from the widget)

2. **ChatWidget Integration** (`apps/web/src/components/ChatWidget.tsx`)
   - ✅ Uses `useChatEncryption` for verified sessions; guest mode stays in-memory with capped prompts
   - ✅ After save, when the API returns `requiresDidUpdate`, calls **`updateChatReference`** (`apps/web/src/utils/did-contract.ts`) to update the on-chain chat reference

### Encryption Scheme Details

**Key Material:**
- **Symmetric Key**: 32-byte AES-256-GCM key (generated client-side)
- **Encrypted Key**: Symmetric key encrypted with wallet signature
- **Storage**: Encrypted key in DID's `encryptedData` field (target); interim localStorage path remains in hook

**Data Flow:**
1. Generate symmetric key (client-side)
2. Encrypt key with wallet signature
3. Store encrypted key in DID
4. Use symmetric key to encrypt chat messages
5. Store encrypted chat in database
6. Store chat hash in DID for verification

**Security:**
- Chat and summary data are stored encrypted (ciphertext-only) and decrypted client-side for display.
- To provide AI responses, message content is decrypted temporarily in server memory during the request and sent to the AI provider for completion (not strict end-to-end encryption).
- Symmetric key never stored unencrypted
- Only wallet owner can decrypt (requires private key)

---

## ✅ Part 2: Production API Refactoring (core complete)

### Legacy / parallel testing endpoints (`apps/api/src/routes/testing.ts`)

Still mounted at **`/api/testing/*`** for backward compatibility (e.g. `POST /api/testing/wallet/connect`, `POST /api/testing/wallet/verify`, `GET /api/testing/wallet/info`, `POST /api/testing/did/verify`, `POST /api/testing/did/check`). **Not automatically disabled in production** — treat as a **hardening backlog** item if you want dev-only exposure.

### ✅ Production endpoints (implemented)

- ✅ `POST /api/auth/wallet/connect` — `apps/api/src/routes/auth.ts`
- ✅ `POST /api/auth/wallet/verify` — same
- ✅ `GET /api/auth/session` — same
- ✅ `POST /api/auth/logout` — same
- ✅ `POST /api/did/check` — DID routes
- ✅ `POST /api/did/create` — DID routes
- ✅ `GET /api/did/info` — DID routes
- ✅ `POST /api/chat/save` — `chat.ts`
- ✅ `GET /api/chat/load` — `chat.ts`

### API refactoring — status

1. ✅ Create **`/api/auth/*`** routes (`routes/auth.ts`, mounted in `index.ts`)
2. ✅ Wallet session logic available on production auth routes (testing routes remain parallel)
3. ⚠️ Optionally **disable or gate `/api/testing`** when `NODE_ENV === 'production'` (not done as of 2026-04-12)
4. ✅ **Shared request validation** — `validate()` + Joi in `apps/api/src/middleware/validation.ts` (used across routes)

---

## Implementation Status

### ✅ Completed (verified in repo)

- [x] ✅ Encryption utilities (AES-GCM, wallet-based key encryption)
- [x] ✅ Database schema for encrypted chat storage
- [x] ✅ Backend chat save/load + **completions** (`chat-completions.ts`)
- [x] ✅ Frontend encryption hook
- [x] ✅ DID-aware chat persistence path (widget + contract `updateChatReference` when required)
- [x] ✅ ChatWidget integration with `useChatEncryption`
- [x] ✅ Production **`/api/auth/*`** endpoints

### ⚠️ Backlog / refinements

- [ ] **Persist encrypted symmetric key** via DID/contract metadata (reduce reliance on localStorage in `useChatEncryption`)
- [ ] **Gate or remove `/api/testing` in production** if security posture requires it
- [ ] **Key rotation mechanism** (security checklist)
- [ ] **Contract failure handling** / retries for on-chain updates (security checklist + hook comments)
- [ ] **Continuous end-to-end testing** beyond unit tests (wallet + chain smoke in staging)

### ~~Remaining Tasks~~ (historical — superseded by verification above)

1. ~~Update ChatWidget to use `useChatEncryption`~~ → ✅ Done  
2. ~~Add contract interaction for on-chain chat reference~~ → ✅ `updateChatReference` from ChatWidget  
3. ~~Create production auth endpoints~~ → ✅ Done  
4. ~~Add shared API utilities~~ → ✅ `middleware/validation` pattern in place  
5. **Test end-to-end flow** — operator/staging responsibility (see MVP checklist)

---

## Quick Start Guide

### 1. Run Database Migration

```bash
cd apps/api
npx prisma migrate dev --name add_encrypted_chats
```

### 2. Update Environment Variables

```env
# Backend
DATABASE_URL=postgresql://...
DID_IDENTITY_TOKEN_ADDRESS=0x...
RPC_URL=https://sepolia.infura.io/v3/...
JWT_SECRET=your-secret-key
```

### 3. Test Endpoints

```bash
# Save encrypted chat
curl -X POST http://localhost:3001/api/chat/save \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"encryptedChatBlob": "...", "didTokenId": "123"}'

# Load encrypted chat
curl -X GET http://localhost:3001/api/chat/load \
  -H "Authorization: Bearer <token>"
```

## Code Examples

### Frontend: Using Encryption Hook

```typescript
import { useChatEncryption } from '../hooks/useChatEncryption';

function ChatWidget() {
  const { symmetricKey, loadChat, saveChat, isLoading } = useChatEncryption();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (symmetricKey) {
      loadChat().then(setMessages);
    }
  }, [symmetricKey]);

  const handleSend = async (content: string) => {
    const newMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content,
      timestamp: new Date(),
    };
    
    const updated = [...messages, newMessage];
    setMessages(updated);
    await saveChat(updated);
  };
}
```

### Backend: Protecting Chat Endpoints

```typescript
import { authenticateWallet } from '../middleware/auth';

router.post('/save', authenticateWallet, async (req, res) => {
  const wallet = req.wallet; // Authenticated wallet
  // Save encrypted chat...
});
```

## Security Checklist

- [x] ✅ Symmetric key generated client-side
- [x] ✅ Key encrypted with wallet signature
- [x] ✅ Plaintext not persisted (ciphertext-only storage); plaintext is decrypted temporarily in server memory for AI completions
- [x] ✅ Only ciphertext stored
- [x] ✅ DID ownership verified
- [x] ✅ Network validation (Sepolia by default in current deployments)
- [ ] Key rotation mechanism
- [ ] Contract failure handling

## Notes

- V2 DID contract uses **`updateChatReference`** / **`updateChatDataReference`** (`did-contract.ts`); older `setDidData` wording in hook comments is misleading — prefer aligning comments with the live ABI.
- Key rotation requires re-encrypting all chat history
- Network failures: chat saved locally, DID update retried later
