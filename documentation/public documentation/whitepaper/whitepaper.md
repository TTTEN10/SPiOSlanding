# SafePsy: A Decentralized AI-Powered Mental Health Platform

**Version 2.0 - Functional & Limitations Assessment**  
**Date: January 2025**  
**Authors: SafePsy Development Team**  
**Status: Pre-Production - Audit-Incomplete**

---

## Abstract

This whitepaper provides a functional assessment and limitations analysis of the SafePsy platform, a decentralized mental health application combining blockchain-based identity (DID), AI-powered therapy assistance, and encryption. This document focuses on **what the platform actually does**, **how it functions**, and **critical limitations and gaps** that must be addressed before production deployment. The assessment is based on comprehensive technical review and security audit findings.

**Key Finding**: The platform demonstrates strong architectural foundations and governance, but requires critical fixes in cryptographic trust models and key lifecycle management before health-grade production readiness.

---

## Table of Contents

1. [Functional Overview](#1-functional-overview)
2. [Architecture & Implementation](#2-architecture--implementation)
3. [Core Functionalities](#3-core-functionalities)
4. [Security Implementation](#4-security-implementation)
5. [Critical Limitations & Gaps](#5-critical-limitations--gaps)
6. [Smart Contract Architecture](#6-smart-contract-architecture)
7. [Governance Model](#7-governance-model)
8. [Known Issues & Risks](#8-known-issues--risks)
9. [Production Readiness Status](#9-production-readiness-status)
10. [Remaining Work](#10-remaining-work)

---

## 1. Functional Overview

### 1.1 What SafePsy Actually Does

SafePsy is a **monorepo-based web application** that provides:

1. **Wallet-Based Authentication**: Users authenticate using Ethereum wallet signatures
2. **DID Management**: Soulbound ERC-721 tokens representing decentralized identities on Ethereum
3. **AI Chat Interface**: OpenAI-powered chat with streaming responses
4. **Encrypted Storage**: Client-side encryption of chat history (AES-256-GCM)
5. **RAG System**: Retrieval-augmented generation using FAQs and Terms of Service
6. **Subscription Management**: Free trial and Premium tiers ($19/month, $69/month Gold) with usage limits
7. **Payment Processing**: Stripe and cryptocurrency; premium tied to **$PSY token** (see [Tokenomics](../TOKENOMICS.md))

### 1.2 What SafePsy Does NOT Do

**Important Limitations**:

- ❌ **Not Fully End-to-End Encrypted**: Server processes plaintext for AI (OpenAI requires decrypted data)
- ❌ **No Key Recovery Mechanism**: Users lose access to encrypted data if device is lost
- ❌ **No Multi-Device Sync**: Keys are device-specific with no synchronization
- ❌ **Not HIPAA Certified**: Compliance framework exists but not certified
- ❌ **Limited Therapist Integration**: No therapist marketplace or direct therapist-client matching
- ❌ **No Mobile App**: Web-only interface (no native mobile applications)
- ❌ **No Offline Mode**: Requires internet connection for all operations

### 1.3 Current Production Status

**Status**: **Near Production-Ready, Audit-Incomplete**

- ✅ Core functionality implemented and tested
- ✅ Governance model mature (multisig + timelock)
- ✅ RAG security hardened (admin auth + audit logging)
- 🔴 **Blocking Issues**: Cryptographic model and key lifecycle undefined
- 🟡 **High Priority**: Contract semantics and bounds need specification
- 🟡 **Moderate Priority**: Documentation inconsistencies, privacy clarifications needed

---

## 2. Architecture & Implementation

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                    │
│  - WalletConnect Integration                                  │
│  - Client-side Encryption (AES-256-GCM)                      │
│  - Chat Interface with SSE Streaming                          │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/TLS 1.3
┌────────────────────▼────────────────────────────────────────┐
│              Backend API (Express.js + TypeScript)            │
│  - Wallet Authentication (JWT)                               │
│  - DID Verification Middleware                                 │
│  - Rate Limiting & Security Headers                          │
│  - AI Gateway (OpenAI Integration)                            │
│  - RAG Service (Qdrant Vector DB)                             │
└──────┬───────────────────────────────────────────────────────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
┌──────▼──────┐ ┌────▼──────┐ ┌────▼──────┐ ┌────▼──────┐
│ PostgreSQL  │ │  Qdrant    │ │  OpenAI    │ │ Ethereum  │
│  Database   │ │  Vector DB │ │    API     │ │ Mainnet   │
└─────────────┘ └────────────┘ └────────────┘ └───────────┘
```

### 2.2 Technology Stack

**Frontend**:
- React 18 with TypeScript
- Vite build system
- Tailwind CSS
- WalletConnect for wallet integration
- ethers.js for blockchain interaction

**Backend**:
- Node.js with Express.js
- TypeScript
- Prisma ORM with PostgreSQL
- JWT authentication
- Helmet.js security headers
- Rate limiting middleware

**Blockchain**:
- Ethereum Mainnet (Chain ID: 1)
- Solidity 0.8.20
- OpenZeppelin contracts
- Hardhat for development

**AI & Storage**:
- OpenAI API (GPT-4o-mini)
- Qdrant vector database (optional)
- Web3.Storage (IPFS) for off-chain storage

### 2.3 Monorepo Structure

```
SPappv1.1/
├── apps/
│   ├── api/          # Backend API server
│   └── web/          # Frontend React application
├── apps/api/src/
│   ├── contracts/    # Solidity smart contracts
│   ├── routes/       # API endpoints
│   ├── lib/          # Services and utilities
│   └── middleware/   # Authentication, validation, etc.
└── apps/web/src/
    ├── components/   # React components
    └── utils/         # Frontend utilities
```

---

## 3. Core Functionalities

### 3.1 Wallet Authentication

**How It Works**:
1. User connects wallet (MetaMask, WalletConnect, etc.)
2. Backend generates nonce
3. User signs message: `"SafePsy Authentication\n\nWallet: {address}\nNonce: {nonce}"`
4. Backend verifies signature using ethers.js
5. JWT token issued and stored in HTTP-only cookie

**Limitations**:
- ⚠️ **Message Format**: Uses custom format, not SIWE/EIP-4361 standard
- ⚠️ **No Expiration**: Message format lacks expiration time
- ⚠️ **Replay Protection**: Relies on nonce, but nonce management not fully documented

**Status**: Functional but could be improved with SIWE standard

### 3.2 DID (Decentralized Identity) Management

**How It Works**:
1. User requests DID creation
2. Backend mints soulbound ERC-721 token on Ethereum
3. Token ID represents DID
4. DID ownership verified on-chain
5. DID can be revoked by owner

**Smart Contract Architecture**:
- **DIDRegistry.sol**: Immutable ERC-721 contract (soulbound, non-transferable)
- **DIDOwnership.sol**: Immutable authorization contract (centralized authorization logic)
- **DIDMetadata.sol**: UUPS upgradeable contract (DID document data)
- **DIDService.sol**: UUPS upgradeable contract (off-chain service pointers)

**Limitations**:
- ✅ **Revocation Semantics**: Fully specified - revocation BURNS token, clears mapping, permanently bans address
- ✅ **Re-Mint Rules**: Clearly defined - revoked addresses CANNOT receive new DIDs (permanent ban)
- ⚠️ **Authorization Rules**: Composition logic (AND/OR) not documented
- ⚠️ **Storage Limits**: No hard limits on strings/arrays (DoS risk)

**Status**: Functional but semantics need clarification

### 3.3 AI Chat Interface

**How It Works**:
1. User sends message
2. Backend retrieves relevant FAQs/ToS via RAG (non-blocking)
3. Context injected into system prompt
4. Request sent to OpenAI API
5. Response streamed via Server-Sent Events (SSE)
6. Encrypted chat history stored in database

**Features**:
- Streaming responses (SSE)
- RAG context enhancement
- Encrypted storage
- Chat history retrieval

**Critical Limitation**:
- 🔴 **Encryption Scope Ambiguity**: 
  - Data encrypted at rest ✅
  - Server decrypts for AI processing ⚠️
  - OpenAI receives plaintext ⚠️
  - **Not true end-to-end encryption** (server can read data)

**Status**: Functional but encryption claims need clarification

### 3.4 RAG (Retrieval-Augmented Generation)

**How It Works**:
1. **Indexing** (Admin-only):
   - Admin authenticates (API key or wallet whitelist)
   - Documents indexed with embeddings (OpenAI text-embedding-3-small)
   - Stored in Qdrant vector database
   - All operations logged to RAGAuditLog table

2. **Retrieval** (Public):
   - User query matched against indexed documents
   - Top 3 most relevant documents retrieved (minScore: 0.5)
   - Context injected into chat system prompt

**Pre-Indexed Content**:
- 14 FAQs about SafePsy
- 8 key Terms of Service sections

**Security**:
- ✅ Admin-only indexing (API key or wallet whitelist)
- ✅ Comprehensive audit logging (database-backed)
- ✅ Provenance tracking (source field required)
- ✅ Input validation (500KB limit, batch size limits)

**Status**: ✅ **Production-Ready** (security hardened)

### 3.5 Subscription & Payment

**Pricing model** (see [Tokenomics](../TOKENOMICS.md) and [PRICING_COMPLETE_GUIDE](../PRICING_COMPLETE_GUIDE.md)):

1. **Free trial** (Freemium):
   - Limited quota (e.g. 10 requests/day, 100 requests/month in current implementation)
   - Upgrade to premium for $20/month

2. **$19/month** (Premium):
   - Extended quotas
   - Users buy **$PSY token** directly or indirectly when paying

3. **$69/month (Gold)** (Premium):
   - Unlimited quotas
   - Users buy **$PSY token** directly or indirectly when paying
   - **Token cashback** is credited **to the user’s wallet**

**Payment methods**:
- Stripe (credit card)
- Cryptocurrency (ETH, USDT, USDC)

**Current implementation**: A single premium tier at $20/30 days is implemented; the full 3-tier model and $PSY/cashback are documented as target behaviour.

**Status**: Functional (single tier); 3-tier + tokenomics in progress

### 3.6 Encryption Implementation

**How It Works**:
1. **Client-Side**:
   - Random 256-bit key generated (or derived via PBKDF2)
   - AES-256-GCM encryption
   - Key stored in browser (localStorage/IndexedDB)

2. **Server-Side**:
   - Receives encrypted blobs
   - Stores ciphertext in database
   - **Decrypts for AI processing** (OpenAI requires plaintext)

**Critical Gaps**:
- 🔴 **Key Lifecycle Undefined**:
  - Key generation method not specified
  - Key storage location not documented
  - No key recovery mechanism
  - No key rotation policy
  - No multi-device sync

**Status**: Functional but key management incomplete

---

## 4. Security Implementation

### 4.1 What's Implemented

**✅ Strong Security Baseline**:
- Helmet.js security headers (CSP, HSTS, XSS protection)
- CORS whitelist (production origins only)
- Rate limiting (endpoint-specific limits)
- Input validation (Joi schemas)
- Sanitization (DOMPurify for XSS)
- Request size limits (10KB default, 100KB chat, 500KB RAG)
- PII redaction in logs
- Structured logging with request IDs
- Prometheus metrics

**✅ RAG Security**:
- Admin authentication required
- Database-backed audit logging
- Provenance tracking
- Input validation

**✅ Governance**:
- Multisig (5 signers, threshold 3)
- Timelock (72h delay)
- Emergency pause (separate safe)

### 4.2 What's Missing

**🔴 Critical Gaps**:
- **Encryption Scope**: Not clearly defined (E2E vs at-rest)
- **Key Lifecycle**: Completely undefined
- **Secret Management**: Listed as recommendation, not implemented

**🟡 High Priority Gaps**:
- **Contract Bounds**: No hard limits on strings/arrays
- **Authorization Semantics**: Rule composition not documented
- ✅ **Revocation Behavior**: Fully specified - burns token, clears mapping, permanently bans address
- **SSRF Protections**: Not explicitly implemented

**🟡 Moderate Gaps**:
- **SIWE Message Format**: Custom format instead of standard
- **CI Security**: No dependency/container scanning
- **Privacy Claims**: Need content vs metadata distinction

---

## 5. Critical Limitations & Gaps

### 5.1 Cryptographic Trust Model (P0 - Critical)

**Issue**: "End-to-end encryption" claim is ambiguous vs AI processing model.

**Reality**:
- ✅ Data encrypted at rest (server stores ciphertext)
- ⚠️ Server decrypts data for AI processing
- ⚠️ OpenAI receives decrypted prompts
- ❌ **Not true end-to-end encryption** (server can read data)

**Impact**: Regulatory/trust risk, security design confusion

**Required Fix**: Define encryption scope explicitly:
- Where plaintext exists
- Where keys are stored
- What OpenAI sees
- What logs contain

### 5.2 Key Lifecycle Undefined (P0 - Critical)

**Issue**: Key lifecycle completely undefined. Users may lose access permanently.

**Missing**:
- Key generation method (random? derived? hybrid?)
- Key storage location (browser? encrypted export?)
- Multi-device sync strategy
- Backup/recovery mechanism
- Key rotation policy
- Key revocation semantics

**Impact**: Users lose access to encrypted data if device is lost

**Required Fix**: Design and document complete key lifecycle

### 5.3 Contract Semantics Not Fully Specified (P1 - High)

**Issues**:
- **Revocation**: Burn vs flag? Mapping clearing? Re-mint rules?
- **Authorization**: Rule composition (AND/OR) not defined
- **Storage Limits**: No hard limits (DoS risk)

**Impact**: Unexpected behavior, gas/DoS attacks

**Required Fix**: Document all semantics and enforce limits

### 5.4 Documentation Inconsistencies (P1 - High)

**Issues**:
- Function names don't match code
- Action constants mismatch
- Minting model conflicts with MINTER_ROLE

**Impact**: Reduces audit confidence

**Required Fix**: Audit all documentation against code

### 5.5 Privacy Claims Need Clarification (P2 - Moderate)

**Issue**: "Minimal on-chain leakage" claim needs refinement.

**Reality**:
- Content encrypted ✅
- On-chain stores hashes/pointers ✅
- But: Service endpoints, DID documents, event history are on-chain
- Metadata correlation possible

**Impact**: Privacy expectations may not match reality

**Required Fix**: Distinguish content privacy from metadata privacy

---

## 6. Smart Contract Architecture

### 6.1 Split-Contract Design

**Immutable Core** (Non-Upgradeable):
- **DIDRegistry.sol**: ERC-721 soulbound token
- **DIDOwnership.sol**: Centralized authorization logic

**Upgradeable Data** (UUPS):
- **DIDMetadata.sol**: DID document data, attributes, credentials
- **DIDService.sol**: Off-chain service pointers, key material references

**Library**:
- **Actions.sol**: Canonical action constants

### 6.2 Governance Model

**Governance Timelock**:
- 72-hour delay for all privileged operations
- Multisig proposer (5 signers, threshold 3)
- Permissionless executor

**Emergency Safe**:
- Separate multisig (2-3 signers, threshold 2)
- Immediate pause capability
- Unpause requires timelock (72h delay)

**Role Mapping**:
- `MINTER_ROLE`: Governance Timelock
- `DEFAULT_ADMIN_ROLE`: Governance Timelock
- `PAUSER_ROLE`: Emergency Safe

### 6.3 Security Features

**✅ Implemented**:
- Immutable core contracts
- Centralized authorization (single source of truth)
- Timelock-gated upgrades
- Emergency pause mechanism
- Multisig required (no single key risk)

**⚠️ Limitations**:
- Storage limits not enforced
- Authorization rule composition not documented
- ✅ Revocation semantics fully specified (burns token, clears mapping, permanently bans address)

### 6.4 Known Contract Issues

1. **Unbounded Storage**: Strings/arrays have no hard limits
   - Risk: Gas/DoS attacks
   - Fix: Add limits (e.g., max 100 attributes, max 500 chars per string)

2. **Authorization Ambiguity**: Rule composition not specified
   - Risk: Authorization bypass or lockout
   - Fix: Document permission matrix and precedence

3. ✅ **Revocation Semantics**: Fully specified and implemented
   - ✅ Revocation BURNS the token (token is destroyed)
   - ✅ `_addressToTokenId` mapping is cleared on revocation
   - ✅ Revoked addresses are permanently banned from receiving new DIDs
   - ✅ Wallet migration is impossible (by design)

---

## 7. Governance Model

### 7.1 Governance Components

**Governance Safe (Multisig)**:
- 5 signers, threshold 3
- Proposes all privileged operations
- Controls timelock proposer role

**Governance Timelock**:
- 72-hour delay
- Executes privileged operations
- Permissionless execution (anyone can execute after delay)

**Emergency Safe**:
- 2-3 signers, threshold 2
- Immediate pause capability
- Break-glass mechanism

### 7.2 Governance Flow

**Standard Proposal**:
1. Governance Safe proposes operation
2. 72-hour delay begins
3. Community can review
4. Anyone can execute after delay

**Emergency Pause**:
1. Emergency Safe pauses immediately
2. Unpause requires timelock (72h delay)
3. Prevents permanent lockout

### 7.3 Governance Invariants

**✅ Strong Guarantees**:
- No single key risk (multisig required)
- 72-hour review period for upgrades
- Emergency containment (separate pause mechanism)
- Governance orthogonal to identity (cannot impersonate users)

**⚠️ Limitations**:
- Timelock role setup not fully documented
- Renounce strategy not specified
- Upgrade policy not explicitly defined

---

## 8. Known Issues & Risks

### 8.1 Technical Risks

**High Risk**:
- 🔴 **Key Loss**: No recovery mechanism (users lose access permanently)
- 🔴 **Encryption Scope**: Ambiguous claims may mislead users
- 🟡 **Contract DoS**: Unbounded storage allows gas attacks

**Moderate Risk**:
- 🟡 **Authorization Ambiguity**: Rule composition unclear
- 🟡 **Revocation Behavior**: Unexpected behavior possible
- 🟡 **SSRF**: No explicit protections for URL fetching

**Low Risk**:
- 🟢 **Message Format**: Custom format instead of SIWE standard
- 🟢 **CI Security**: No automated security scanning

### 8.2 Operational Risks

**Service Availability**:
- ⚠️ Qdrant optional (RAG fails gracefully if unavailable)
- ⚠️ OpenAI dependency (service unavailable if API down)
- ⚠️ Ethereum network dependency (DID operations require network)

**Data Loss**:
- 🔴 **No Key Recovery**: Permanent data loss if device lost
- ⚠️ **No Multi-Device Sync**: Keys device-specific
- ⚠️ **No Backup Mechanism**: No encrypted export option

### 8.3 Regulatory Risks

**Compliance Status**:
- ⚠️ **GDPR**: Framework exists, not certified
- ⚠️ **HIPAA**: Framework exists, not certified
- ⚠️ **ISO 27001**: Framework exists, not certified

**Privacy Claims**:
- ⚠️ "End-to-end encryption" claim may be misleading
- ⚠️ "Minimal on-chain leakage" needs clarification

---

## 9. Production Readiness Status

### 9.1 Completed ✅

- ✅ Core functionality implemented
- ✅ Governance model mature
- ✅ RAG security hardened
- ✅ Smart contract architecture solid
- ✅ Security baseline strong

### 9.2 Blocking Issues 🔴

**P0 - Critical (Must Fix Before Production)**:
1. Define encryption scope & trust boundaries
2. Define key lifecycle & recovery mechanisms
3. ✅ Lock down RAG indexing (COMPLETED)

### 9.3 High Priority 🟡

**P1 - High (Fix Before Launch)**:
1. Clarify revocation & re-mint semantics
2. Define authorization rule composition
3. Add hard limits for strings/arrays
4. Document timelock role configuration
5. Fix documentation drift & inconsistencies

### 9.4 Moderate Priority 🟢

**P2 - Moderate (Should Fix)**:
1. Clarify privacy claims (content vs metadata)
2. Improve wallet auth wording & message format
3. Add SSRF protections
4. Document UUPS upgrade policy
5. Add CI security checklist
6. Clarify key storage in data model
7. Define DID method & resolution
8. Promote secret management to requirement

### 9.5 Audit Scorecard

| Category | Status | Notes |
|----------|--------|-------|
| **Smart Contracts Design** | Strong | Governance mature; needs bounds, semantics fixes |
| **DID Model** | Coherent | Standards and role model need definition |
| **Security Posture (Off-Chain)** | Good Baseline | Needs RAG hardening + CI security maturity |
| **Privacy** | Strong Intent | Metadata leakage and E2E semantics must be clarified |
| **Documentation Quality** | Very Detailed | Some inconsistencies need cleaning for audit-grade |
| **Cryptographic Model** | **Gap** | Key lifecycle and E2E scope must be defined |
| **RAG Security** | ✅ **Complete** | Admin auth, audit logging, provenance tracking |
| **Production Readiness** | Near-Ready | Blocked by P0 items (crypto model, key lifecycle) |

---

## 10. Remaining Work

### 10.1 Critical Path to Production

**Phase 1: Cryptographic Clarity** (P0)
- Define encryption scope & trust boundaries
- Design key lifecycle & recovery mechanism
- Update all documentation with precise language

**Phase 2: Contract Semantics** (P1)
- Document revocation & re-mint rules
- Create authorization permission matrix
- Implement storage limits in contracts

**Phase 3: Documentation Accuracy** (P1)
- Audit all documentation against code
- Fix inconsistencies
- Establish documentation validation process

**Phase 4: Security Hardening** (P2)
- Add SSRF protections
- Implement secret management
- Add CI security scanning
- Clarify privacy claims

### 10.2 Estimated Timeline

**Minimum Viable Production** (P0 + P1 Critical):
- 2-4 weeks for cryptographic model definition
- 1-2 weeks for contract semantics documentation
- 1 week for documentation audit
- **Total: 4-7 weeks**

**Full Production Readiness** (All P0-P2):
- Additional 2-3 weeks for P2 items
- **Total: 6-10 weeks**

### 10.3 Success Criteria

**Production-Ready When**:
- [ ] Encryption scope clearly defined and documented
- [ ] Key lifecycle designed and implemented
- [ ] Contract semantics fully specified
- [ ] Documentation matches code exactly
- [ ] All P0 and P1 items resolved
- [ ] Security audit completed and findings addressed

---

## Conclusion

SafePsy demonstrates **strong architectural foundations** with a mature governance model, solid smart contract design, and good security baseline. The platform is **functionally complete** for core use cases (wallet auth, DID management, AI chat, encrypted storage).

However, **critical gaps remain** that prevent health-grade production deployment:

1. **Cryptographic Clarity**: E2E encryption scope and key lifecycle must be explicitly defined
2. **Contract Semantics**: Revocation, authorization, and bounds must be fully specified
3. **Documentation Accuracy**: Inconsistencies must be resolved for audit-grade documentation

**Key Achievements**:
- ✅ Governance model is production-ready (multisig + timelock + emergency pause)
- ✅ RAG security is hardened (admin auth + audit logging)
- ✅ Smart contract architecture is structurally sound

**Remaining Blockers**:
- 🔴 Cryptographic model definition (P0)
- 🔴 Key lifecycle design (P0)
- 🟡 Contract semantics specification (P1)

With these fixes, SafePsy will be ready for health-grade production deployment and audit completion.

---

## References

### Technical Documentation
- SafePsy Technical Review — `documentation/private documentation/TECHNICAL_REVIEW.md` (includes audit findings; former `audit_technical_Review.md` merged March 2026)
- Contract Implementation Summary (CONTRACT_IMPLEMENTATION_SUMMARY.md)
- RAG Implementation Guide (documentation/api/RAG_IMPLEMENTATION.md)
- [Tokenomics](../TOKENOMICS.md) — $PSY token, tiers, cashback to user wallet (Gold)
- [Pricing Model & Implementation](../PRICING_COMPLETE_GUIDE.md) — pricing guide

### Standards
- Ethereum Improvement Proposals (EIPs)
- W3C Decentralized Identifiers (DIDs)
- ISO/IEC 27001:2022 Information Security Management
- GDPR Regulation (EU) 2016/679
- HIPAA 45 CFR Parts 160 and 164

---

**Document Version**: 2.0  
**Last Updated**: January 2025  
**Status**: Pre-Production - Audit-Incomplete  
**Next Review**: After P0 items completion

---

*This whitepaper provides an honest assessment of SafePsy's current state, focusing on functional capabilities and known limitations. It is intended for technical stakeholders, auditors, and developers evaluating the platform's production readiness.*
