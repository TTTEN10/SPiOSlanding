# FAQ 

## Encryption and privacy

### 1. Is my chat really end-to-end encrypted?

We use **client-side encryption**: you encrypt your messages before they leave your device, and we store only ciphertext. So your data is encrypted in transit and at rest. However, to provide AI replies, our server must temporarily decrypt your messages in memory and send the text to the AI provider. That means it is **not** end-to-end encryption in the strict sense (where only you and the recipient can ever see plaintext). We do not write decrypted content to disk, logs, or the database, and we do not use your chats to train models.

### 2. Can SafePsy read my messages?

During each AI request, the server holds your message in plaintext in memory only for the time needed to call the AI service (typically seconds). We do not store plaintext, and we do not log chat content. So we *can* technically read content only while processing a request; we do not retain or routinely access it. Our design and policies are built to avoid storing or logging the content of your conversations.

### 3. Who else can see my chat content?

Your messages are sent to the AI provider (e.g. Scaleway or our own GPU service) in plaintext so they can generate responses. We do not send your name, DID, or other identifiers with the content. You should rely on that provider’s privacy and data-handling policies for what they do with the content they process.

### 4. If you don’t store my keys, what happens if I lose my wallet?

If you lose access to your wallet or seed phrase, we **cannot** recover your DID or decrypt your stored chat data. There is no backdoor or recovery mechanism. We recommend backing up your seed phrase securely and, if appropriate, using a hardware wallet.

---

## Compliance and certifications

### 5. Are you HIPAA compliant?

We implement technical and organizational measures that support **HIPAA-style** safeguards (access control, audit controls, transmission security, integrity). We are **not** a HIPAA-covered entity and we do **not** hold HIPAA certification. If you are a covered entity or business associate, you should consult legal counsel about your obligations and whether our measures are sufficient for your use case.

### 6. Are you GDPR compliant?

We implement measures aimed at **GDPR compliance**, including data subject rights (access, rectification, erasure, portability, restriction, objection), lawful bases, minimization, and transparency. Whether we meet all requirements in your jurisdiction depends on your role and the specific processing. We do not offer a formal “GDPR certification”; for legal certainty, consult your legal advisor.

### 7. Are you ISO 27001 certified?

Our security controls and documentation are **aligned with** ISO/IEC 27001:2022. We are **not certified** to ISO 27001. Certification would require an accredited certification body and a formal audit.

### 8. You mention APA and HIPAA on the site—what does that mean?

We aim to operate in line with **APA guidelines** and professional ethics for psychological services. When we refer to HIPAA, we mean we implement **safeguards that support HIPAA-style** security and privacy; we do not claim to be a HIPAA-covered entity or certified. For any “compliant with APA and HIPAA” phrasing, use the approved wording in our Claims and Trust Language doc (e.g. “aligned with” / “measures supporting”) and avoid implying certification.

---

## Blockchain and on-chain

### 9. Which blockchain do you use?

Today our app uses **Sepolia Testnet** (Chain ID 11155111) for DID operations. We may support Ethereum Mainnet in the future after a professional audit and readiness review. Always check the app or latest docs for the current network.

### 10. Is my therapy content stored on the blockchain?

**No.** Chat messages and summaries are **not** stored on the blockchain. They are encrypted and stored off-chain. On-chain we store DID identifiers, document metadata, service endpoints, and authorization events—so some **metadata** is public and persistent, but not the content of your conversations.

### 11. Can my identity or activity be traced on-chain?

DID-related events (e.g. creation, updates, authorization) are recorded on-chain and are publicly visible. So someone who knows your wallet address could see that you have a DID and some metadata. They could **not** see your chat content, which stays off-chain and encrypted.

---

## Security and audits

### 12. Have your smart contracts been audited?

Our DID smart contracts on **Sepolia** have undergone an **internal** audit (documented in our repo). We run invariant tests and on-chain verification scripts. A **professional external audit** is required before we use these contracts on mainnet. We do not claim they are “fully audited” in the sense of an independent third-party mainnet audit.

### 13. What if there’s a bug or breach?

We have incident response and security practices in place. In the event of a security incident that affects your data, we would follow our procedures and applicable law (including breach notification where required). We do not guarantee that our systems are immune to bugs or attacks.

---

## AI and therapy

### 14. Is the AI a replacement for a therapist?

**No.** The AI assistant is **not** a substitute for professional mental health care. It does not provide medical advice, diagnosis, or treatment. It is designed to complement human support (e.g. preparation, reflection, general guidance). Always consult licensed mental health professionals for clinical decisions.

### 15. Do you use my chats to train your AI?

We do **not** use your chat content to train our models. Your messages are sent to the AI provider only to generate responses for your session. Please also review the AI provider’s policy (e.g. Scaleway or our GPU service) regarding their use of data.

---

## Governance and control

### 16. Who controls the smart contracts?

Sensitive operations and upgrades are governed by a **Timelock** and **multisig Safe(s)**. So control is with the signers of that Safe, not with a single key. This is documented in our governance and deployment docs.

### 17. Can you revoke or delete my DID?

Depending on design and roles, certain actions (e.g. revocation in case of abuse) may be possible by the system (e.g. via governance or authorized roles). The exact conditions are in the contracts and documentation. We do not arbitrarily revoke DIDs; any such capability is for safety and abuse prevention.

---

## Data and deletion

### 18. If I delete my data, is it really gone?

We support deletion of your **off-chain** data (e.g. chat history, encrypted blobs). Once deleted according to our process, we do not retain it in our active systems. **On-chain** DID and lifecycle events are permanent on the blockchain and cannot be erased; we can mark a DID as revoked so it is no longer used.

### 19. How long do you keep my data?

Retention is described in our Privacy Policy and related docs. We do not retain chat content in plaintext; encrypted data may be kept for the periods stated there. Audit and security logs (with redacted identifiers) may be kept longer for security and compliance.

---

## Liability and guarantees

### 20. Do you guarantee my data is secure?

We implement strong technical and organizational measures (encryption, access control, logging, etc.) but we **do not guarantee** that our systems are invulnerable. No online service can guarantee absolute security. We recommend reading our Terms of Service and Security & Privacy Policy for the full picture.

---

## Using this FAQ

- **Internal use**: Train support and leadership on these answers.
- **Public use**: Copy answers into your help center or FAQ; keep wording consistent with `CLAIMS_AND_TRUST_LANGUAGE.md`.
- **Updates**: When product or policy changes (e.g. mainnet, new AI provider, certification), update both this FAQ and the Claims doc.
