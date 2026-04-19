import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import logger from '../lib/logger';
import { walletAuthMiddleware, walletConnectionMiddleware, WalletAuthRequest } from '../middleware/wallet-auth';
import { validateWalletConnect, validateWalletSignature } from '../middleware/validation';
import { generateWalletToken, extractTokenFromRequest, verifyWalletToken } from '../lib/session';
import { authenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import { 
  strictAuthRateLimitMiddleware, 
  walletAuthRateLimitMiddleware,
  testingRateLimitMiddleware 
} from '../lib/ratelimit';
import { SUPPORTED_CHAIN_ID } from '../lib/constants';

const router = Router();

// Apply strict rate limiting to all auth routes
router.use(strictAuthRateLimitMiddleware);

/**
 * POST /api/auth/wallet/connect
 * Connect wallet and generate verification message
 * 
 * Input: wallet address (via header or body)
 * Auth: Public (no auth required)
 * 
 * Output: { success: true, data: { address, chainId, nonce, message } }
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

      // Validate chain ID - Sepolia Testnet
      if (req.wallet.chainId !== SUPPORTED_CHAIN_ID) {
        return res.status(400).json({
          success: false,
          message: 'Only Sepolia Testnet is supported',
          error: 'UNSUPPORTED_CHAIN',
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
 * POST /api/auth/wallet/verify
 * Verify wallet signature and create session
 * 
 * Input: { address, signature, message, chainId }
 * Auth: Public (no auth required, but creates session)
 * 
 * Output: { success: true, data: { address, chainId, verified: true, token } }
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
 * GET /api/auth/me
 * Same contract as GET /api/auth/session (mobile-friendly alias).
 */
router.get(
  '/me',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      res.json({
        success: true,
        data: {
          walletAddress: req.wallet.walletAddress,
          chainId: req.wallet.chainId,
          isVerified: req.wallet.isVerified,
        },
      });
    } catch (error) {
      logger.error('Session (/me) error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/auth/session
 * Get current session information (canonical name; /me is an alias).
 */
router.get(
  '/session',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      res.json({
        success: true,
        data: {
          walletAddress: req.wallet.walletAddress,
          chainId: req.wallet.chainId,
          isVerified: req.wallet.isVerified,
        },
      });
    } catch (error) {
      logger.error('Session info error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout and clear session
 * 
 * Auth: Required (wallet session)
 */
router.post(
  '/logout',
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

