import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';
import logger from '../lib/logger';
import { SUPPORTED_CHAIN_ID, SUPPORTED_NETWORK_NAME } from '../lib/constants';
import { logSecurityEvent, redactWalletForAudit } from '../lib/security-audit';

/**
 * Interface for wallet authentication request
 */
export interface WalletAuthRequest extends Request {
  wallet?: {
    address: string;
    chainId: number;
    signature?: string;
    message?: string;
  };
}

/**
 * Message template for wallet signature verification (legacy format)
 * @deprecated Consider using generateSIWEMessage for EIP-4361 compliance
 */
const WALLET_VERIFICATION_MESSAGE = (address: string, nonce: string) => 
  `SafePsy Wallet Verification\n\nAddress: ${address}\nNonce: ${nonce}\n\nThis signature proves you own this wallet.`;

/**
 * Generate a nonce for wallet verification
 */
export function generateNonce(): string {
  return ethers.hexlify(ethers.randomBytes(32));
}

/**
 * Generate SIWE (Sign-In with Ethereum) message per EIP-4361
 * This is the recommended format for wallet authentication as it:
 * - Reduces phishing risk through standardized format
 * - Includes expiration time for enhanced security
 * - Provides better domain separation
 * - Is an industry standard (EIP-4361)
 * 
 * @param address The wallet address
 * @param nonce The nonce for replay attack prevention
 * @param options Optional configuration (domain, URI, expiration time)
 * @returns SIWE message string ready for signing
 */
export function generateSIWEMessage(
  address: string,
  nonce: string,
  options?: {
    domain?: string;
    uri?: string;
    expirationTime?: Date;
  }
): string {
  const domain = options?.domain || process.env.SIWE_DOMAIN || 'safepsy.com';
  const uri = options?.uri || process.env.SIWE_URI || 'https://safepsy.com';
  const expirationTime = options?.expirationTime || new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours default

  const chainId = SUPPORTED_CHAIN_ID;
  const siweMessage = new SiweMessage({
    domain,
    address,
    statement: 'Sign in with Ethereum to SafePsy',
    uri,
    version: '1',
    chainId,
    nonce,
    issuedAt: new Date().toISOString(),
    expirationTime: expirationTime.toISOString(),
  });

  return siweMessage.prepareMessage();
}

/**
 * Verify if a message is in SIWE format
 */
function isSIWEMessage(message: string): boolean {
  return message.includes('wants you to sign in with your Ethereum account:') ||
         (message.includes('URI:') && message.includes('Version:') && message.includes('Chain ID:'));
}

/**
 * Verify SIWE message signature
 */
async function verifySIWESignature(
  message: string,
  signature: string
): Promise<{ address: string; isValid: boolean }> {
  try {
    const siweMessage = new SiweMessage(message);
    const fields = await siweMessage.validate(signature);
    
    // Validate chain ID
    if (fields.chainId !== SUPPORTED_CHAIN_ID) {
      logger.warn(`SIWE verification failed: invalid chain ID ${fields.chainId}`);
      return { address: fields.address, isValid: false };
    }

    // Check expiration
    if (fields.expirationTime && new Date(fields.expirationTime) < new Date()) {
      logger.warn(`SIWE verification failed: message expired`);
      return { address: fields.address, isValid: false };
    }

    return { address: fields.address, isValid: true };
  } catch (error) {
    logger.error('SIWE verification error:', error);
    return { address: '', isValid: false };
  }
}

/**
 * Verify wallet signature
 * Supports both SIWE (EIP-4361) and legacy message formats
 * 
 * Security considerations:
 * - Uses ethers.js for signature recovery (cryptographically secure)
 * - Address comparison is case-insensitive (EIP-55 checksum handled)
 * - Always returns false on error to prevent information leakage
 * - SIWE format includes expiration time and domain validation
 * 
 * @param address The wallet address
 * @param message The message that was signed (SIWE or legacy format)
 * @param signature The signature
 * @returns Whether the signature is valid
 */
export async function verifySignature(
  address: string,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    // Check if message is in SIWE format
    if (isSIWEMessage(message)) {
      const result = await verifySIWESignature(message, signature);
      if (!result.isValid) {
        return false;
      }
      // Verify address matches
      return result.address.toLowerCase() === address.toLowerCase();
    }

    // Legacy format verification using ethers.js
    const recoveredAddress = ethers.verifyMessage(message, signature);
    // Use case-insensitive comparison
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    logger.error('Signature verification error:', error);
    // Always return false on error to prevent information leakage
    return false;
  }
}

/**
 * Middleware to verify wallet connection and signature
 * Expects:
 * - x-wallet-address header
 * - x-wallet-signature header
 * - x-wallet-message header (or will use default message)
 * - x-chain-id header (optional)
 */
export const walletAuthMiddleware = async (
  req: WalletAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const address = req.headers['x-wallet-address'] as string;
    const signature = req.headers['x-wallet-signature'] as string;
    const message = req.headers['x-wallet-message'] as string;
    const chainId = req.headers['x-chain-id'] as string;

    // Check if wallet address is provided
    if (!address) {
      logger.warn('Wallet authentication failed: missing address');
      await logSecurityEvent({
        eventType: 'AUTH_FAILURE',
        resource: req.path,
        success: false,
        req,
        details: { reason: 'MISSING_WALLET_ADDRESS' },
      });
      res.status(401).json({
        success: false,
        message: 'Wallet address is required',
        error: 'MISSING_WALLET_ADDRESS',
      });
      return;
    }

    // Validate address format
    if (!ethers.isAddress(address)) {
      logger.warn(`Wallet authentication failed: invalid address format - ${address}`);
      await logSecurityEvent({
        eventType: 'AUTH_FAILURE',
        resource: req.path,
        success: false,
        req,
        details: { reason: 'INVALID_ADDRESS' },
      });
      res.status(401).json({
        success: false,
        message: 'Invalid wallet address format',
        error: 'INVALID_ADDRESS',
      });
      return;
    }

    // Validate chain ID - Sepolia Testnet
    const parsedChainId = chainId ? parseInt(chainId, 10) : SUPPORTED_CHAIN_ID;
    if (parsedChainId !== SUPPORTED_CHAIN_ID) {
      logger.warn(`Wallet authentication failed: unsupported chain ID ${parsedChainId} for address ${address}`);
      await logSecurityEvent({
        eventType: 'AUTH_FAILURE',
        actor: redactWalletForAudit(address),
        resource: req.path,
        success: false,
        req,
        details: { reason: 'UNSUPPORTED_CHAIN_ID', chainId: parsedChainId },
      });
      res.status(400).json({
        success: false,
        message: `Only ${SUPPORTED_NETWORK_NAME} (Chain ID: ${SUPPORTED_CHAIN_ID}) is supported`,
        error: 'UNSUPPORTED_CHAIN_ID',
      });
      return;
    }

    // If signature is provided, verify it
    if (signature) {
      if (!message) {
        logger.warn('Wallet authentication failed: missing message for signature verification');
        await logSecurityEvent({
          eventType: 'AUTH_FAILURE',
          actor: redactWalletForAudit(address),
          resource: req.path,
          success: false,
          req,
          details: { reason: 'MISSING_MESSAGE' },
        });
        res.status(401).json({
          success: false,
          message: 'Message is required for signature verification',
          error: 'MISSING_MESSAGE',
        });
        return;
      }

      const isValid = await verifySignature(address, message, signature);
      if (!isValid) {
        logger.warn(`Wallet authentication failed: invalid signature for address ${address}`);
        await logSecurityEvent({
          eventType: 'AUTH_FAILURE',
          actor: redactWalletForAudit(address),
          resource: req.path,
          success: false,
          req,
          details: { reason: 'INVALID_SIGNATURE' },
        });
        res.status(401).json({
          success: false,
          message: 'Invalid signature',
          error: 'INVALID_SIGNATURE',
        });
        return;
      }

      await logSecurityEvent({
        eventType: 'AUTH_SUCCESS',
        actor: redactWalletForAudit(address),
        resource: req.path,
        success: true,
        req,
      });
      logger.info(`Wallet authenticated: ${address} with valid signature`);
    } else {
      await logSecurityEvent({
        eventType: 'AUTH_SUCCESS',
        actor: redactWalletForAudit(address),
        resource: req.path,
        success: true,
        req,
        details: { method: 'connection_only' },
      });
      logger.info(`Wallet connection verified: ${address} (no signature)`);
    }

    // Attach wallet info to request
    req.wallet = {
      address: address.toLowerCase(),
      chainId: parsedChainId,
      signature,
      message,
    };

    next();
  } catch (error) {
    logger.error('Wallet authentication error:', error);
    await logSecurityEvent({
      eventType: 'AUTH_FAILURE',
      resource: (req as Request).path,
      success: false,
      req,
      details: { reason: 'WALLET_AUTH_ERROR' },
    }).catch(() => {});
    res.status(500).json({
      success: false,
      message: 'Internal server error during wallet authentication',
      error: 'WALLET_AUTH_ERROR',
    });
  }
};

/**
 * Optional middleware - only requires wallet connection, not signature
 */
export const walletConnectionMiddleware = async (
  req: WalletAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const address = req.headers['x-wallet-address'] as string;
    const chainId = req.headers['x-chain-id'] as string;

    if (!address) {
      res.status(401).json({
        success: false,
        message: 'Wallet connection required',
        error: 'MISSING_WALLET_ADDRESS',
      });
      return;
    }

    if (!ethers.isAddress(address)) {
      res.status(401).json({
        success: false,
        message: 'Invalid wallet address format',
        error: 'INVALID_ADDRESS',
      });
      return;
    }

    // Validate chain ID - Sepolia Testnet
    const parsedChainId = chainId ? parseInt(chainId, 10) : SUPPORTED_CHAIN_ID;
    if (parsedChainId !== SUPPORTED_CHAIN_ID) {
      logger.warn(`Wallet connection failed: unsupported chain ID ${parsedChainId} for address ${address}`);
      res.status(400).json({
        success: false,
        message: `Only ${SUPPORTED_NETWORK_NAME} (Chain ID: ${SUPPORTED_CHAIN_ID}) is supported`,
        error: 'UNSUPPORTED_CHAIN_ID',
      });
      return;
    }

    req.wallet = {
      address: address.toLowerCase(),
      chainId: parsedChainId,
    };

    next();
  } catch (error) {
    logger.error('Wallet connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during wallet connection',
      error: 'WALLET_CONNECTION_ERROR',
    });
  }
};


