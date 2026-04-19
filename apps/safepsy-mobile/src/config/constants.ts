/** Sepolia — must match apps/api `SUPPORTED_CHAIN_ID` and apps/web `supportedChain.ts`. */
export const SUPPORTED_CHAIN_ID = 11155111;
export const SUPPORTED_CHAIN_ID_HEX = '0xaa36a7' as const;

export const SEPOLIA_CHAIN_PARAMS = {
  chainId: SUPPORTED_CHAIN_ID_HEX,
  chainName: 'Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://rpc.sepolia.org'],
  blockExplorerUrls: ['https://sepolia.etherscan.io'],
};
