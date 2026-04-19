import { Request, Response, NextFunction } from 'express';
import { verifyWalletToken, extractTokenFromRequest, WalletSessionPayload } from '../lib/session';
import logger from '../lib/logger';
import { SUPPORTED_CHAIN_ID } from '../lib/constants';

/**
 * Extended request interface with authenticated wallet session
 */
export interface AuthenticatedRequest extends Request {
  wallet?: WalletSessionPayload;
}

/**
 * Middleware to authenticate wallet session
 * Validates JWT token from Authorization header or cookie
 */
export const authenticateWallet = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromRequest(req);

    if (!token) {
      logger.warn('Authentication failed: no token provided');
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NO_TOKEN',
      });
      return;
    }

    const session = verifyWalletToken(token);

    if (!session) {
      logger.warn('Authentication failed: invalid token');
      res.status(401).json({
        success: false,
        message: 'Invalid or expired session',
        error: 'INVALID_TOKEN',
      });
      return;
    }

    // Validate chain ID
    if (session.chainId !== SUPPORTED_CHAIN_ID) {
      logger.warn(`Authentication failed: unsupported chain ID ${session.chainId}`);
      res.status(400).json({
        success: false,
        message: 'Unsupported network',
        error: 'UNSUPPORTED_CHAIN',
      });
      return;
    }

    // Attach wallet session to request
    req.wallet = session;

    logger.info(`Authenticated wallet: ${session.walletAddress}`);
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
      error: 'AUTH_ERROR',
    });
  }
};

/**
 * Helper function to get authenticated wallet from request
 * Throws error if not authenticated
 */
export function getAuthenticatedWallet(req: AuthenticatedRequest): WalletSessionPayload {
  if (!req.wallet) {
    throw new Error('Wallet not authenticated');
  }
  return req.wallet;
}

/**
 * Optional authentication - doesn't fail if no token, but attaches wallet if valid
 */
export const optionalAuthenticateWallet = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromRequest(req);

    if (token) {
      const session = verifyWalletToken(token);
      if (session && session.chainId === SUPPORTED_CHAIN_ID) {
        req.wallet = session;
      }
    }

    next();
  } catch (error) {
    // Continue even on error for optional auth
    logger.warn('Optional authentication error:', error);
    next();
  }
};

