# ISMS Scope (ISO 27001:2022)

**Document owner:** [Assign role, e.g. CISO / Tech Lead]  
**Last reviewed:** [Date]  
**Version:** 1.0

## 1. Scope Statement

The Information Security Management System (ISMS) covers the **SafePsy** platform: the set of applications, services, and supporting infrastructure used to deliver secure, ethical, and human-centred online therapy and mental health support.

## 2. Organizational Boundaries

- **In scope:** SafePsy product development, operations, and support performed by [Organization name / team].
- **Out of scope (for this ISMS):** Third-party therapy providers’ own systems and processes; end-users’ personal devices and networks; general corporate IT not used to process SafePsy data.

## 3. Technological Scope

### 3.1 In-scope systems and assets

| Asset / system | Description | Information types |
|----------------|-------------|-------------------|
| SafePsy Web App | Frontend (React/Vite) – landing, wallet connect, subscription, chat UI | User interaction, no persistent PII in frontend-only storage |
| SafePsy API | Backend API (Node.js/Express) – auth, DID, chat, payments, subscriptions | Authentication data, wallet addresses, subscription/payment metadata |
| Database | PostgreSQL (e.g. Prisma) – subscriptions, encrypted chat refs, contact/email, RAG/audit logs | Personal data, special category (mental health), financial metadata |
| AI/Chat service | AI gateway and RAG – prompts, responses, indexing | Mental health–related content (encrypted at rest; processed in memory) |
| Smart contracts / DID | Sepolia (or mainnet) – DID registry, ownership, on-chain references | Wallet addresses, DID identifiers, integrity hashes |
| Infrastructure | Hosting (e.g. Scaleway), TLS termination (e.g. Caddy), WAF, secrets (e.g. Scaleway Secret Manager) | Config, keys, logs, network flows |
| CI/CD & code | Repositories, build and deploy pipelines (e.g. GitHub Actions) | Source code, config, deployment secrets |

### 3.2 Excluded from technological scope

- User-owned devices and browsers (only their use of the in-scope services is in scope from a “service design” perspective).
- Third-party SaaS not directly processing SafePsy sensitive data (e.g. generic tooling) may be listed as “supporting” and risk-assessed separately.

## 4. Information to Be Protected

- **Personal data:** Email, name, contact form content, IP (hashed where applicable), wallet address.
- **Special category data:** Mental health–related content in chat and RAG (encrypted; minimal retention by design).
- **Financial:** Payment metadata (Stripe, crypto), subscription status; no persistent storage of full card numbers.
- **Technical:** API keys, DB credentials, signing keys, TLS certs; logs (with PII/sensitive redaction).

## 5. Interested Parties and Requirements

- **Users:** Confidentiality and privacy of mental health data; secure authentication (e.g. wallet/SIWE).
- **Regulators:** GDPR, ePrivacy; potential health-sector expectations depending on jurisdiction.
- **Partners / auditors:** Evidence of security controls and audit trails.

## 6. Scope Justification

This scope is chosen to include all systems that create, process, or store SafePsy user and operational data, so that risks can be assessed and controls applied consistently. Exclusions are limited and documented so that extended scope (e.g. future certification) can be defined clearly.

---

*This scope should be reviewed at least annually or when significant changes to the product or infrastructure occur.*
