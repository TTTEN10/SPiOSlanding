import { Router, Request, Response } from 'express';
import express from 'express';
import Joi from 'joi';
import logger from '../lib/logger';
import { authenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { SUPPORTED_CHAIN_ID } from '../lib/constants';
import { cryptoPaymentService } from '../lib/crypto-payment.service';
import { subscriptionService } from '../lib/subscription.service';
import { DIDService } from '../lib/did.service';
import { priceOracleService } from '../lib/price-oracle.service';
import { paymentRateLimitMiddleware } from '../lib/ratelimit';
import { prisma } from '../lib/prisma';

const router = Router();

// Apply strict rate limiting to all payment routes
router.use(paymentRateLimitMiddleware);

/**
 * Validation schema for crypto payment
 */
const cryptoPaymentSchema = Joi.object({
  tier: Joi.string().valid('PREMIUM').required(),
  txHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  currency: Joi.string().valid('ETH', 'USDT', 'USDC').default('ETH'),
});

/**
 * POST /api/payment/crypto
 * Process crypto payment
 */
router.post(
  '/crypto',
  authenticateWallet,
  validate(cryptoPaymentSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      if (!cryptoPaymentService.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: 'Crypto payment not configured',
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

      const { tier, txHash, currency = 'ETH' } = req.body;
      const walletAddress = req.wallet.walletAddress.toLowerCase();

      // Get DID token ID
      const didService = DIDService.getInstance();
      let didTokenId: string | null = null;
      if (didService) {
        const didInfo = await didService.getDIDInfo(walletAddress);
        if (didInfo.hasDid && didInfo.tokenId) {
          didTokenId = didInfo.tokenId;
        }
      }

      // Process payment
      await cryptoPaymentService.processPayment(walletAddress, didTokenId, tier, txHash, currency);

      res.json({
        success: true,
        message: 'Payment processed successfully',
        data: {
          tier,
          txHash,
        },
      });
    } catch (error: any) {
      logger.error('Crypto payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process payment',
      });
    }
  }
);

/**
 * GET /api/payment/subscription
 * Get subscription status
 */
router.get(
  '/subscription',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const walletAddress = req.wallet.walletAddress.toLowerCase();
      const subscription = await subscriptionService.getOrCreateSubscription(walletAddress);

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error: any) {
      logger.error('Get subscription error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get subscription',
      });
    }
  }
);

/**
 * GET /api/payment/pricing
 * Get pricing information (with dynamic ETH price)
 */
router.get('/pricing', async (_req: Request, res: Response) => {
  try {
    // Get dynamic premium pricing
    const premiumPricing = await priceOracleService.getPremiumPricing();
    
    res.json({
      success: true,
      data: {
        tiers: {
          FREE: {
            name: 'Free',
            dailyLimit: 10,
            monthlyLimit: 100,
            price: {
              crypto: null,
            },
          },
          PREMIUM: {
            name: 'Premium',
            dailyLimit: 125,
            monthlyLimit: 1250,
            price: {
              amount: premiumPricing.USD,
              currency: 'USD',
              period: premiumPricing.period,
              crypto: {
                ETH: premiumPricing.ETH, // Just the number, no "ETH" suffix
                USDT: premiumPricing.USDT, // Just the number, no "USDT" suffix
                USDC: premiumPricing.USDC, // Just the number, no "USDC" suffix
              },
            },
          },
        },
      },
    });
  } catch (error: any) {
    logger.error('Error getting pricing:', error);
    // Fallback to environment variables on error
    res.json({
      success: true,
      data: {
        tiers: {
          FREE: {
            name: 'Free',
            dailyLimit: 10,
            monthlyLimit: 100,
            price: {
              crypto: null,
            },
          },
          PREMIUM: {
            name: 'Premium',
            dailyLimit: 125,
            monthlyLimit: 1250,
            price: {
              amount: 20,
              currency: 'USD',
              period: '30 days',
              crypto: {
                ETH: process.env.CRYPTO_PRICE_PREMIUM_ETH || '0.005714 ETH',
                USDT: process.env.CRYPTO_PRICE_PREMIUM_USDT || '20.00 USDT',
                USDC: process.env.CRYPTO_PRICE_PREMIUM_USDC || '20.00 USDC',
              },
            },
          },
        },
      },
    });
  }
});

export default router;

