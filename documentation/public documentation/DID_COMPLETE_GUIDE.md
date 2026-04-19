# DID Identity Token Implementation

Complete implementation of DID (Decentralized Identity) layer for SafePsy with soulbound identity tokens.

## Overview

This implementation provides:
- **Soulbound Identity Tokens**: One non-transferable token per wallet
- **Smart Contract**: Solidity contract for DID management
- **Backend Service**: Web3 integration with ethers.js
- **Production API**: RESTful endpoints for DID operations
- **Frontend UI**: React components for DID management
- **Auto-Creation**: Automatic DID creation on first connection

## Architecture

### Smart Contract

**File**: `apps/api/src/contracts/DIDIdentityToken.sol`

- **Soulbound Design**: Tokens cannot be transferred (one per wallet)
- **Key Functions**:
  - `hasDid(address user)` - Check if wallet has DID
  - `getDidId(address user)` - Get token ID for wallet
  - `getDidData(address user)` - Get encrypted data
  - `setDidData(bytes encryptedData)` - Update encrypted data (owner only)
  - `createDid(address user)` - Create DID (backend signer or public)
  - `createMyDid()` - Public self-minting

- **Events**:
  - `DidCreated(address indexed user, uint256 indexed tokenId)`
  - `DidDataUpdated(address indexed user)`

### Backend Service

**File**: `apps/api/src/lib/did.service.ts`

- **DIDService Class**: Manages Web3 interactions
- **Features**:
  - Network validation (Ethereum Mainnet only)
  - Wallet address validation
  - Backend signer support for minting
  - Public minting fallback

### API Endpoints

**File**: `apps/api/src/routes/did.ts`

#### POST /api/did/check
Check if authenticated wallet has a DID.

**Authentication**: Required (JWT token)

**Response**:
```json
{
  "success": true,
  "data": {
    "hasDid": true,
    "tokenId": "123",
    "encryptedDataExists": false,
    "walletAddress": "0x..."
  }
}
```

#### POST /api/did/create
Create a DID for authenticated wallet.

**Authentication**: Required (JWT token)

**Response**:
```json
{
  "success": true,
  "message": "DID created successfully",
  "data": {
    "hasDid": true,
    "tokenId": "123",
    "encryptedDataExists": false,
    "walletAddress": "0x...",
    "txHash": "0x..."
  }
}
```

#### GET /api/did/info
Get all available metadata about user's DID.

**Authentication**: Required (JWT token)

**Response**:
```json
{
  "success": true,
  "data": {
    "hasDid": true,
    "tokenId": "123",
    "encryptedDataExists": true,
    "encryptedDataSize": 256,
    "walletAddress": "0x...",
    "contractAddress": "0x...",
    "network": "Ethereum Mainnet",
    "chainId": 1
  }
}
```

### Frontend Components

**File**: `apps/web/src/components/DIDManager.tsx`

- **DID Status Panel**: Shows identity status
- **Create Button**: Triggers DID creation
- **Auto-Refresh**: Updates on auth state changes

**States**:
- "No identity yet" - Shows create button
- "Identity active" - Shows token ID and data status
- Loading/Error states with appropriate UI

## User Flow

### First-Time User

1. **Connect Wallet** → MetaMask/WalletConnect
2. **Verify Wallet** → Sign verification message
3. **Auto-Check DID** → System checks if DID exists
4. **No DID Found** → Shows "Create my Safe ID Token" button
5. **User Clicks Create** → Backend mints DID token
6. **DID Created** → Token ID assigned, status updated

### Returning User

1. **Connect Wallet** → MetaMask/WalletConnect
2. **Verify Wallet** → Sign verification message
3. **Auto-Check DID** → System checks if DID exists
4. **DID Found** → Shows "Identity Active" with token ID
5. **Ready to Use** → All features available

## Integration with Auth Flow

The DID check is automatically integrated into the authentication flow:

```typescript
// In AuthContext.tsx
useEffect(() => {
  if (authState.isVerified) {
    checkDID(); // Automatically checks DID after verification
  }
}, [authState.isVerified]);
```

## Security Features

### 1. Network Validation
- Only Ethereum Mainnet (Chain ID: 1) is supported
- Backend validates network before any operation
- Frontend shows error if wrong network

### 2. Authentication Required
- All DID endpoints require valid JWT session
- Wallet address extracted from authenticated session
- No arbitrary address minting allowed

### 3. Ownership Validation
- Only wallet owner can update their DID data
- Backend signer can create DIDs (if configured)
- Public minting option (if enabled in contract)

### 4. Duplicate Prevention
- Contract enforces one DID per wallet
- Backend checks before creation
- Returns existing DID if already created

## Environment Variables

### Backend

```env
# DID Contract Configuration
DID_IDENTITY_TOKEN_ADDRESS=0x... # Deployed contract address
RPC_URL=https://mainnet.infura.io/v3/... # Ethereum RPC endpoint
ETH_RPC_URL=https://mainnet.infura.io/v3/... # Alternative RPC URL

# Optional: Backend Signer (for backend-initiated minting)
DID_BACKEND_SIGNER_PRIVATE_KEY=0x... # Private key for backend signer

# JWT Configuration
JWT_SECRET=your-strong-random-secret
JWT_EXPIRES_IN=7d
```

### Frontend

```env
VITE_API_URL=http://localhost:3001
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
```

## Deployment

### 1. Deploy Smart Contract

```bash
# Compile contract
npx hardhat compile

# Deploy to Ethereum Mainnet
npx hardhat run scripts/deploy-did-token.js --network mainnet
```

**Deployment Script Example**:
```javascript
const DIDIdentityToken = await ethers.getContractFactory("DIDIdentityToken");
const didToken = await DIDIdentityToken.deploy(
  "0x0000000000000000000000000000000000000000", // Backend signer (zero = no backend)
  true // Allow public minting
);
await didToken.deployed();
console.log("DIDIdentityToken deployed to:", didToken.address);
```

### 2. Configure Backend

1. Set `DID_IDENTITY_TOKEN_ADDRESS` to deployed contract address
2. Set `RPC_URL` to Ethereum Mainnet RPC endpoint
3. (Optional) Set `DID_BACKEND_SIGNER_PRIVATE_KEY` for backend minting

### 3. Test Endpoints

```bash
# Check DID (requires auth)
curl -X POST http://localhost:3001/api/did/check \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"

# Create DID (requires auth)
curl -X POST http://localhost:3001/api/did/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

## Usage Examples

### Frontend: Display DID Status

```typescript
import { useAuth } from '../contexts/AuthContext';
import DIDManager from '../components/DIDManager';

function MyComponent() {
  const { authState } = useAuth();

  return (
    <div>
      {authState.isVerified && (
        <DIDManager />
      )}
    </div>
  );
}
```

### Frontend: Check DID Programmatically

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { authState, checkDID } = useAuth();

  useEffect(() => {
    if (authState.isVerified) {
      checkDID();
    }
  }, [authState.isVerified]);

  if (authState.didStatus === 'exists') {
    return <div>DID Active: {authState.didInfo?.did}</div>;
  }

  return <div>No DID found</div>;
}
```

### Backend: Protect Route with DID Check

```typescript
import { authenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import { DIDService } from '../lib/did.service';

router.get('/protected', authenticateWallet, async (req: AuthenticatedRequest, res) => {
  const didService = DIDService.getInstance();
  if (!didService) {
    return res.status(503).json({ error: 'DID service unavailable' });
  }

  const hasDid = await didService.hasDid(req.wallet.walletAddress);
  if (!hasDid) {
    return res.status(403).json({ error: 'DID required' });
  }

  // Continue with protected logic
  res.json({ success: true });
});
```

## Error Handling

### Network Errors

If user is on wrong network:
- Frontend shows error banner
- Backend returns `UNSUPPORTED_CHAIN` error
- User must switch to Ethereum Mainnet

### DID Creation Errors

- **Already Exists**: Returns existing DID info
- **Network Mismatch**: Clear error message
- **Backend Signer Missing**: Falls back to public minting (if enabled)
- **Transaction Failed**: Detailed error from blockchain

### Authentication Errors

- **No Token**: Returns 401
- **Invalid Token**: Returns 401
- **Expired Token**: Frontend auto-refreshes or prompts re-verification

## Testing

### Manual Testing

1. **Deploy Contract** to testnet (Sepolia/Amoy)
2. **Update Environment** with testnet contract address
3. **Connect Wallet** to testnet
4. **Verify Wallet** and check DID status
5. **Create DID** and verify token ID
6. **Check DID Info** and verify all fields

### Unit Tests

```typescript
describe('DIDService', () => {
  it('should check if wallet has DID', async () => {
    const service = DIDService.getInstance();
    const hasDid = await service.hasDid('0x...');
    expect(hasDid).toBe(false);
  });

  it('should create DID for wallet', async () => {
    const service = DIDService.getInstance();
    const result = await service.createDID('0x...');
    expect(result.tokenId).toBeDefined();
  });
});
```

## Files Created/Modified

### Backend
- `apps/api/src/contracts/DIDIdentityToken.sol` - Smart contract
- `apps/api/src/lib/did.service.ts` - DID service
- `apps/api/src/routes/did.ts` - API endpoints
- `apps/api/src/index.ts` - Route registration

### Frontend
- `apps/web/src/components/DIDManager.tsx` - DID management UI
- `apps/web/src/contexts/AuthContext.tsx` - Updated DID check
- `apps/web/src/components/ConnectWallet.tsx` - Auto DID check

## Next Steps

1. **Deploy Contract**: Deploy to Ethereum Mainnet
2. **Configure Environment**: Set contract address and RPC URL
3. **Test Integration**: Verify end-to-end flow
4. **Add Encryption**: Implement encrypted data storage
5. **Add DID Metadata**: Store additional identity information
6. **Add DID Revocation**: Allow users to revoke their DID

## Contract Deployment Checklist

- [ ] Compile contract with Solidity 0.8.20+
- [ ] Deploy to Ethereum Mainnet
- [ ] Verify contract on Etherscan
- [ ] Set backend environment variables
- [ ] Test contract functions
- [ ] Test API endpoints
- [ ] Test frontend integration
- [ ] Monitor gas costs
- [ ] Set up contract upgradeability (if needed)

## Security Checklist

- [ ] Backend signer private key stored securely
- [ ] Contract address validated on every request
- [ ] Network validation on all operations
- [ ] Wallet address validation
- [ ] Rate limiting on create endpoint
- [ ] Error messages don't leak sensitive info
- [ ] JWT tokens expire appropriately
- [ ] HTTPS in production
- [ ] Contract audited (recommended)

# DID Identity Token Contract - ERC-721 Soulbound Implementation

## Overview

The DID Identity Token is a **soulbound ERC-721 token** that serves as a user's decentralized identity on SafePsy. Each wallet can have exactly one non-transferable identity token.

## Contract Features

### ERC-721 Standard Compliance
- Extends OpenZeppelin's `ERC721` contract
- Implements standard ERC-721 functions (`ownerOf`, `tokenURI`, etc.)
- **Soulbound (Non-Transferable)**: All transfer functions are overridden to revert

### Storage Model

The contract uses a structured storage model:

```solidity
struct DidProfile {
    address owner;                    // 20 bytes
    uint64 createdAt;                 // 8 bytes (packed)
    uint64 lastUpdatedAt;             // 8 bytes (packed)
    bytes32 chatDataReference;        // 32 bytes (hash/CID/DB key)
    bytes encryptedKeyMetadata;       // Variable length
}
```

**Storage Layout:**
- `tokenId → DidProfile` mapping
- `owner → tokenId` mapping (for efficient lookup)
- `owner → bool` mapping (for quick existence checks)

### Key Functions

#### Profile Management

```solidity
// Get full profile by wallet address
function getProfileByOwner(address user) external view returns (DidProfile memory)

// Get full profile by token ID
function getProfile(uint256 tokenId) external view returns (DidProfile memory)

// Update chat reference and encrypted key metadata
function updateChatReference(
    string calldata newRef,
    bytes calldata newEncryptedKeyMetadata
) external

// Update only encrypted key metadata
function updateEncryptedKeyMetadata(bytes calldata newEncryptedKeyMetadata) external

// Update only chat data reference
function updateChatDataReference(string calldata newRef) external
```

#### DID Status

```solidity
// Check if wallet has a DID
function hasDid(address user) external view returns (bool)

// Get token ID for wallet
function getDidId(address user) external view returns (uint256)

// Get chat data reference
function getChatDataReference(address user) external view returns (bytes32)

// Get encrypted key metadata
function getEncryptedKeyMetadata(address user) external view returns (bytes memory)
```

#### Minting

```solidity
// Create DID for a user (backend signer or owner only)
function createDid(address user) external returns (uint256)

// Create DID for caller (public minting if enabled)
function createMyDid() external returns (uint256)
```

### Soulbound Implementation

All transfer functions are overridden to prevent transfers:

```solidity
function transferFrom(address, address, uint256) public pure override {
    revert("DIDIdentityToken: token is soulbound and non-transferable");
}

function safeTransferFrom(...) public pure override {
    revert("DIDIdentityToken: token is soulbound and non-transferable");
}

function approve(address, uint256) public pure override {
    revert("DIDIdentityToken: token is soulbound and cannot be approved");
}

function setApprovalForAll(address, bool) public pure override {
    revert("DIDIdentityToken: token is soulbound and cannot be approved");
}
```

### Access Control

- **Owner**: Contract deployer (can update backend signer, toggle public minting)
- **Backend Signer**: Can mint DIDs for users (if configured)
- **Public Minting**: Can be enabled/disabled by owner
- **DID Owner**: Can update their own profile data

### Events

```solidity
event DidCreated(
    address indexed user,
    uint256 indexed tokenId,
    uint64 timestamp
);

event DidChatReferenceUpdated(
    address indexed user,
    uint256 indexed tokenId,
    bytes32 indexed chatDataReference,
    uint64 timestamp
);

event DidKeyMetadataUpdated(
    address indexed user,
    uint256 indexed tokenId,
    uint64 timestamp
);
```

## Gas Optimization

1. **Packed Struct**: `DidProfile` uses `uint64` for timestamps (saves gas vs `uint256`)
2. **Efficient Lookups**: Direct `owner → tokenId` mapping for O(1) lookups
3. **Indexed Events**: All events use indexed parameters for efficient filtering
4. **Storage Slots**: Profile data is organized to minimize storage operations

## Upgradeability Considerations

The contract is designed with UUPS proxy compatibility in mind:

- Storage variables are grouped logically
- No storage layout conflicts with proxy patterns
- Consider using UUPS proxy for future upgrades

**Note**: If upgrading, ensure:
1. Storage layout compatibility
2. Preserve existing token IDs and profiles
3. Maintain soulbound behavior

## Deployment

### Constructor Parameters

```solidity
constructor(
    string memory name,              // e.g., "SafePsy DID Identity"
    string memory symbol,            // e.g., "SAFEPSY-DID"
    string memory baseURI,           // Base URI for token metadata
    address _backendSigner,          // Backend signer address (can be zero)
    bool _allowPublicMinting         // Whether to allow public minting
)
```

### Example Deployment

```javascript
const DIDIdentityToken = await ethers.getContractFactory("DIDIdentityToken");
const didToken = await DIDIdentityToken.deploy(
    "SafePsy DID Identity",
    "SAFEPSY-DID",
    "https://api.safepsy.com/did/metadata/",
    backendSignerAddress,
    false // Start with public minting disabled
);
```

## Usage Examples

### Backend: Create DID for User

```typescript
const didService = DIDService.getInstance();
const result = await didService.createDID(walletAddress);
// Returns: { tokenId: string, txHash: string }
```

### Frontend: Update Chat Reference

```typescript
import { updateChatReference } from '../utils/did-contract';

const receipt = await updateChatReference(
    signer,
    chatHash,              // String: hash/CID/DB key
    encryptedKeyMetadata   // Uint8Array: encrypted symmetric key
);
```

### Frontend: Get Profile

```typescript
import { getDIDProfile } from '../utils/did-contract';

const profile = await getDIDProfile(provider, walletAddress);
// Returns: { owner, createdAt, lastUpdatedAt, chatDataReference, encryptedKeyMetadata }
```

## Security Considerations

1. **Soulbound**: Tokens cannot be transferred, preventing identity theft
2. **Access Control**: Only DID owner can update their profile
3. **Backend Signer**: Controlled minting prevents spam
4. **Network Validation**: Contract enforces Ethereum Mainnet only
5. **Reentrancy Protection**: Uses `ReentrancyGuard` for state-changing functions

## Integration Points

### Backend (`apps/api/src/lib/did.service.ts`)
- `getProfile(walletAddress)`: Get full profile
- `getChatDataReference(walletAddress)`: Get chat reference
- `getEncryptedKeyMetadata(walletAddress)`: Get encrypted key

### Frontend (`apps/web/src/utils/did-contract.ts`)
- `updateChatReference(signer, chatRef, keyMetadata)`: Update both fields
- `updateEncryptedKeyMetadata(signer, keyMetadata)`: Update only key
- `updateChatDataReference(signer, chatRef)`: Update only reference
- `getDIDProfile(provider, walletAddress)`: Get full profile

## Migration from Previous Contract

If migrating from the previous non-ERC721 contract:

1. Deploy new ERC-721 contract
2. Migrate existing DIDs:
   - For each existing DID, call `createDid(userAddress)`
   - Preserve token IDs if possible (may require custom migration)
3. Update contract address in environment variables
4. Update frontend/backend ABIs

## Future Enhancements

- **Metadata URI**: Implement `tokenURI()` for rich metadata
- **Batch Operations**: Add batch minting for efficiency
- **Upgradeability**: Implement UUPS proxy pattern
- **Gas Optimization**: Consider using storage packing for additional savings

# DID User Flow: First-Time vs Returning Users

## Overview

This document explains how the system handles first-time users (no DID) vs returning users (existing DID).

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Connects Wallet                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Wallet Verification (Sign Message)              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         Auto-Check DID Status (POST /api/did/check)          │
└────────────┬───────────────────────────────┬────────────────┘
             │                               │
             ▼                               ▼
    ┌─────────────────┐           ┌─────────────────┐
    │  No DID Found   │           │   DID Found     │
    │  (First-Time)   │           │  (Returning)    │
    └────────┬────────┘           └────────┬────────┘
             │                             │
             ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│  Show "Create Identity"  │   │  Show "Identity Active" │
│         Button           │   │    with Token ID        │
└────────────┬─────────────┘   └────────────┬────────────┘
             │                             │
             ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│  User Clicks "Create"    │   │   Load DID Information    │
│  POST /api/did/create    │   │   GET /api/did/info       │
└────────────┬─────────────┘   └────────────┬────────────┘
             │                             │
             ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│  Backend Mints Token     │   │   Display Token ID       │
│  Returns Token ID        │   │   Show Data Status        │
└────────────┬─────────────┘   └────────────┬────────────┘
             │                             │
             └─────────────┬───────────────┘
                           ▼
              ┌────────────────────────┐
              │   Ready to Use App     │
              └────────────────────────┘
```

## First-Time User Flow

### Step 1: Connect & Verify Wallet
```typescript
// User connects wallet via MetaMask/WalletConnect
await connectWallet();

// User signs verification message
await verifyWallet();
// → Creates JWT session
// → Sets isVerified = true
```

### Step 2: Auto-Check DID
```typescript
// Automatically triggered after verification
useEffect(() => {
  if (authState.isVerified) {
    checkDID(); // POST /api/did/check
  }
}, [authState.isVerified]);
```

**Backend Response**:
```json
{
  "success": true,
  "data": {
    "hasDid": false,  // ← No DID found
    "tokenId": null,
    "encryptedDataExists": false,
    "walletAddress": "0x..."
  }
}
```

**Frontend State**:
```typescript
authState.didStatus = 'none';
authState.didInfo = { hasDid: false, ... };
```

### Step 3: Show Create Button
```tsx
// DIDManager component shows:
<div>
  <AlertCircle /> No identity yet
  <button onClick={handleCreateDID}>
    Create my Safe ID Token
  </button>
</div>
```

### Step 4: User Creates DID
```typescript
// User clicks "Create my Safe ID Token"
await fetch('/api/did/create', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Backend Process**:
1. Validates authentication
2. Validates network (Ethereum Mainnet)
3. Checks if DID already exists (should be false)
4. Calls `didService.createDID(walletAddress)`
5. Backend signer mints token via `contract.createDid(walletAddress)`
6. Returns token ID and transaction hash

**Backend Response**:
```json
{
  "success": true,
  "message": "DID created successfully",
  "data": {
    "hasDid": true,
    "tokenId": "123",  // ← New token ID
    "encryptedDataExists": false,
    "walletAddress": "0x...",
    "txHash": "0x..."
  }
}
```

**Frontend State Update**:
```typescript
authState.didStatus = 'exists';
authState.didInfo = {
  hasDid: true,
  tokenId: "123",
  ...
};
```

### Step 5: Display Active Identity
```tsx
// DIDManager component updates to show:
<div>
  <CheckCircle /> Identity Active
  <p>Token ID: 123</p>
  <p>Secure Data Storage: No data stored yet</p>
</div>
```

## Returning User Flow

### Step 1: Connect & Verify Wallet
```typescript
// Same as first-time user
await connectWallet();
await verifyWallet();
```

### Step 2: Auto-Check DID
```typescript
// Automatically triggered after verification
checkDID(); // POST /api/did/check
```

**Backend Response**:
```json
{
  "success": true,
  "data": {
    "hasDid": true,  // ← DID found!
    "tokenId": "123",  // ← Existing token ID
    "encryptedDataExists": true,
    "walletAddress": "0x..."
  }
}
```

**Frontend State**:
```typescript
authState.didStatus = 'exists';
authState.didInfo = {
  hasDid: true,
  tokenId: "123",
  encryptedDataExists: true,
  ...
};
```

### Step 3: Display Active Identity
```tsx
// DIDManager component shows:
<div>
  <CheckCircle /> Identity Active
  <p>Token ID: 123</p>
  <p>Secure Data Storage: Yes - 256 bytes stored</p>
</div>
```

**No create button shown** - user already has DID.

## Key Implementation Details

### Auto-Check on Verification

```typescript
// In AuthContext.tsx
useEffect(() => {
  if (authState.isVerified) {
    // Always check DID status after verification
    checkDID();
  }
}, [authState.isVerified]);
```

### Duplicate Prevention

**Backend Check**:
```typescript
// In did.service.ts
const has = await this.hasDid(walletAddress);
if (has) {
  const tokenId = await this.contract.getDidId(walletAddress);
  throw new Error(`DID already exists with token ID ${tokenId}`);
}
```

**Contract Enforcement**:
```solidity
// In DIDIdentityToken.sol
function createDid(address user) external returns (uint256) {
    require(!_hasDid[user], "DIDIdentityToken: user already has a DID");
    // ... create DID
}
```

### State Management

**AuthContext State**:
```typescript
interface AuthState {
  walletAddress: string | null;
  isVerified: boolean;
  didStatus: 'none' | 'exists' | 'error' | 'checking';
  didInfo: DIDInfo | null;
}
```

**DID Status Transitions**:
- `'none'` → No DID found, show create button
- `'checking'` → Loading DID status
- `'exists'` → DID found, show active status
- `'error'` → Error checking/creating DID

## Error Scenarios

### Network Mismatch
```typescript
// User on wrong network
if (req.wallet.chainId !== ETHEREUM_MAINNET_CHAIN_ID) {
  return res.status(400).json({
    error: 'UNSUPPORTED_CHAIN',
    message: 'Only Ethereum Mainnet is supported'
  });
}
```

### DID Already Exists (on Create)
```typescript
// If somehow DID exists when creating
const hasDid = await didService.hasDid(walletAddress);
if (hasDid) {
  // Return existing DID instead of error
  const didInfo = await didService.getDIDInfo(walletAddress);
  return res.json({
    success: true,
    message: 'DID already exists',
    data: didInfo
  });
}
```

### Backend Signer Not Configured
```typescript
// If backend signer missing and public minting disabled
if (!this.signer && !allowPublicMinting) {
  throw new Error('Backend signer not configured. User must create DID via wallet.');
}
```

## Testing Scenarios

### Test First-Time User
1. Use new wallet address (never connected)
2. Connect wallet
3. Verify wallet
4. Should see "No identity yet"
5. Click "Create my Safe ID Token"
6. Should see "Identity Active" with token ID

### Test Returning User
1. Use wallet that already has DID
2. Connect wallet
3. Verify wallet
4. Should immediately see "Identity Active"
5. No create button shown

### Test Duplicate Prevention
1. Try to create DID twice
2. First attempt succeeds
3. Second attempt returns existing DID info (no error)

## Summary

- **First-Time Users**: Auto-check → No DID → Show create button → Create DID → Show active
- **Returning Users**: Auto-check → DID found → Show active immediately
- **No Duplicates**: Contract + backend enforce one DID per wallet
- **Auto-Integration**: DID check happens automatically after wallet verification
- **Seamless UX**: Users don't need to manually check DID status

# DID Revocation - Implementation Summary

## Overview

⚠️ **IMPORTANT**: This section documents the revocation semantics for the **split-contract architecture** (DIDRegistry.sol). 

**Current Implementation (DIDRegistry.sol):**
- Revocation **BURNS** the token (token is destroyed, not just flagged)
- `_addressToTokenId` mapping is **cleared** on revocation
- Revoked addresses are **permanently banned** from receiving new DIDs
- **Wallet migration is IMPOSSIBLE** - revoked addresses cannot be reused

**Note**: The migration functionality described below refers to the old single-contract architecture (DIDIdentityToken.sol) and is **NOT available** in the current split-contract implementation.

## Files Modified/Created

### Solidity Contract
- **`apps/api/src/contracts/DIDIdentityToken.sol`**
  - Added revocation mappings (`_revokedTokens`, `_revokedAddresses`)
  - Added `isRevoked()` and `isRevokedById()` view functions
  - Added `revokeDid()` function (with optional chat reference clearing)
  - Added `migrateDid()` function (admin/backend only)
  - Added `notRevoked` modifier to prevent updates on revoked DIDs
  - Added events: `DidRevoked`, `DidMigrated`

### Backend
- **`apps/api/src/lib/did.service.ts`**
  - Updated ABI to include revocation and migration functions
  - Added `isRevoked()` method
  - Added `migrateDid()` method
  - Updated `getDIDInfo()` to include revocation status

- **`apps/api/src/routes/did.ts`**
  - Added `POST /api/did/revoke` endpoint
  - Updated `POST /api/did/check` to include `isRevoked` status
  - Updated `GET /api/did/info` to include `isRevoked` status

### Documentation
- **`apps/api/src/contracts/DID_REVOCATION_MIGRATION.md`**
  - Complete design documentation
  - UX implications
  - Security considerations
  - Future enhancements

## Key Features

### Revocation (Current Implementation - DIDRegistry.sol)

**Revocation Semantics:**
- **Token Burning**: Revocation BURNS the token (token is destroyed, not just flagged)
- **Mapping Clearing**: `_addressToTokenId` is cleared on revocation
- **Permanent Ban**: Revoked addresses CANNOT receive new DIDs (permanent tracking)
- **One DID Per Address**: Enforced in smart contract
- **Wallet Migration Impossible**: Revoked addresses are permanently banned

**User Flow:**
1. User requests revocation via UI
2. Frontend validates with backend (`POST /api/did/revoke`)
3. User calls `revoke(uint256 tokenId)` on DIDRegistry contract with wallet
4. Token is **BURNED** (destroyed)
5. Address mapping is cleared
6. Address is permanently marked as revoked
7. Revoked addresses cannot receive new DIDs

**Contract Functions (DIDRegistry.sol):**
```solidity
function revoke(uint256 tokenId) external // Burns token, permanently bans address
function revokeByAddress(address owner) external // Convenience function
function isAddressRevoked(address owner) external view returns (bool)
function isRevoked(uint256 tokenId) external view returns (bool) // Checks if token exists
```

**⚠️ Legacy Functions (DIDIdentityToken.sol - Old Architecture):**
```solidity
function revokeDid(bool clearChatReference) external // Old implementation
function revokeDid() external // Old implementation
function isRevoked(address user) external view returns (bool) // Old implementation
```

**Backend Endpoint:**
- `POST /api/did/revoke` - Validates request, returns instructions

### Migration

⚠️ **IMPORTANT**: **Wallet migration is IMPOSSIBLE** in the current split-contract architecture (DIDRegistry.sol).

**Current Implementation:**
- Revoked addresses are **permanently banned** from receiving new DIDs
- No migration functions exist in DIDRegistry.sol
- This is by design to prevent abuse and maintain identity integrity

**Legacy Implementation (DIDIdentityToken.sol - No Longer Available):**

The migration functionality below refers to the old single-contract architecture and is **NOT available** in the current implementation:

**Support-Driven Flow (Legacy):**
1. User contacts support requesting migration
2. Support verifies identity (off-chain)
3. Support calls `POST /api/did/migrate` (admin only)
4. Backend calls `migrateDid()` on contract
5. Old DID is revoked, new DID is created
6. Chat data can be preserved or cleared

**Contract Function (Legacy):**
```solidity
function migrateDid(
    address oldWallet,
    address newWallet,
    bool clearChatReference
) external // Only owner or backend signer - NOT AVAILABLE in DIDRegistry.sol
```

**Backend Endpoint (Legacy):**
- `POST /api/did/migrate` - Admin only, performs migration (may not be available)

## Security

### Revocation (Current Implementation - DIDRegistry.sol)
- ✅ Only authorized user (via DIDOwnership) can revoke
- ✅ Revocation BURNS the token (token is destroyed)
- ✅ `_addressToTokenId` mapping is cleared
- ✅ Revoked addresses are permanently banned from receiving new DIDs
- ✅ Clear audit trail via events
- ⚠️ Cannot be undone (by design)
- ⚠️ Address cannot receive new DID after revocation (permanent ban)

### Migration (Current Implementation)
- ❌ **Wallet migration is IMPOSSIBLE** in current architecture
- ❌ No migration functions exist in DIDRegistry.sol
- ❌ Revoked addresses cannot be reused
- ✅ This is by design to prevent abuse and maintain identity integrity

## Storage Design (Current Implementation - DIDRegistry.sol)

**Revocation Status:**
- Permanent ban tracking:
  - `mapping(address => bool) private _revokedAddresses` - Permanent ban (prevents re-minting)
  - `mapping(address => uint256) private _addressToTokenId` - Cleared on revocation

**Key Points:**
- Token is **BURNED** on revocation (not just flagged)
- `_addressToTokenId` is **cleared** on revocation
- `_revokedAddresses` is **permanently set** (cannot be reset)
- Efficient lookups via mapping
- Easy to query revocation status via `isAddressRevoked()`

**Legacy Storage (DIDIdentityToken.sol - Old Architecture):**
- `mapping(uint256 => bool) private _revokedTokens` - Old implementation
- `mapping(address => bool) private _revokedAddresses` - Old implementation

## Events

```solidity
event DidRevoked(
    address indexed user,
    uint256 indexed tokenId,
    uint64 timestamp
);

event DidMigrated(
    address indexed oldWallet,
    address indexed newWallet,
    uint256 indexed tokenId,
    uint64 timestamp
);
```

## Next Steps

1. **Update Frontend:**
   - Add revocation UI component
   - Add migration request form
   - Show revoked status in DID display
   - Disable operations on revoked DIDs

2. **Update Web3 Client:**
   - Add `revokeDid()` function
   - Add `isRevoked()` check
   - Add migration request helper

3. **Admin Panel:**
   - Create admin interface for migrations
   - Add verification workflow
   - Track migration requests

4. **Testing:**
   - Unit tests for revocation
   - Integration tests for migration
   - E2E tests for user flows

## Usage Examples

### Revoke DID (Frontend - Current Implementation)

**Current Implementation (DIDRegistry.sol):**
```typescript
// Check if address is revoked
const isRevoked = await contract.isAddressRevoked(walletAddress);

// Get token ID
const tokenId = await contract.getTokenIdByAddress(walletAddress);

// Revoke (burns token, permanently bans address)
await contract.revoke(tokenId);

// Or use convenience function
await contract.revokeByAddress(walletAddress);
```

**Legacy Implementation (DIDIdentityToken.sol - Old Architecture):**
```typescript
// Check if revoked (old implementation)
const isRevoked = await contract.isRevoked(walletAddress);

// Revoke (clears chat reference) - NOT AVAILABLE in DIDRegistry.sol
await contract.revokeDid(true);

// Or use convenience function - NOT AVAILABLE in DIDRegistry.sol
await contract.revokeDid();
```

### Check Revocation Status (Backend)
```typescript
const didInfo = await didService.getDIDInfo(walletAddress);
if (didInfo.isRevoked) {
  // Handle revoked DID
}
```

### Migrate DID (Admin/Backend)
```typescript
const result = await didService.migrateDid(
  oldWallet,
  newWallet,
  false // Preserve chat reference
);
```

## UX Considerations

### Revocation (Current Implementation)
- Show clear warning before revocation
- Explain consequences (cannot be undone, address permanently banned)
- ⚠️ **IMPORTANT**: Explain that address will be permanently banned from receiving new DIDs
- Show revoked status after revocation
- ❌ **Cannot create new DID after revocation** - address is permanently banned

### Migration
- Provide clear migration request form
- Set expectations for processing time
- Show pending status during migration
- Confirm successful migration
- Remind user to update saved addresses

## Future Enhancements

1. **Time-Locked Revocation:** 7-day cooldown before effect
2. **Self-Service Migration:** Two-wallet signature verification
3. **Partial Revocation:** Revoke specific data types
4. **Migration History:** Track all migrations
5. **Recovery Options:** Social recovery, guardians

# DID Revocation and Migration Design

## Overview

This document describes the design and implementation of DID revocation and wallet migration features for SafePsy.

## Revocation

### Purpose

Allow users to reset their identity by revoking their DID token. This is useful for:
- Privacy concerns
- Security incidents (compromised wallet)
- Starting fresh with a new identity

### Implementation

#### Solidity Contract

**Storage Structure:**
- Separate mappings for revocation status (preserves storage layout):
  - `mapping(uint256 => bool) private _revokedTokens`
  - `mapping(address => bool) private _revokedAddresses`

**Functions:**
```solidity
// Check revocation status
function isRevoked(address user) external view returns (bool)
function isRevokedById(uint256 tokenId) external view returns (bool)

// Revoke DID
function revokeDid(bool clearChatReference) external
function revokeDid() external // Convenience: clears chat reference by default
```

**Behavior:**
- Only DID owner can revoke their DID
- Revoked DIDs cannot be updated (enforced by `notRevoked` modifier)
- Token remains in existence (soulbound, cannot be burned)
- Optionally clears chat data reference and encrypted key metadata
- Emits `DidRevoked` event

**Modifiers:**
- `notRevoked(address user)` - Prevents operations on revoked DIDs
- Applied to all update functions (`updateChatReference`, `updateEncryptedKeyMetadata`, etc.)

#### Backend API

**Endpoint:** `POST /api/did/revoke`

**Request:**
```json
{
  "clearChatReference": true  // Optional, defaults to true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Revocation must be performed by wallet owner",
  "data": {
    "walletAddress": "0x...",
    "clearChatReference": true,
    "requiresWalletSignature": true,
    "instructions": "Call revokeDid() on the DID contract with your wallet"
  }
}
```

**Note:** The backend endpoint validates the request but does not perform the revocation. The actual revocation must be done by the wallet owner calling the contract directly (for security).

#### Frontend Flow

1. User requests revocation via UI
2. Frontend calls `POST /api/did/revoke` to validate
3. Frontend calls `revokeDid()` on the contract with user's wallet
4. Contract emits `DidRevoked` event
5. Frontend updates UI to show revoked status

### UX Implications

**Before Revocation:**
- Show clear warning about consequences
- Explain that:
  - DID will be permanently revoked
  - Token will be BURNED (destroyed)
  - Address will be permanently banned from receiving new DIDs
  - Cannot be undone
  - ❌ **User CANNOT create a new DID after revocation** - address is permanently banned

**After Revocation:**
- Show revoked status in UI
- Disable all DID update operations
- ❌ **Cannot create new DID** - address is permanently banned
- ⚠️ Show warning that wallet migration is impossible

## Migration

### Purpose

Allow users to migrate their DID and associated data from one wallet to another. This is useful for:
- Lost wallet recovery
- Hardware wallet upgrades
- Security improvements (moving to more secure wallet)

### Implementation

#### Solidity Contract

**Function:**
```solidity
function migrateDid(
    address oldWallet,
    address newWallet,
    bool clearChatReference
) external
```

**Access Control:**
- Only callable by contract owner or backend signer
- This ensures migration is a support-driven process with proper verification

**Behavior:**
1. Validates old wallet has a DID (not revoked)
2. Validates new wallet does not have a DID
3. Revokes old wallet's DID
4. Creates new DID for new wallet
5. Optionally copies chat data reference and encrypted key metadata
6. Emits events: `DidRevoked`, `DidCreated`, `DidMigrated`

**Security Considerations:**
- Old wallet's DID is revoked (cannot be used)
- New wallet gets a new token ID
- Profile data can be preserved or cleared
- Migration requires off-chain verification (see below)

#### Backend API

**Endpoint:** `POST /api/did/migrate` (Admin/Support only)

**Request:**
```json
{
  "oldWallet": "0x...",
  "newWallet": "0x...",
  "clearChatReference": false  // Optional, defaults to false
}
```

**Response:**
```json
{
  "success": true,
  "message": "DID migrated successfully",
  "data": {
    "oldTokenId": "1",
    "newTokenId": "2",
    "txHash": "0x...",
    "oldWallet": "0x...",
    "newWallet": "0x..."
  }
}
```

**Access Control:**
- Requires admin authentication
- Should be behind additional verification (see Migration Flow below)

#### Migration Flow (Support-Driven)

**Step 1: User Request**
- User contacts support requesting wallet migration
- Provides:
  - Old wallet address
  - New wallet address
  - Reason for migration

**Step 2: Verification**
- Support verifies user identity (off-chain):
  - Email verification
  - Phone verification
  - KYC if required
  - Proof of ownership of old wallet (signature challenge)

**Step 3: Off-Chain Verification**
- Support creates a signed message from old wallet:
  - Message: "I authorize migration of my SafePsy DID from {oldWallet} to {newWallet}"
  - Signature from old wallet proves ownership
- Support stores verification record in database

**Step 4: Migration Execution**
- Support calls `POST /api/did/migrate` with:
  - Old wallet address
  - New wallet address
  - Verification signature
  - Support admin credentials
- Backend verifies signature
- Backend calls `migrateDid()` on contract
- Backend updates off-chain data (chat storage, etc.)

**Step 5: Notification**
- User is notified of successful migration
- User can now use new wallet with migrated DID

### Future: Self-Service Migration

For future implementation, consider:

1. **Two-Wallet Signature:**
   - User signs with both old and new wallet
   - Backend verifies both signatures
   - Migration can proceed automatically

2. **Time-Locked Migration:**
   - User initiates migration
   - 7-day waiting period
   - User confirms with new wallet
   - Migration executes

3. **Recovery Phrase Verification:**
   - User provides recovery phrase (encrypted)
   - Backend verifies can derive old wallet
   - Migration proceeds

### UX Implications

**Migration Request:**
- Clear form explaining requirements
- List of information needed
- Estimated processing time
- Contact information for support

**During Migration:**
- Show pending status
- Provide tracking/reference number
- Set expectations for timeline

**After Migration:**
- Confirm successful migration
- Show new wallet address
- Remind user to update any saved addresses
- Option to clear old wallet's data

## Data Handling

### Chat Data

**On Revocation:**
- If `clearChatReference = true`:
  - Chat reference cleared on-chain
  - Off-chain chat data can be:
    - Deleted (privacy)
    - Archived (compliance)
    - Retained for recovery period

**On Migration:**
- If `clearChatReference = false`:
  - Chat reference copied to new DID
  - Off-chain chat data linked to new wallet address
  - Old wallet's chat data can be:
    - Transferred to new wallet
    - Archived
    - Deleted

### Encrypted Key Metadata

**On Revocation:**
- If `clearChatReference = true`:
  - Encrypted key metadata cleared
  - User cannot decrypt old chat data
  - New DID will have new encryption keys

**On Migration:**
- If `clearChatReference = false`:
  - Encrypted key metadata copied
  - User can decrypt migrated chat data
  - Same encryption keys used

## Security Considerations

### Revocation (Current Implementation)
- ✅ Only authorized user (via DIDOwnership) can revoke
- ✅ Revocation BURNS the token (token is destroyed)
- ✅ `_addressToTokenId` mapping is cleared
- ✅ Revoked addresses are permanently banned from receiving new DIDs
- ✅ Clear audit trail via events
- ⚠️ Cannot be undone (by design)
- ⚠️ Address CANNOT receive new DID after revocation (permanent ban)

### Migration (Current Implementation)
- ❌ **Wallet migration is IMPOSSIBLE** in current architecture
- ❌ No migration functions exist in DIDRegistry.sol
- ❌ Revoked addresses cannot be reused
- ✅ This is by design to prevent abuse and maintain identity integrity
- ⚠️ Support-driven process (manual verification)

## Events

### DidRevoked
```solidity
event DidRevoked(
    address indexed user,
    uint256 indexed tokenId,
    uint64 timestamp
);
```

### DidMigrated
```solidity
event DidMigrated(
    address indexed oldWallet,
    address indexed newWallet,
    uint256 indexed tokenId,
    uint64 timestamp
);
```

## Testing

### Revocation Tests (Current Implementation)
- [ ] User can revoke their DID (via DIDOwnership authorization)
- [ ] Token is BURNED on revocation
- [ ] `_addressToTokenId` mapping is cleared on revocation
- [ ] Address is permanently marked as revoked
- [ ] Revoked address cannot receive new DID (permanent ban)
- [ ] `isAddressRevoked()` correctly returns true for revoked addresses
- [ ] `isRevoked(tokenId)` returns true for burned tokens

### Migration Tests (Current Implementation)
- [ ] Migration is IMPOSSIBLE - no migration functions exist
- [ ] Revoked addresses cannot receive new DIDs
- [ ] Attempting to mint to revoked address fails
- [ ] New wallet gets new DID
- [ ] Chat reference preserved when requested
- [ ] Migration fails if new wallet has DID
- [ ] Migration fails if old DID is revoked

## Future Enhancements

1. **Time-Locked Revocation:**
   - 7-day cooldown before revocation takes effect
   - User can cancel during cooldown

2. **Partial Revocation:**
   - Revoke specific data (chat, profile, etc.)
   - Keep DID active for other uses

3. **Automated Migration:**
   - Self-service with two-wallet signature
   - Recovery phrase verification
   - Social recovery (guardians)

4. **Migration History:**
   - Track all migrations
   - Show migration chain
   - Prevent circular migrations

# End-to-End DID Implementation Complete ✅

## Summary

All requested features have been implemented for the DID Identity Token smart contract flow:

### ✅ Completed Tasks

1. **ChatWidget Updated with Encryption Hook**
   - Updated `ChatWidget.tsx` to use `useChatEncryption` hook
   - Integrated with DID-based encryption system
   - Automatic chat saving and DID contract updates
   - Location: `apps/web/src/components/ChatWidget.tsx`

2. **Environment Variables Set**
   - Backend: `DID_IDENTITY_TOKEN_ADDRESS=0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8`
   - Frontend: `VITE_DID_IDENTITY_TOKEN_ADDRESS=0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8`
   - Crypto Payment Recipient: `CRYPTO_PAYMENT_CONTRACT_ADDRESS=0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c`
   - Ethereum Mainnet: Chain ID `1`

3. **DID Token Visualization Component Created**
   - Beautiful gradient design matching app aesthetics
   - Displays token ID, owner address, profile data
   - Shows encrypted chat history with decrypt option
   - Etherscan link integration
   - Location: `apps/web/src/components/DIDTokenVisualization.tsx`

4. **DID Components Added to UI**
   - Added to `/chat` route (Testing component)
   - Added to `/about-me` route (AboutMe component)
   - Includes both DIDTokenVisualization and DIDManager components

5. **Crypto Payment Configuration Updated**
   - Payment recipient: `0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c`
   - Ethereum Mainnet: Chain ID `1`

6. **Premium Plan Pricing Updated**
   - **Current implementation**: Single premium at **$20 USD for 30 days**
   - **Target model**: Three tiers (Free trial, $19/month, $69/month Gold) with $PSY token and cashback to user wallet for Gold — see [TOKENOMICS.md](TOKENOMICS.md) and [PRICING_COMPLETE_GUIDE.md](PRICING_COMPLETE_GUIDE.md)
   - Crypto prices (current):
     - ETH: `0.005714 ETH` (based on ~$3,500 ETH price)
     - USDT: `20.00 USDT`
     - USDC: `20.00 USDC`
   - Period: 30 days (automatically set in subscription service)

## Files Modified/Created

### Frontend
- ✅ `apps/web/src/components/ChatWidget.tsx` - Updated to use encryption hook
- ✅ `apps/web/src/components/DIDTokenVisualization.tsx` - **NEW** Beautiful token visualization
- ✅ `apps/web/src/components/Testing.tsx` - Added DID components
- ✅ `apps/web/src/components/AboutMe.tsx` - Added DID visualization
- ✅ `apps/web/.env` - Added `VITE_DID_IDENTITY_TOKEN_ADDRESS`

### Backend
- ✅ `apps/api/.env` - Updated with:
  - `DID_IDENTITY_TOKEN_ADDRESS=0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8`
  - `CRYPTO_PAYMENT_CONTRACT_ADDRESS=0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c`
  - `CRYPTO_PRICE_PREMIUM_ETH=0.005714`
  - `CRYPTO_PRICE_PREMIUM_USDT=20.00`
  - `CRYPTO_PRICE_PREMIUM_USDC=20.00`
- ✅ `apps/api/src/routes/payment.ts` - Updated pricing display with $20/30 days

## Features

### DID Token Visualization
- **Gradient Design**: Beautiful indigo-purple-pink gradient matching app design
- **Token Information**: Displays token ID, owner address, creation/update dates
- **Encrypted Chat History**: Shows encrypted messages with decrypt/view option
- **Profile Data**: Displays DID profile information from contract
- **Etherscan Integration**: Direct link to view token on Etherscan
- **Copy to Clipboard**: Easy address copying

### ChatWidget Integration
- **Automatic Encryption**: Uses `useChatEncryption` hook for wallet-based encryption
- **DID Contract Updates**: Automatically updates DID contract with chat references
- **Encrypted Storage**: All messages encrypted before storage
- **Seamless UX**: Transparent encryption/decryption for users

### Premium Plan (current implementation)
- **Price**: $20 USD (single tier; target model has $19/month and $69/month Gold — see [TOKENOMICS.md](TOKENOMICS.md))
- **Period**: 30 days
- **Payment Methods**: ETH, USDT, USDC, Stripe
- **Recipient**: `0x1F4739e229AdCb1c986C8A8b66f686ddEc29694c`
- **Network**: Ethereum Mainnet (Chain ID: 1)

## Testing Checklist

### End-to-End Flow
- [ ] Connect wallet
- [ ] Verify wallet signature
- [ ] Create DID (if not exists)
- [ ] View DID token visualization
- [ ] Send chat message
- [ ] Verify message is encrypted
- [ ] View decrypted chat history in DID visualization
- [ ] Test premium payment flow
- [ ] Verify 30-day subscription period

### UI/UX
- [ ] DID token visualization displays correctly
- [ ] Gradient design matches app theme
- [ ] Chat history decrypts properly
- [ ] All components responsive
- [ ] Dark mode support works

### Integration
- [ ] ChatWidget uses encryption hook correctly
- [ ] DID contract updates on chat save
- [ ] Environment variables loaded correctly
- [ ] Payment recipient address correct
- [ ] Pricing displays $20/30 days

## Next Steps

1. **Test the complete flow**:
   ```bash
   # Start backend
   cd apps/api
   npm run dev
   
   # Start frontend
   cd apps/web
   npm run dev
   ```

2. **Verify Environment Variables**:
   - Check `apps/api/.env` has all required variables
   - Check `apps/web/.env` has `VITE_DID_IDENTITY_TOKEN_ADDRESS`

3. **Test DID Flow**:
   - Navigate to `/chat` or `/about-me`
   - Connect wallet
   - Create DID if needed
   - View token visualization
   - Send chat messages
   - View encrypted chat history

4. **Test Payment Flow**:
   - Trigger quota exceeded
   - View paywall with $20 pricing
   - Complete crypto payment
   - Verify 30-day subscription period

## Notes

- The contract address `0xd8b934580fcE35a11B58C6D73aDeE468a2833fa8` is from a local deployment (block 2)
- For production, deploy to Mainnet and update the address in `.env` files
- Premium pricing is set to $20 for 30 days in current implementation; target model adds $19/month, $69/month Gold with $PSY token and cashback to user wallet (see [TOKENOMICS.md](TOKENOMICS.md))
- All encryption is handled client-side using wallet signatures
- Chat history is stored encrypted in the database and referenced in the DID contract

