import { ethers } from 'ethers';

/**
 * WalletContext exposes `BrowserProvider` or WalletConnect's Ethereum provider.
 * Anything with EIP-1193 `request` can be wrapped as a read provider for ethers v6.
 */
export function toEthersReadProvider(
  provider: ethers.BrowserProvider | { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } | null
): ethers.Provider | null {
  if (!provider) return null;
  if (provider instanceof ethers.BrowserProvider) return provider;
  return new ethers.BrowserProvider(provider as ethers.Eip1193Provider);
}
