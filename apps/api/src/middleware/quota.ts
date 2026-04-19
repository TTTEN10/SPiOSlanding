import { Request, Response, NextFunction } from 'express';
import { QuotaService } from '../lib/quota.service';
import { AuthenticatedRequest } from './auth';
import { priceOracleService } from '../lib/price-oracle.service';
import logger from '../lib/logger';

/**
 * Quota middleware
 * Checks if the authenticated DID has remaining chat quota
 * Should be used after wallet authentication middleware
 */
export const quotaMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const quotaService = QuotaService.getInstance();

    // If no wallet is authenticated, skip quota check (allow anonymous usage)
    // You can modify this behavior if you want to require authentication
    if (!req.wallet) {
      logger.debug('No wallet authenticated, skipping quota check');
      next();
      return;
    }

    const walletAddress = req.wallet.walletAddress.toLowerCase();

    // Get DID from wallet address
    const did = await quotaService.getDIDFromWallet(walletAddress);

    // If no DID, skip quota check (allow usage without DID)
    // You can modify this to require DID if needed
    if (!did) {
      logger.debug(`No DID found for wallet ${walletAddress}, skipping quota check`);
      next();
      return;
    }

    // Check if quota is available (pass wallet address for subscription check)
    const canUse = await quotaService.canUseChat(did, walletAddress);

    if (!canUse) {
      const status = await quotaService.getQuotaStatus(did, walletAddress);
      logger.warn(`Quota exceeded for DID ${did}: daily=${status.dailyUsed}/${status.dailyLimit}, monthly=${status.monthlyUsed}/${status.monthlyLimit}`);
      
      // Get pricing information for paywall (dynamic ETH price)
      const premiumPricing = await priceOracleService.getPremiumPricing();
      const pricing = {
        PREMIUM: {
          crypto: {
            ETH: premiumPricing.ETH,
            USDT: premiumPricing.USDT,
            USDC: premiumPricing.USDC,
          },
        },
      };

      res.status(429).json({
        success: false,
        error: 'QUOTA_EXCEEDED',
        message: 'Chat quota exceeded. Upgrade to Premium to continue.',
        quota: {
          dailyUsed: status.dailyUsed,
          dailyLimit: status.dailyLimit,
          monthlyUsed: status.monthlyUsed,
          monthlyLimit: status.monthlyLimit,
          resetDailyAt: status.resetDailyAt,
          resetMonthlyAt: status.resetMonthlyAt,
        },
        paywall: {
          showPaywall: true,
          pricing,
          paymentRecipient: process.env.CRYPTO_PAYMENT_CONTRACT_ADDRESS || null,
        },
      });
      return;
    }

    // Attach quota info to request for later use
    req.quota = {
      did,
      service: quotaService,
    };

    next();
  } catch (error) {
    logger.error('Quota middleware error:', error);
    // Fail open: allow request to proceed if quota check fails
    next();
  }
};

/**
 * Optional quota middleware - checks quota but allows request to continue if check fails
 */
export const optionalQuotaMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const quotaService = QuotaService.getInstance();

    // Guest mode: explicit client flag — do not attach DID quota (no billing linkage).
    const body = req.body as { mode?: string } | undefined;
    if (body?.mode === 'guest') {
      next();
      return;
    }

    if (!req.wallet) {
      next();
      return;
    }

    const walletAddress = req.wallet.walletAddress.toLowerCase();
    const did = await quotaService.getDIDFromWallet(walletAddress);

    if (!did) {
      next();
      return;
    }

    const canUse = await quotaService.canUseChat(did);
    if (canUse) {
      req.quota = {
        did,
        service: quotaService,
      };
    } else {
      logger.warn(`Quota exceeded for DID ${did}, but allowing request (optional middleware)`);
    }

    next();
  } catch (error) {
    logger.error('Optional quota middleware error:', error);
    next();
  }
};

// Extend AuthenticatedRequest to include quota info
declare global {
  namespace Express {
    interface Request {
      quota?: {
        did: string;
        service: QuotaService;
      };
    }
  }
}

