/**
 * Public env vars must use EXPO_PUBLIC_ prefix (embedded at build time).
 * Default matches apps/web local API (port 3001).
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:3001';

/** WalletConnect `metadata.url` + Universal Link marketing origin (HTTPS). */
export const UNIVERSAL_LINK_BASE =
  process.env.EXPO_PUBLIC_UNIVERSAL_LINK_BASE?.trim().replace(/\/$/, '') ?? '';

/** Optional strict lock: registrable domain, e.g. `safepsy.com` (see `productionEnv.ts`). */
export const APP_DOMAIN_LOCK = process.env.EXPO_PUBLIC_APP_DOMAIN?.trim().toLowerCase() ?? '';

export const WALLETCONNECT_PROJECT_ID = process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ?? '';

/** When true, product intends to use `@walletconnect/modal-react-native` (integration TBD). */
export const USE_WALLETCONNECT_MODAL =
  process.env.EXPO_PUBLIC_USE_WALLETCONNECT_MODAL?.trim().toLowerCase() === 'true';
