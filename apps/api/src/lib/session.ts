import jwt, { type SignOptions } from 'jsonwebtoken';
import logger from './logger';
import { SUPPORTED_CHAIN_ID } from './constants';

/**
 * JWT payload structure for wallet authentication
 */
export interface WalletSessionPayload {
  walletAddress: string;
  chainId: number;
  isVerified: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Session configuration
 */
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-use-strong-random-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // 7 days default

/**
 * Generate a JWT token for wallet session
 */
export function generateWalletToken(payload: Omit<WalletSessionPayload, 'iat' | 'exp'>): string {
  if (!JWT_SECRET || JWT_SECRET === 'change-me-in-production-use-strong-random-secret') {
    logger.warn('WARNING: Using default JWT_SECRET. This is insecure for production!');
  }

  const tokenPayload: WalletSessionPayload = {
    walletAddress: payload.walletAddress.toLowerCase(),
    chainId: payload.chainId,
    isVerified: payload.isVerified,
  };

  return jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as SignOptions);
}

/**
 * Verify and decode a JWT token
 */
export function verifyWalletToken(token: string): WalletSessionPayload | null {
  try {
    if (!JWT_SECRET || JWT_SECRET === 'change-me-in-production-use-strong-random-secret') {
      logger.warn('WARNING: Using default JWT_SECRET. This is insecure for production!');
    }

    const decoded = jwt.verify(token, JWT_SECRET) as WalletSessionPayload;
    
    // Validate chain ID
    if (decoded.chainId !== SUPPORTED_CHAIN_ID) {
      logger.warn(`Invalid chain ID in token: ${decoded.chainId}`);
      return null;
    }

    return decoded;
  } catch (error) {
    logger.error('JWT verification error:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header or cookie
 */
export function extractTokenFromRequest(req: any): string | null {
  // Check Authorization header: "Bearer <token>"
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  if (req.cookies && req.cookies.walletSession) {
    return req.cookies.walletSession;
  }

  return null;
}

