# Encryption Complete Guide - SafePsy

> **For comprehensive data protection information, including consent flows and detailed encryption implementation in the context of GDPR compliance, see the [Data Protection Impact Assessment (DPIA)](/dpia) in the SafePsy application.**

## ⚠️ IMPORTANT: Your Wallet is Your Key

**Critical Information**: SafePsy uses wallet-based encryption. This means:

- ✅ **Your wallet is your key**: If you can authenticate with your wallet, you can access your encrypted data
- ❌ **No recovery without wallet**: If you lose access to your wallet or if your DID token is revoked, SafePsy **cannot recover your encrypted data**
- ❌ **No password reset**: There is no password-based account recovery mechanism
- ❌ **No key escrow**: SafePsy does not store your encryption keys and cannot recover your data

**To prevent data loss**:
- Securely store your wallet seed phrase in a safe location
- Use a hardware wallet (Ledger, Trezor) for additional security
- Understand that token revocation will prevent data access
- Back up your wallet seed phrase (not your encryption keys - those are derived from your wallet)

---

## How SafePsy Encryption Works

### Simple Explanation

SafePsy encrypts your chat messages using a two-layer encryption system:

1. **Your chat messages** are encrypted with a random encryption key (DEK)
2. **That encryption key** is encrypted using your wallet signature
3. **The encrypted key** is stored on the blockchain (in your DID)
4. **Your encrypted chat** is stored in SafePsy's database

**To access your data**:
- You must connect your wallet
- You must sign an authentication message (proves you own the wallet)
- Your DID token must be valid (not revoked)
- Only then can you decrypt your chat history

### End-to-End (E2E) Encryption Semantics

**Important**: SafePsy implements **client-side encryption with server-side temporary decryption** for AI processing. This is **not** traditional end-to-end encryption where the server never sees plaintext.

**Encryption Flow**:

1. **Client-Side Encryption (E2E Start)**:
   - ✅ Chat messages are encrypted **client-side** using AES-256-GCM
   - ✅ Encryption happens in the user's browser before transmission
   - ✅ Server receives **ciphertext only** (encrypted blobs)
   - ✅ Server stores **ciphertext only** in database

2. **Server-Side Temporary Decryption (AI Processing)**:
   - ⚠️ Server **must decrypt** messages temporarily in memory for AI processing
   - ⚠️ Plaintext exists **only in server memory** during request processing
   - ⚠️ Plaintext is **never written to disk, logs, or database**
   - ⚠️ Plaintext lifetime: **Request duration only** (typically seconds to minutes)

3. **AI Service Processing**:
   - ⚠️ Decrypted plaintext is sent to Scaleway AI service for chat completions
   - ⚠️ Scaleway receives **plaintext message content** (necessary for AI processing)
   - ⚠️ Scaleway does **NOT** receive user identifiers (wallet addresses, DID, email, IP)

4. **Response Encryption (E2E End)**:
   - ✅ AI responses are streamed back to client in plaintext over TLS
   - ✅ Client encrypts complete conversation before saving
   - ✅ Server stores encrypted conversation blob (ciphertext only)

**Trust Boundaries**:

| Component | Can See Plaintext? | When? | Storage |
|-----------|-------------------|-------|---------|
| **Client Browser** | ✅ Yes | Always (user's device) | Memory only (session) |
| **SafePsy Server** | ⚠️ Temporarily | During AI processing only | Never stored |
| **SafePsy Database** | ❌ No | Never | Ciphertext only |
| **Scaleway AI** | ⚠️ Yes | During AI processing | Per Scaleway policy |
| **Network (TLS)** | ❌ No | Encrypted in transit | N/A |

**Privacy Guarantees**:

✅ **Content Privacy**: Chat content is encrypted at rest (ciphertext only in database)  
✅ **Key Privacy**: Encryption keys are never stored on server (client-side only)  
⚠️ **Transient Processing**: Plaintext exists temporarily in server memory for AI functionality  
❌ **Not Pure E2E**: Server must decrypt for AI processing (functional requirement)

### What This Means for You

**✅ You Can Access Your Data If**:
- You have access to your wallet (can sign messages)
- Your DID token is valid (not revoked)
- You can authenticate with SafePsy

**❌ You Cannot Access Your Data If**:
- You lose your wallet seed phrase
- Your wallet is inaccessible
- Your DID token is revoked
- You cannot sign authentication messages

**Multi-Device Access**:
- You can use SafePsy on multiple devices
- You must connect your wallet on each device
- There is no automatic key synchronization between devices
- Each device derives the decryption key from your wallet signature

---

## Encryption Architecture

### Two-Layer Encryption

```
┌─────────────────────────────────────────────────────────────┐
│                    Encryption Layers                         │
└─────────────────────────────────────────────────────────────┘

Layer 1: Chat Message Encryption (AES-256-GCM)
├── Key: Random 32-byte key (DEK)
├── Purpose: Encrypt/decrypt your chat messages
└── Storage: Encrypted chat stored in database

Layer 2: Key Encryption (Wallet-Based)
├── Method: Wallet signature → SHA-256 hash → encryption key (KEK)
├── Purpose: Encrypt the chat encryption key (DEK)
└── Storage: Encrypted DEK stored in DID (on blockchain)
```

### Key Types

**Data Encryption Key (DEK)**:
- Random 32-byte key generated when you first use SafePsy
- Used to encrypt/decrypt your chat messages
- Stored encrypted in your DID (on blockchain)
- Never transmitted to SafePsy servers

**Key Encryption Key (KEK)**:
- Derived from your wallet signature
- Used to encrypt/decrypt the DEK
- Never stored (derived on-demand when needed)
- Only you can derive it (requires your wallet private key)

### How Keys Are Derived

**Key Derivation Process**:

1. **You sign a message** with your wallet:
   ```
   SafePsy Chat Encryption Key
   Wallet: {your-wallet-address}
   Purpose: Encrypt symmetric key for chat history
   ```

2. **SafePsy derives an encryption key** from your signature:
   - Takes your signature + wallet address
   - Hashes them together (SHA-256)
   - Produces a 32-byte encryption key (KEK)

3. **This KEK encrypts your DEK**:
   - Your chat encryption key (DEK) is encrypted with the KEK
   - The encrypted DEK is stored in your DID (on blockchain)

4. **To decrypt your chat**:
   - You sign the same message again
   - SafePsy derives the same KEK from your signature
   - The KEK decrypts your DEK
   - The DEK decrypts your chat messages

**Security**: Only someone with your wallet private key can produce the signature needed to derive the KEK. This is why your wallet is your key.

---

## Storage Locations

### Where Your Data Is Stored

**Encrypted Chat Messages**:
- **Location**: SafePsy database (off-chain)
- **Format**: Encrypted blob (ciphertext only)
- **Access**: Only you can decrypt (requires wallet authentication)

**Encrypted Encryption Key**:
- **Location**: Your DID on blockchain (on-chain)
- **Format**: Encrypted DEK (wrapped with wallet-based KEK)
- **Access**: Only you can decrypt (requires wallet signature)

**Plaintext Keys**:
- **Location**: Your browser memory (during active session only)
- **Format**: Plaintext DEK (temporary)
- **Lifetime**: Only exists while you're using SafePsy
- **Cleared**: Automatically cleared when you log out

### What SafePsy Cannot Access

**SafePsy servers**:
- ❌ Cannot decrypt your chat messages (no access to your encryption keys)
- ❌ Cannot read your plaintext chat history
- ❌ Do not store your encryption keys
- ✅ Can see encrypted blobs (ciphertext) but cannot decrypt them

**SafePsy can temporarily decrypt**:
- ⚠️ During AI processing: Your chat messages are decrypted temporarily in server memory to send to AI services (Scaleway)
- ⚠️ This is necessary for AI chat functionality
- ⚠️ Plaintext is never stored, logged, or written to disk
- ⚠️ Plaintext exists only during request processing (seconds to minutes)

---

## Access and Recovery

### How to Access Your Data

**Step-by-Step Access Process**:

1. **Connect Your Wallet**
   - Open SafePsy in your browser
   - Connect your wallet (MetaMask, WalletConnect, etc.)
   - Ensure you're on Ethereum Mainnet

2. **Authenticate**
   - SafePsy will ask you to sign a message
   - This proves you own the wallet
   - Sign the message with your wallet

3. **Verify DID Token**
   - SafePsy checks that you own a valid DID token
   - Token must not be revoked
   - If verification fails, access is denied

4. **Derive Decryption Key**
   - SafePsy asks you to sign the key encryption message
   - Your signature is used to derive the KEK
   - The KEK decrypts your DEK
   - The DEK decrypts your chat history

5. **Access Your Chat**
   - Your chat history is decrypted and displayed
   - You can continue chatting
   - New messages are encrypted before saving

### Recovery Scenarios

**✅ You Can Recover Your Data If**:
- You have your wallet seed phrase
- You can access your wallet
- Your DID token is valid (not revoked)
- You can sign authentication messages

**❌ You Cannot Recover Your Data If**:
- **Lost wallet seed phrase**: If you lose your seed phrase, you cannot access your wallet, and therefore cannot access your data
- **Wallet inaccessible**: If your wallet is locked, lost, or inaccessible, you cannot authenticate
- **Token revoked**: If your DID token is revoked, SafePsy will deny access even if you have your wallet
- **Cannot sign**: If you cannot sign authentication messages (wallet issue, device issue), you cannot access your data

**Permanent Loss Conditions**:
- Lost wallet = permanent data loss
- Revoked token = permanent data loss (even if you have wallet)
- No recovery mechanism exists for these scenarios

### Multi-Device Access

**Using SafePsy on Multiple Devices**:

1. **Connect wallet on each device**:
   - Open SafePsy on Device A → Connect wallet → Access data
   - Open SafePsy on Device B → Connect wallet → Access data
   - No automatic synchronization needed

2. **How it works**:
   - Each device derives the decryption key from your wallet signature
   - No keys are synced between devices
   - Each device independently derives keys from wallet authentication

3. **Limitations**:
   - You must connect your wallet on each device
   - No automatic key synchronization
   - Each device requires wallet authentication

---

## Security Best Practices

### Protecting Your Wallet

**Wallet Security**:
- ✅ Use a hardware wallet (Ledger, Trezor) for maximum security
- ✅ Store your seed phrase in a secure location (password manager, safe)
- ✅ Never share your seed phrase with anyone
- ✅ Use strong wallet software (MetaMask, etc.)
- ✅ Keep your wallet software updated

**Device Security**:
- ✅ Use secure devices (encrypted disk, screen lock)
- ✅ Log out of SafePsy when not using it
- ✅ Use private browsing mode on shared devices
- ✅ Clear browser data regularly
- ✅ Keep your browser and operating system updated

### Understanding Token Revocation

**What is Token Revocation?**:
- Your DID token can be revoked on the blockchain
- Revocation is permanent (cannot be undone)
- Revocation prevents access to your encrypted data

**When to Revoke**:
- If your wallet is compromised
- If you suspect unauthorized access
- If you want to permanently prevent access

**Consequences of Revocation**:
- ⚠️ You will lose access to your encrypted data
- ⚠️ SafePsy cannot recover your data after revocation
- ⚠️ Revocation is permanent

**Before Revoking**:
- Ensure you have backed up any important data
- Understand that revocation means permanent data loss
- Consider alternative security measures first

---

## Frequently Asked Questions (FAQ)

### Can SafePsy recover my data if I lose my wallet?

**No**. SafePsy cannot recover your encrypted data if you lose access to your wallet. Your wallet is your key, and without it, your data is permanently inaccessible.

### Can I use multiple devices?

**Yes**. You can use SafePsy on multiple devices. You must connect your wallet on each device to access your data. There is no automatic key synchronization - each device derives keys from your wallet signature.

### Does SafePsy store my keys?

**No**. SafePsy does not store your encryption keys. Your encrypted key is stored in your DID on the blockchain, but SafePsy servers never have access to your plaintext keys.

### What happens if my token is revoked?

**You lose access to your data**. If your DID token is revoked, SafePsy will deny access to your encrypted data, even if you have your wallet. Revocation is permanent and cannot be undone.

### Can I change my wallet?

**Yes, but with limitations**. If you transfer your DID token to a new wallet, the new wallet will have access to your encrypted data. However, if you create a new DID with a new wallet, you will not have access to data encrypted with the old wallet's key.

### What if I forget my wallet password?

**This depends on your wallet software**. SafePsy does not manage wallet passwords. If you forget your wallet password but have your seed phrase, you can recover your wallet using your seed phrase. If you lose both your password and seed phrase, you cannot access your wallet or your SafePsy data.

### Is my data encrypted end-to-end?

**Partially, with important caveats**. SafePsy implements **client-side encryption** where:

✅ **Client-side encryption**: Your chat messages are encrypted in your browser before transmission  
✅ **Encrypted storage**: Server stores only ciphertext (encrypted blobs)  
✅ **Key privacy**: Encryption keys are never stored on server (client-side only)  

⚠️ **Server-side temporary decryption**: SafePsy **must decrypt** your messages temporarily in server memory to process them with AI services (Scaleway). This is a functional requirement for AI chat functionality.

❌ **Not pure E2E**: Traditional end-to-end encryption means the server never sees plaintext. SafePsy cannot provide pure E2E because AI processing requires server-side decryption.

**What this means**:
- Your data is encrypted at rest (ciphertext only in database)
- Your data is encrypted in transit (TLS)
- Your data is temporarily decrypted in server memory for AI processing
- Plaintext is never written to disk, logs, or database
- Plaintext exists only during request processing (seconds to minutes)

### What does SafePsy see?

**SafePsy servers see**:
- ✅ Encrypted chat blobs (ciphertext) - stored in database, cannot decrypt without your key
- ✅ Wallet addresses (public identifiers) - required for authentication
- ✅ DID token IDs (public identifiers) - required for authorization
- ⚠️ **Plaintext messages temporarily during AI processing** - decrypted in memory only, never stored

**SafePsy servers do NOT see**:
- ❌ Your encryption keys (never transmitted to servers, client-side only)
- ❌ Your wallet private key (managed by wallet software)
- ❌ Your seed phrase (never shared with SafePsy)
- ❌ Persistent plaintext (only temporary in-memory decryption for AI processing)

**Important**: The server **must** decrypt your messages temporarily to send them to Scaleway AI for chat completions. This is a functional requirement. Plaintext exists only in server memory during request processing and is never written to disk, logs, or database.

### What does Scaleway (AI service) see?

**Scaleway sees**:
- ✅ Your chat message content (plaintext) - necessary for AI processing
- ✅ Conversation context (full chat history for context-aware responses)

**Scaleway does NOT see**:
- ❌ Your wallet address
- ❌ Your DID token ID
- ❌ Your email address
- ❌ Your IP address (except unavoidable network-level)
- ❌ Session metadata

### Can I back up my encryption keys?

**No, and you don't need to**. Your encryption keys are derived from your wallet signature. As long as you have your wallet (and seed phrase), you can always derive the keys. Backing up your wallet seed phrase is sufficient.

### What encryption algorithm is used?

**AES-256-GCM**:
- Advanced Encryption Standard with 256-bit keys
- Galois/Counter Mode for authenticated encryption
- Industry-standard encryption algorithm

**Key Derivation**:
- SHA-256 hash of wallet signature + wallet address
- Not PBKDF2 (PBKDF2 is available but not used for wallet-based keys)

---

## Technical Details (For Developers)

### Key Derivation Algorithm

**Current Implementation**:
- **Input**: Wallet signature (hex string) + wallet address (lowercase string)
- **Process**: Concatenate signature bytes + address bytes → SHA-256 hash
- **Output**: 32-byte key (KEK)
- **Algorithm**: SHA-256 (not PBKDF2)

**Message Format** (for key encryption):
```
SafePsy Chat Encryption Key
Wallet: {walletAddress.toLowerCase()}
Purpose: Encrypt symmetric key for chat history
```

**Security Properties**:
- Deterministic: Same wallet + same message = same KEK
- Non-replayable: Message format is domain-separated
- Verifiable: Signature can be verified to ensure wallet ownership

### Storage Format

**Encrypted DEK Format**:
```
{signature}:{iv}:{encryptedKey}
```

Where:
- `signature`: Wallet signature of key encryption message
- `iv`: Initialization vector (12 bytes, hex)
- `encryptedKey`: Encrypted DEK (AES-256-GCM ciphertext, hex)

**DID Storage Format**:
```json
{
  "encryptedKey": "{signature}:{iv}:{encryptedKey}",
  "chatHash": "0x...",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

### Implementation Files

**Frontend**:
- `apps/web/src/utils/did-encryption.ts` - Key encryption/decryption
- `apps/web/src/utils/encryption.ts` - AES-256-GCM encryption
- `apps/web/src/hooks/useChatEncryption.ts` - Encryption hook

**Backend**:
- `apps/api/src/lib/crypto.ts` - Server-side crypto utilities
- `apps/api/src/middleware/did-verify.ts` - DID token verification
- `apps/api/src/middleware/wallet-auth.ts` - Wallet authentication

---

## Summary

**Key Takeaways**:

1. **Your wallet is your key**: Wallet authentication is the sole access mechanism
2. **No recovery without wallet**: Losing wallet access means permanent data loss
3. **No key escrow**: SafePsy does not store encryption keys
4. **Multi-device support**: Connect wallet on each device (no key sync)
5. **Token revocation**: Revoking token means permanent access loss
6. **Transient decryption**: Server decrypts temporarily for AI processing (not stored)

**Your Responsibilities**:
- Securely store your wallet seed phrase
- Use a hardware wallet for maximum security
- Understand that token revocation means data loss
- Keep your wallet and devices secure

**SafePsy's Guarantees**:
- Your data is encrypted at rest (ciphertext only in database)
- Your encryption keys are never stored server-side
- Your wallet is required for all data access
- No recovery mechanism exists (by design, for security)

---

**For more technical details, see**: `TECHNICAL_REVIEW.md` - "Key Lifecycle & Management (Wallet-Gated)" section
