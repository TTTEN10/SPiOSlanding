import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import logger from '../lib/logger';
import { SUPPORTED_CHAIN_ID } from '../lib/constants';
import { walletAuthMiddleware, walletConnectionMiddleware, WalletAuthRequest } from '../middleware/wallet-auth';
import { didVerifyMiddleware, didVerifyOptionalMiddleware, DIDVerifyRequest } from '../middleware/did-verify';
import { validateWalletConnect, validateWalletSignature, validateDIDVerify } from '../middleware/validation';
import { generateWalletToken } from '../lib/session';
import { authenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import { 
  walletAuthRateLimitMiddleware, 
  didVerifyRateLimitMiddleware, 
  testingRateLimitMiddleware 
} from '../lib/ratelimit';

const router = Router();

// Apply general rate limiting to all testing routes
router.use(testingRateLimitMiddleware);

/**
 * GET /api/testing/health
 * Health check for testing endpoints
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Testing endpoints are healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/testing/wallet/connect
 * Connect wallet and generate verification message
 */
router.post(
  '/wallet/connect',
  validateWalletConnect,
  walletConnectionMiddleware,
  async (req: WalletAuthRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Wallet connection failed',
        });
      }

      // Generate a nonce for signature verification
      const nonce = ethers.hexlify(ethers.randomBytes(32));
      const message = `SafePsy Wallet Verification\n\nAddress: ${req.wallet.address}\nNonce: ${nonce}\n\nThis signature proves you own this wallet.`;

      logger.info(`Wallet connection request from ${req.wallet.address}`);

      res.json({
        success: true,
        message: 'Wallet connected successfully',
        data: {
          address: req.wallet.address,
          chainId: req.wallet.chainId,
          nonce,
          message,
        },
      });
    } catch (error) {
      logger.error('Wallet connect error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/testing/wallet/verify
 * Verify wallet signature and create session
 */
router.post(
  '/wallet/verify',
  validateWalletSignature,
  walletAuthRateLimitMiddleware,
  walletAuthMiddleware,
  async (req: WalletAuthRequest, res: Response) => {
    try {
      if (!req.wallet || !req.wallet.signature) {
        return res.status(401).json({
          success: false,
          message: 'Wallet signature verification failed',
        });
      }

      logger.info(`Wallet verified: ${req.wallet.address}`);

      // Generate JWT session token
      const sessionToken = generateWalletToken({
        walletAddress: req.wallet.address,
        chainId: req.wallet.chainId,
        isVerified: true,
      });

      // Set HTTP-only cookie
      res.cookie('walletSession', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        message: 'Wallet signature verified successfully',
        data: {
          address: req.wallet.address,
          chainId: req.wallet.chainId,
          verified: true,
          token: sessionToken, // Also return in body for client-side storage if needed
        },
      });
    } catch (error) {
      logger.error('Wallet verify error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/testing/did/verify
 * Verify DID from smart contract
 */
router.post(
  '/did/verify',
  validateDIDVerify,
  walletAuthRateLimitMiddleware,
  walletAuthMiddleware,
  didVerifyRateLimitMiddleware,
  didVerifyMiddleware,
  async (req: DIDVerifyRequest, res: Response) => {
    try {
      if (!req.did) {
        return res.status(400).json({
          success: false,
          message: 'DID verification failed',
        });
      }

      logger.info(`DID verified: ${req.did.did} for wallet ${req.wallet?.address}`);

      res.json({
        success: true,
        message: 'DID verified successfully',
        data: {
          did: req.did.did,
          didHash: req.did.didHash,
          isValid: req.did.isValid,
          walletAddress: req.wallet?.address,
        },
      });
    } catch (error) {
      logger.error('DID verify error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/testing/wallet/info
 * Get wallet information (requires wallet connection)
 */
router.get(
  '/wallet/info',
  walletConnectionMiddleware,
  async (req: WalletAuthRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Wallet not connected',
        });
      }

      res.json({
        success: true,
        data: {
          address: req.wallet.address,
          chainId: req.wallet.chainId,
        },
      });
    } catch (error) {
      logger.error('Wallet info error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/testing/did/check
 * Check DID status (optional verification)
 */
router.post(
  '/did/check',
  validateDIDVerify,
  walletConnectionMiddleware,
  didVerifyOptionalMiddleware,
  async (req: DIDVerifyRequest, res: Response) => {
    try {
      const didHash = req.body.didHash || req.headers['x-did-hash'];

      res.json({
        success: true,
        data: {
          didHash,
          did: req.did?.did || null,
          isValid: req.did?.isValid || false,
          walletAddress: req.wallet?.address || null,
        },
      });
    } catch (error) {
      logger.error('DID check error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/testing/did/check-by-wallet
 * Check DID status by wallet address (requires authentication)
 */
router.get(
  '/did/check-by-wallet',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Get DID verification config
      // We need to access the private function, so we'll recreate the logic
      const registryAddress = process.env.DID_REGISTRY_ADDRESS;
      const rpcUrl = process.env.RPC_URL || process.env.ETH_RPC_URL;
      
      if (!registryAddress || !rpcUrl) {
        // DID verification not configured, return no DID
        return res.json({
          success: true,
          data: {
            hasDid: false,
            did: null,
            didHash: null,
            isValid: false,
            walletAddress: req.wallet.walletAddress,
          },
        });
      }
      
      const config = {
        registryAddress,
        rpcUrl,
        chainId: SUPPORTED_CHAIN_ID, // Sepolia Testnet
      };

      // Try to get DIDs for this wallet
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      const DID_REGISTRY_ABI = [
        'function getDIDsByOwner(address owner) external view returns (bytes32[] memory)',
        'function getDID(bytes32 didHash) external view returns (string memory did, address owner, uint256 createdAt, uint256 updatedAt, bool revoked)',
        'function isValidDID(bytes32 didHash) external view returns (bool)',
      ];
      const registry = new ethers.Contract(
        config.registryAddress,
        DID_REGISTRY_ABI,
        provider
      );

      try {
        const didHashes = await registry.getDIDsByOwner(req.wallet.walletAddress);
        
        if (didHashes.length === 0) {
          return res.json({
            success: true,
            data: {
              hasDid: false,
              did: null,
              didHash: null,
              isValid: false,
              walletAddress: req.wallet.walletAddress,
            },
          });
        }

        // Get the first valid DID
        for (const didHash of didHashes) {
          const isValid = await registry.isValidDID(didHash);
          if (isValid) {
            const didInfo = await registry.getDID(didHash);
            const [did, owner] = didInfo;

            return res.json({
              success: true,
              data: {
                hasDid: true,
                did,
                didHash,
                isValid: true,
                walletAddress: req.wallet.walletAddress,
                contractAddress: config.registryAddress,
              },
            });
          }
        }

        // No valid DID found
        return res.json({
          success: true,
          data: {
            hasDid: false,
            did: null,
            didHash: null,
            isValid: false,
            walletAddress: req.wallet.walletAddress,
          },
        });
      } catch (contractError) {
        logger.error('DID contract query error:', contractError);
        // Return error status but don't fail the request
        return res.json({
          success: true,
          data: {
            hasDid: false,
            did: null,
            didHash: null,
            isValid: false,
            walletAddress: req.wallet.walletAddress,
            error: 'Unable to check DID status',
          },
        });
      }
    } catch (error) {
      logger.error('DID check by wallet error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/testing/auth/logout
 * Logout and clear session
 */
router.post(
  '/auth/logout',
  authenticateWallet,
  async (_req: AuthenticatedRequest, res: Response) => {
    try {
      res.clearCookie('walletSession');
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

export default router;


