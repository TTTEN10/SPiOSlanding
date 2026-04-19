/**
 * Single source of truth for the app-supported EVM network (web).
 * When moving to Ethereum mainnet: set SUPPORTED_CHAIN_ID = 1, SUPPORTED_CHAIN_ID_HEX = '0x1', update labels/RPC hints as needed.
 */
export const SUPPORTED_NETWORK_NAME = 'Sepolia Testnet';

export const SUPPORTED_CHAIN_ID = 11155111;
export const SUPPORTED_CHAIN_ID_HEX = '0xAA36A7' as const;
