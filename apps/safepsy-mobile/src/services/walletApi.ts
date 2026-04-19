import { API_BASE_URL } from '../config/env';
import { SUPPORTED_CHAIN_ID } from '../config/constants';

type ConnectResponse = {
  success: boolean;
  message?: string;
  data?: { address: string; chainId: number; nonce: string; message: string };
};

type VerifyResponse = {
  success: boolean;
  message?: string;
  data?: { address: string; chainId: number; verified: boolean; token?: string };
};

const jsonHeaders = { 'Content-Type': 'application/json' };

export async function postWalletConnect(address: string, chainId: number): Promise<ConnectResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/wallet/connect`, {
    method: 'POST',
    headers: {
      ...jsonHeaders,
      'x-wallet-address': address,
      'x-chain-id': String(chainId),
    },
    body: JSON.stringify({ address, chainId }),
  });
  return (await res.json()) as ConnectResponse;
}

export async function postWalletVerify(params: {
  address: string;
  chainId: number;
  message: string;
  signature: string;
}): Promise<VerifyResponse> {
  const { address, chainId, message, signature } = params;
  const res = await fetch(`${API_BASE_URL}/api/auth/wallet/verify`, {
    method: 'POST',
    headers: {
      ...jsonHeaders,
      'x-wallet-address': address,
      'x-chain-id': String(chainId),
      'x-wallet-signature': signature,
      'x-wallet-message': message,
    },
    body: JSON.stringify({
      address,
      chainId,
      message,
      signature,
    }),
  });
  return (await res.json()) as VerifyResponse;
}

export async function getAuthMe(token: string): Promise<{
  success: boolean;
  data?: { walletAddress: string; chainId: number; isVerified: boolean };
}> {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    throw new Error('Session invalid');
  }
  return (await res.json()) as {
    success: boolean;
    data?: { walletAddress: string; chainId: number; isVerified: boolean };
  };
}

export async function postLogout(token: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        ...jsonHeaders,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    /* best-effort */
  }
}

export { SUPPORTED_CHAIN_ID };
