import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../lib/logger';
import { WalletAuthRequest } from './wallet-auth';
import { SUPPORTED_CHAIN_ID } from '../lib/constants';

/**
 * Interface for DID verification request
 */
export interface DIDVerifyRequest extends WalletAuthRequest {
  did?: {
    didHash: string;
    did: string;
    isValid: boolean;
  };
}

/**
 * Configuration for DID verification
 */
interface DIDVerifyConfig {
  registryAddress: string;
  rpcUrl: string;
  chainId: number;
}

// Legacy DIDIdentityToken ABI (hasDid, getDidId, isRevoked by address)
const DID_IDENTITY_TOKEN_ABI = [
  'function hasDid(address user) external view returns (bool)',
  'function getDidId(address user) external view returns (uint256)',
  'function isRevoked(address user) external view returns (bool)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
];

// DIDRegistryV2 ABI (split architecture: getTokenIdByAddress, isAddressRevoked)
const DID_REGISTRY_V2_ABI = [
  'function getTokenIdByAddress(address owner) external view returns (uint256)',
  'function isAddressRevoked(address owner) external view returns (bool)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
];

/**
 * Load Registry from deployment registry when env not set (Sepolia)
 */
function loadRegistryFromDeploymentRegistry(): string | undefined {
  try {
    const registryPath = path.join(process.cwd(), 'deployments', 'sepolia-latest.json');
    if (fs.existsSync(registryPath)) {
      const reg = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      return reg?.contracts?.DIDRegistryV2?.address;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * Get DID verification configuration from environment
 * Prefers DID_REGISTRY_ADDRESS (new split architecture) when set.
 * Fallback: deployments/sepolia-latest.json when running on Sepolia.
 */
function getDIDVerifyConfig(): (DIDVerifyConfig & { useNewRegistry: boolean }) | null {
  let registryAddress = process.env.DID_REGISTRY_ADDRESS;
  if (!registryAddress) registryAddress = loadRegistryFromDeploymentRegistry();
  const legacyAddress = process.env.DID_IDENTITY_TOKEN_ADDRESS;
  const contractAddress = registryAddress || legacyAddress;
  const rpcUrl = process.env.RPC_URL || process.env.ETH_RPC_URL;
  const chainId = SUPPORTED_CHAIN_ID;

  if (!contractAddress || !rpcUrl) {
    logger.warn('DID verification not configured: missing DID_REGISTRY_ADDRESS (or DID_IDENTITY_TOKEN_ADDRESS) or RPC_URL');
    return null;
  }

  return {
    registryAddress: contractAddress,
    rpcUrl,
    chainId,
    useNewRegistry: !!registryAddress,
  };
}

/**
 * Verify DID from smart contract using wallet address
 * @param walletAddress The wallet address to verify
 * @param config DID verification configuration
 * @returns DID information if valid, null otherwise
 */
async function verifyDIDFromContract(
  walletAddress: string,
  config: DIDVerifyConfig & { useNewRegistry: boolean }
): Promise<{ tokenId: string; owner: string; isValid: boolean; isRevoked: boolean } | null> {
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const abi = config.useNewRegistry ? DID_REGISTRY_V2_ABI : DID_IDENTITY_TOKEN_ABI;
    const contract = new ethers.Contract(config.registryAddress, abi, provider);

    let tokenId: bigint;
    let isRevoked: boolean;

    if (config.useNewRegistry) {
      // DIDRegistryV2: getTokenIdByAddress, isAddressRevoked
      tokenId = await contract.getTokenIdByAddress(walletAddress);
      if (tokenId === 0n) {
        logger.warn(`DID verification failed: wallet ${walletAddress} does not have a DID`);
        return null;
      }
      isRevoked = await contract.isAddressRevoked(walletAddress);
    } else {
      // Legacy DIDIdentityToken: hasDid, getDidId, isRevoked
      const hasDid = await contract.hasDid(walletAddress);
      if (!hasDid) {
        logger.warn(`DID verification failed: wallet ${walletAddress} does not have a DID`);
        return null;
      }
      tokenId = await contract.getDidId(walletAddress);
      if (tokenId === 0n) {
        logger.warn(`DID verification failed: wallet ${walletAddress} has invalid token ID`);
        return null;
      }
      isRevoked = await contract.isRevoked(walletAddress);
    }

    if (isRevoked) {
      logger.warn(`DID verification failed: DID for wallet ${walletAddress} has been revoked`);
      return null;
    }

    const owner = await contract.ownerOf(tokenId);
    if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
      logger.warn(
        `DID verification failed: wallet ${walletAddress} does not own token ${tokenId.toString()}`
      );
      return null;
    }

    return {
      tokenId: tokenId.toString(),
      owner: owner.toLowerCase(),
      isValid: true,
      isRevoked: false,
    };
  } catch (error: any) {
    // Handle specific contract errors
    if (error?.reason?.includes('No DID') || error?.reason?.includes('No token')) {
      logger.warn(`DID verification failed: wallet ${walletAddress} does not have a DID`);
      return null;
    }
    logger.error('DID verification error:', error);
    return null;
  }
}

/**
 * Middleware to verify DID from smart contract
 * Verifies that the authenticated wallet has a valid, non-revoked DID
 * 
 * Expects:
 * - Wallet authentication (wallet-auth middleware should run first)
 * - Optional: x-did-hash header or didHash in body (for backward compatibility, but not used for verification)
 */
export const didVerifyMiddleware = async (
  req: DIDVerifyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if wallet is authenticated
    if (!req.wallet) {
      logger.warn('DID verification failed: wallet not authenticated');
      res.status(401).json({
        success: false,
        message: 'Wallet authentication required',
        error: 'WALLET_NOT_AUTHENTICATED',
      });
      return;
    }

    // Get configuration
    const config = getDIDVerifyConfig();
    if (!config) {
      logger.warn('DID verification skipped: not configured');
      // Allow request to continue without DID verification if not configured
      const didHash = (req.headers['x-did-hash'] as string) || req.body?.didHash || '';
      req.did = {
        didHash,
        did: '',
        isValid: false,
      };
      next();
      return;
    }

    // Verify DID from contract using wallet address
    const didInfo = await verifyDIDFromContract(
      req.wallet.address,
      config
    );

    if (!didInfo) {
      logger.warn(`DID verification failed for wallet ${req.wallet.address}`);
      res.status(403).json({
        success: false,
        message: 'DID verification failed: wallet does not have a valid DID',
        error: 'INVALID_DID',
      });
      return;
    }

    // Get optional DID hash from header/body for backward compatibility
    const didHash = (req.headers['x-did-hash'] as string) || req.body?.didHash || '';

    // Attach DID info to request
    req.did = {
      didHash: didHash || `did:token:${didInfo.tokenId}`, // Generate DID identifier from token ID if not provided
      did: `did:token:${didInfo.tokenId}`, // DID identifier based on token ID
      isValid: didInfo.isValid && !didInfo.isRevoked,
    };

    logger.info(`DID verified: token ${didInfo.tokenId} for wallet ${req.wallet.address}`);
    next();
  } catch (error) {
    logger.error('DID verification middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during DID verification',
      error: 'DID_VERIFY_ERROR',
    });
  }
};

/**
 * Optional middleware - verify DID but allow request to continue if verification fails
 * Verifies that the authenticated wallet has a valid, non-revoked DID
 */
export const didVerifyOptionalMiddleware = async (
  req: DIDVerifyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.wallet) {
      // No wallet, skip DID verification
      next();
      return;
    }

    const config = getDIDVerifyConfig();
    if (!config) {
      const didHash = (req.headers['x-did-hash'] as string) || req.body?.didHash || '';
      req.did = {
        didHash,
        did: '',
        isValid: false,
      };
      next();
      return;
    }

    // Verify DID from contract using wallet address
    const didInfo = await verifyDIDFromContract(
      req.wallet.address,
      config
    );

    const didHash = (req.headers['x-did-hash'] as string) || req.body?.didHash || '';

    if (didInfo) {
      req.did = {
        didHash: didHash || `did:token:${didInfo.tokenId}`,
        did: `did:token:${didInfo.tokenId}`,
        isValid: didInfo.isValid && !didInfo.isRevoked,
      };
      logger.info(`DID verified: token ${didInfo.tokenId} for wallet ${req.wallet.address}`);
    } else {
      req.did = {
        didHash,
        did: '',
        isValid: false,
      };
      logger.warn(`DID verification failed for wallet ${req.wallet.address}, but continuing`);
    }

    next();
  } catch (error) {
    logger.error('Optional DID verification error:', error);
    // Continue even on error
    const didHash = (req.headers['x-did-hash'] as string) || req.body?.didHash || '';
    req.did = {
      didHash,
      did: '',
      isValid: false,
    };
    next();
  }
};


