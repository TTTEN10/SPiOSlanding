import * as SecureStore from 'expo-secure-store';

const WALLET_SESSION_KEY = 'walletSessionToken';

export async function getWalletSessionToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(WALLET_SESSION_KEY);
  } catch {
    return null;
  }
}

export async function setWalletSessionToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(WALLET_SESSION_KEY, token);
}

export async function clearWalletSessionToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(WALLET_SESSION_KEY);
  } catch {
    /* no-op */
  }
}

/** Matches web `localStorage` key in useChatEncryption: `encryptedKey_${wallet.address}` */
export function encryptedDekStorageKey(walletAddress: string): string {
  return `encryptedKey_${walletAddress.toLowerCase()}`;
}

export async function getEncryptedDek(walletAddress: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(encryptedDekStorageKey(walletAddress));
  } catch {
    return null;
  }
}

export async function setEncryptedDek(walletAddress: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(encryptedDekStorageKey(walletAddress), value);
}

export async function clearEncryptedDek(walletAddress: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(encryptedDekStorageKey(walletAddress));
  } catch {
    /* no-op */
  }
}
