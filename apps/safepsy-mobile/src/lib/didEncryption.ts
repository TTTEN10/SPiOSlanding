/**
 * Port of apps/web/src/utils/did-encryption.ts using global.crypto (react-native-quick-crypto).
 * Wire format must match web so ciphertext is interchangeable with the API.
 */
import { ethers } from 'ethers';
import type { JsonRpcSigner } from 'ethers';
import { toBufferSource } from './cryptoHelpers';

export function generateSymmetricKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

async function encryptWithAES(data: Uint8Array, key: Uint8Array): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    toBufferSource(key),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBufferSource(iv) },
    cryptoKey,
    toBufferSource(data),
  );

  const ivHex = ethers.hexlify(iv);
  const encryptedHex = ethers.hexlify(new Uint8Array(encrypted));
  return `${ivHex}:${encryptedHex}`;
}

async function decryptWithAES(encryptedData: string, key: Uint8Array): Promise<Uint8Array> {
  const [ivHex, encryptedHex] = encryptedData.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = ethers.getBytes(ivHex);
  const encrypted = ethers.getBytes(encryptedHex);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    toBufferSource(key),
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toBufferSource(iv) },
    cryptoKey,
    toBufferSource(encrypted),
  );

  return new Uint8Array(decrypted);
}

export async function encryptSymmetricKey(
  symmetricKey: Uint8Array,
  walletAddress: string,
  signer: JsonRpcSigner,
): Promise<string> {
  const keyMessage = `SafePsy Chat Encryption Key\nWallet: ${walletAddress.toLowerCase()}\nPurpose: Encrypt symmetric key for chat history`;
  const signature = await signer.signMessage(keyMessage);

  const encoder = new TextEncoder();
  const signatureBytes = encoder.encode(signature);
  const walletBytes = encoder.encode(walletAddress.toLowerCase());
  const combined = new Uint8Array(signatureBytes.length + walletBytes.length);
  combined.set(signatureBytes, 0);
  combined.set(walletBytes, signatureBytes.length);

  const hash = await crypto.subtle.digest('SHA-256', toBufferSource(combined));
  const derivedKey = new Uint8Array(hash);

  const encrypted = await encryptWithAES(symmetricKey, derivedKey);
  return `${signature}:${encrypted}`;
}

export async function decryptSymmetricKey(
  encryptedKey: string,
  walletAddress: string,
  _signer: JsonRpcSigner,
): Promise<Uint8Array> {
  const [signature, encrypted] = encryptedKey.split(':');
  if (!signature || !encrypted) {
    throw new Error('Invalid encrypted key format');
  }

  const keyMessage = `SafePsy Chat Encryption Key\nWallet: ${walletAddress.toLowerCase()}\nPurpose: Encrypt symmetric key for chat history`;
  const recoveredAddress = ethers.verifyMessage(keyMessage, signature);
  if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error('Encrypted key signature does not match wallet address');
  }

  const encoder = new TextEncoder();
  const signatureBytes = encoder.encode(signature);
  const walletBytes = encoder.encode(walletAddress.toLowerCase());
  const combined = new Uint8Array(signatureBytes.length + walletBytes.length);
  combined.set(signatureBytes, 0);
  combined.set(walletBytes, signatureBytes.length);

  const hash = await crypto.subtle.digest('SHA-256', toBufferSource(combined));
  const derivedKey = new Uint8Array(hash);

  return decryptWithAES(encrypted, derivedKey);
}

export async function encryptChatHistory(chatHistory: string, symmetricKey: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  return encryptWithAES(encoder.encode(chatHistory), symmetricKey);
}

export async function decryptChatHistory(encryptedHistory: string, symmetricKey: Uint8Array): Promise<string> {
  const decrypted = await decryptWithAES(encryptedHistory, symmetricKey);
  return new TextDecoder().decode(decrypted);
}
