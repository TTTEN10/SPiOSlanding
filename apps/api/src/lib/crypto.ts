import crypto from "crypto";

// Salt used for IP hashing to prevent rainbow table attacks
// Retrieved from environment variables for security
const SALT = process.env.IP_SALT ?? "";

/**
 * Hashes an IP address using SHA-256 with salt for privacy protection
 * @param ip - The IP address string to hash
 * @returns The hashed IP address as a hex string, or undefined if no salt is configured
 */
export const ipHash = (ip: string) => {
  // Privacy by default - only hash if explicitly enabled
  if (process.env.IP_HASHING_ENABLED !== 'true') {
    return undefined;
  }
  
  // Validate salt exists and is secure
  if (!SALT || SALT.length < 32) {
    console.warn('WARNING: IP_SALT is not secure. IP hashing disabled.');
    return undefined;
  }
  
  // Validate IP is not empty
  if (!ip || ip.trim() === '') {
    return undefined;
  }
  
  return crypto
    .createHash("sha256")
    .update(ip + SALT)
    .digest("hex");
};

/**
 * AES-256-GCM Encryption Utility for Backend
 * 
 * KEY LIFECYCLE & MANAGEMENT (WALLET-GATED)
 * 
 * Server-Side Constraints:
 * - Server MUST NOT store raw keys (DEK/KEK) in any form
 * - Server MAY hold plaintext transiently in memory for AI processing
 * - Server stores ciphertext blobs only (encrypted chat data)
 * - Server never has access to wallet-based derived keys
 * 
 * Key Derivation:
 * - Wallet-based keys: Derived client-side from wallet signature (SHA-256 hash)
 *   Server never performs wallet-based key derivation
 * - PBKDF2 functions: Available for password-based derivation if needed,
 *   but NOT used for wallet-based encryption (wallet keys are client-side only)
 * 
 * Plaintext Handling:
 * - Plaintext exists transiently in memory during AI processing
 * - Plaintext is NEVER written to disk, logs, or database
 * - Plaintext lifetime: Request duration only (seconds to minutes)
 * 
 * Security Policy Compliance:
 * - AES-256-GCM encryption (as per security policy)
 * - Secure key derivation using PBKDF2 (for password-based, if used)
 * - Authentication tag for integrity verification
 * 
 * DO NOT LOG: Keys, plaintext, prompts, or sensitive data
 */

/**
 * Encrypts data using AES-256-GCM
 * @param data - Plain text data to encrypt
 * @param key - Encryption key (must be 32 bytes for AES-256)
 * @returns Encrypted data with IV and auth tag (base64 encoded)
 */
export function encryptAES256GCM(data: string, key: Buffer): string {
  if (key.length !== 32) {
    throw new Error('Key must be 32 bytes for AES-256');
  }

  // Generate a random IV (12 bytes for GCM)
  const iv = crypto.randomBytes(12);

  // Create cipher
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  // Encrypt the data
  let encrypted = cipher.update(data, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  // Combine IV, encrypted data, and auth tag
  const combined = Buffer.concat([iv, encrypted, authTag]);

  // Convert to base64 for storage/transmission
  return combined.toString('base64');
}

/**
 * Decrypts data using AES-256-GCM
 * @param encryptedData - Encrypted data (base64 encoded, includes IV and auth tag)
 * @param key - Decryption key (must be 32 bytes for AES-256)
 * @returns Decrypted plain text data
 */
export function decryptAES256GCM(encryptedData: string, key: Buffer): string {
  if (key.length !== 32) {
    throw new Error('Key must be 32 bytes for AES-256');
  }

  // Decode from base64
  const combined = Buffer.from(encryptedData, 'base64');

  // Extract IV (first 12 bytes)
  const iv = combined.slice(0, 12);

  // Extract auth tag (last 16 bytes)
  const authTag = combined.slice(-16);

  // Extract encrypted data (middle bytes)
  const encrypted = combined.slice(12, -16);

  // Create decipher
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt the data
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  // Convert to string
  return decrypted.toString('utf8');
}

/**
 * Derives an encryption key from a password using PBKDF2
 * 
 * IMPORTANT: This function is NOT used for wallet-based key derivation.
 * Wallet-based keys are derived client-side using SHA-256 hash of wallet signature.
 * Server never performs wallet-based key derivation.
 * 
 * This function is available for password-based key derivation if needed
 * in the future, but is NOT part of the current wallet-gated encryption model.
 * 
 * @param password - Password string
 * @param salt - Salt (should be random, 16+ bytes)
 * @returns Derived key (32 bytes for AES-256)
 */
export function deriveKeyPBKDF2(password: string, salt: Buffer): Buffer {
  // Derive key using PBKDF2 with 100,000 iterations (as per security policy)
  return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

/**
 * Generates a random encryption key (32 bytes for AES-256)
 * @returns Random key
 */
export function generateEncryptionKey(): Buffer {
  return crypto.randomBytes(32);
}

/**
 * Generates a random salt for key derivation
 * @returns Random salt (16 bytes)
 */
export function generateSalt(): Buffer {
  return crypto.randomBytes(16);
}
