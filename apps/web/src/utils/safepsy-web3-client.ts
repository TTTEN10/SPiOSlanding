/**
 * SafePsy Web3 Client Library
 * 
 * Framework-agnostic library for interacting with SafePsy's Web3 infrastructure.
 * Handles wallet connection, authentication, DID management, and chat operations.
 * 
 * @module safepsy-web3-client
 */

import { ethers } from 'ethers';
import {
  SUPPORTED_CHAIN_ID,
  SUPPORTED_CHAIN_ID_HEX,
  SUPPORTED_NETWORK_NAME,
} from '../config/supportedChain';
import { getApiBaseUrl } from '../config/api'

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Wallet provider type
 */
export type WalletProvider = ethers.BrowserProvider | ethers.JsonRpcProvider;

/**
 * DID Profile structure (matches Solidity contract)
 */
export interface DidProfile {
  owner: string;
  createdAt: bigint;
  lastUpdatedAt: bigint;
  chatDataReference: string; // bytes32 as hex string
  encryptedKeyMetadata: string; // bytes as hex string
}

/**
 * DID Information
 */
export interface DidInfo {
  hasDid: boolean;
  tokenId: string | null;
  encryptedDataExists: boolean;
  walletAddress: string;
  profile?: DidProfile;
}

/**
 * Authenticated user session
 */
export interface UserSession {
  walletAddress: string;
  chainId: number;
  isVerified: boolean;
  didInfo: DidInfo | null;
}

/**
 * Error types
 */
export class SafePsyError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SafePsyError';
  }
}

export class NetworkError extends SafePsyError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends SafePsyError {
  constructor(message: string, details?: any) {
    super(message, 'AUTH_ERROR', details);
    this.name = 'AuthenticationError';
  }
}

export class DIDError extends SafePsyError {
  constructor(message: string, details?: any) {
    super(message, 'DID_ERROR', details);
    this.name = 'DIDError';
  }
}

export class ContractError extends SafePsyError {
  constructor(message: string, details?: any) {
    super(message, 'CONTRACT_ERROR', details);
    this.name = 'ContractError';
  }
}

// ============================================================================
// Configuration
// ============================================================================

interface SafePsyConfig {
  apiBaseUrl?: string;
  didContractAddress?: string;
  rpcUrl?: string;
}

/**
 * Get configuration from environment or defaults
 */
function getConfig(): Required<SafePsyConfig> {
  // SSR / non-Vite usage: allow explicit env, otherwise default to same-origin.
  const defaultApiBase = typeof window !== 'undefined' ? getApiBaseUrl() : (process.env.VITE_API_URL || '/api')
  return {
    apiBaseUrl: defaultApiBase,
    didContractAddress: typeof window !== 'undefined'
      ? (import.meta.env?.VITE_DID_IDENTITY_TOKEN_ADDRESS || '')
      : process.env.VITE_DID_IDENTITY_TOKEN_ADDRESS || '',
    rpcUrl: typeof window !== 'undefined'
      ? (import.meta.env?.VITE_RPC_URL || 'https://eth.llamarpc.com')
      : process.env.VITE_RPC_URL || 'https://eth.llamarpc.com',
  };
}

// ============================================================================
// DID Contract ABI
// ============================================================================

const DID_IDENTITY_TOKEN_ABI = [
  'function getProfileByOwner(address user) external view returns (tuple(address owner, uint64 createdAt, uint64 lastUpdatedAt, bytes32 chatDataReference, bytes encryptedKeyMetadata))',
  'function updateChatReference(string calldata newRef, bytes calldata newEncryptedKeyMetadata) external',
  'function updateEncryptedKeyMetadata(bytes calldata newEncryptedKeyMetadata) external',
  'function updateChatDataReference(string calldata newRef) external',
  'function hasDid(address user) external view returns (bool)',
  'function getDidId(address user) external view returns (uint256)',
  'function getChatDataReference(address user) external view returns (bytes32)',
  'function getEncryptedKeyMetadata(address user) external view returns (bytes memory)',
  'function createDid(address user) external returns (uint256)',
  'function createMyDid() external returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
];

// ============================================================================
// SafePsy Web3 Client Class
// ============================================================================

export class SafePsyWeb3Client {
  private config: Required<SafePsyConfig>;
  private provider: WalletProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private session: UserSession | null = null;

  constructor(config?: SafePsyConfig) {
    this.config = { ...getConfig(), ...config };
  }

  // ==========================================================================
  // Provider Management
  // ==========================================================================

  /**
   * Initialize provider from window.ethereum (MetaMask) or custom RPC
   */
  private async initializeProvider(): Promise<WalletProvider> {
    if (this.provider) {
      return this.provider;
    }

    if (typeof window !== 'undefined' && window.ethereum) {
      // Use MetaMask or injected provider
      this.provider = new ethers.BrowserProvider(window.ethereum);
    } else if (this.config.rpcUrl) {
      // Use custom RPC URL
      this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    } else {
      throw new NetworkError('No wallet provider available. Please install MetaMask or provide an RPC URL.');
    }

    return this.provider;
  }

  /**
   * Get or create provider
   */
  private async getProvider(): Promise<WalletProvider> {
    if (!this.provider) {
      await this.initializeProvider();
    }
    return this.provider!;
  }

  /**
   * Get signer from provider
   */
  private async getSigner(): Promise<ethers.JsonRpcSigner> {
    if (this.signer) {
      return this.signer;
    }

    const provider = await this.getProvider();
    
    if (provider instanceof ethers.BrowserProvider) {
      this.signer = await provider.getSigner();
    } else {
      throw new NetworkError('Signer not available. Browser provider required for signing.');
    }

    return this.signer;
  }

  /**
   * Validate network is Sepolia Testnet
   */
  private async validateNetwork(): Promise<void> {
    const provider = await this.getProvider();
    const network = await provider.getNetwork();
    
    if (Number(network.chainId) !== SUPPORTED_CHAIN_ID) {
      throw new NetworkError(
        `Unsupported network. Please switch to ${SUPPORTED_NETWORK_NAME} (Chain ID: ${SUPPORTED_CHAIN_ID})`,
        { currentChainId: Number(network.chainId) }
      );
    }
  }

  /**
   * Request network switch to Sepolia Testnet
   */
  private async requestNetworkSwitch(): Promise<void> {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new NetworkError('Cannot switch network: no wallet provider available');
    }

    const ethereum = window.ethereum;

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SUPPORTED_CHAIN_ID_HEX }],
      });
    } catch (switchError: any) {
      // If chain doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: SUPPORTED_CHAIN_ID_HEX,
              chainName: 'Sepolia',
              nativeCurrency: {
                name: 'Sepolia Ether',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: [this.config.rpcUrl || 'https://rpc.sepolia.org'],
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            }],
          });
        } catch (addError) {
          throw new NetworkError('Failed to add Sepolia Testnet to wallet', addError);
        }
      } else {
        throw new NetworkError('Failed to switch to Sepolia Testnet', switchError);
      }
    }
  }

  // ==========================================================================
  // API Communication
  // ==========================================================================

  /**
   * Make authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.apiBaseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authentication headers if we have a session
    if (this.session) {
      (headers as Record<string, string>)['x-wallet-address'] = this.session.walletAddress;
      (headers as Record<string, string>)['x-chain-id'] = this.session.chainId.toString();
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies for session
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new NetworkError(
        errorData.message || `API request failed: ${response.statusText}`,
        { status: response.status, ...errorData }
      );
    }

    return response.json();
  }

  // ==========================================================================
  // Wallet Connection & Authentication
  // ==========================================================================

  /**
   * Connect wallet and authenticate with backend
   * 
   * Flow:
   * 1. Initialize provider
   * 2. Request account access
   * 3. Validate network (switch if needed)
   * 4. Request verification message from backend
   * 5. Sign message with wallet
   * 6. Verify signature with backend
   * 7. Create session
   * 
   * @returns UserSession with authenticated wallet info
   */
  async connectWalletAndAuthenticate(): Promise<UserSession> {
    try {
      // Initialize provider
      await this.initializeProvider();

      // Request account access
      if (typeof window !== 'undefined' && window.ethereum) {
        const ethereum = window.ethereum;
        const accounts = await ethereum.request({
          method: 'eth_requestAccounts',
        });
        
        if (!accounts || accounts.length === 0) {
          throw new AuthenticationError('No accounts found. Please connect your wallet.');
        }
      }

      // Get signer and address
      const signer = await this.getSigner();
      const walletAddress = await signer.getAddress();

      // Validate network
      try {
        await this.validateNetwork();
      } catch (error) {
        // Try to switch network
        await this.requestNetworkSwitch();
        await this.validateNetwork();
      }

      // Request verification message from backend
      // Send address in both headers (for middleware) and body (for validation)
      const connectResponse = await this.apiRequest<{
        success: boolean;
        data: {
          address: string;
          chainId: number;
          nonce: string;
          message: string;
        };
      }>('/api/auth/wallet/connect', {
        method: 'POST',
        headers: {
          'x-wallet-address': walletAddress,
          'x-chain-id': SUPPORTED_CHAIN_ID.toString(),
        },
        body: JSON.stringify({
          address: walletAddress,
          chainId: SUPPORTED_CHAIN_ID,
        }),
      });

      if (!connectResponse.success || !connectResponse.data) {
        throw new AuthenticationError('Failed to get verification message');
      }

      const { message } = connectResponse.data;

      // Sign message
      const signature = await signer.signMessage(message);

      // Verify signature with backend
      const verifyResponse = await this.apiRequest<{
        success: boolean;
        data: {
          address: string;
          chainId: number;
          verified: boolean;
          token?: string;
        };
      }>('/api/auth/wallet/verify', {
        method: 'POST',
        body: JSON.stringify({
          address: walletAddress,
          signature,
          message,
          chainId: SUPPORTED_CHAIN_ID,
        }),
      });

      if (!verifyResponse.success || !verifyResponse.data) {
        throw new AuthenticationError('Signature verification failed');
      }

      // Create session
      this.session = {
        walletAddress: verifyResponse.data.address.toLowerCase(),
        chainId: verifyResponse.data.chainId,
        isVerified: verifyResponse.data.verified,
        didInfo: null,
      };

      // Check DID status
      try {
        const didInfo = await this.getCurrentUserDid();
        this.session.didInfo = didInfo;
      } catch (error) {
        // DID check failed, but authentication succeeded
        console.warn('DID check failed:', error);
      }

      return this.session;
    } catch (error: any) {
      if (error instanceof SafePsyError) {
        throw error;
      }
      throw new AuthenticationError(
        error.message || 'Failed to connect and authenticate wallet',
        error
      );
    }
  }

  /**
   * Get current authenticated session
   */
  getCurrentSession(): UserSession | null {
    return this.session;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.session !== null && this.session.isVerified;
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    try {
      if (this.session) {
        await this.apiRequest('/api/auth/logout', {
          method: 'POST',
        });
      }
    } catch (error) {
      // Ignore logout errors
      console.warn('Logout error:', error);
    } finally {
      this.session = null;
      this.signer = null;
      this.provider = null;
    }
  }

  // ==========================================================================
  // DID Operations
  // ==========================================================================

  /**
   * Get current user's DID information
   * 
   * @returns DidInfo or null if no DID exists
   */
  async getCurrentUserDid(): Promise<DidInfo | null> {
    if (!this.session) {
      throw new AuthenticationError('Not authenticated. Call connectWalletAndAuthenticate() first.');
    }

    try {
      const response = await this.apiRequest<{
        success: boolean;
        data: {
          hasDid: boolean;
          tokenId: string | null;
          encryptedDataExists: boolean;
          walletAddress: string;
          profile?: {
            owner: string;
            createdAt: string;
            lastUpdatedAt: string;
            chatDataReference: string;
            encryptedKeyMetadataLength: number;
            hasChatReference: boolean;
          };
        };
      }>('/api/did/check', {
        method: 'POST',
      });

      if (!response.success) {
        throw new DIDError('Failed to check DID status');
      }

      if (!response.data.hasDid) {
        return null;
      }

      const didInfo: DidInfo = {
        hasDid: response.data.hasDid,
        tokenId: response.data.tokenId,
        encryptedDataExists: response.data.encryptedDataExists,
        walletAddress: response.data.walletAddress,
      };

      // If profile data is available, include it
      if (response.data.profile) {
        didInfo.profile = {
          owner: response.data.profile.owner,
          createdAt: BigInt(response.data.profile.createdAt),
          lastUpdatedAt: BigInt(response.data.profile.lastUpdatedAt),
          chatDataReference: response.data.profile.chatDataReference,
          encryptedKeyMetadata: '', // Not included in check response
        };
      }

      // Update session
      if (this.session) {
        this.session.didInfo = didInfo;
      }

      return didInfo;
    } catch (error: any) {
      if (error instanceof SafePsyError) {
        throw error;
      }
      throw new DIDError('Failed to get DID information', error);
    }
  }

  /**
   * Create DID if missing
   * 
   * Checks if user has a DID, and creates one if they don't.
   * 
   * @returns DidInfo for the created or existing DID
   */
  async createDidIfMissing(): Promise<DidInfo> {
    if (!this.session) {
      throw new AuthenticationError('Not authenticated. Call connectWalletAndAuthenticate() first.');
    }

    try {
      // Check if DID already exists
      const existingDid = await this.getCurrentUserDid();
      if (existingDid) {
        return existingDid;
      }

      // Create DID via backend
      const response = await this.apiRequest<{
        success: boolean;
        data: {
          hasDid: boolean;
          tokenId: string;
          encryptedDataExists: boolean;
          walletAddress: string;
          txHash?: string;
        };
      }>('/api/did/create', {
        method: 'POST',
      });

      if (!response.success || !response.data.hasDid) {
        throw new DIDError('Failed to create DID');
      }

      const didInfo: DidInfo = {
        hasDid: response.data.hasDid,
        tokenId: response.data.tokenId,
        encryptedDataExists: response.data.encryptedDataExists,
        walletAddress: response.data.walletAddress,
      };

      // Update session
      if (this.session) {
        this.session.didInfo = didInfo;
      }

      return didInfo;
    } catch (error: any) {
      if (error instanceof SafePsyError) {
        throw error;
      }
      throw new DIDError('Failed to create DID', error);
    }
  }

  /**
   * Get encrypted chat reference from DID
   * 
   * @returns Chat data reference (hash/CID/DB key) or null if not set
   */
  async getEncryptedChatReference(): Promise<string | null> {
    if (!this.session) {
      throw new AuthenticationError('Not authenticated. Call connectWalletAndAuthenticate() first.');
    }

    if (!this.config.didContractAddress) {
      throw new ContractError('DID contract address not configured');
    }

    try {
      await this.validateNetwork();

      const provider = await this.getProvider();
      const contract = new ethers.Contract(
        this.config.didContractAddress,
        DID_IDENTITY_TOKEN_ABI,
        provider
      );

      const chatReference = await contract.getChatDataReference(this.session.walletAddress);

      // Check if reference is empty (all zeros)
      if (chatReference === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        return null;
      }

      return chatReference;
    } catch (error: any) {
      if (error instanceof SafePsyError) {
        throw error;
      }
      throw new ContractError('Failed to get chat reference from DID', error);
    }
  }

  /**
   * Update encrypted chat reference and key metadata in DID
   * 
   * @param chatReference Chat data reference (hash/CID/DB key)
   * @param encryptedKeyMetadata Encrypted key metadata (as hex string or Uint8Array)
   */
  async updateEncryptedChatReference(
    chatReference: string,
    encryptedKeyMetadata: string | Uint8Array
  ): Promise<void> {
    if (!this.session) {
      throw new AuthenticationError('Not authenticated. Call connectWalletAndAuthenticate() first.');
    }

    if (!this.config.didContractAddress) {
      throw new ContractError('DID contract address not configured');
    }

    try {
      await this.validateNetwork();

      const signer = await this.getSigner();
      const contract = new ethers.Contract(
        this.config.didContractAddress,
        DID_IDENTITY_TOKEN_ABI,
        signer
      );

      // Convert encrypted key metadata to bytes if needed
      let keyMetadataBytes: Uint8Array;
      if (typeof encryptedKeyMetadata === 'string') {
        if (encryptedKeyMetadata.startsWith('0x')) {
          keyMetadataBytes = ethers.getBytes(encryptedKeyMetadata);
        } else {
          // Treat as base64 or plain string
          keyMetadataBytes = new TextEncoder().encode(encryptedKeyMetadata);
        }
      } else {
        keyMetadataBytes = encryptedKeyMetadata;
      }

      // Call updateChatReference on contract
      const tx = await contract.updateChatReference(chatReference, keyMetadataBytes);
      await tx.wait();

      // Refresh DID info
      await this.getCurrentUserDid();
    } catch (error: any) {
      if (error instanceof SafePsyError) {
        throw error;
      }
      throw new ContractError('Failed to update chat reference in DID', error);
    }
  }

  // ==========================================================================
  // Chat Operations
  // ==========================================================================

  /**
   * Save encrypted chat blob to backend
   * 
   * @param encryptedChatBlob Encrypted chat data (base64 or hex string)
   * @returns Chat hash and update info
   */
  async saveEncryptedChat(encryptedChatBlob: string): Promise<{
    chatId: string;
    blobHash: string;
    chatReference: string | null;
    requiresDidUpdate: boolean;
  }> {
    if (!this.session) {
      throw new AuthenticationError('Not authenticated. Call connectWalletAndAuthenticate() first.');
    }

    try {
      const response = await this.apiRequest<{
        success: boolean;
        data: {
          chatId: string;
          blobHash: string;
          didTokenId: string | null;
          chatReference?: string;
          preserveEncryptedKeyMetadata?: string | null;
          requiresDidUpdate: boolean;
        };
      }>('/api/chat/save', {
        method: 'POST',
        body: JSON.stringify({
          encryptedChatBlob,
          didTokenId: this.session.didInfo?.tokenId || null,
        }),
      });

      if (!response.success) {
        throw new NetworkError('Failed to save encrypted chat');
      }

      return {
        chatId: response.data.chatId,
        blobHash: response.data.blobHash,
        chatReference: response.data.chatReference || null,
        requiresDidUpdate: response.data.requiresDidUpdate,
      };
    } catch (error: any) {
      if (error instanceof SafePsyError) {
        throw error;
      }
      throw new NetworkError('Failed to save encrypted chat', error);
    }
  }

  /**
   * Load encrypted chat blob from backend
   * 
   * @returns Encrypted chat blob or null if no chat exists
   */
  async loadEncryptedChat(): Promise<string | null> {
    if (!this.session) {
      throw new AuthenticationError('Not authenticated. Call connectWalletAndAuthenticate() first.');
    }

    try {
      const response = await this.apiRequest<{
        success: boolean;
        data: {
          hasChat: boolean;
          encryptedChatBlob: string | null;
          blobHash: string | null;
        };
      }>('/api/chat/load', {
        method: 'GET',
      });

      if (!response.success || !response.data.hasChat) {
        return null;
      }

      return response.data.encryptedChatBlob || null;
    } catch (error: any) {
      if (error instanceof SafePsyError) {
        throw error;
      }
      throw new NetworkError('Failed to load encrypted chat', error);
    }
  }
}

// ============================================================================
// Convenience Functions (Alternative to Class API)
// ============================================================================

let defaultClient: SafePsyWeb3Client | null = null;

/**
 * Get or create default client instance
 */
function getDefaultClient(config?: SafePsyConfig): SafePsyWeb3Client {
  if (!defaultClient) {
    defaultClient = new SafePsyWeb3Client(config);
  }
  return defaultClient;
}

/**
 * Connect wallet and authenticate (convenience function)
 */
export async function connectWalletAndAuthenticate(
  config?: SafePsyConfig
): Promise<UserSession> {
  const client = getDefaultClient(config);
  return client.connectWalletAndAuthenticate();
}

/**
 * Get current user's DID (convenience function)
 */
export async function getCurrentUserDid(
  config?: SafePsyConfig
): Promise<DidInfo | null> {
  const client = getDefaultClient(config);
  return client.getCurrentUserDid();
}

/**
 * Create DID if missing (convenience function)
 */
export async function createDidIfMissing(
  config?: SafePsyConfig
): Promise<DidInfo> {
  const client = getDefaultClient(config);
  return client.createDidIfMissing();
}

/**
 * Get encrypted chat reference (convenience function)
 */
export async function getEncryptedChatReference(
  config?: SafePsyConfig
): Promise<string | null> {
  const client = getDefaultClient(config);
  return client.getEncryptedChatReference();
}

/**
 * Update encrypted chat reference (convenience function)
 */
export async function updateEncryptedChatReference(
  chatReference: string,
  encryptedKeyMetadata: string | Uint8Array,
  config?: SafePsyConfig
): Promise<void> {
  const client = getDefaultClient(config);
  return client.updateEncryptedChatReference(chatReference, encryptedKeyMetadata);
}

