# SafePsy — Claims, Trust Language, Evidence & Maintenance

This document lists every trust claim SafePsy might make, with **approved wording**, **evidence**, and **disallowed wording** to avoid reputational damage and overclaiming. It also defines **evidence paths** and **maintenance** so claims stay accurate and auditable.

**Evidence paths** in the tables below are relative to the public documentation folder (this folder) unless marked as internal. Internal evidence (code, runbooks, private deployment docs) is listed in [Evidence paths and maintenance](#evidence-paths-and-maintenance) at the end.

---

## 1. Encryption and data protection

| Aspect | Approved wording | Evidence | Disallowed wording |
|--------|------------------|----------|--------------------|
| **Encryption at rest** | "Chat and summary data are encrypted at rest using AES-256-GCM. Only ciphertext is stored in the database." | [ENCRYPTION_COMPLETE_GUIDE.md](./ENCRYPTION_COMPLETE_GUIDE.md) (encryption flow, trust boundaries); [PRIVACY-BY-DESIGN.md](./PRIVACY-BY-DESIGN.md); client-side encryption before storage | "End-to-end encryption" (without caveat); "Nobody can ever read your data" |
| **Key control** | "Encryption keys are derived from your wallet and are not stored on SafePsy servers. You control your keys." | [ENCRYPTION_COMPLETE_GUIDE.md](./ENCRYPTION_COMPLETE_GUIDE.md) (wallet as key, DEK in DID); wallet-based key derivation; key material never transmitted to server | "SafePsy never has access to … unencrypted data" (server has transient plaintext for AI) |
| **Transit** | "Data is transmitted over TLS 1.3. Sensitive content is encrypted client-side before sending." | [SECURITY_COMPLETE_GUIDE.md](./SECURITY_COMPLETE_GUIDE.md); TLS 1.3; client-side AES before upload | "Fully end-to-end encrypted" (implies server never sees plaintext) |
| **AI processing** | "To provide AI responses, message content is decrypted temporarily in server memory only during the request. Plaintext is not written to disk, logs, or database." | [ENCRYPTION_COMPLETE_GUIDE.md](./ENCRYPTION_COMPLETE_GUIDE.md) (trust boundaries, server-side temporary decryption); no-content-logging policy; AI gateway implementation | "Your messages are never seen by our servers"; "Complete privacy" (without stating AI provider sees content) |

---

## 2. Privacy

| Aspect | Approved wording | Evidence | Disallowed wording |
|--------|------------------|----------|--------------------|
| **Privacy-by-design** | "SafePsy is designed with privacy-by-design principles: encryption at rest, client-side key control, minimal metadata to AI providers, and no logging of chat content." | [PRIVACY-BY-DESIGN.md](./PRIVACY-BY-DESIGN.md); DPIA (in-app); log redaction; no PII in audit logs | "Your data is never shared" (AI provider receives message content) |
| **Metadata to AI** | "We do not send user identifiers, DID information, or session metadata to the AI service. Only message content is sent as required for AI processing." | [ENCRYPTION_COMPLETE_GUIDE.md](./ENCRYPTION_COMPLETE_GUIDE.md) (Scaleway receives no identifiers); gateway implementation | "We never send your data to third parties" |
| **Content logging** | "We do not log chat message content. Security-relevant events (e.g. authentication) are logged with redacted identifiers." | Log redaction middleware; no-content-logging policy in DPIA/Security docs; [SECURITY_COMPLETE_GUIDE.md](./SECURITY_COMPLETE_GUIDE.md) | "We never log anything" |

---

## 3. Security (technical)

| Aspect | Approved wording | Evidence | Disallowed wording |
|--------|------------------|----------|--------------------|
| **Security measures** | "We use AES-256-GCM, TLS 1.3, DID-based authentication, security headers, rate limiting, and audit logging for security-relevant events." | Security & Privacy Policy; [SECURITY_COMPLETE_GUIDE.md](./SECURITY_COMPLETE_GUIDE.md); WAF/headers docs | "Unhackable"; "Military-grade" (unless qualified); "100% secure" |
| **Audit logging** | "We record security-relevant events (e.g. authentication success/failure) in audit logs. Logs use redacted identifiers and do not contain full PII or secrets." | Security policy; log redaction; DPIA | "We log everything for your safety" (implies content logging) |

---

## 4. Compliance (GDPR, HIPAA, ISO, APA/EFPA)

| Aspect | Approved wording | Evidence | Disallowed wording |
|--------|------------------|----------|--------------------|
| **GDPR** | "We implement measures aimed at GDPR compliance, including data subject rights (access, rectification, erasure, portability, restriction, objection), lawful bases, and data minimization. Whether we are fully compliant in your jurisdiction should be confirmed with legal advice." | DPIA; Security & Privacy Policy (rights); consent and retention docs | "We are GDPR certified" (no certification); "Fully GDPR compliant" (unless legally confirmed) |
| **HIPAA** | "We implement technical and organizational measures that support HIPAA-style safeguards (access control, audit controls, transmission security, integrity). We are not a HIPAA-covered entity and do not hold HIPAA certification. If you are a covered entity or business associate, consult legal counsel." | Security policy (safeguards); [whitepaper/whitepaper.md](./whitepaper/whitepaper.md) ("Not HIPAA Certified"); [ISO27001/README.md](./ISO27001/README.md) certification note | "HIPAA compliant"; "HIPAA certified" |
| **ISO 27001** | "Our security controls and documentation are aligned with ISO/IEC 27001:2022. We are not certified to ISO 27001; certification would require an accredited audit." | [ISO27001/README.md](./ISO27001/README.md) (certification note); ISMS scope; SoA; Security policy | "ISO 27001 certified"; "We are ISO 27001 compliant" |
| **APA / EFPA** | "We aim to operate in line with APA guidelines and professional ethics for psychological services. We do not certify or guarantee compliance with any specific professional body's requirements." | About Us (ethics); professional context | "Compliant with APA and HIPAA standards" (overclaim; HIPAA is legal, not professional-body) |

---

## 5. Blockchain and on-chain

| Aspect | Approved wording | Evidence | Disallowed wording |
|--------|------------------|----------|--------------------|
| **Network** | "DID operations run on [Sepolia Testnet / Ethereum Mainnet]. Check the app and docs for the current network." | Code: `SUPPORTED_CHAIN_ID = 11155111` (Sepolia); deployments on Sepolia; mainnet not yet in production | "We use Ethereum Mainnet" (if app is on Sepolia); stating wrong Chain ID |
| **On-chain data** | "DID identifiers, document metadata, service endpoints, and authorization events are stored on the blockchain and are public. Chat content is not stored on-chain; only references or hashes may be." | [PRIVACY-BY-DESIGN.md](./PRIVACY-BY-DESIGN.md) (on-chain vs off-chain); [DID_COMPLETE_GUIDE.md](./DID_COMPLETE_GUIDE.md); contract docs | "Everything is private on the blockchain"; "Your therapy content is on-chain" |
| **Immutability** | "DID lifecycle and authorization events are recorded on-chain and are tamper-evident and persistent." | [SMART_CONTRACTS_AUDIT_REPORT.md](./SMART_CONTRACTS_AUDIT_REPORT.md); [api/contracts/governance/GOVERNANCE.md](./api/contracts/governance/GOVERNANCE.md) | "Everything on blockchain is immutable" (contracts can be upgraded where designed) |

---

## 6. Governance and audits

| Aspect | Approved wording | Evidence | Disallowed wording |
|--------|------------------|----------|--------------------|
| **Smart contracts** | "Our DID smart contracts on Sepolia have undergone an internal audit. Invariant tests and on-chain verification scripts are in place. A professional external audit is required before mainnet." | [SMART_CONTRACTS_AUDIT_REPORT.md](./SMART_CONTRACTS_AUDIT_REPORT.md); invariant tests and bytecode verification scripts in repo | "Our contracts are audited" (without saying internal / Sepolia); "Fully audited" |
| **Governance** | "Contract upgrades and sensitive operations are governed by a Timelock and multisig Safe(s)." | [api/contracts/governance/GOVERNANCE.md](./api/contracts/governance/GOVERNANCE.md); GovernanceTimelock; Safe addresses registry | "Fully decentralized governance" (if control is limited to a Safe) |

---

## 7. AI and therapy

| Aspect | Approved wording | Evidence | Disallowed wording |
|--------|------------------|----------|--------------------|
| **AI role** | "The AI assistant is not a substitute for professional mental health care. It does not provide medical advice, diagnosis, or treatment. Always consult licensed professionals for clinical decisions." | Terms of Service; [HARD_QUESTIONS_FAQ.md](./HARD_QUESTIONS_FAQ.md) (AI not replacement) | "AI therapist"; "Replaces a therapist"; "Clinical advice" |
| **AI data use** | "We do not use your chat content to train our models. Message content is sent to the AI provider (e.g. Scaleway or our GPU service) to generate responses only." | [CHAT_COMPLETE_GUIDE.md](./CHAT_COMPLETE_GUIDE.md); no training on user data stated in docs | "Your data is never sent to anyone" |

---

## 8. Availability and SLAs

| Aspect | Approved wording | Evidence | Disallowed wording |
|--------|------------------|----------|--------------------|
| **Uptime** | "We aim for high availability but do not guarantee uninterrupted service. AI and infrastructure may be modified or suspended as described in our Terms." | Terms of Service (no guarantee of uninterrupted AI service) | "99.9% uptime"; "Guaranteed availability" (unless contractually agreed) |

---

## 9. Accessibility

| Aspect | Approved wording | Evidence | Disallowed wording |
|--------|------------------|----------|--------------------|
| **WCAG** | "We strive to meet WCAG 2.1 Level AA [or AAA where documented] for accessibility. Specific pages may have been designed with enhanced accessibility in mind." | HiddenPage / admin (WCAG AAA referenced); config | "We are WCAG certified" (no formal certification); "Fully ADA compliant" (unless legally confirmed) |

---

## 10. Third-party trust

| Aspect | Approved wording | Evidence | Disallowed wording |
|--------|------------------|----------|--------------------|
| **AI provider** | "Chat content is processed by a third-party AI provider. Their data handling and retention policies apply to the content they process." | [ENCRYPTION_COMPLETE_GUIDE.md](./ENCRYPTION_COMPLETE_GUIDE.md) (Scaleway/GPU); AI gateway implementation | "We control all data"; "No third party ever sees your data" |

---

## 11. Data deletion and retention

| Aspect | Approved wording | Evidence | Disallowed wording |
|--------|------------------|----------|--------------------|
| **Off-chain deletion** | "We support deletion of your off-chain data (e.g. chat history, encrypted blobs). Once deleted according to our process, we do not retain it in our active systems." | [QUICKSTART_AND_OFFBOARDING.md](./QUICKSTART_AND_OFFBOARDING.md); deletion process; storage/API implementation | "We delete everything immediately everywhere"; "All data is erased" (on-chain cannot be erased) |
| **On-chain permanence** | "On-chain DID and lifecycle events are permanent on the blockchain and cannot be erased. We can revoke your DID so it is no longer used for access or identification in our app." | [QUICKSTART_AND_OFFBOARDING.md](./QUICKSTART_AND_OFFBOARDING.md); [DID_COMPLETE_GUIDE.md](./DID_COMPLETE_GUIDE.md) (revocation) | "We can delete your blockchain data"; "Everything can be removed" |
| **Retention** | "Retention is described in our Privacy Policy and related docs. We do not retain chat content in plaintext; encrypted data may be kept for the periods stated there. Audit and security logs (with redacted identifiers) may be kept longer for security and compliance." | Privacy Policy; [HARD_QUESTIONS_FAQ.md](./HARD_QUESTIONS_FAQ.md) (Q19); DPIA | "We keep your data forever"; "We never keep logs" |

---

## 12. Liability and guarantees

| Aspect | Approved wording | Evidence | Disallowed wording |
|--------|------------------|----------|--------------------|
| **Security guarantee** | "We implement strong technical and organizational measures (encryption, access control, logging, etc.) but we do not guarantee that our systems are invulnerable. No online service can guarantee absolute security." | Terms of Service; [HARD_QUESTIONS_FAQ.md](./HARD_QUESTIONS_FAQ.md) (Q20) | "Your data is 100% safe"; "We guarantee no breaches"; "Fully secure" |
| **Incident response** | "We have incident response and security practices in place. In the event of a security incident that affects your data, we would follow our procedures and applicable law (including breach notification where required)." | Security policy; incident runbooks (internal) | "We will never have a breach"; "We are breach-proof" |

---

## 13. Token ($PSY) and utility

| Aspect | Approved wording | Evidence | Disallowed wording |
|--------|------------------|----------|--------------------|
| **Token nature** | "$PSY is a utility token for premium access, ecosystem participation, and governance-related features. This is not financial or medical advice. Users must read our Terms of Service and applicable disclaimers." | [TOKENOMICS.md](./TOKENOMICS.md); Terms of Service; partner/exchange one-pagers | "Investment"; "Securities"; "Guaranteed returns"; "Medical or therapeutic benefit" (beyond product access) |
| **Listing / partners** | "When listing or promoting $PSY, use approved asset description and disclaimers. Partner is responsible for its own compliance in its jurisdiction." | [TOKENOMICS.md](./TOKENOMICS.md); exchange/VC one-pagers in documentation folder | Implied endorsement of partner's compliance; "SafePsy certifies this listing" |

---

## 14. Revocation (on-chain)

| Aspect | Approved wording | Evidence | Disallowed wording |
|--------|------------------|----------|--------------------|
| **Revocation semantics** | "DIDs can be revoked. Revocation is permanent: the token is burned and the address cannot receive a new DID. Revocation may be used for abuse prevention or at user request; exact conditions are in the contracts and documentation." | [DID_COMPLETE_GUIDE.md](./DID_COMPLETE_GUIDE.md) (revocation section); [SMART_CONTRACTS_AUDIT_REPORT.md](./SMART_CONTRACTS_AUDIT_REPORT.md) (revocation permanence) | "We can undo revocation"; "You can get a new DID with the same address after revoking" |
| **Data access after revocation** | "If your DID token is revoked, SafePsy will deny access to your encrypted data even if you have your wallet. Revocation means permanent loss of access to that identity's data in our app." | [ENCRYPTION_COMPLETE_GUIDE.md](./ENCRYPTION_COMPLETE_GUIDE.md) (token revoked); [QUICKSTART_AND_OFFBOARDING.md](./QUICKSTART_AND_OFFBOARDING.md) | "We can recover your data after revocation" |

---

## 15. RAG (retrieval-augmented generation)

| Aspect | Approved wording | Evidence | Disallowed wording |
|--------|------------------|----------|--------------------|
| **RAG content** | "Our RAG system indexes psychoeducational and therapeutic knowledge documents to augment AI responses. User chat content is not indexed in the RAG knowledge base." | [RAG_COMPLETE_GUIDE.md](./RAG_COMPLETE_GUIDE.md) (document indexing, not user chats) | "Your conversations are used to train the knowledge base"; "We index your chats for search" |

---

## Quick reference: terms to avoid

- "End-to-end encryption" without stating that the server decrypts for AI.
- "HIPAA compliant" or "HIPAA certified" (use "measures supporting HIPAA-style safeguards" and state no certification).
- "GDPR certified" or "fully GDPR compliant" without legal sign-off.
- "ISO 27001 certified" (use "aligned with" or "measures aligned with ISO 27001").
- "SafePsy never has access to unencrypted data" (transient server-side decryption for AI).
- "Ethereum Mainnet" when the app is on Sepolia.
- "Audited" without specifying internal vs external and network (Sepolia vs mainnet).
- "AI therapist" or that the AI provides clinical treatment or diagnosis.
- "We guarantee security" or "100% safe" (use "strong measures" and "no guarantee of invulnerability").
- "We can delete all your data" (on-chain data cannot be erased).
- "$PSY" as investment or security (use "utility token" and disclaimers).

---

## Evidence paths and maintenance

### Evidence path conventions

- **Public docs**: Paths in the tables (e.g. `ENCRYPTION_COMPLETE_GUIDE.md`, `DID_COMPLETE_GUIDE.md`) are relative to this public documentation folder.
- **Internal evidence** (not linked in the tables; for maintainers and auditors):
  - **Code**: `apps/api/` (encryption, DID, auth, log redaction), `apps/web/` (client-side encryption, wallet), contracts under `apps/api/src/contracts/`.
  - **Runbooks / ops**: Private deployment and incident-response docs (if present in your private documentation folder).
  - **Deployment / env**: Contract deployment manifests (`apps/api/deployments/`), env examples; keep private docs for secrets and live endpoints.

When adding or changing a claim, add or update the corresponding evidence path (public doc or internal location) in the table or in this section.

### Maintenance checklist

- **When adding claims**: Add a row to the relevant section with approved wording, evidence (public doc or “internal: …”), and disallowed wording. If the evidence is code or private docs, note it in *Evidence paths and maintenance* above.
- **When changing product or policy**: Re-read every row that might be affected (encryption, AI, compliance, token, etc.) and update approved wording and evidence.
- **Before “compliant” or “certified”**: Confirm with legal or compliance and document the evidence (e.g. audit report, legal memo).
- **Ongoing**: Keep FAQ, ToS, Security & Privacy Policy, and marketing copy aligned with the approved wording in this doc; avoid any disallowed phrasing.
- **Review cadence**: Review this document when releasing trust-sensitive features, after audits, and when compliance or legal advice changes.
