import { Response } from 'express';
import logger from './logger';
import { SUPPORTED_CHAIN_ID, SUPPORTED_NETWORK_NAME } from './constants';

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Send success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): void {
  const response: ApiResponse<T> = {
    success: true,
    ...(message && { message }),
    data,
  };
  res.status(statusCode).json(response);
}

/**
 * Send error response
 */
export function sendError(
  res: Response,
  message: string,
  errorCode?: string,
  statusCode: number = 400,
  errors?: Array<{ field: string; message: string }>
): void {
  const response: ApiResponse = {
    success: false,
    message,
    ...(errorCode && { error: errorCode }),
    ...(errors && { errors }),
  };
  res.status(statusCode).json(response);
}

/**
 * Validate network/chain ID
 */
export function validateNetwork(chainId: number): { valid: boolean; error?: string } {
  if (chainId !== SUPPORTED_CHAIN_ID) {
    return {
      valid: false,
      error: `Only ${SUPPORTED_NETWORK_NAME} (Chain ID: ${SUPPORTED_CHAIN_ID}) is supported`,
    };
  }
  return { valid: true };
}

/**
 * Handle async route errors
 */
export function asyncHandler(
  fn: (req: any, res: Response, next: any) => Promise<any>
) {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      logger.error('Async handler error:', error);
      sendError(
        res,
        error.message || 'Internal server error',
        'INTERNAL_ERROR',
        500
      );
    });
  };
}

/**
 * Get Web3 RPC URL from environment (must match deployed network)
 */
export function getWeb3Provider(): string {
  return process.env.RPC_URL || process.env.ETH_RPC_URL || '';
}

/**
 * Validate wallet address format
 */
export function isValidWalletAddress(address: string): boolean {
  try {
    const { ethers } = require('ethers');
    return ethers.isAddress(address);
  } catch {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

