# SafePsy — VC One-Pager

**Confidential.** Wording aligned with [CLAIMS_AND_TRUST_LANGUAGE.md](../public documentation/CLAIMS_AND_TRUST_LANGUAGE.md). See [LAUNCH.md](./LAUNCH.md) and [PERSONAS.md](./PERSONAS.md) for full positioning.

---

## One-liner

SafePsy gives people private mental wellness support between therapy sessions without giving up control of their data—wallet-based identity, encrypted storage, no training on user chats, and an ethical AI assistant (Dr. Safe) that complements (not replaces) licensed care.

---

## Problem

Most mental-health tools and AI chatbots hold user data on their servers, use it for analytics or model training, and leave users with no real ownership. That creates risk for stigma, breaches, and loss of control when people are at their most vulnerable. The cost: users either skip digital support or accept that their reflections and conversations are no longer fully theirs.

---

## Solution

SafePsy is a privacy-first platform: (1) users connect a Web3 wallet and create an on-chain identity (DID); (2) they chat with Dr. Safe, an ethical AI assistant for reflection, preparation, and coping practice between sessions; (3) data is encrypted at rest, keys are derived from the user’s wallet and are not stored on our servers, and we do not use chat content to train models or store user data with third parties. The AI does not diagnose, treat, or provide clinical advice—it complements licensed therapy.

---

## Why now

- Demand for mental wellness support is high; trust in centralized apps and generic AI is under scrutiny.
- Users and regulators care about data ownership and “no training on my data”; privacy-by-design is a differentiator.
- Web3 identity (DID) and wallet-based key control are proven building blocks; we apply them to a large, underserved use case.

---

## Product snapshot

- **Activation:** User has created a DID token and had their first chat with Dr. Safe.
- **Stack:** Wallet auth → DID (soulbound, on-chain, Sepolia) → encrypted chat + AI (streaming) → encrypted storage; RAG for FAQs/ToS; freemium + premium; $PSY token for premium/ecosystem.
- **Governance:** Contract upgrades and sensitive operations governed by Timelock and multisig Safe(s). DID contracts on Sepolia internally audited; external audit required before mainnet.

---

## Market

- **TAM:** People in or considering therapy + privacy-conscious users seeking AI-assisted reflection globally. Mental health apps and telehealth are large and growing; we target the segment that wants data sovereignty and clear AI boundaries.
- **Segments:** B2C (direct users); potential B2B2C (employer wellness, payers) where user data stays in user control.

---

## Traction / leading indicators

- Product: Core flow live (wallet → DID → chat); encryption at rest; no training on user data; governance in place.
- Metrics: Activation = DID creation + first chat; waitlist for early access; pricing (free tier + premium) in app.
- Roadmap: Scaling, compliance path, distribution (partners, exchanges).

*[Replace with concrete metrics as available: MAU, activation rate, waitlist size, revenue.]*

---

## Moat / defensibility

- **Privacy and positioning:** User-controlled keys + no training on data + clear “complement to therapy” positioning—hard for incumbents to copy without product and policy changes.
- **Identity and governance:** On-chain DID and Timelock + multisig create verifiable, tamper-evident infrastructure; governance cannot impersonate identities.
- **Trust and compliance:** Privacy-by-design, measures aimed at GDPR, HIPAA-style safeguards (we are not HIPAA certified); alignment with APA-style ethics. Careful claims reduce regulatory and reputational risk.

---

## Go-to-market

- **Acquisition:** Waitlist and early access; content and community (privacy, mental wellness, Web3); partnerships (psychology associations, NGOs, employer wellness); exchange/strategic partners for wallet-holder reach.
- **Monetization:** Freemium + premium tiers; $PSY token for premium and ecosystem. Transparent pricing in app.
- **Expansion:** B2B2C (wellness programs) with user-controlled data; global access; possible research/impact partnerships.

---

## Ask

- **Funding:** [Amount] for [use: product, compliance, distribution, runway].
- **Intros:** [e.g. Health tech / Web3 VCs, mental health or digital-rights foundations, exchange listing teams, psychology associations or institutional partners.]

---

## 1-page memo (text-only)

**SafePsy — VC memo**

**One-liner:** SafePsy gives people private mental wellness support between therapy sessions without giving up control of their data—wallet-based identity, encrypted storage, no training on user chats, and an ethical AI assistant (Dr. Safe) that complements (not replaces) licensed care.

**Problem:** Most mental-health tools and AI chatbots hold user data on their servers, use it for analytics or model training, and leave users with no real ownership—creating risk for stigma, breaches, and loss of control. Users either skip digital support or accept that their reflections are no longer fully theirs.

**Solution:** Privacy-first platform: (1) wallet + on-chain identity (DID); (2) chat with Dr. Safe for reflection and between-session support; (3) data encrypted at rest, keys from wallet not stored on our servers, we do not use chat content to train models or store user data with third parties. AI complements therapy; no diagnosis, treatment, or clinical advice.

**Why now:** Demand for mental wellness is high; trust in centralized apps and generic AI is under scrutiny. Data ownership and “no training on my data” are differentiators. Web3 identity and wallet-based keys are proven; we apply them to mental wellness.

**Product:** Activation = DID creation + first chat. Stack: wallet → DID (Sepolia) → encrypted chat + AI → encrypted storage; RAG; freemium + premium; $PSY. Governance: Timelock + multisig; DID contracts internally audited on Sepolia; external audit before mainnet.

**Market:** People in or considering therapy and privacy-conscious users globally. B2C now; B2B2C (wellness, payers) with user-controlled data as expansion.

**Traction:** Core product live; activation metric defined; waitlist; pricing in app. [Add: MAU, activation rate, revenue when available.]

**Moat:** Privacy and positioning (user-controlled keys, no training on data, complement-not-replace); on-chain DID and transparent governance; careful compliance posture (GDPR-minded, HIPAA-style safeguards, not HIPAA certified; APA-aligned ethics).

**GTM:** Waitlist and early access; content and community; partnerships (associations, NGOs, employers); exchange/strategic partners. Monetization: freemium + premium + $PSY.

**Ask:** [Amount] for [use]. Intros: [health tech / Web3 VCs, foundations, exchanges, institutional partners.]
