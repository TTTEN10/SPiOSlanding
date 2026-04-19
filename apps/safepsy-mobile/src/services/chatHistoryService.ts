import type { JsonRpcSigner } from 'ethers';
import { API_BASE_URL } from '../config/env';
import {
  decryptChatHistory,
  decryptSymmetricKey,
  encryptChatHistory,
  encryptSymmetricKey,
  generateSymmetricKey,
} from '../lib/didEncryption';
import { addMonitoringBreadcrumb, captureMonitoringEvent } from '../instrumentation/sentry';
import { triggerDidUpdateAfterSave, type SaveChatApiData, type TriggerDidOptions } from './didService';
import { getEncryptedDek, getWalletSessionToken, setEncryptedDek } from './secureToken';

export type PersistedChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

export type SaveChatSessionResult = SaveChatApiData & {
  success: boolean;
};

let symmetricKey: Uint8Array | null = null;

export function getChatSymmetricKey(): Uint8Array | null {
  return symmetricKey;
}

export function clearChatSymmetricKey(): void {
  symmetricKey = null;
}

/**
 * Initialize DEK the same way as web useChatEncryption (SecureStore vs localStorage for wrapped key).
 */
export async function initializeChatCrypto(
  signer: JsonRpcSigner,
  walletAddress: string,
): Promise<void> {
  const addr = walletAddress.toLowerCase();
  const stored = await getEncryptedDek(addr);
  if (stored) {
    symmetricKey = await decryptSymmetricKey(stored, addr, signer);
    return;
  }

  const dek = generateSymmetricKey();
  const wrapped = await encryptSymmetricKey(dek, addr, signer);
  await setEncryptedDek(addr, wrapped);
  symmetricKey = dek;
}

export type LoadChatSessionResult = {
  messages: PersistedChatMessage[];
  /** True when ciphertext exists but could not be decrypted (wrong DEK / corruption). */
  corrupted: boolean;
};

export async function loadChatSession(): Promise<LoadChatSessionResult> {
  const key = symmetricKey;
  const token = await getWalletSessionToken();
  if (!key || !token) {
    return { messages: [], corrupted: false };
  }

  const res = await fetch(`${API_BASE_URL}/api/chat/load`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    return { messages: [], corrupted: false };
  }

  const data = (await res.json()) as {
    success: boolean;
    data?: { hasChat: boolean; encryptedChatBlob: string | null };
  };

  if (!data.success || !data.data?.hasChat || !data.data.encryptedChatBlob) {
    return { messages: [], corrupted: false };
  }

  try {
    const plain = await decryptChatHistory(data.data.encryptedChatBlob, key);
    const parsed = JSON.parse(plain) as PersistedChatMessage[];
    return {
      messages: Array.isArray(parsed) ? parsed : [],
      corrupted: false,
    };
  } catch {
    captureMonitoringEvent('chat_history_decrypt_failed', { area: 'chat_decrypt' }, 'warning');
    return { messages: [], corrupted: true };
  }
}

export type SaveChatSessionOptions = {
  signer?: JsonRpcSigner;
  didOptions?: TriggerDidOptions;
  /** When true, only POST /save; caller runs DID tx (for UX / retry). */
  skipDidAfterSave?: boolean;
};

export async function saveChatSession(
  messages: PersistedChatMessage[],
  options?: SaveChatSessionOptions,
): Promise<SaveChatSessionResult> {
  const key = symmetricKey;
  const token = await getWalletSessionToken();
  if (!key || !token) {
    throw new Error('Chat encryption not initialized or not authenticated.');
  }

  addMonitoringBreadcrumb('chat', 'save_session', { count: String(messages.length) });
  const encryptedBlob = await encryptChatHistory(JSON.stringify(messages), key);

  const res = await fetch(`${API_BASE_URL}/api/chat/save`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      encryptedChatBlob: encryptedBlob,
      didTokenId: null,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error((errBody as { message?: string }).message || 'Failed to save chat.');
  }

  const body = (await res.json()) as {
    success: boolean;
    data?: SaveChatApiData & { chatId?: string; blobHash?: string };
  };

  const payload = body.data ?? {};

  if (options?.signer && payload.requiresDidUpdate && !options.skipDidAfterSave) {
    await triggerDidUpdateAfterSave(options.signer, payload, options.didOptions);
  }

  return {
    success: !!body.success,
    requiresDidUpdate: payload.requiresDidUpdate,
    chatReference: payload.chatReference,
    preserveEncryptedKeyMetadata: payload.preserveEncryptedKeyMetadata ?? null,
  };
}
