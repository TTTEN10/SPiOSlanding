# Wallet-Based Authentication Implementation

Complete wallet-based authentication system with DID integration for SafePsy.

## Overview

This implementation provides:
- **Wallet connection** (MetaMask/WalletConnect)
- **Signature verification** and session management
- **DID status checking** for authenticated users
- **Protected API routes** with JWT-based authentication
- **Client-side state management** for auth and DID status
- **Error handling** for network switches and disconnects

## Architecture

### Backend Components

1. **Session Management** (`apps/api/src/lib/session.ts`)
   - JWT token generation and verification
   - HTTP-only cookie support
   - Token extraction from headers/cookies

2. **Auth Middleware** (`apps/api/src/middleware/auth.ts`)
   - `authenticateWallet` - Required authentication
   - `optionalAuthenticateWallet` - Optional authentication
   - `getAuthenticatedWallet` - Helper to get wallet from request

3. **Updated Endpoints** (`apps/api/src/routes/testing.ts`)
   - `POST /api/testing/wallet/connect` - Request verification message
   - `POST /api/testing/wallet/verify` - Verify signature & create session
   - `GET /api/testing/did/check-by-wallet` - Check DID status (requires auth)
   - `POST /api/testing/auth/logout` - Clear session

### Frontend Components

1. **AuthContext** (`apps/web/src/contexts/AuthContext.tsx`)
   - Manages authentication state
   - Handles wallet verification
   - Checks DID status
   - Provides logout functionality

2. **ConnectWallet Component** (`apps/web/src/components/ConnectWallet.tsx`)
   - Wallet connection UI
   - Verification status display
   - DID status badges
   - Network error handling

## Usage Examples

### Backend: Protecting a Route

```typescript
import { Router } from 'express';
import { authenticateWallet, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Protected route example
router.get('/protected', authenticateWallet, async (req: AuthenticatedRequest, res: Response) => {
  // Get authenticated wallet
  const wallet = req.wallet; // { walletAddress, chainId, isVerified }
  
  res.json({
    success: true,
    data: {
      message: `Hello ${wallet.walletAddress}`,
    },
  });
});

// Using helper function
router.get('/user-data', authenticateWallet, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const wallet = getAuthenticatedWallet(req);
    // Use wallet.walletAddress, wallet.chainId, etc.
    res.json({ success: true, data: { wallet } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
  }
});
```

### Frontend: Using Auth Context

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { authState, verifyWallet, checkDID, logout } = useAuth();

  // Check authentication status
  if (!authState.isVerified) {
    return <div>Please verify your wallet</div>;
  }

  // Check DID status
  if (authState.didStatus === 'none') {
    return <div>No DID found. Create one?</div>;
  }

  return (
    <div>
      <p>Wallet: {authState.walletAddress}</p>
      <p>DID Status: {authState.didStatus}</p>
      {authState.didInfo?.hasDid && (
        <p>DID: {authState.didInfo.did}</p>
      )}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Frontend: Manual Verification

```typescript
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';

function VerifyButton() {
  const { wallet, connectWallet } = useWallet();
  const { verifyWallet } = useAuth();

  const handleVerify = async () => {
    if (!wallet) {
      await connectWallet();
    }
    await verifyWallet();
  };

  return <button onClick={handleVerify}>Verify Wallet</button>;
}
```

## API Endpoints

### POST /api/testing/wallet/connect

Request verification message for wallet signature.

**Headers:**
- `x-wallet-address`: Wallet address (required)
- `x-chain-id`: Chain ID (required, must be 1 for Ethereum Mainnet)

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "chainId": 1,
    "nonce": "...",
    "message": "SafePsy Wallet Verification\n\nAddress: 0x...\nNonce: ...\n\nThis signature proves you own this wallet."
  }
}
```

### POST /api/testing/wallet/verify

Verify wallet signature and create session.

**Headers:**
- `x-wallet-address`: Wallet address (required)
- `x-wallet-signature`: Signature (required)
- `x-wallet-message`: Original message (required)
- `x-chain-id`: Chain ID (required)

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "chainId": 1,
    "verified": true,
    "token": "jwt-token-here"
  }
}
```

**Cookies:**
- Sets `walletSession` HTTP-only cookie

### GET /api/testing/did/check-by-wallet

Check DID status for authenticated wallet.

**Authentication:**
- Requires valid session (JWT token in Authorization header or cookie)

**Response:**
```json
{
  "success": true,
  "data": {
    "hasDid": true,
    "did": "did:example:123",
    "didHash": "0x...",
    "isValid": true,
    "walletAddress": "0x...",
    "contractAddress": "0x..."
  }
}
```

### POST /api/testing/auth/logout

Clear session and logout.

**Authentication:**
- Requires valid session

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## State Management

### AuthState Interface

```typescript
interface AuthState {
  walletAddress: string | null;
  network: number | null;
  isVerified: boolean;
  didStatus: 'none' | 'exists' | 'error' | 'checking';
  didInfo: DIDInfo | null;
  isLoading: boolean;
  error: string | null;
}
```

### DIDInfo Interface

```typescript
interface DIDInfo {
  hasDid: boolean;
  did: string | null;
  didHash: string | null;
  isValid: boolean;
  contractAddress?: string;
}
```

## Error Handling

### Network Errors

If user switches to unsupported network:
- Frontend shows error banner
- Wallet disconnects automatically
- All features locked until correct network

### DID Check Errors

If DID check fails:
- `didStatus` set to `'error'`
- User can retry by calling `checkDID()`
- Non-blocking error (doesn't prevent app usage)

### Session Expiration

If JWT token expires:
- Frontend detects on next API call
- Automatically clears session
- User must re-verify wallet

## Security Features

1. **JWT Tokens**: Secure, signed tokens with expiration
2. **HTTP-Only Cookies**: Prevents XSS attacks
3. **Signature Verification**: Cryptographic proof of wallet ownership
4. **Chain ID Validation**: Only Ethereum Mainnet (1) allowed
5. **Rate Limiting**: Applied to all auth endpoints
6. **Session Expiration**: Tokens expire after 7 days (configurable)

## Environment Variables

### Backend

```env
# JWT Configuration
JWT_SECRET=your-strong-random-secret-here
JWT_EXPIRES_IN=7d

# DID Verification (optional)
DID_REGISTRY_ADDRESS=0x...
RPC_URL=https://mainnet.infura.io/v3/...
ETH_RPC_URL=https://mainnet.infura.io/v3/...
```

### Frontend

```env
VITE_API_URL=http://localhost:3001
VITE_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
```

## Testing

### Manual Testing Flow

1. **Connect Wallet**
   - Click "Connect Wallet" button
   - Approve in MetaMask/WalletConnect
   - Wallet address should appear

2. **Verify Wallet**
   - Click "Verify" button
   - Sign message in wallet
   - Should see ✅ "Verified" badge

3. **Check DID**
   - After verification, DID status checked automatically
   - Shows "DID Active" if exists, "No DID" if not

4. **Test Protected Route**
   - Make API call to protected endpoint
   - Should succeed if authenticated
   - Should return 401 if not authenticated

5. **Test Logout**
   - Click disconnect/logout
   - Session cleared
   - Must re-verify to access protected routes

## Next Steps

1. **Create Production Endpoints**
   - Move from `/api/testing/*` to `/api/auth/*` and `/api/did/*`
   - Add proper error handling and logging

2. **Add DID Creation Flow**
   - Allow users to create DID if none exists
   - Integrate with smart contract deployment

3. **Session Refresh**
   - Implement token refresh mechanism
   - Extend session on activity

4. **Multi-Wallet Support**
   - Allow switching between multiple wallets
   - Store multiple sessions

5. **Enhanced Error Messages**
   - User-friendly error messages
   - Recovery suggestions

## Files Created/Modified

### Backend
- `apps/api/src/lib/session.ts` - Session management
- `apps/api/src/middleware/auth.ts` - Auth middleware
- `apps/api/src/routes/testing.ts` - Updated endpoints
- `apps/api/src/index.ts` - Added cookie parser

### Frontend
- `apps/web/src/contexts/AuthContext.tsx` - Auth context
- `apps/web/src/components/ConnectWallet.tsx` - Updated component
- `apps/web/src/App.tsx` - Added AuthProvider

## Dependencies Added

### Backend
- `jsonwebtoken` - JWT token handling
- `@types/jsonwebtoken` - TypeScript types
- `cookie-parser` - Cookie parsing
- `@types/cookie-parser` - TypeScript types

All dependencies installed with `npm install --legacy-peer-deps`

# Wallet Connection Implementation

This document describes the wallet connection implementation with WalletConnect API integration in the SafePsy application.

## ✅ Implementation Complete

### 1. WalletContext (`src/contexts/WalletContext.tsx`)

**Features:**
- Global wallet state management
- WalletConnect API integration
- MetaMask fallback support
- Automatic signature verification
- Session persistence
- Chain and account change handling

**Key Methods:**
- `connectWallet()` - Connect wallet via WalletConnect or MetaMask
- `disconnectWallet()` - Disconnect wallet and clear state
- `signMessage()` - Sign message and verify with backend

**Supported Networks:**
- Ethereum Mainnet (Chain ID: 1) - **Only supported network**

### 2. ConnectWallet Component (`src/components/ConnectWallet.tsx`)

**Features:**
- Connect/Disconnect wallet button
- Wallet address display (truncated)
- Verification status indicator
- Automatic signature verification
- Error handling and display

**UI States:**
- Not Connected: Shows "Connect Wallet" button
- Connected (Not Verified): Shows address with yellow indicator + "Verify" button
- Connected (Verified): Shows address with green checkmark
- Loading: Shows "Connecting..." state

### 3. Header Integration

The ConnectWallet component is integrated into the Header component and appears on all pages:
- Top right corner
- Next to theme toggle
- Responsive design (hides text on mobile, shows icon only)

## 📦 Dependencies Added

```json
{
  "@walletconnect/ethereum-provider": "^2.9.2",
  "@walletconnect/modal": "^2.6.2"
}
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in `apps/web/`:

```env
# API Configuration
VITE_API_URL=http://localhost:3001

# WalletConnect Configuration
# Get your Project ID from https://cloud.walletconnect.com
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
```

### Getting WalletConnect Project ID

1. Go to https://cloud.walletconnect.com
2. Sign up or log in
3. Create a new project
4. Copy the Project ID
5. Add it to your `.env` file

**Note:** If Project ID is not set, the app will fall back to MetaMask only.

## 🚀 Usage

### User Flow

1. **User clicks "Connect Wallet" button** (top right of header)
2. **WalletConnect modal appears** (if Project ID is set) or MetaMask popup
3. **User selects/approves wallet connection**
4. **Wallet connects** and address is displayed
5. **Automatic verification** - User is prompted to sign verification message
6. **Signature verified** - Green checkmark appears when verified

### Programmatic Usage

```typescript
import { useWallet } from '../contexts/WalletContext';

function MyComponent() {
  const { wallet, connectWallet, disconnectWallet, signMessage } = useWallet();

  // Check if wallet is connected
  if (wallet) {
    console.log('Connected:', wallet.address);
  }

  // Connect wallet
  await connectWallet();

  // Sign a message
  const signature = await signMessage('Hello, SafePsy!');

  // Disconnect
  disconnectWallet();
}
```

## 🔐 Security Features

1. **Signature Verification**: All signatures are verified server-side
2. **Nonce-based Messages**: Each verification uses a unique nonce
3. **Session Management**: Wallet state persists across page reloads
4. **Error Handling**: Comprehensive error handling and user feedback
5. **Privacy**: Wallet addresses are truncated in UI

## 📱 Supported Wallets

### WalletConnect (Mobile & Desktop)
- Trust Wallet
- MetaMask Mobile
- Rainbow
- Coinbase Wallet
- And 300+ other wallets

### Injected Providers (Desktop)
- MetaMask
- Coinbase Wallet
- Brave Wallet
- Any EIP-1193 compatible wallet

## 🎨 UI/UX Features

1. **Responsive Design**: Adapts to mobile and desktop
2. **Visual Indicators**: Color-coded status (green = verified, yellow = unverified)
3. **Truncated Addresses**: Shows first 6 and last 4 characters
4. **Loading States**: Clear feedback during connection/verification
5. **Error Messages**: User-friendly error messages
6. **Accessibility**: Proper ARIA labels and keyboard navigation

## 🔄 State Management

### Wallet State

```typescript
interface WalletInfo {
  address: string;        // Wallet address
  chainId: number;        // Current chain ID
  isConnected: boolean;  // Connection status
}
```

### Context State

- `wallet`: Current wallet info or null
- `provider`: Ethers provider instance
- `signer`: Ethers signer instance
- `isLoading`: Loading state
- `error`: Error message or null

## 🐛 Troubleshooting

### WalletConnect Not Working

1. **Check Project ID**: Ensure `VITE_WALLETCONNECT_PROJECT_ID` is set
2. **Check Network**: Ensure you're on a supported network
3. **Check Console**: Look for error messages in browser console
4. **Fallback**: App will automatically fall back to MetaMask

### Signature Verification Failing

1. **Check API**: Ensure backend API is running
2. **Check Network**: Ensure wallet is on correct network
3. **Check Message**: Verify message format is correct
4. **Retry**: Click "Verify" button to retry

### Wallet Not Persisting

1. **Check localStorage**: Wallet state is stored in localStorage
2. **Check Browser**: Some browsers block localStorage
3. **Clear Cache**: Try clearing browser cache

## 📝 API Integration

The wallet connection integrates with the backend API:

- `POST /api/testing/wallet/connect` - Request verification message
- `POST /api/testing/wallet/verify` - Verify signature

### Request Headers

```
x-wallet-address: 0x...
x-chain-id: 1
x-wallet-signature: 0x... (for verification)
x-wallet-message: ... (for verification)
```

## 🔮 Future Enhancements

- [ ] Multi-wallet support (show all connected wallets)
- [ ] Wallet switching
- [ ] Network switching UI
- [ ] Transaction history
- [ ] Wallet balance display
- [ ] Custom RPC endpoints
- [ ] Hardware wallet support (Ledger, Trezor)

## 📚 Documentation

- **WalletConnect Docs**: https://docs.walletconnect.com/
- **Ethers.js Docs**: https://docs.ethers.org/
- **API Routes**: See `apps/api/src/routes/testing.ts`


