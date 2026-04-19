import { EthereumProvider } from '@walletconnect/ethereum-provider';
import type { WcEthereumProvider } from '../types/walletconnect';
import * as Linking from 'expo-linking';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ethers } from 'ethers';
import { SUPPORTED_CHAIN_ID } from '../config/constants';
import { UNIVERSAL_LINK_BASE, USE_WALLETCONNECT_MODAL, WALLETCONNECT_PROJECT_ID } from '../config/env';
import { trackActivation } from '../instrumentation/activation';
import { captureException, captureMonitoringEvent } from '../instrumentation/sentry';
import { resetChatEncryptionForAddressChange } from '../services/chatSessionLifecycle';
import { clearLocalWalletSession, signInWithWallet } from '../services/walletService';
import { useAuthStore } from '../store/authStore';

const FLOW_TIMEOUT_MS = 60_000;

export type WalletAuthPhase = 'idle' | 'connecting' | 'awaiting_signature' | 'verifying' | 'success' | 'error';

type WalletConnectContextValue = {
  projectIdConfigured: boolean;
  wcConnected: boolean;
  wcAddress: string | null;
  wcChainId: number | null;
  signer: ethers.JsonRpcSigner | null;
  isBusy: boolean;
  error: string | null;
  authPhase: WalletAuthPhase;
  connectAndSignIn: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
};

const WalletConnectContext = createContext<WalletConnectContextValue | null>(null);

let providerInit: Promise<WcEthereumProvider> | null = null;

function metadataAppUrl(): string {
  if (UNIVERSAL_LINK_BASE && /^https:\/\//i.test(UNIVERSAL_LINK_BASE)) {
    return UNIVERSAL_LINK_BASE;
  }
  return Linking.createURL('/');
}

function getOrCreateProvider(): Promise<WcEthereumProvider> {
  if (!WALLETCONNECT_PROJECT_ID) {
    return Promise.reject(new Error('Missing EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID'));
  }
  if (USE_WALLETCONNECT_MODAL) {
    console.warn(
      '[SafePsy] EXPO_PUBLIC_USE_WALLETCONNECT_MODAL=true — @walletconnect/modal-react-native is not wired in this build; keep the flag false until integrated.',
    );
  }
  if (!providerInit) {
    providerInit = EthereumProvider.init({
      projectId: WALLETCONNECT_PROJECT_ID,
      chains: [SUPPORTED_CHAIN_ID],
      optionalChains: [],
      showQrModal: true,
      metadata: {
        name: 'SafePsy',
        description: 'SafePsy — mobile',
        url: metadataAppUrl(),
        icons: [],
      },
      rpcMap: {
        'eip155:11155111': 'https://rpc.sepolia.org',
      },
    });
  }
  return providerInit;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

export function WalletConnectProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<WcEthereumProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [wcAddress, setWcAddress] = useState<string | null>(null);
  const [wcChainId, setWcChainId] = useState<number | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authPhase, setAuthPhase] = useState<WalletAuthPhase>('idle');
  const providerRef = useRef<WcEthereumProvider | null>(null);
  const lastWcAccountRef = useRef<string | null>(null);
  const disconnectRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    const sub = Linking.addEventListener('url', () => {
      /* WalletConnect compat + future universal-link handling */
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!WALLETCONNECT_PROJECT_ID) return;

    let cancelled = false;
    void (async () => {
      try {
        const p = await getOrCreateProvider();
        if (cancelled) return;
        providerRef.current = p;
        setProvider(p);

        const onAccounts = (accounts: string[]) => {
          const next = accounts[0] ?? null;
          const prev = lastWcAccountRef.current;
          if (prev && next && prev.toLowerCase() !== next.toLowerCase()) {
            void (async () => {
              await resetChatEncryptionForAddressChange(prev);
              const sessionAddr = useAuthStore.getState().walletAddress;
              if (sessionAddr && next.toLowerCase() !== sessionAddr.toLowerCase()) {
                await disconnectRef.current();
              }
            })();
          }
          lastWcAccountRef.current = next;
          if (accounts.length > 0) {
            setWcAddress(accounts[0]);
          } else {
            setWcAddress(null);
            setSigner(null);
          }
        };
        const onChain = (hex: string | number) => {
          const n = typeof hex === 'string' ? parseInt(hex, 16) : Number(hex);
          setWcChainId(Number.isFinite(n) ? n : null);
        };

        p.on('accountsChanged', onAccounts);
        p.on('chainChanged', onChain);
        p.on('disconnect', () => {
          lastWcAccountRef.current = null;
          setWcAddress(null);
          setWcChainId(null);
          setSigner(null);
        });

        if (p.connected && p.accounts[0]) {
          lastWcAccountRef.current = p.accounts[0];
          setWcAddress(p.accounts[0]);
          setWcChainId(p.chainId);
          const ep = new ethers.BrowserProvider(p);
          setSigner(await ep.getSigner());
        }
      } catch (e) {
        console.warn('WalletConnect init', e);
        captureException(e, { area: 'wc_init' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const disconnectWallet = useCallback(async () => {
    const token = useAuthStore.getState().token;
    const addr = useAuthStore.getState().walletAddress;
    try {
      const p = providerRef.current;
      if (p?.connected) {
        await p.disconnect();
      }
    } catch {
      /* ignore */
    }
    await resetChatEncryptionForAddressChange(addr);
    await clearLocalWalletSession(addr, token);
    await useAuthStore.getState().clearSession();
    setSigner(null);
    setWcAddress(null);
    setWcChainId(null);
    lastWcAccountRef.current = null;
    setError(null);
    setAuthPhase('idle');
  }, []);

  disconnectRef.current = disconnectWallet;

  const connectAndSignIn = useCallback(async () => {
    setError(null);
    setIsBusy(true);
    setAuthPhase('connecting');
    try {
      const p = providerRef.current ?? (await getOrCreateProvider());
      providerRef.current = p;
      setProvider(p);

      await withTimeout(p.connect(), FLOW_TIMEOUT_MS, 'WalletConnect pairing');

      setAuthPhase('awaiting_signature');
      const session = await withTimeout(signInWithWallet(p), FLOW_TIMEOUT_MS, 'Wallet signature');

      setAuthPhase('verifying');
      await useAuthStore.getState().setAuthenticatedSession({
        token: session.token,
        walletAddress: session.address,
        chainId: session.chainId,
      });

      const ep = new ethers.BrowserProvider(p);
      const s = await ep.getSigner();
      setSigner(s);
      setWcAddress(session.address);
      setWcChainId(session.chainId);
      lastWcAccountRef.current = session.address;
      setAuthPhase('success');
      trackActivation('on_wallet_success');
      setTimeout(() => setAuthPhase('idle'), 1500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setAuthPhase('error');
      trackActivation('on_wallet_fail', { message: msg.slice(0, 200) });
      const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: unknown }).code) : '';
      const rejected =
        code === 'ACTION_REJECTED' ||
        /user rejected|denied message signature|rejected the request/i.test(msg);
      if (rejected) {
        captureMonitoringEvent('wallet_signature_rejected', { area: 'wallet_auth' }, 'info');
      } else {
        captureException(e, { area: 'wc_sign_in' });
      }
      throw e;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const value = useMemo<WalletConnectContextValue>(
    () => ({
      projectIdConfigured: Boolean(WALLETCONNECT_PROJECT_ID),
      wcConnected: Boolean(wcAddress && signer),
      wcAddress,
      wcChainId,
      signer,
      isBusy,
      error,
      authPhase,
      connectAndSignIn,
      disconnectWallet,
    }),
    [wcAddress, wcChainId, signer, isBusy, error, authPhase, connectAndSignIn, disconnectWallet],
  );

  return <WalletConnectContext.Provider value={value}>{children}</WalletConnectContext.Provider>;
}

export function useWalletConnect(): WalletConnectContextValue {
  const ctx = useContext(WalletConnectContext);
  if (!ctx) {
    throw new Error('useWalletConnect must be used within WalletConnectProvider');
  }
  return ctx;
}
