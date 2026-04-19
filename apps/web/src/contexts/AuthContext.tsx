import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useWallet } from './WalletContext';

// Use empty string when not set: same-origin requests use Vite proxy (dev) or Caddy (prod)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * High-level product mode for chat and persistence.
 * - guest: no verified wallet session — in-memory chat only (see ChatWidget guest limit).
 * - authenticated: wallet verified — encrypted persistence and quota paths apply.
 */
export type UserMode = 'guest' | 'authenticated';

/**
 * DID Status types
 */
export type DIDStatus = 'none' | 'exists' | 'error' | 'checking';

/**
 * DID Information
 */
export interface DIDInfo {
  hasDid: boolean;
  did: string | null;
  didHash: string | null;
  isValid: boolean;
  contractAddress?: string;
  /** ERC-721 token id string (API `tokenId`; used for explorer links / UI). */
  tokenId?: string | null;
}

/**
 * Authentication State
 */
export interface AuthState {
  walletAddress: string | null;
  network: number | null;
  isVerified: boolean;
  didStatus: DIDStatus;
  didInfo: DIDInfo | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Auth Context Type
 */
interface AuthContextType {
  authState: AuthState;
  /** Derived: authenticated when the wallet session is verified; otherwise guest. */
  userMode: UserMode;
  verifyWallet: () => Promise<void>;
  checkDID: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * Get session token from localStorage or cookie
 */
function getSessionToken(): string | null {
  // Try localStorage first (for client-side storage)
  const token = localStorage.getItem('walletSessionToken');
  if (token) {
    return token;
  }
  return null;
}

/**
 * Store session token
 */
function setSessionToken(token: string): void {
  localStorage.setItem('walletSessionToken', token);
}

/**
 * Clear session token
 */
function clearSessionToken(): void {
  localStorage.removeItem('walletSessionToken');
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { wallet, disconnectWallet, signMessage } = useWallet();
  const [authState, setAuthState] = useState<AuthState>({
    walletAddress: null,
    network: null,
    isVerified: false,
    didStatus: 'none',
    didInfo: null,
    isLoading: false,
    error: null,
  });

  /**
   * Request verification message from backend
   */
  const requestVerificationMessage = useCallback(async (address: string, chainId: number): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/wallet/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': address,
        'x-chain-id': chainId.toString(),
      },
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      throw new Error('Failed to request verification message');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to request verification message');
    }

    return data.data.message;
  }, []);

  /**
   * Verify wallet signature and create session
   */
  const verifyWallet = useCallback(async () => {
    if (!wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Request verification message
      const message = await requestVerificationMessage(wallet.address, wallet.chainId);

      // Sign the message
      const signature = await signMessage(message);

      // Verify signature with backend
      const response = await fetch(`${API_BASE_URL}/api/auth/wallet/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': wallet.address,
          'x-wallet-signature': signature,
          'x-wallet-message': message,
          'x-chain-id': wallet.chainId.toString(),
        },
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Verification failed');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Verification failed');
      }

      // Store token if provided
      if (data.data.token) {
        setSessionToken(data.data.token);
      }

      // Update auth state
      setAuthState((prev) => ({
        ...prev,
        walletAddress: wallet.address,
        network: wallet.chainId,
        isVerified: true,
        isLoading: false,
        error: null,
      }));

      // Check DID status after verification
      await checkDID();
    } catch (err: any) {
      setAuthState((prev) => ({
        ...prev,
        isVerified: false,
        isLoading: false,
        error: err.message || 'Verification failed',
      }));
      throw err;
    }
  }, [wallet, signMessage, requestVerificationMessage]);

  /**
   * Check DID status for authenticated wallet
   * Uses production endpoint /api/did/check
   */
  const checkDID = useCallback(async () => {
    if (!wallet || !authState.isVerified) {
      return;
    }

    try {
      setAuthState((prev) => ({ ...prev, didStatus: 'checking' }));

      const token = getSessionToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add token to Authorization header if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Use production endpoint
      const response = await fetch(`${API_BASE_URL}/api/did/check`, {
        method: 'POST',
        headers,
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        // If 401, token might be expired
        if (response.status === 401) {
          clearSessionToken();
          setAuthState((prev) => ({
            ...prev,
            isVerified: false,
            didStatus: 'none',
            didInfo: null,
          }));
          return;
        }
        throw new Error('Failed to check DID status');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to check DID status');
      }

      const tid =
        data.data.tokenId !== undefined && data.data.tokenId !== null
          ? String(data.data.tokenId)
          : null;
      const didInfo: DIDInfo = {
        hasDid: data.data.hasDid,
        did: tid,
        didHash: tid,
        isValid: data.data.hasDid,
        tokenId: tid,
      };

      setAuthState((prev) => ({
        ...prev,
        didStatus: data.data.hasDid ? 'exists' : 'none',
        didInfo,
      }));
    } catch (err: any) {
      console.error('DID check error:', err);
      setAuthState((prev) => ({
        ...prev,
        didStatus: 'error',
        didInfo: null,
      }));
    }
  }, [wallet, authState.isVerified]);

  /**
   * Logout and clear session
   */
  const logout = useCallback(async () => {
    try {
      const token = getSessionToken();
      if (token) {
        // Call logout endpoint
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear local state
      clearSessionToken();
      setAuthState({
        walletAddress: null,
        network: null,
        isVerified: false,
        didStatus: 'none',
        didInfo: null,
        isLoading: false,
        error: null,
      });
      disconnectWallet();
    }
  }, [disconnectWallet]);

  /**
   * Refresh authentication state
   */
  const refreshAuth = useCallback(async () => {
    if (!wallet) {
      setAuthState({
        walletAddress: null,
        network: null,
        isVerified: false,
        didStatus: 'none',
        didInfo: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    // Check if we have a session token
    const token = getSessionToken();
    if (token) {
      // Verify token is still valid by checking DID (which requires auth)
      try {
        await checkDID();
        setAuthState((prev) => ({
          ...prev,
          walletAddress: wallet.address,
          network: wallet.chainId,
          isVerified: true,
        }));
      } catch (err) {
        // Token invalid, clear state
        clearSessionToken();
        setAuthState({
          walletAddress: wallet.address,
          network: wallet.chainId,
          isVerified: false,
          didStatus: 'none',
          didInfo: null,
          isLoading: false,
          error: null,
        });
      }
    } else {
      setAuthState((prev) => ({
        ...prev,
        walletAddress: wallet.address,
        network: wallet.chainId,
        isVerified: false,
      }));
    }
  }, [wallet, checkDID]);

  // Sync with wallet state
  useEffect(() => {
    if (wallet) {
      setAuthState((prev) => ({
        ...prev,
        walletAddress: wallet.address,
        network: wallet.chainId,
      }));
      refreshAuth();
    } else {
      setAuthState({
        walletAddress: null,
        network: null,
        isVerified: false,
        didStatus: 'none',
        didInfo: null,
        isLoading: false,
        error: null,
      });
    }
  }, [wallet, refreshAuth]);

  const userMode: UserMode = useMemo(
    () => (authState.isVerified ? 'authenticated' : 'guest'),
    [authState.isVerified]
  );

  return (
    <AuthContext.Provider
      value={{
        authState,
        userMode,
        verifyWallet,
        checkDID,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

