/**
 * Admin Authentication Middleware
 * 
 * Provides access control for admin-only endpoints using:
 * - API key authentication (via header or environment)
 * - Admin wallet address whitelist
 * - Optional: JWT-based admin tokens (future enhancement)
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';
import { authenticateWallet, AuthenticatedRequest } from './auth';

/**
 * Extended request interface with admin authentication
 */
export interface AdminRequest extends AuthenticatedRequest {
  admin?: {
    method: 'api_key' | 'wallet' | 'jwt';
    identifier: string;
  };
}

/**
 * Get admin API key from environment or header
 */
function getAdminApiKey(req: Request): string | null {
  // Check header first (X-Admin-API-Key)
  const headerKey = req.headers['x-admin-api-key'] as string;
  if (headerKey) {
    return headerKey;
  }

  // Check environment variable (for server-side scripts)
  return process.env.RAG_ADMIN_API_KEY || null;
}

/**
 * Check if wallet address is in admin whitelist
 */
function isAdminWallet(walletAddress: string): boolean {
  const adminWallets = process.env.RAG_ADMIN_WALLETS;
  if (!adminWallets) {
    return false;
  }

  const addresses = adminWallets
    .split(',')
    .map((addr) => addr.trim().toLowerCase())
    .filter((addr) => addr.length > 0);

  return addresses.includes(walletAddress.toLowerCase());
}

/**
 * Admin authentication middleware
 * Supports multiple authentication methods:
 * 1. API key (X-Admin-API-Key header or RAG_ADMIN_API_KEY env var)
 * 2. Wallet authentication (wallet must be in RAG_ADMIN_WALLETS whitelist)
 * 
 * Environment variables:
 * - RAG_ADMIN_API_KEY: Admin API key
 * - RAG_ADMIN_WALLETS: Comma-separated list of admin wallet addresses
 */
export const adminAuth = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Try API key authentication first
    const apiKey = getAdminApiKey(req);
    const expectedApiKey = process.env.RAG_ADMIN_API_KEY;

    if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
      req.admin = {
        method: 'api_key',
        identifier: 'api_key',
      };
      logger.info('Admin authenticated via API key');
      next();
      return;
    }

    // Try wallet authentication
    // First ensure wallet is authenticated
    const token = req.headers['authorization']?.replace('Bearer ', '') ||
                  req.cookies?.token ||
                  req.headers['x-wallet-token'] as string;

    if (token) {
      try {
        // Use the authenticateWallet logic to verify the wallet
        // We'll manually check the wallet here to avoid double authentication
        const { verifyWalletToken } = await import('../lib/session');
        const session = verifyWalletToken(token);

        if (session && isAdminWallet(session.walletAddress)) {
          req.wallet = session;
          req.admin = {
            method: 'wallet',
            identifier: session.walletAddress,
          };
          logger.info(`Admin authenticated via wallet: ${session.walletAddress}`);
          next();
          return;
        }
      } catch (error) {
        // Continue to check other methods
      }
    }

    // Try wallet address from header (for development/testing)
    const walletAddress = req.headers['x-wallet-address'] as string;
    if (walletAddress && isAdminWallet(walletAddress)) {
      req.admin = {
        method: 'wallet',
        identifier: walletAddress,
      };
      logger.info(`Admin authenticated via wallet header: ${walletAddress}`);
      next();
      return;
    }

    // No valid authentication found
    logger.warn('Admin authentication failed: no valid credentials');
    res.status(403).json({
      success: false,
      message: 'Admin access required',
      error: 'ADMIN_ACCESS_REQUIRED',
    });
  } catch (error) {
    logger.error('Admin authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during admin authentication',
      error: 'ADMIN_AUTH_ERROR',
    });
  }
};

/**
 * Optional admin authentication - doesn't fail if not authenticated
 * Useful for endpoints that behave differently for admins
 */
export const optionalAdminAuth = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = getAdminApiKey(req);
    const expectedApiKey = process.env.RAG_ADMIN_API_KEY;

    if (apiKey && expectedApiKey && apiKey === expectedApiKey) {
      req.admin = {
        method: 'api_key',
        identifier: 'api_key',
      };
      next();
      return;
    }

    const walletAddress = req.headers['x-wallet-address'] as string;
    if (walletAddress && isAdminWallet(walletAddress)) {
      req.admin = {
        method: 'wallet',
        identifier: walletAddress,
      };
      next();
      return;
    }

    // Continue without admin authentication
    next();
  } catch (error) {
    logger.warn('Optional admin authentication error:', error);
    next(); // Continue even on error
  }
};

