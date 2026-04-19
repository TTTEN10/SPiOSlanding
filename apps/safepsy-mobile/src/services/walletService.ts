import type { WcEthereumProvider } from '../types/walletconnect';
import { ethers } from 'ethers';
import { SUPPORTED_CHAIN_ID, SUPPORTED_CHAIN_ID_HEX, SEPOLIA_CHAIN_PARAMS } from '../config/constants';
import { captureMonitoringEvent } from '../instrumentation/sentry';
import { postLogout, postWalletConnect, postWalletVerify } from './walletApi';
import { clearEncryptedDek, clearWalletSessionToken } from './secureToken';

export async function ensureSepolia(provider: WcEthereumProvider): Promise<void> {
  const current = provider.chainId;
  if (current === SUPPORTED_CHAIN_ID) return;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SUPPORTED_CHAIN_ID_HEX }],
    });
  } catch (e: unknown) {
    const err = e as { code?: number };
    if (err?.code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [SEPOLIA_CHAIN_PARAMS],
      });
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SUPPORTED_CHAIN_ID_HEX }],
      });
    } else {
      throw new Error('Please switch to Sepolia Testnet in your wallet.');
    }
  }

  if (provider.chainId !== SUPPORTED_CHAIN_ID) {
    throw new Error('Sepolia Testnet is required for SafePsy.');
  }
}

/**
 * Full SafePsy wallet session: Sepolia → nonce message → sign → verify → JWT.
 * Caller persists token (SecureStore + Zustand) on success.
 */
export async function signInWithWallet(provider: WcEthereumProvider): Promise<{
  token: string;
  address: string;
  chainId: number;
}> {
  await ensureSepolia(provider);

  const address = provider.accounts[0];
  if (!address) {
    throw new Error('No wallet account returned.');
  }

  const chainId = provider.chainId;
  const connect = await postWalletConnect(address, chainId);
  if (!connect.success || !connect.data?.message) {
    captureMonitoringEvent('wallet_connect_nonce_failed', { area: 'wallet_auth', detail: connect.message ?? '' }, 'warning');
    throw new Error(connect.message || 'Failed to get sign-in message from API.');
  }

  const { message } = connect.data;
  const ethersProvider = new ethers.BrowserProvider(provider);
  const signer = await ethersProvider.getSigner();
  const signature = await signer.signMessage(message);

  const verify = await postWalletVerify({
    address,
    chainId,
    message,
    signature,
  });

  if (!verify.success || !verify.data?.token) {
    captureMonitoringEvent('wallet_verify_failed', { area: 'wallet_auth', detail: verify.message ?? '' }, 'warning');
    throw new Error(verify.message || 'Wallet verification failed.');
  }

  return {
    token: verify.data.token,
    address: verify.data.address.toLowerCase(),
    chainId: verify.data.chainId,
  };
}

export async function clearLocalWalletSession(walletAddress: string | null, token: string | null) {
  if (token) {
    await postLogout(token);
  }
  await clearWalletSessionToken();
  if (walletAddress) {
    await clearEncryptedDek(walletAddress);
  }
}
