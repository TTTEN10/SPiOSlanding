# Privacy by Design: IP Address Handling

## Overview

This document describes the privacy by design implementation for IP address handling across the SafePsy platform. The implementation follows the principle of **default OFF** for maximum privacy protection.

> **For comprehensive privacy and data protection information, including consent flows and encrypted storage details, see the [Data Protection Impact Assessment (DPIA)](/dpia) in the SafePsy application.**

## Key Principles

1. **Default OFF**: IP hashing is disabled by default
2. **Explicit Opt-in**: Must be explicitly enabled via environment variables
3. **Secure Hashing**: Uses SHA-256 with configurable salt when enabled
4. **Consistent Implementation**: Same privacy utilities across all services

## Implementation Details

### Environment Variables

```bash
# Privacy by Design - IP Address Handling
IP_HASHING_ENABLED=false  # Default: OFF for maximum privacy
IP_SALT=default-privacy-salt-change-in-production  # Change in production!
```

### Behavior

- **When `IP_HASHING_ENABLED=false` (default)**:
  - Raw IP addresses are NOT logged
  - Placeholder `IP_HASHING_DISABLED` is used instead
  - Maximum privacy protection

- **When `IP_HASHING_ENABLED=true`**:
  - IP addresses are hashed using SHA-256 with salt
  - `ipHash = sha256(ip + SALT)`
  - Still provides privacy while enabling rate limiting

### Files Modified

#### 1. Centralized Privacy Utilities
- **File**: `SPv3.x/packages/shared-types/src/privacy.ts`
- **Purpose**: Centralized IP hashing utilities
- **Exports**: `hashIP`, `getClientIP`, `getPrivacySafeIP`, `isIPHashingEnabled`

#### 2. Rate Limiting Middleware
- **File**: `SPv3.x/backend/src/middleware/rate-limit.ts`
- **Changes**: Updated to use privacy-safe IP handling
- **Impact**: Rate limiting now respects privacy settings

#### 3. Shared Logger
- **File**: `SPv3.x/shared-logger/index.js`
- **Changes**: IP addresses are hashed before logging
- **Impact**: Logs contain privacy-safe IP information

#### 4. Landing Page API
- **Files**: 
  - `SPlandingv0.1/safepsy-landing/apps/api/src/lib/crypto.ts`
  - `SPlandingv0.1/safepsy-landing/backend/src/server.ts`
- **Changes**: Updated IP hashing to respect privacy settings
- **Impact**: Email subscriptions use privacy-safe IP handling

#### 5. Environment Configuration
- **Files**: All `env.example` files updated
- **Changes**: Added `IP_HASHING_ENABLED` and `IP_SALT` variables
- **Impact**: Clear documentation of privacy settings

## Usage Examples

### Basic IP Hashing

```typescript
import { hashIP, getClientIP } from '@safepsy/shared-types';

// Get privacy-safe IP from request
const safeIP = getClientIP(req);

// Hash a specific IP
const hashedIP = hashIP('192.168.1.1');
```

### Rate Limiting with Privacy

```typescript
import { rateLimitPerIP } from './middleware/rate-limit';

// Rate limiting automatically uses privacy-safe IPs
app.use('/api', rateLimitPerIP({
  windowMs: 15 * 60 * 1000,
  max: 100
}));
```

### Logging with Privacy

```javascript
const { createLogger } = require('@safepsy/shared-logger');

const logger = createLogger('my-service');
logger.logRequest(req, res, next); // Automatically uses privacy-safe IPs
```

## Security Considerations

1. **Salt Management**: 
   - Use a strong, unique salt in production
   - Generate with: `openssl rand -hex 32`
   - Rotate regularly

2. **Default Behavior**:
   - Default OFF ensures maximum privacy
   - Must explicitly enable IP hashing
   - Clear documentation of privacy implications

3. **Rate Limiting**:
   - Still effective with hashed IPs
   - Maintains security while protecting privacy
   - Consistent behavior across services

## Compliance

This implementation supports:

- **GDPR**: Privacy by design principles
- **CCPA**: Minimal data collection
- **SOC 2**: Data protection requirements
- **HIPAA**: Privacy safeguards (if applicable)

## Migration Guide

### For Existing Deployments

1. **Update Environment Variables**:
   ```bash
   # Add to your .env file
   IP_HASHING_ENABLED=false  # Keep disabled for maximum privacy
   IP_SALT=your-secure-salt-here
   ```

2. **Deploy Updated Code**:
   - All services will automatically use privacy-safe IP handling
   - No breaking changes to existing functionality

3. **Optional: Enable IP Hashing**:
   ```bash
   # Only if you need IP-based rate limiting
   IP_HASHING_ENABLED=true
   IP_SALT=your-production-salt
   ```

### Testing

```bash
# Test privacy settings
curl -H "X-Forwarded-For: 192.168.1.1" http://localhost:3000/api/subscribe

# Check logs - should show 'IP_HASHING_DISABLED' or hashed IP
```

## Monitoring

Monitor the following metrics:

- Rate limiting effectiveness
- Privacy compliance
- Salt rotation schedule
- Environment variable consistency

## Support

For questions about privacy implementation:

1. Check environment variables
2. Verify salt configuration
3. Review log outputs
4. Test with different IP addresses

---

**Remember**: Privacy by design means defaulting to maximum privacy protection. Only enable IP hashing if absolutely necessary for your use case.

---

## Encryption Scope & Privacy Model

> **For comprehensive details on encryption implementation, consent flows, and data protection measures, see the [Data Protection Impact Assessment (DPIA)](/dpia) in the SafePsy application.**

### Encryption at Rest

SafePsy implements **client-side encryption with server-side temporary decryption** for all user chat content:

- **Client-Side Encryption**: All chat messages and summaries are encrypted in the user's browser using AES-256-GCM before transmission to the server. See [DPIA - Encrypted Storage section](/dpia#encrypted-storage) for detailed technical implementation.
- **Server Storage**: The server stores only ciphertext (encrypted blobs) in the database. The server never has persistent access to encryption keys.
- **Key Management**: Encryption keys are stored exclusively client-side (browser localStorage/IndexedDB) and are never transmitted to the server. Wallet-based key derivation using SHA-256 hash of wallet signature. See [DPIA - Key Management section](/dpia#encrypted-storage) for details.
- **Temporary Decryption**: The server must decrypt messages temporarily in memory for AI processing (functional requirement). Plaintext exists only during request processing and is never stored.

### Server-Side AI Processing

**Important Privacy Disclosure**: To provide AI-powered chat functionality, the server must temporarily decrypt chat data in memory to process it with Scaleway AI:

- **Transient Plaintext**: Plaintext exists temporarily in server memory only during AI processing operations.
- **Lifetime**: Plaintext exists only for the duration of request processing (typically seconds to minutes).
- **Security Controls**: 
  - Plaintext is never written to persistent storage
  - Plaintext is never logged
  - Plaintext is cleared from memory after request completion

### External Service Data Sharing

**Scaleway AI (Chat Completions)**:
- **Receives**: Plaintext user message content (prompts) and conversation context for AI processing
- **Does NOT Receive**: User identifiers (wallet addresses, DID, email), IP addresses (except unavoidable network-level), or session metadata
- **User Awareness**: Users should be aware that Scaleway processes their chat message content in plaintext for AI responses

**OpenAI (Embeddings Only)**:
- **Receives**: Plaintext text content from FAQs and Terms of Service (public data) for embedding generation
- **NOT Used**: OpenAI is NOT used for chat completions, only for RAG embeddings

**Scaleway Object Storage**:
- **Stores**: Encrypted chat summaries (ciphertext only)
- **Cannot Decrypt**: Scaleway cannot decrypt the data without the user's key

### Privacy Guarantees

1. **Content Privacy**: Chat content is encrypted at rest (ciphertext only in database). Only users with encryption keys can decrypt their data.
2. **Metadata Minimization**: SafePsy minimizes metadata exposure by not sending user identifiers to external AI services.
3. **Transient Processing**: Plaintext exists only transiently in server memory during AI processing (seconds to minutes).
4. **No Persistent Plaintext**: The server never stores decrypted chat data in any persistent form (not written to disk, logs, or database).
5. **Client-Side Key Control**: Encryption keys are never stored on server (client-side only, derived from wallet signature).

### End-to-End Encryption Semantics

**Important Clarification**: SafePsy implements **client-side encryption**, not traditional end-to-end encryption where the server never sees plaintext.

**Encryption Flow**:
1. **Client encrypts** messages using AES-256-GCM before transmission
2. **Server receives** ciphertext only and stores encrypted blobs
3. **Server decrypts** temporarily in memory for AI processing (functional requirement)
4. **Server sends** plaintext to Scaleway AI for chat completions
5. **Server clears** plaintext from memory after request completion
6. **Client receives** AI response and encrypts complete conversation before saving

**Trust Model**:
- ✅ **Client → Server**: Encrypted (ciphertext only)
- ⚠️ **Server Memory**: Temporary plaintext (during AI processing only)
- ✅ **Server Storage**: Encrypted (ciphertext only)
- ⚠️ **Server → Scaleway**: Plaintext (necessary for AI processing)
- ✅ **Client Storage**: Encrypted (ciphertext only)

**This is NOT pure E2E encryption** because the server must decrypt for AI functionality. However, it provides strong privacy guarantees:
- Encryption at rest (ciphertext only in database)
- Client-side key management (keys never on server)
- Transient plaintext (only in memory during processing)
- No persistent plaintext storage

For complete details, see `TECHNICAL_REVIEW.md` Section 2 "Encryption Scope & Trust Boundaries".

---

## Content Privacy vs Metadata Privacy

This section clarifies the distinction between content privacy (what is encrypted) and metadata exposure (what is observable on-chain).

### Content Privacy

- **User content is encrypted before storage or transmission**: Chat messages and summaries are encrypted client-side using AES-256-GCM before transmission and storage.
- **Encryption keys are not stored on-chain**: Keys are client-side only (never transmitted to server) or stored as encrypted DEK in DID's `encryptedData` field (on-chain).
- **On-chain references do not reveal content payloads**: Only cryptographic hashes of encrypted data are stored on-chain, not the encrypted data itself.

### On-Chain Metadata

The following metadata is stored on-chain for functional reasons:

- **DID identifiers**: Wallet addresses, token IDs, DID hashes (public identifiers)
- **DID documents**: Including contexts (string[]), ID strings, controller arrays (string[]), and updated timestamps (stored in `DIDMetadata` contract)
- **Service endpoints**: Service endpoint URLs are stored as plaintext strings on-chain (required for DID resolution, stored in `DIDService` contract). Endpoint URLs are publicly observable.
- **Public attributes**: Key-value attribute pairs stored in DID documents (stored as plaintext on-chain in `DIDMetadata` contract)
- **Credential references**: Credential hashes, types, issuer addresses, and issue timestamps (stored in `DIDMetadata` contract)
- **Authorization and lifecycle events**: All DID lifecycle events, authorization events, and data pointer updates are publicly queryable and permanent

### Off-Chain Metadata

The following data is not stored on-chain:

- **Encrypted content payloads**: Chat messages, summaries, and other user content (only hashes stored on-chain)
- **Message bodies**: Actual message content (encrypted and stored off-chain)
- **Private user attributes**: User content is encrypted before storage
- **Application-level analytics**: Usage patterns, preferences (not stored on-chain)

### Privacy Implications

While content remains confidential, on-chain metadata may:

- **Reveal interaction timing**: Event timestamps can show when DID operations occurred
- **Enable linkage between events**: Events indexed by tokenId can be linked to the same DID across time
- **Allow correlation across services**: Service endpoints may reveal service types and locations, enabling correlation with off-chain activity
- **Create permanent history trail**: DID document updates, attribute changes, and authorization events create an immutable history

This is a known and accepted trade-off in decentralized identity systems, where public metadata enables verifiability and resolution while content privacy is maintained through encryption.

### Design Intent

The system prioritizes:

1. **Strong content confidentiality**: User content is encrypted end-to-end and stored as ciphertext only
2. **Verifiable and resolvable identity**: Public metadata enables DID resolution and authorization verification
3. **Minimal but unavoidable metadata exposure**: Metadata exposure is minimized where possible, but some metadata (DID documents, service endpoints, events) is required for system functionality

---

## Optional Stronger Privacy Configurations

This section describes possible enhancements to reduce metadata exposure. **These approaches are not currently implemented and introduce trade-offs in complexity, cost, and resolvability.**

Possible enhancements to reduce metadata exposure include:

- **Hashing service endpoints**: Instead of storing service endpoint URLs in plaintext, store only hashes and require off-chain resolution
- **Off-chain DID documents**: Move DID documents fully off-chain with on-chain commitments (hashes only on-chain)
- **Privacy-preserving registries**: Use privacy-preserving blockchain solutions or ZK-based resolution mechanisms
- **DID rotation**: Rotate DIDs periodically to reduce long-term linkability (requires new DID minting and data migration)

**Trade-offs to consider**:

- **Complexity**: Off-chain resolution requires additional infrastructure and coordination
- **Cost**: Privacy-preserving solutions may increase gas costs or require additional services
- **Resolvability**: Reducing on-chain metadata may complicate DID resolution and verification
- **User experience**: More complex privacy configurations may impact usability

These approaches are documented for future consideration and are not enabled by default.
