/**
 * Single source of truth for the app-supported EVM network (API).
 * When moving to Ethereum mainnet: set SUPPORTED_CHAIN_ID = 1, SUPPORTED_CHAIN_ID_HEX = '0x1', update SUPPORTED_NETWORK_NAME.
 */
export const SUPPORTED_NETWORK_NAME = 'Sepolia Testnet';

/** Decimal chain ID */
export const SUPPORTED_CHAIN_ID = 11155111;

/** For wallet_switchEthereumChain / wallet_addEthereumChain */
export const SUPPORTED_CHAIN_ID_HEX = '0xAA36A7';

/**
 * Main governance/admin address for the app
 */
export const GOVERNANCE_ADMIN_ADDRESS = '0x4D32FFBA2A7e090a10789fc094572f61E956f809';
