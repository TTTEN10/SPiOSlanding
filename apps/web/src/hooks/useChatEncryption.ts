import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import {
  generateSymmetricKey,
  encryptSymmetricKey,
  decryptSymmetricKey,
  encryptChatHistory,
  decryptChatHistory,
} from '../utils/did-encryption';
import { apiUrl } from '../config/api'

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Hook for managing encrypted chat storage (verified wallet sessions only).
 *
 * Guest mode does not use this path: ChatWidget keeps messages in React state and calls
 * POST /api/chat/completions with { mode: 'guest' } — no ciphertext is saved to the API.
 *
 * Flow (authenticated):
 * 1. On mount: Load DID info, get encrypted symmetric key
 * 2. Decrypt symmetric key using wallet
 * 3. Load encrypted chat from backend
 * 4. Decrypt chat history
 * 5. On save: Encrypt chat, save to backend, update DID
 */
export function useChatEncryption() {
  const { wallet, signer } = useWallet();
  const { authState } = useAuth();
  const [symmetricKey, setSymmetricKey] = useState<Uint8Array | null>(null);
  const [encryptedKey, setEncryptedKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize encryption key
   * - If DID exists, load encrypted key from DID
   * - If no key exists, generate new one and encrypt it
   */
  const initializeKey = useCallback(async () => {
    if (!wallet || !signer || !authState.isVerified) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check if DID exists and has encrypted data
      if (authState.didStatus === 'exists' && authState.didInfo?.hasDid) {
        // Load DID data to get encrypted key
        const token = localStorage.getItem('walletSessionToken');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(apiUrl('/did/info'), {
          method: 'GET',
          headers,
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.encryptedDataExists) {
            // Get encrypted data from DID contract
            // This contains the encrypted symmetric key
            // For now, we'll need to call the contract directly or via backend
            // Let's use a simpler approach: store encrypted key in localStorage
            // and sync with DID when possible
            
            const storedEncryptedKey = localStorage.getItem(`encryptedKey_${wallet.address}`);
            if (storedEncryptedKey) {
              // Decrypt the symmetric key
              const decryptedKey = await decryptSymmetricKey(
                storedEncryptedKey,
                wallet.address,
                signer
              );
              setSymmetricKey(decryptedKey);
              setEncryptedKey(storedEncryptedKey);
              return;
            }
          }
        }
      }

      // No key exists, generate new one
      const newKey = generateSymmetricKey();
      const encrypted = await encryptSymmetricKey(newKey, wallet.address, signer);
      
      setSymmetricKey(newKey);
      setEncryptedKey(encrypted);
      
      // Store encrypted key in localStorage (temporary until saved to DID)
      localStorage.setItem(`encryptedKey_${wallet.address}`, encrypted);
    } catch (err: any) {
      console.error('Error initializing encryption key:', err);
      setError(err.message || 'Failed to initialize encryption');
    } finally {
      setIsLoading(false);
    }
  }, [wallet, signer, authState.isVerified, authState.didStatus, authState.didInfo]);

  /**
   * Save encrypted key to DID
   */
  const saveKeyToDID = useCallback(async () => {
    if (!wallet || !signer || !encryptedKey || !authState.didInfo?.hasDid) {
      return;
    }

    try {
      // Get existing DID data
      const token = localStorage.getItem('walletSessionToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const didInfoResponse = await fetch(apiUrl('/did/info'), {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (!didInfoResponse.ok) {
        throw new Error('Failed to get DID info');
      }

      const didInfoData = await didInfoResponse.json();
      if (!didInfoData.success) {
        throw new Error('Failed to get DID info');
      }

      // Prepare DID data object
      const didDataObj: any = {
        encryptedKey,
        updatedAt: new Date().toISOString(),
      };

      // If chat hash exists, preserve it
      if (didInfoData.data.encryptedDataExists) {
        try {
          // We'd need to get existing data, but for now we'll just add the key
          // In production, merge with existing data
        } catch {
          // Ignore
        }
      }

      const didDataString = JSON.stringify(didDataObj);

      // Call smart contract setDidData (this must be done by wallet owner)
      // We'll need to call this from frontend using ethers
      // For now, we'll return the data that needs to be set
      // The frontend will need to call contract.setDidData() directly

      return didDataString;
    } catch (err: any) {
      console.error('Error saving key to DID:', err);
      throw err;
    }
  }, [wallet, signer, encryptedKey, authState.didInfo]);

  /**
   * Load encrypted chat from backend
   */
  const loadChat = useCallback(async (): Promise<ChatMessage[]> => {
    if (!symmetricKey || !authState.isVerified) {
      return [];
    }

    try {
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
        throw new Error('Failed to load chat');
      }

      const data = await response.json();
      if (!data.success || !data.data.hasChat) {
        return [];
      }

      // Decrypt chat history
      const decryptedHistory = await decryptChatHistory(
        data.data.encryptedChatBlob,
        symmetricKey
      );

      // Parse JSON
      const messages: ChatMessage[] = JSON.parse(decryptedHistory);
      return messages.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    } catch (err: any) {
      console.error('Error loading chat:', err);
      return [];
    }
  }, [symmetricKey, authState.isVerified]);

  /**
   * Save encrypted chat to backend
   */
  const saveChat = useCallback(async (messages: ChatMessage[]): Promise<void> => {
    if (!symmetricKey || !authState.isVerified) {
      throw new Error('Encryption not initialized');
    }

    try {
      // Encrypt chat history
      const chatJson = JSON.stringify(messages);
      const encryptedBlob = await encryptChatHistory(chatJson, symmetricKey);

      // Save to backend
      const token = localStorage.getItem('walletSessionToken');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(apiUrl('/chat/save'), {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          encryptedChatBlob: encryptedBlob,
          didTokenId: authState.didInfo?.did || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save chat');
      }

      const data = await response.json();
      if (data.success && data.data.requiresDidUpdate) {
        // Update DID with chat hash and encrypted key
        // This should be done by calling contract.setDidData()
        // For now, we'll just log it
        console.log('DID update required:', data.data.didDataToUpdate);
      }
    } catch (err: any) {
      console.error('Error saving chat:', err);
      throw err;
    }
  }, [symmetricKey, authState.isVerified, authState.didInfo]);

  // Initialize key when wallet is verified
  useEffect(() => {
    if (authState.isVerified && wallet && signer) {
      initializeKey();
    } else {
      setSymmetricKey(null);
      setEncryptedKey(null);
    }
  }, [authState.isVerified, wallet, signer, initializeKey]);

  return {
    symmetricKey,
    encryptedKey,
    isLoading,
    error,
    loadChat,
    saveChat,
    saveKeyToDID,
    initializeKey,
  };
}

