/**
 * Chat Retrieval Utility
 * Implements: pointer → download blob → decrypt
 */

import { decrypt } from './encryption';
import { apiUrl } from '../config/api'

interface ChatRetrievalResult {
  success: boolean;
  data?: string; // Decrypted chat data (JSON string)
  error?: string;
}

/**
 * Retrieves and decrypts chat data from pointer
 * Flow: pointer → download blob → decrypt
 * 
 * @param encryptionKey - The AES-256-GCM encryption key (32 bytes)
 * @param pointer - Optional chat data reference pointer (if not provided, uses authenticated wallet's chat)
 * @returns Decrypted chat data as JSON string
 */
export async function retrieveChatData(
  encryptionKey: Uint8Array,
  _pointer?: string
): Promise<ChatRetrievalResult> {
  try {
    if (encryptionKey.length !== 32) {
      return {
        success: false,
        error: 'Encryption key must be 32 bytes',
      };
    }

    // Step 1: Download blob from API
    // The API endpoint uses wallet authentication, so it automatically
    // retrieves the chat for the authenticated wallet
    const token = localStorage.getItem('walletSessionToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(apiUrl('/chat/load'), {
      method: 'GET',
      headers,
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

    if (!data.data.hasChat || !data.data.encryptedChatBlob) {
      return {
        success: false,
        error: 'No chat data found',
      };
    }

    // Step 2: Decrypt the blob
    const encryptedBlob = data.data.encryptedChatBlob;
    
    try {
      const decryptedData = await decrypt(encryptedBlob, encryptionKey);
      
      return {
        success: true,
        data: decryptedData,
      };
    } catch (decryptError: any) {
      return {
        success: false,
        error: `Decryption failed: ${decryptError.message || 'Invalid encryption key or corrupted data'}`,
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to retrieve chat data',
    };
  }
}

/**
 * Export chat data as a downloadable file
 * 
 * @param chatData - The chat data (JSON string or object)
 * @param filename - Optional filename (default: safepsy-chat-export-{timestamp}.json)
 */
export function exportChatData(
  chatData: string | object,
  filename?: string
): void {
  try {
    // Convert to JSON string if object
    const jsonData = typeof chatData === 'string' 
      ? chatData 
      : JSON.stringify(chatData, null, 2);

    // Create blob
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `safepsy-chat-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error: any) {
    throw new Error(`Failed to export chat data: ${error.message}`);
  }
}

