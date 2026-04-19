import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearChatSymmetricKey } from './chatHistoryService';
import { clearEncryptedDek } from './secureToken';

const CACHE_PREFIX = 'safepsy_';

/**
 * Wipe local chat crypto when the wallet account changes or user signs out.
 */
export async function resetChatEncryptionForAddressChange(previousWallet: string | null): Promise<void> {
  clearChatSymmetricKey();
  if (previousWallet) {
    await clearEncryptedDek(previousWallet);
  }
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    if (ours.length > 0) {
      await AsyncStorage.multiRemove(ours);
    }
  } catch {
    /* ignore */
  }
}

export async function clearAllLocalChatCaches(): Promise<void> {
  await resetChatEncryptionForAddressChange(null);
}
