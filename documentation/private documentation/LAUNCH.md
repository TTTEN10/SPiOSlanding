# Launch — One-Page Overview

## About (boilerplate for press / partners)

SafePsy is a privacy-first mental wellness platform that helps people get private support between therapy sessions without giving up control of their data. Users connect a Web3 wallet, create an on-chain identity (DID), and chat with Dr. Safe—an ethical AI assistant that does not replace licensed therapy. Chat and summary data are encrypted at rest; encryption keys are derived from the user’s wallet and are not stored on SafePsy servers. SafePsy does not use chat content to train models or store user data with third parties. The platform is designed with privacy-by-design principles and aims to operate in line with APA guidelines for professional ethics. SafePsy is not HIPAA certified (yet) and does not provide medical advice, diagnosis, or treatment.

## Who SP is for

1. **People in or considering therapy** who want private, structured support between sessions—to prepare for appointments, organize thoughts and emotions, or practice coping tools without leaving a trail on traditional platforms.

2. **Privacy-conscious users** who want AI-assisted reflection and mental wellness support without giving up data ownership—no training on their data, no third-party storage of their conversations, keys in their control (wallet).

---

## Value prop (5-second test)

**SP helps people get private mental wellness support between sessions without giving up control of their data.**

- ✅ Concrete: “private mental wellness support,” “between sessions,” “control of their data.”
- ❌ Avoid: “AI-driven collaborative platform for strategic problem solving” — too abstract.

---

## The one action = activation

**A user is activated when they have:**

1. **Created their DID token** (on-chain identity via wallet; soulbound, non-transferable).
2. **Had their first chat with Dr. Safe** (the ethical AI assistant).

Until both are done, the user has not fully “started” with SP. Design onboarding and success metrics around this single activation moment.

---

## Positioning + differentiation (anti-confusion)

### What SP is

SP (SafePsy) is a privacy-first mental wellness platform that gives you an AI assistant (Dr. Safe) for reflection and support between therapy sessions, with identity and encryption keys you control via your wallet. Data is encrypted at rest, we do not use your chats to train models, and we do not store your data with third parties.

### What SP is not

- **Not a replacement for a therapist** — The AI does not diagnose, treat, or provide clinical advice; it complements licensed care (prep, reflection, coping practice).
- **Not fully end-to-end encrypted in the strict sense** — The server temporarily decrypts messages in memory to call the AI provider; we do not log or store plaintext.
- **Not HIPAA certified** — We implement HIPAA-style safeguards but are not certified (yet).

### Three pillars (Pillar → benefit → proof point)

| Pillar | Benefit | Proof point |
|--------|---------|-------------|
| **Privacy & key control** | You own and control your data; no training on your chats. | Encryption keys derived from your wallet, not stored on our servers; client-side encryption (AES-256-GCM); no logging of chat content. |
| **Verifiable identity** | Transparent, tamper-evident identity you can prove without a central authority. | Soulbound DID token on-chain (Sepolia); wallet-based auth; governance cannot impersonate identities. |
| **Ethical AI** | Support between sessions without claiming to be clinical care. | Dr. Safe positioned as complement to therapy; APA-aligned ethics; clear "not a therapist" in ToS and FAQ. |

### Differentiation matrix (SP vs 3 alternatives)

| Dimension | SP (SafePsy) | abby.gg | BetterHelp | Generic AI chatbot (e.g. ChatGPT) |
|-----------|--------------|---------|------------|-----------------------------------|
| **Identity & keys** | You control: wallet + DID; keys never on our server. | Account with provider; data held by provider. | Account with provider; keys and data held by provider. | Account with provider; data used per provider policy (often for training). |
| **Training on your data** | We do not use your chat content to train models. | App learns and improves with use (training on interactions). | Varies; often data used for product/analytics. | Often used to train or improve models. |
| **Role of AI** | AI = complement to therapy (prep, reflection); not diagnosis/treatment. | AI as primary support; not a licensed therapist; 24/7 chat/voice. | Human therapist primary; little or no AI in session. | No clinical framing or boundaries; not therapy-specific. |
| **On-chain / governance** | DID on-chain; upgrades via Timelock + multisig; transparent. | Centralized; no public audit trail. | Centralized; no public audit trail. | Centralized. |

---

## Explanations by persona

Use these when writing one-pagers, emails, or pitch decks. Full persona list: **[PERSONAS.md](./PERSONAS.md)**. Keep all claims aligned with [CLAIMS_AND_TRUST_LANGUAGE.md](../public documentation/CLAIMS_AND_TRUST_LANGUAGE.md).

### User personas

**In-therapy (between sessions)**  
“SafePsy gives you a private space between therapy sessions. Connect your wallet, create your identity once, and chat with Dr. Safe to reflect, prepare for appointments, or practice coping tools. Your conversations are encrypted at rest and we don’t use them to train AI. You keep control of your data—we don’t store it with third parties. Dr. Safe complements your therapist; it doesn’t replace them and doesn’t give clinical advice.”

**Considering therapy / first-step**  
“SafePsy is a low-pressure way to explore mental wellness support. You don’t need to book a therapist first. Connect a wallet, create your on-chain identity, and talk to Dr. Safe to organize thoughts and emotions in a confidential space. No centralized account ties your name to your use. We don’t train on your data or hand it to third parties. When you’re ready, SafePsy can support you alongside licensed therapy.”

**Privacy-first**  
“SafePsy is built so you keep control. Your encryption keys come from your wallet and are not stored on our servers. Chat and summary data are encrypted at rest (AES-256-GCM); we don’t log chat content or use it to train models. We don’t send your identity or DID to the AI provider—only message content for responses. You can export or delete your data. Identity is on-chain (DID) so you can prove it without us holding custody.”

### Partners

**Psychology associations / professional bodies**  
“SafePsy is a privacy-first mental wellness platform that positions AI as a complement to licensed therapy, not a substitute. We aim to operate in line with APA guidelines and professional ethics. The AI does not diagnose, treat, or provide clinical advice; it supports reflection, preparation, and coping practice between sessions. Users control their data via wallet and on-chain identity (DID); we implement privacy-by-design and do not use chat content to train models. We are not HIPAA certified and do not certify compliance with any professional body.”

**NGOs (mental health, digital rights, humanitarian)**  
“SafePsy offers private, AI-assisted support between therapy sessions with user-controlled data. Identity and encryption keys are wallet-based; we don’t store user data with third parties or use chats to train AI. Built for global access and transparent pricing. We don’t replace crisis or clinical care—we complement licensed therapy. For digital-rights audiences: governance is transparent (Timelock + multisig); DID and metadata are on-chain; chat content is not. For humanitarian/access: borderless, wallet-based access; privacy by design.”

**Employers / healthcare systems (B2B)**  
“SafePsy provides a mental wellness tool that keeps data in the user’s control—no employer or payer access to conversations. Users connect a wallet and use an ethical AI assistant (Dr. Safe) for between-session support. We implement measures aimed at GDPR and HIPAA-style safeguards (we are not HIPAA certified). The AI does not replace therapy or provide clinical advice. Scalable for wellness programs without central storage of sensitive content.”

### Investors

**Solo / angel**  
“SafePsy is a privacy-first mental wellness product: wallet + on-chain identity (DID), then chat with an ethical AI assistant (Dr. Safe) for support between therapy sessions. We don’t train on user data or store it with third parties; keys stay with the user. Clear positioning: AI complements therapy, doesn’t replace it. Activation = DID creation + first chat. Target users: people in or considering therapy who want control over their data.”

**Incubator**  
“SafePsy: mental wellness platform with wallet-based identity (DID on Sepolia) and an AI assistant (Dr. Safe) for between-session support. Value prop: private support without giving up data control—encryption at rest, keys from wallet, no training on chats. Governance: Timelock + multisig for upgrades. Traction: activation = DID + first chat. We’re building for product–market fit with privacy-conscious and therapy-adjacent users; roadmap includes scaling and compliance path.”

**VC (health tech or Web3)**  
“SafePsy is a privacy-first mental wellness platform. Users get an AI assistant (Dr. Safe) for reflection and support between therapy sessions while retaining data ownership: wallet-derived keys, encrypted storage, no training on user data, no third-party storage. Identity is on-chain (DID); governance is Timelock + multisig. We are not a therapist marketplace or replacement for clinical care. TAM: people in or considering therapy and privacy-conscious users globally. Monetization: freemium + premium; tokenomics in place ($PSY).”

**Centralized exchange (CEX)**  
“SafePsy is a mental wellness app with real Web3 use: wallet-based auth and on-chain identity (DID, Sepolia). Users chat with an ethical AI assistant (Dr. Safe); data is encrypted at rest and keys are user-controlled. We don’t train on chat data or store it with third parties. Token ($PSY) ties into premium and ecosystem. Clear compliance stance: we implement safeguards but are not HIPAA certified; we don’t provide medical advice. Relevant for users who already hold wallets and care about privacy and data ownership.”

**Decentralized exchange / DeFi / DAO**  
“SafePsy uses blockchain for identity and user sovereignty: DID (soulbound, on-chain), wallet-controlled encryption keys, no central custody of user data. The product is mental wellness—an AI assistant (Dr. Safe) for between-therapy support—with privacy by design: no training on user data, no third-party storage. Governance is Timelock + multisig. AI complements licensed therapy and does not diagnose or treat. Fit for users and treasuries that care about self-sovereign identity and privacy-preserving health tech.”

---

## Claims and trust language (avoid reputational damage)

Use **approved wording** only. Evidence and full tables: **[CLAIMS_AND_TRUST_LANGUAGE.md](../public documentation/CLAIMS_AND_TRUST_LANGUAGE.md)**.  
For difficult questions (encryption, compliance, on-chain, AI): **[FAQ](../public documentation/FAQ.md)**.

### Trust claims at a glance (approved vs disallowed)

| Area | Approved (use this) | Disallowed (do not say) |
|------|---------------------|--------------------------|
| **Encryption at rest** | Chat/summary data encrypted at rest with AES-256-GCM; only ciphertext stored. | "End-to-end encryption" without caveat; "Nobody can ever read your data". |
| **Key control** | Keys derived from your wallet, not stored on our servers; you control your keys. | "SafePsy never has access to unencrypted data" (server decrypts for AI). |
| **Transit** | Data over TLS 1.3; sensitive content encrypted client-side before sending. | "Fully end-to-end encrypted" (implies server never sees plaintext). |
| **AI processing** | Message content decrypted temporarily in server memory only during request; not written to disk/logs/DB. | "Your messages are never seen by our servers"; "Complete privacy" without stating AI provider sees content. |
| **Privacy-by-design** | Privacy-by-design: encryption at rest, client-side key control, minimal metadata to AI, no chat content logging. | "Your data is never shared" (AI provider receives message content). |
| **Metadata to AI** | We do not send user identifiers, DID, or session metadata to AI; only message content for processing. | "We never send your data to third parties". |
| **Content logging** | We do not log chat message content; security events logged with redacted identifiers. | "We never log anything". |
| **Security measures** | AES-256-GCM, TLS 1.3, DID auth, security headers, rate limiting, audit logging. | "Unhackable"; "Military-grade" unqualified; "100% secure". |
| **Audit logging** | Security-relevant events in audit logs; redacted identifiers; no full PII/secrets. | "We log everything for your safety" (implies content logging). |
| **GDPR** | Measures aimed at GDPR compliance (rights, bases, minimization); confirm full compliance with legal advice. | "GDPR certified"; "Fully GDPR compliant" without legal sign-off. |
| **HIPAA** | Measures supporting HIPAA-style safeguards; we are not a HIPAA-covered entity and do not hold certification; consult counsel if covered. | "HIPAA compliant"; "HIPAA certified". |
| **ISO 27001** | Controls aligned with ISO/IEC 27001:2022; we are not certified. | "We are ISO 27001 compliant". |
| **APA/EFPA** | We aim to operate in line with APA guidelines and professional ethics; we do not certify compliance. | "Compliant with APA and HIPAA standards" (overclaim). |
| **Network** | DID operations run on [Sepolia Testnet / Ethereum Mainnet]; check app/docs for current network. | "We use Ethereum Mainnet" when on Sepolia; wrong Chain ID. |
| **On-chain data** | DID identifiers, document metadata, service endpoints, authorization events on-chain and public; chat content not on-chain. | "Everything is private on the blockchain"; "Your therapy content is on-chain". |
| **Immutability** | DID lifecycle and authorization events on-chain, tamper-evident and persistent. | "Everything on blockchain is immutable" (contracts can be upgraded). |
| **Smart contracts** | DID contracts on Sepolia internally audited; invariant tests and verification scripts; external audit required before mainnet. | "Our contracts are audited" without internal/Sepolia; "Fully audited". |
| **Governance** | Upgrades and sensitive ops governed by Timelock and multisig Safe(s). | "Fully decentralized governance" (if control is a Safe). |
| **AI role** | AI is not a substitute for professional care; no medical advice, diagnosis, or treatment; consult licensed professionals. | "AI therapist"; "Replaces a therapist"; "Clinical advice". |
| **AI data use** | We do not use your chat content to train our models; content sent to AI provider for responses only. | "Your data is never sent to anyone". |
| **Uptime** | We aim for high availability but do not guarantee uninterrupted service; see Terms. | "99.9% uptime"; "Guaranteed availability" (unless contractually agreed). |
| **Accessibility** | We strive for WCAG 2.1 Level AA (or AAA where documented). | "WCAG certified"; "Fully ADA compliant" unless legally confirmed. |
| **AI provider** | Chat content is processed by a third-party AI provider; their data and retention policies apply. | "We control all data"; "No third party ever sees your data". |
| **Data deletion** | Off-chain data can be deleted on request; on-chain DID/events are permanent; we can revoke DID. | "We can delete everything"; "All data is erased" (on-chain cannot be). |
| **Liability** | Strong measures in place; we do not guarantee invulnerability. No guarantee of absolute security. | "100% safe"; "We guarantee no breaches". |
| **Token ($PSY)** | $PSY is a utility token; not financial or medical advice; see ToS and disclaimers. | "Investment"; "Securities"; "Guaranteed returns". |
| **Revocation** | DIDs can be revoked permanently; address cannot get new DID; revocation = permanent loss of app access to that identity's data. | "We can undo revocation"; "You can get a new DID with same address after revoking". |
| **RAG** | RAG indexes psychoeducational documents only; user chat content is not indexed. | "Your conversations are used to train the knowledge base". |

### Hard Questions FAQ

**Location:** [documentation/public documentation/FAQ.md](../public documentation/FAQ.md)

Covers: encryption (E2E?, who can read?, key loss), compliance (HIPAA, GDPR, ISO, APA), blockchain (network, on-chain content, traceability), security (audits, breaches), AI (replacement for therapist?, training on data?), governance (who controls contracts, revocation), data (deletion, retention), liability (guarantees). Use these answers for support, leadership, and help center; keep wording consistent with CLAIMS_AND_TRUST_LANGUAGE.md.

---

## Production deploy (Scaleway)

**Terraform** (`infra/terraform/envs/prod`): credentials via either:

1. **Environment:** `TF_VAR_scaleway_access_key`, `TF_VAR_scaleway_secret_key`, `TF_VAR_scaleway_project_id` (or short aliases `TF_VAR_access_key`, `TF_VAR_secret_key`, `TF_VAR_project_id`).

2. **`terraform.tfvars`** in that directory (from `terraform.tfvars.example`; gitignored).

**SSH + hosts** (optional): `SSH_KEY`, `APP_HOST`, `CHATBOT_HOST`, `APP_DOMAIN`, `CADDY_SITE_NAMES` — see `deployment/deploy.sh` defaults (`safepsy.com`, app/chatbot IPs).

**Full deploy:** `./deployment/deploy.sh` from repo root. **App-only:** `DEPLOY_LEGACY=1 ./deployment/deploy.sh`.

### vLLM model (Dolphin Mistral 24B)

The production deployment scripts support a vLLM OpenAI-compatible inference container. For **dphn/Dolphin-Mistral-24B-Venice-Edition**, vLLM must run with **Mistral tokenizer mode** (`tokenizer_mode=mistral`).

> Operational note: this checkpoint is **GPU-only** in practice (the model card indicates **~60GB+ VRAM** for full GPU inference). Ensure your API host has sufficient GPU memory and raise vLLM container memory limits as needed.

Example (copy/paste):

```bash
MODEL_ID=dphn/Dolphin-Mistral-24B-Venice-Edition \
VLLM_TOKENIZER_MODE=mistral \
./deployment/deploy-app.sh
```

**Verify:** `APP_DOMAIN=safepsy.com APP_IP=<app-public-ip> CHECK_LLM=1 ./deployment/verify-production.sh`; then HTTPS, `/api/healthz`, and chat as needed.

---


