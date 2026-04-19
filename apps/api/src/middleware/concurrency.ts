import { Request, Response, NextFunction } from 'express';
import { QuotaService } from '../lib/quota.service';
import { AuthenticatedRequest } from './auth';
import logger from '../lib/logger';

/**
 * Concurrency middleware
 * Tracks active chat requests per DID (does not block requests)
 * Frontend should disable send button when a request is in progress
 */
export const chatConcurrencyMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const quotaService = QuotaService.getInstance();

    // If no wallet is authenticated, skip concurrency tracking
    if (!req.wallet) {
      logger.debug('No wallet authenticated, skipping concurrency tracking');
      next();
      return;
    }

    const walletAddress = req.wallet.walletAddress.toLowerCase();

    // Get DID from wallet address
    const did = await quotaService.getDIDFromWallet(walletAddress);

    // If no DID, skip concurrency tracking
    if (!did) {
      logger.debug(`No DID found for wallet ${walletAddress}, skipping concurrency tracking`);
      next();
      return;
    }

    // Try to acquire lock (with 5 minute TTL to prevent stale locks)
    // If lock already exists, we still allow the request (frontend handles disabling the button)
    const lockAcquired = await quotaService.acquireConcurrencyLock(did, 300);
    if (lockAcquired) {
      // Attach lock release function to request for cleanup
      req.chatLockRelease = async () => {
        await quotaService.releaseConcurrencyLock(did);
      };

      // Release lock when response finishes (both success and error cases)
      res.on('finish', async () => {
        if (req.chatLockRelease) {
          await req.chatLockRelease();
          logger.debug(`Concurrency lock released for DID ${did} (response finished)`);
        }
      });

      res.on('close', async () => {
        if (req.chatLockRelease) {
          await req.chatLockRelease();
          logger.debug(`Concurrency lock released for DID ${did} (response closed)`);
        }
      });
    } else {
      // Lock already exists - request can still proceed, but frontend should handle button state
      logger.debug(`Concurrency lock already exists for DID ${did}, request proceeding`);
    }

    next();
  } catch (error) {
    logger.error('Concurrency middleware error:', error);
    // Fail open: allow request to proceed if concurrency check fails
    next();
  }
};

// Extend AuthenticatedRequest to include lock release function
declare global {
  namespace Express {
    interface Request {
      chatLockRelease?: () => Promise<void>;
    }
  }
}

