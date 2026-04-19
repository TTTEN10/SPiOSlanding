import { toBufferSource } from './crypto-helpers';

/**
 * AES-256-GCM Encryption Utility for Frontend
 * Uses Web Crypto API for browser-compatible encryption
 * 
 * KEY LIFECYCLE & MANAGEMENT (WALLET-GATED)
 * 
 * Access Model:
 * - Wallet authentication is the sole recovery/access mechanism
 * - No wallet → no access
 * - Revoked token → no access
 * - SP does not provide key escrow, recovery phrases, or key backups
 * 
 * Key Derivation:
 * - Wallet-based keys: Derived from wallet signature using SHA-256 hash
 *   (NOT PBKDF2 - see did-encryption.ts for wallet-based key derivation)
 * - PBKDF2 functions: Available for password-based derivation if needed,
 *   but NOT used for wallet-based encryption in current implementation
 * 
 * Storage:
 * - Client-side: Keys stored in memory only during active session
 * - Server-side: Never stores keys (only encrypted blobs)
 * - Backups: Store ciphertext only, cannot restore access without wallet
 * 
 * Security Policy Compliance:
 * - AES-256-GCM encryption (as per security policy)
 * - Secure key derivation
 * - Authentication tag for integrity verification
 * 
 * DO NOT LOG: Keys, plaintext, or sensitive data
 */

/**
 * Encrypts data using AES-256-GCM
 * @param data - Plain text data to encrypt
 * @param key - Encryption key (must be 32 bytes for AES-256)
 * @returns Encrypted data with IV and auth tag (base64 encoded)
 */
export async function encrypt(data: string, key: Uint8Array): Promise<string> {
  if (key.length !== 32) {
    throw new Error('Key must be 32 bytes for AES-256');
  }

  // Generate a random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Import the key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    toBufferSource(key),
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Encrypt the data
  const encodedData = new TextEncoder().encode(data);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128, // 128-bit authentication tag
    },
    cryptoKey,
    encodedData
  );

  // Combine IV, encrypted data, and auth tag
  // The encrypted array contains: ciphertext + auth tag (16 bytes at the end)
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Convert to base64 for storage/transmission
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts data using AES-256-GCM
 * @param encryptedData - Encrypted data (base64 encoded, includes IV and auth tag)
 * @param key - Decryption key (must be 32 bytes for AES-256)
 * @returns Decrypted plain text data
 */
export async function decrypt(encryptedData: string, key: Uint8Array): Promise<string> {
  if (key.length !== 32) {
    throw new Error('Key must be 32 bytes for AES-256');
  }

  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

  // Extract IV (first 12 bytes)
  const iv = combined.slice(0, 12);

  // Extract encrypted data with auth tag (rest of the bytes)
  const encrypted = combined.slice(12);

  // Import the key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    toBufferSource(key),
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Decrypt the data
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toBufferSource(iv),
      tagLength: 128,
    },
    cryptoKey,
    toBufferSource(encrypted)
  );

  // Convert to string
  return new TextDecoder().decode(decrypted);
}

/**
 * Derives an encryption key from a password using PBKDF2
 * 
 * IMPORTANT: This function is NOT used for wallet-based key derivation.
 * Wallet-based keys are derived using SHA-256 hash of wallet signature
 * (see did-encryption.ts for wallet-based key derivation).
 * 
 * This function is available for password-based key derivation if needed
 * in the future, but is NOT part of the current wallet-gated encryption model.
 * 
 * @param password - Password string
 * @param salt - Salt (should be random, 16+ bytes)
 * @returns Derived key (32 bytes for AES-256)
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  // Derive key using PBKDF2 with 100,000 iterations (as per security policy)
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toBufferSource(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 256 bits = 32 bytes for AES-256
  );

  return new Uint8Array(derivedBits);
}

/**
 * Generates a random encryption key (32 bytes for AES-256)
 * @returns Random key
 */
export function generateKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * Generates a random salt for key derivation
 * @returns Random salt (16 bytes)
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

