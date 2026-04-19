# Testing Implementation Summary

This document summarizes the implementation of the testing infrastructure for SafePsy at `safepsy.com/testing/`.

## ✅ Completed Implementation

### 1. Logging Setup
- **Location**: `apps/api/src/lib/logger.ts`
- **Features**:
  - Winston-based logging system
  - Console and file logging
  - Automatic logs directory creation
  - Exception and rejection handlers
  - Environment-based log levels (debug in dev, warn in prod)
  - Log files: `error.log`, `combined.log`, `exceptions.log`, `rejections.log`

### 2. Smart Contract Scaffold
- **DIDRegistry.sol** (`apps/api/src/contracts/DIDRegistry.sol`):
  - DID creation, updates, and revocation
  - Ownership management
  - DID validation
  - Events for lifecycle tracking
  
- **DIDStorage.sol** (`apps/api/src/contracts/DIDStorage.sol`):
  - Data storage associated with DIDs
  - Support for encrypted data
  - Gas-optimized storage separation
  
- **Deployment Script** (`apps/api/src/contracts/scripts/deploy.ts`):
  - TypeScript deployment script template
  - Environment-based configuration
  - Deployment info persistence

### 3. Middlewares

#### Wallet Authentication (`apps/api/src/middleware/wallet-auth.ts`)
- Verifies wallet connection
- Validates Ethereum addresses
- Verifies message signatures
- Two modes: `walletAuthMiddleware` (requires signature) and `walletConnectionMiddleware` (connection only)

#### DID Verification (`apps/api/src/middleware/did-verify.ts`)
- Verifies DIDs from smart contracts
- Checks DID ownership
- Validates DID status (not revoked)
- Two modes: `didVerifyMiddleware` (required) and `didVerifyOptionalMiddleware` (optional)

#### Validation (`apps/api/src/middleware/validation.ts`)
- Joi-based request validation
- Common schemas for Ethereum addresses, DID hashes, signatures
- Validates body, query, and params
- Pre-built validators for common use cases

#### Rate Limiting (`apps/api/src/lib/ratelimit.ts`)
- Enhanced with wallet-specific rate limits
- Testing endpoint rate limits
- DID verification rate limits
- Wallet authentication rate limits

### 4. API Routes
- **Location**: `apps/api/src/routes/testing.ts`
- **Endpoints**:
  - `GET /api/testing/health` - Health check
  - `POST /api/testing/wallet/connect` - Connect wallet
  - `POST /api/testing/wallet/verify` - Verify signature
  - `POST /api/testing/did/verify` - Verify DID
  - `GET /api/testing/wallet/info` - Get wallet info
  - `POST /api/testing/did/check` - Check DID status

### 5. Frontend Component
- **Location**: `apps/web/src/components/Testing.tsx`
- **Features**:
  - Wallet connection (MetaMask/Web3)
  - Message signing and verification
  - DID verification interface
  - API health check
  - Modern UI with Tailwind CSS

### 6. Integration
- Testing route added to `apps/web/src/App.tsx` at `/testing`
- API server updated to include testing routes
- Logger integrated into main server
- Type definitions for `window.ethereum`

## 📦 Dependencies Added

### API (`apps/api/package.json`)
- `ethers`: ^6.9.0 - Blockchain interactions
- `winston`: ^3.11.0 - Logging

### Web (`apps/web/package.json`)
- `ethers`: ^6.9.0 - Blockchain interactions

## 🔧 Configuration Required

Add these environment variables to `apps/api/.env`:

```env
# Blockchain Configuration
RPC_URL=http://localhost:8545
ETH_RPC_URL=http://localhost:8545
CHAIN_ID=1
DID_REGISTRY_ADDRESS=0x...  # After contract deployment
DID_STORAGE_ADDRESS=0x...   # After contract deployment

# Network Configuration (for deployment)
NETWORK=localhost
PRIVATE_KEY=your_private_key_here
GAS_PRICE=20000000000
GAS_LIMIT=5000000
```

Add to `apps/web/.env`:

```env
VITE_API_URL=http://localhost:3001
```

## 🚀 Usage

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Servers
```bash
npm run dev
```

### 3. Access Testing Page
Navigate to: `http://localhost:3000/testing`

### 4. Connect Wallet
- Click "Connect Wallet"
- Approve connection in MetaMask
- Sign the verification message
- Test DID verification (if you have a DID)

## 📝 Next Steps

1. **Deploy Smart Contracts**:
   - Compile contracts using Hardhat or Foundry
   - Deploy to testnet (Polygon Amoy, Ethereum Sepolia)
   - Update `DID_REGISTRY_ADDRESS` and `DID_STORAGE_ADDRESS` in `.env`

2. **WalletConnect SDK Integration** (Optional):
   - Install `@walletconnect/ethereum-provider`
   - Add mobile wallet support
   - Enhance connection options

3. **Testing**:
   - Add unit tests for middlewares
   - Add integration tests for API routes
   - Test smart contract interactions

4. **Documentation**:
   - API documentation (Swagger/OpenAPI)
   - Smart contract documentation
   - User guide for testing page

## 📚 Documentation

- **Testing Setup Guide**: `apps/api/TESTING_SETUP.md`
- **Smart Contracts**: See contract files for detailed comments
- **API Routes**: See route files for endpoint documentation

## 🔒 Security Notes

- All endpoints have rate limiting
- Signatures are verified server-side
- DIDs are verified from smart contracts
- Private keys should never be committed
- Use environment variables for sensitive data

## 🐛 Troubleshooting

### Wallet Connection Issues
- Ensure MetaMask is installed and unlocked
- Check browser console for errors
- Verify API is running on correct port

### DID Verification Issues
- Ensure contracts are deployed
- Verify `DID_REGISTRY_ADDRESS` is correct
- Check RPC URL is accessible
- Verify wallet owns the DID

### Logging Issues
- Check `logs/` directory exists
- Verify file permissions
- Check disk space

## 📞 Support

For questions or issues, refer to:
- `apps/api/TESTING_SETUP.md` for detailed documentation
- Contract files for smart contract details
- Middleware files for implementation details


# Testing Setup Documentation

This document describes the testing infrastructure for SafePsy, including wallet authentication, DID verification, and smart contract integration.

## Overview

The testing setup includes:
- **Logging**: Winston-based logging system
- **Smart Contracts**: DIDRegistry and DIDStorage Solidity contracts
- **Middlewares**: Wallet authentication, DID verification, validation, and rate limiting
- **API Routes**: Testing endpoints for wallet connection and DID verification
- **Frontend**: React component for testing wallet connections

## Architecture

### Logging Setup

The logging system uses Winston and is configured in `src/lib/logger.ts`:
- Console logging for development
- File logging for errors and combined logs
- Log levels: error, warn, info, http, debug
- Logs are stored in `logs/` directory

### Smart Contracts

#### DIDRegistry.sol
- Manages DID creation, updates, and revocation
- Stores DID ownership and metadata
- Events for DID lifecycle tracking
- Functions: `createDID`, `updateDID`, `revokeDID`, `transferOwnership`, `isValidDID`

#### DIDStorage.sol
- Stores data associated with DIDs
- Separates storage from registry for gas optimization
- Supports encrypted data storage
- Functions: `storeData`, `updateData`, `deleteData`, `getData`

### Middlewares

#### wallet-auth.ts
- Verifies wallet connection
- Validates Ethereum addresses
- Verifies message signatures
- Attaches wallet info to request object

#### did-verify.ts
- Verifies DIDs from smart contracts
- Checks DID ownership
- Validates DID status (not revoked)
- Requires wallet authentication

#### validation.ts
- Request validation using Joi
- Common schemas for Ethereum addresses, DID hashes, signatures
- Validates request body, query, and params

#### ratelimit.ts
- General rate limiting
- Wallet authentication rate limiting
- DID verification rate limiting
- Testing endpoint rate limiting

## API Endpoints

### Testing Endpoints

All endpoints are prefixed with `/api/testing`

#### GET /api/testing/health
Health check for testing endpoints.

**Response:**
```json
{
  "success": true,
  "message": "Testing endpoints are healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### POST /api/testing/wallet/connect
Connect wallet and generate verification message.

**Headers:**
- `x-wallet-address`: Ethereum address
- `x-chain-id`: Chain ID (optional)

**Response:**
```json
{
  "success": true,
  "message": "Wallet connected successfully",
  "data": {
    "address": "0x...",
    "chainId": 1,
    "nonce": "...",
    "message": "SafePsy Wallet Verification\n\n..."
  }
}
```

#### POST /api/testing/wallet/verify
Verify wallet signature.

**Headers:**
- `x-wallet-address`: Ethereum address
- `x-wallet-signature`: Signature
- `x-wallet-message`: Message that was signed
- `x-chain-id`: Chain ID (optional)

**Response:**
```json
{
  "success": true,
  "message": "Wallet signature verified successfully",
  "data": {
    "address": "0x...",
    "chainId": 1,
    "verified": true
  }
}
```

#### POST /api/testing/did/verify
Verify DID from smart contract.

**Headers:**
- `x-wallet-address`: Ethereum address
- `x-wallet-signature`: Signature (optional but recommended)
- `x-wallet-message`: Message (optional)
- `x-chain-id`: Chain ID (optional)
- `x-did-hash`: DID hash (bytes32)

**Body:**
```json
{
  "didHash": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "DID verified successfully",
  "data": {
    "did": "did:ethr:0x...",
    "didHash": "0x...",
    "isValid": true,
    "walletAddress": "0x..."
  }
}
```

#### GET /api/testing/wallet/info
Get wallet information (requires wallet connection).

**Headers:**
- `x-wallet-address`: Ethereum address
- `x-chain-id`: Chain ID (optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "chainId": 1
  }
}
```

#### POST /api/testing/did/check
Check DID status (optional verification).

**Headers:**
- `x-wallet-address`: Ethereum address (optional)
- `x-did-hash`: DID hash (optional)

**Body:**
```json
{
  "didHash": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "didHash": "0x...",
    "did": "did:ethr:0x..." | null,
    "isValid": true | false,
    "walletAddress": "0x..." | null
  }
}
```

## Environment Variables

Add these to your `.env` file:

```env
# Blockchain Configuration
RPC_URL=http://localhost:8545
ETH_RPC_URL=http://localhost:8545
CHAIN_ID=1
DID_REGISTRY_ADDRESS=0x...
DID_STORAGE_ADDRESS=0x...

# Network Configuration (for deployment)
NETWORK=localhost
PRIVATE_KEY=your_private_key_here
GAS_PRICE=20000000000
GAS_LIMIT=5000000

# API Configuration
PORT=3001
NODE_ENV=development
```

## Frontend Usage

The testing page is available at `/testing` route.

### Features:
1. **Wallet Connection**: Connect MetaMask or other Web3 wallets
2. **Signature Verification**: Sign and verify messages
3. **DID Verification**: Verify DIDs from smart contracts
4. **API Health Check**: Check API status

### Usage:
1. Navigate to `http://localhost:3000/testing`
2. Click "Connect Wallet" to connect your MetaMask
3. Sign the verification message
4. Enter a DID hash to verify (if you have one)

## Smart Contract Deployment

### Prerequisites
- Node.js 18+
- Hardhat or Foundry (for contract compilation)
- Access to an Ethereum node (local or RPC)

### Deployment Steps

1. **Compile Contracts** (using Hardhat example):
```bash
npx hardhat compile
```

2. **Deploy Contracts**:
```bash
# Set environment variables
export NETWORK=localhost
export RPC_URL=http://localhost:8545
export PRIVATE_KEY=your_private_key

# Deploy DIDRegistry first
npx hardhat run scripts/deploy-registry.js --network localhost

# Deploy DIDStorage with DIDRegistry address
npx hardhat run scripts/deploy-storage.js --network localhost
```

3. **Update Environment Variables**:
Update `DID_REGISTRY_ADDRESS` and `DID_STORAGE_ADDRESS` in your `.env` file.

## Rate Limiting

Rate limits are configured as follows:
- **General API**: 100 requests per 15 minutes per IP
- **Wallet Auth**: 20 requests per 15 minutes per wallet/IP
- **DID Verify**: 50 requests per 15 minutes per wallet/IP
- **Testing Endpoints**: 30 requests per minute per IP

## Security Considerations

1. **Private Keys**: Never commit private keys to version control
2. **RPC URLs**: Use environment variables for RPC endpoints
3. **Rate Limiting**: All endpoints have appropriate rate limits
4. **Signature Verification**: Always verify signatures server-side
5. **DID Verification**: Always verify DIDs from smart contracts

## Troubleshooting

### Wallet Connection Issues
- Ensure MetaMask or another Web3 wallet is installed
- Check that the wallet is unlocked
- Verify network connection

### DID Verification Issues
- Ensure `DID_REGISTRY_ADDRESS` is set correctly
- Verify RPC URL is accessible
- Check that the DID exists and is not revoked
- Verify wallet owns the DID

### API Connection Issues
- Check API is running on correct port
- Verify CORS settings if accessing from different origin
- Check API logs for errors

## Next Steps

1. Deploy contracts to testnet (Polygon Amoy, Ethereum Sepolia)
2. Integrate WalletConnect SDK for mobile wallet support
3. Add more comprehensive error handling
4. Implement DID creation endpoints
5. Add unit and integration tests


