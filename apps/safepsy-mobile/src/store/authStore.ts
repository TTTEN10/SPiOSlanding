import { create } from 'zustand';
import {
  clearWalletSessionToken,
  getWalletSessionToken,
  setWalletSessionToken,
} from '../services/secureToken';
import { getAuthMe } from '../services/walletApi';

type AuthState = {
  token: string | null;
  hydrated: boolean;
  /** From JWT session (may exist before WalletConnect reconnects). */
  walletAddress: string | null;
  chainId: number | null;
  isVerified: boolean;
  restoreError: string | null;
  hydrate: () => Promise<void>;
  /** Validates stored JWT with GET /api/auth/me; clears on 401. */
  restoreSession: () => Promise<void>;
  setAuthenticatedSession: (p: {
    token: string;
    walletAddress: string;
    chainId: number;
  }) => Promise<void>;
  /** Clears token and in-memory session fields (caller disconnects WC + chat crypto). */
  clearSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  hydrated: false,
  walletAddress: null,
  chainId: null,
  isVerified: false,
  restoreError: null,

  hydrate: async () => {
    const token = await getWalletSessionToken();
    set({ token, hydrated: true });
  },

  restoreSession: async () => {
    if (!get().hydrated) {
      await get().hydrate();
    }
    const t = get().token;
    if (!t) {
      set({
        isVerified: false,
        walletAddress: null,
        chainId: null,
        restoreError: null,
      });
      return;
    }

    try {
      const me = await getAuthMe(t);
      if (me.success && me.data?.walletAddress) {
        set({
          token: t,
          isVerified: !!me.data.isVerified,
          walletAddress: me.data.walletAddress.toLowerCase(),
          chainId: me.data.chainId ?? null,
          restoreError: null,
        });
      } else {
        await clearWalletSessionToken();
        set({
          token: null,
          isVerified: false,
          walletAddress: null,
          chainId: null,
          restoreError: 'Session invalid. Please sign in again.',
        });
      }
    } catch {
      await clearWalletSessionToken();
      set({
        token: null,
        isVerified: false,
        walletAddress: null,
        chainId: null,
        restoreError: 'Session expired. Please sign in again.',
      });
    }
  },

  setAuthenticatedSession: async ({ token, walletAddress, chainId }) => {
    await setWalletSessionToken(token);
    set({
      token,
      walletAddress: walletAddress.toLowerCase(),
      chainId,
      isVerified: true,
      restoreError: null,
    });
  },

  clearSession: async () => {
    await clearWalletSessionToken();
    set({
      token: null,
      walletAddress: null,
      chainId: null,
      isVerified: false,
      restoreError: null,
    });
  },
}));
