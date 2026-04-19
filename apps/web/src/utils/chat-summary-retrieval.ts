/**
 * Chat Summary Retrieval Utility
 * Implements: pointer → download → decrypt
 * 
 * Retrieves encrypted chat summaries from IPFS/S3 storage and decrypts them
 */

import { decrypt } from './encryption';
import { SUPPORTED_CHAIN_ID } from '../config/supportedChain';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ChatSummaryRetrievalResult {
  success: boolean;
  data?: string; // Decrypted summary text
  error?: string;
  reference?: string; // Storage reference (IPFS CID or S3 key)
}

/**
 * Get wallet authentication headers
 */
function getWalletAuthHeaders(walletAddress: string, chainId?: number): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'x-wallet-address': walletAddress,
    'x-chain-id': (chainId ?? SUPPORTED_CHAIN_ID).toString(),
  };

  // Try to get session token if available
  const token = localStorage.getItem('walletSessionToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Retrieves and decrypts chat summary from storage
 * Flow: pointer → download → decrypt
 * 
 * The API endpoint automatically retrieves the summary reference from the database
 * and downloads the encrypted summary from IPFS/S3 storage.
 * 
 * @param summaryKey - The AES-256-GCM encryption key for the summary (32 bytes)
 * @param walletAddress - The wallet address for authentication
 * @param chainId - Optional chain ID (defaults to supported network / Sepolia when sent to API)
 * @returns Decrypted summary text
 */
export async function retrieveChatSummary(
  summaryKey: Uint8Array,
  walletAddress: string,
  chainId?: number
): Promise<ChatSummaryRetrievalResult> {
  try {
    if (summaryKey.length !== 32) {
      return {
        success: false,
        error: 'Summary encryption key must be 32 bytes',
      };
    }

    // Fetch encrypted summary from API (which handles IPFS/S3 download)
    // The API endpoint retrieves the reference from the database and downloads from storage
    const response = await fetch(`${API_BASE_URL}/api/chat/summary`, {
      method: 'GET',
      headers: getWalletAuthHeaders(walletAddress, chainId),
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: 'Authentication required. Please verify your wallet.',
        };
      }
      if (response.status === 404) {
        return {
          success: false,
          error: 'Chat summary not found',
        };
      }
      return {
        success: false,
        error: `Failed to retrieve summary: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    if (!data.success) {
      return {
        success: false,
        error: data.message || 'Failed to retrieve chat summary',
      };
    }

    const encryptedSummaryBase64 = data.data.encryptedSummary;
    const storageReference = data.data.reference;

    // Decrypt the summary
    try {
      const decryptedSummary = await decrypt(encryptedSummaryBase64, summaryKey);
      
      return {
        success: true,
        data: decryptedSummary,
        reference: storageReference,
      };
    } catch (decryptError: any) {
      return {
        success: false,
        error: `Decryption failed: ${decryptError.message || 'Invalid encryption key or corrupted data'}`,
        reference: storageReference,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to retrieve chat summary',
    };
  }
}

/**
 * Retrieves chat summary reference from the database
 * This is useful when you need to get the reference before downloading
 * 
 * @param walletAddress - The wallet address for authentication
 * @param chainId - Optional chain ID (defaults to supported network / Sepolia when sent to API)
 * @returns Storage reference (IPFS CID or S3 key)
 */
export async function getChatSummaryReference(
  walletAddress: string,
  chainId?: number
): Promise<{ success: boolean; reference?: string; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/load`, {
      method: 'GET',
      headers: getWalletAuthHeaders(walletAddress, chainId),
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: 'Authentication required. Please verify your wallet.',
        };
      }
      return {
        success: false,
        error: `Failed to load chat: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    if (!data.success) {
      return {
        success: false,
        error: data.message || 'Failed to load chat',
      };
    }

    if (!data.data.hasChat) {
      return {
        success: false,
        error: 'No chat found',
      };
    }

    return {
      success: true,
      reference: data.data.encryptedSummaryRef || undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get chat summary reference',
    };
  }
}

