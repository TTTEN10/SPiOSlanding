import { Router, Response } from 'express';
import Joi from 'joi';
import { ethers } from 'ethers';
import logger from '../lib/logger';
import { authenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { DIDService } from '../lib/did.service';
import { SUPPORTED_CHAIN_ID } from '../lib/constants';

const router = Router();

/**
 * Prepare calldata for DIDIdentityToken.updateChatReference (client signs & broadcasts).
 * Requires DID_IDENTITY_TOKEN_ADDRESS — the legacy token that exposes profile + updateChatReference.
 */
const didUpdatePrepareSchema = Joi.object({
  chatReference: Joi.string().min(1).max(4096).required(),
  encryptedKeyMetadataHex: Joi.string()
    .pattern(/^0x([0-9a-fA-F]{2})*$/)
    .optional()
    .default('0x'),
});

/**
 * POST /api/did/check
 * Check if authenticated wallet has a DID
 */
router.post(
  '/check',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Validate chain ID
      if (req.wallet.chainId !== SUPPORTED_CHAIN_ID) {
        return res.status(400).json({
          success: false,
          message: 'Only Sepolia Testnet is supported',
          error: 'UNSUPPORTED_CHAIN',
        });
      }

      const didService = DIDService.getInstance();
      if (!didService) {
        return res.status(503).json({
          success: false,
          message: 'DID service not configured',
          error: 'SERVICE_UNAVAILABLE',
        });
      }

      const didInfo = await didService.getDIDInfo(req.wallet.walletAddress);

      logger.info(`DID check for ${req.wallet.walletAddress}: hasDid=${didInfo.hasDid}`);

      res.json({
        success: true,
        data: {
          hasDid: didInfo.hasDid,
          tokenId: didInfo.tokenId,
          encryptedDataExists: didInfo.encryptedDataExists,
          walletAddress: didInfo.walletAddress,
          isRevoked: didInfo.isRevoked || false,
        },
      });
    } catch (error: any) {
      logger.error('DID check error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/did/create
 * Create a DID for authenticated wallet
 */
router.post(
  '/create',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Validate chain ID
      if (req.wallet.chainId !== SUPPORTED_CHAIN_ID) {
        return res.status(400).json({
          success: false,
          message: 'Only Sepolia Testnet is supported. Please switch networks.',
          error: 'UNSUPPORTED_CHAIN',
        });
      }

      const didService = DIDService.getInstance();
      if (!didService) {
        return res.status(503).json({
          success: false,
          message: 'DID service not configured',
          error: 'SERVICE_UNAVAILABLE',
        });
      }

      // Check if DID already exists
      const hasDid = await didService.hasDid(req.wallet.walletAddress);
      if (hasDid) {
        const didInfo = await didService.getDIDInfo(req.wallet.walletAddress);
        return res.json({
          success: true,
          message: 'DID already exists',
          data: {
            hasDid: true,
            tokenId: didInfo.tokenId,
            encryptedDataExists: didInfo.encryptedDataExists,
            walletAddress: didInfo.walletAddress,
          },
        });
      }

      // Create DID
      const result = await didService.createDID(req.wallet.walletAddress);

      logger.info(`DID created for ${req.wallet.walletAddress}: token ${result.tokenId}`);

      res.json({
        success: true,
        message: 'DID created successfully',
        data: {
          hasDid: true,
          tokenId: result.tokenId,
          encryptedDataExists: false,
          walletAddress: req.wallet.walletAddress,
          txHash: result.txHash,
        },
      });
    } catch (error: any) {
      logger.error('DID create error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create DID',
        error: 'CREATE_FAILED',
      });
    }
  }
);

/**
 * GET /api/did/info
 * Get all available metadata about user's DID
 */
router.get(
  '/info',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Validate chain ID
      if (req.wallet.chainId !== SUPPORTED_CHAIN_ID) {
        return res.status(400).json({
          success: false,
          message: 'Only Sepolia Testnet is supported',
          error: 'UNSUPPORTED_CHAIN',
        });
      }

      const didService = DIDService.getInstance();
      if (!didService) {
        return res.status(503).json({
          success: false,
          message: 'DID service not configured',
          error: 'SERVICE_UNAVAILABLE',
        });
      }

      const didInfo = await didService.getDIDInfo(req.wallet.walletAddress);

      // Build response with profile data if available
      const responseData: any = {
        hasDid: didInfo.hasDid,
        tokenId: didInfo.tokenId,
        encryptedDataExists: didInfo.encryptedDataExists,
        walletAddress: didInfo.walletAddress,
        contractAddress: process.env.DID_REGISTRY_ADDRESS || process.env.DID_IDENTITY_TOKEN_ADDRESS || null,
        network: 'Sepolia Testnet',
        chainId: SUPPORTED_CHAIN_ID,
      };

      // Add revocation status
      responseData.isRevoked = didInfo.isRevoked || false;

      // Add profile details if available
      if (didInfo.profile) {
        responseData.profile = {
          owner: didInfo.profile.owner,
          createdAt: didInfo.profile.createdAt.toString(),
          lastUpdatedAt: didInfo.profile.lastUpdatedAt.toString(),
          chatDataReference: didInfo.profile.chatDataReference,
          encryptedKeyMetadataLength: didInfo.profile.encryptedKeyMetadata.length,
          hasChatReference: didInfo.profile.chatDataReference !== '0x0000000000000000000000000000000000000000000000000000000000000000',
        };
      }

      res.json({
        success: true,
        data: responseData,
      });
    } catch (error: any) {
      logger.error('DID info error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/did/revoke
 * Revoke authenticated wallet's DID
 * 
 * Body: { clearChatReference?: boolean } (optional, defaults to true)
 */
router.post(
  '/revoke',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Validate chain ID
      if (req.wallet.chainId !== SUPPORTED_CHAIN_ID) {
        return res.status(400).json({
          success: false,
          message: 'Only Sepolia Testnet is supported',
          error: 'UNSUPPORTED_CHAIN',
        });
      }

      const didService = DIDService.getInstance();
      if (!didService) {
        return res.status(503).json({
          success: false,
          message: 'DID service not configured',
          error: 'SERVICE_UNAVAILABLE',
        });
      }

      // Check if DID exists
      const hasDid = await didService.hasDid(req.wallet.walletAddress);
      if (!hasDid) {
        return res.status(404).json({
          success: false,
          message: 'DID not found',
          error: 'DID_NOT_FOUND',
        });
      }

      // Check if already revoked
      const isRevoked = await didService.isRevoked(req.wallet.walletAddress);
      if (isRevoked) {
        return res.status(400).json({
          success: false,
          message: 'DID is already revoked',
          error: 'ALREADY_REVOKED',
        });
      }

      // Get clearChatReference from body (defaults to true)
      const clearChatReference = req.body.clearChatReference !== false;

      // Note: revokeDid must be called by wallet owner via frontend
      // Backend cannot call this on behalf of the user
      // We return instructions for the frontend
      logger.info(`Revocation requested for ${req.wallet.walletAddress}, clearChatReference=${clearChatReference}`);

      res.json({
        success: true,
        message: 'Revocation must be performed by wallet owner',
        data: {
          walletAddress: req.wallet.walletAddress,
          clearChatReference,
          requiresWalletSignature: true,
          instructions: 'Call revokeDid() on the DID contract with your wallet',
        },
      });
    } catch (error: any) {
      logger.error('DID revoke error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/did/update
 * Option A (backend-driven prepare): verifies JWT + DID ownership, returns unsigned tx calldata.
 * The mobile/web client must sign and send the transaction (same trust model as direct contract calls).
 */
router.post(
  '/update',
  authenticateWallet,
  validate(didUpdatePrepareSchema, 'body'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      if (req.wallet.chainId !== SUPPORTED_CHAIN_ID) {
        return res.status(400).json({
          success: false,
          message: 'Only Sepolia Testnet is supported',
          error: 'UNSUPPORTED_CHAIN',
        });
      }

      const didService = DIDService.getInstance();
      if (!didService) {
        return res.status(503).json({
          success: false,
          message: 'DID service not configured',
          error: 'SERVICE_UNAVAILABLE',
        });
      }

      const walletAddress = req.wallet.walletAddress.toLowerCase();
      const has = await didService.hasDid(walletAddress);
      if (!has) {
        return res.status(404).json({
          success: false,
          message: 'No DID for this wallet',
          error: 'DID_NOT_FOUND',
        });
      }

      const writeContractAddress = process.env.DID_IDENTITY_TOKEN_ADDRESS?.trim();
      if (!writeContractAddress) {
        return res.status(503).json({
          success: false,
          message:
            'On-chain chat reference updates require DID_IDENTITY_TOKEN_ADDRESS (identity token with updateChatReference).',
          error: 'DID_WRITE_CONTRACT_UNAVAILABLE',
        });
      }

      const { chatReference, encryptedKeyMetadataHex } = req.body as {
        chatReference: string;
        encryptedKeyMetadataHex: string;
      };

      let metadataBytes: Uint8Array;
      try {
        metadataBytes =
          encryptedKeyMetadataHex === '0x'
            ? new Uint8Array(0)
            : ethers.getBytes(encryptedKeyMetadataHex);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid encryptedKeyMetadataHex',
          error: 'INVALID_METADATA_HEX',
        });
      }

      const iface = new ethers.Interface([
        'function updateChatReference(string calldata newRef, bytes calldata newEncryptedKeyMetadata) external',
      ]);
      const data = iface.encodeFunctionData('updateChatReference', [chatReference, metadataBytes]);

      logger.info(`Prepared DID updateChatReference calldata for wallet ${walletAddress.slice(0, 10)}…`);

      res.json({
        success: true,
        data: {
          to: writeContractAddress,
          data,
          chainId: SUPPORTED_CHAIN_ID,
          value: '0x0',
        },
      });
    } catch (error: any) {
      logger.error('DID /update prepare error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/did/export
 * Export all DID data for authenticated wallet
 */
router.get(
  '/export',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Validate chain ID
      if (req.wallet.chainId !== SUPPORTED_CHAIN_ID) {
        return res.status(400).json({
          success: false,
          message: 'Only Sepolia Testnet is supported',
          error: 'UNSUPPORTED_CHAIN',
        });
      }

      const didService = DIDService.getInstance();
      if (!didService) {
        return res.status(503).json({
          success: false,
          message: 'DID service not configured',
          error: 'SERVICE_UNAVAILABLE',
        });
      }

      const didInfo = await didService.getDIDInfo(req.wallet.walletAddress);

      if (!didInfo.hasDid) {
        return res.status(404).json({
          success: false,
          message: 'DID not found',
          error: 'DID_NOT_FOUND',
        });
      }

      // Build export data
      const exportData = {
        walletAddress: didInfo.walletAddress,
        tokenId: didInfo.tokenId,
        contractAddress: process.env.DID_REGISTRY_ADDRESS || process.env.DID_IDENTITY_TOKEN_ADDRESS || null,
        network: 'Sepolia Testnet',
        chainId: SUPPORTED_CHAIN_ID,
        isRevoked: didInfo.isRevoked || false,
        encryptedDataExists: didInfo.encryptedDataExists,
        profile: didInfo.profile ? {
          owner: didInfo.profile.owner,
          createdAt: didInfo.profile.createdAt.toString(),
          lastUpdatedAt: didInfo.profile.lastUpdatedAt.toString(),
          chatDataReference: didInfo.profile.chatDataReference,
          encryptedKeyMetadata: didInfo.profile.encryptedKeyMetadata,
          encryptedKeyMetadataLength: didInfo.profile.encryptedKeyMetadata.length,
          hasChatReference: didInfo.profile.chatDataReference !== '0x0000000000000000000000000000000000000000000000000000000000000000',
        } : null,
        exportedAt: new Date().toISOString(),
        exportedBy: req.wallet.walletAddress,
      };

      logger.info(`DID export requested for ${req.wallet.walletAddress}`);

      res.json({
        success: true,
        data: exportData,
      });
    } catch (error: any) {
      logger.error('DID export error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }
);

export default router;

